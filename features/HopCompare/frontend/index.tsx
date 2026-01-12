import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Upload, Play, Pause, RotateCcw, FileJson } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import axios from "axios";

// Convert a 4‑bit array (e.g. [0,1,0,1]) into a nibble value 0‑15
const bitsToNibble = (bits: number[]): number => {
  // Assume bits are ordered most‑significant to least‑significant
  return bits.reduce((acc, bit, idx) => acc + (bit << (3 - idx)), 0);
};

// Derive placeholder Kolam parameters from a matrix (used for UI display only)
const deriveParams = (matrix: number[][], kFromJson?: number) => {
  const k = kFromJson ?? matrix.length;
  return {
    matrix,
    k,
    symmetry: 4,
    randomness: 0.5,
    seed: Math.floor(Math.random() * 10000),
    mod: 16,
  };
};

const HopCompare = () => {
  const navigate = useNavigate();
  const [seqA, setSeqA] = useState<number[]>([]);
  const [seqB, setSeqB] = useState<number[]>([]);
  const [paramsA, setParamsA] = useState<any>(null);
  const [paramsB, setParamsB] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [metrics, setMetrics] = useState<any>(null);

  // ---------------------------------------------------------------------------
  // File upload handling – supports two JSON shapes:
  //   1. Plain 2‑D matrix array
  //   2. { k: number, matrix: [[[bits]]] } where each cell is a 4‑bit array
  // ---------------------------------------------------------------------------
  const handleFileUpload = async (file: File, target: "A" | "B") => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const json = JSON.parse(content);

          let matrix: number[][] = [];
          let kFromJson: number | undefined = undefined;

          if (Array.isArray(json) && json.length > 0 && Array.isArray(json[0])) {
            // Plain 2‑D matrix directly in the file
            matrix = json as number[][];
          } else if (json.matrix) {
            if (Array.isArray(json.matrix[0][0])) {
              // 3‑D bit matrix – convert each cell's 4 bits to a nibble
              matrix = (json.matrix as number[][][]).map((row) =>
                row.map((cell) => bitsToNibble(cell))
              );
            } else {
              // Already a 2‑D matrix inside an object
              matrix = json.matrix as number[][];
            }
            if (json.k) {
              kFromJson = Number(json.k);
            }
          } else {
            toast.error("Invalid file format – expected a matrix or a Kolam JSON object.");
            return;
          }

          const params = deriveParams(matrix, kFromJson);
          const loadingToast = toast.loading(`Generating hopping sequence (${params.k}×${params.k})...`);
          try {
            const response = await axios.post(
              "/matrix-to-hops",
              { matrix: matrix, channels: 16 }
            );
            const hops: number[] = response.data.hops_sequence;
            if (!hops || hops.length === 0) {
              toast.error("Backend returned an empty hopping sequence.");
              return;
            }
            const invalid = hops.filter((h) => h < 0 || h > 15);
            if (invalid.length > 0) {
              toast.warning(`Found ${invalid.length} channels outside 0‑15 range.`);
            }
            if (target === "A") {
              setSeqA(hops);
              setParamsA(params);
              toast.success(`Sequence A generated: ${hops.length} hops`);
            } else {
              setSeqB(hops);
              setParamsB(params);
              toast.success(`Sequence B generated: ${hops.length} hops`);
            }
          } finally {
            toast.dismiss(loadingToast);
          }
        } catch (err: any) {
          toast.error(`Failed to process ${file.name}: ${err.message}`);
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      toast.error(`Failed to read file: ${err.message}`);
    }
  };

  // ---------------------------------------------------------------------------
  // Animation loop – steps through the longer of the two sequences
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isPlaying) return;
    const maxLen = Math.max(seqA.length, seqB.length);
    if (maxLen === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= maxLen - 1) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 1000 / speed);
    return () => clearInterval(interval);
  }, [isPlaying, speed, seqA.length, seqB.length]);

  // Sync Hardware Transmission with Animation
  useEffect(() => {
    if (isPlaying && seqA[currentIndex] !== undefined) {
      // Fire-and-forget transmission request
      axios.post("/transmit-single-hop", { channel: seqA[currentIndex] }).catch(() => { });
    }
  }, [currentIndex, isPlaying, seqA]);

  // ---------------------------------------------------------------------------
  // Metrics calculation (Hamming, Jaccard, Collision Rate)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (seqA.length === 0 || seqB.length === 0) return;
    const minLen = Math.min(seqA.length, seqB.length);
    let hamming = 0;
    for (let i = 0; i < minLen; i++) {
      if (seqA[i] !== seqB[i]) hamming++;
    }
    const setA = new Set(seqA);
    const setB = new Set(seqB);
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    const jaccard = union.size > 0 ? intersection.size / union.size : 0;
    const collisionRate = minLen > 0 ? (minLen - hamming) / minLen : 0;
    setMetrics({
      hamming: (hamming / minLen) * 100,
      collision: collisionRate * 100,
      jaccard: jaccard * 100,
      lengthA: seqA.length,
      lengthB: seqB.length,
    });
  }, [seqA, seqB]);

  // ---------------------------------------------------------------------------
  // Data preparation for charts
  // ---------------------------------------------------------------------------
  const channelDistributionA = Array.from({ length: 16 }, (_, i) => ({
    channel: i,
    countA: seqA.filter((h) => h === i).length,
  }));
  const channelDistributionB = Array.from({ length: 16 }, (_, i) => ({
    channel: i,
    countB: seqB.filter((h) => h === i).length,
  }));
  const timelineData = Array.from({ length: Math.max(seqA.length, seqB.length) }, (_, i) => ({
    index: i,
    channelA: seqA[i] ?? null,
    channelB: seqB[i] ?? null,
  }));

  const currentChannelA = seqA[currentIndex] ?? -1;
  const currentChannelB = seqB[currentIndex] ?? -1;
  const isCollision = currentChannelA !== -1 && currentChannelA === currentChannelB;

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">FHSS Hop Compare</h1>
          <p className="text-muted-foreground">
            Upload Kolam matrix JSON files to generate and compare hopping sequences.
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      {/* Upload panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Sequence A */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-blue-500" />
              Sequence A
            </CardTitle>
            <CardDescription>
              {seqA.length > 0 ? `${seqA.length} hops generated` : "Upload Kolam JSON"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/5 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Drop JSON or click to upload</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "A")}
              />
            </label>
            {paramsA && (
              <div className="mt-4 p-3 bg-muted/10 rounded text-xs space-y-1">
                <div><strong>Symmetry:</strong> {paramsA.symmetry}</div>
                <div><strong>Randomness:</strong> {paramsA.randomness}</div>
                <div><strong>K (Matrix Size):</strong> {paramsA.k} × {paramsA.k}</div>
                <div><strong>Seed:</strong> {paramsA.seed}</div>
                <div><strong>Mod:</strong> {paramsA.mod}</div>
                <div className="pt-2 border-t border-border/30 mt-2">
                  <div><strong>Channels:</strong> 16 (4‑bit: 0‑15)</div>
                  <div><strong>Indexes (n²):</strong> {paramsA.k * paramsA.k}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sequence B */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-purple-500" />
              Sequence B
            </CardTitle>
            <CardDescription>
              {seqB.length > 0 ? `${seqB.length} hops generated` : "Upload Kolam JSON"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/5 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Drop JSON or click to upload</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "B")}
              />
            </label>
            {paramsB && (
              <div className="mt-4 p-3 bg-muted/10 rounded text-xs space-y-1">
                <div><strong>Symmetry:</strong> {paramsB.symmetry}</div>
                <div><strong>Randomness:</strong> {paramsB.randomness}</div>
                <div><strong>K (Matrix Size):</strong> {paramsB.k} × {paramsB.k}</div>
                <div><strong>Seed:</strong> {paramsB.seed}</div>
                <div><strong>Mod:</strong> {paramsB.mod}</div>
                <div className="pt-2 border-t border-border/30 mt-2">
                  <div><strong>Channels:</strong> 16 (4‑bit: 0‑15)</div>
                  <div><strong>Indexes (n²):</strong> {paramsB.k * paramsB.k}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metrics dashboard */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Hamming Distance</div>
              <div className="text-3xl font-bold mt-2">{metrics.hamming.toFixed(1)}%</div>
              <div className="w-full bg-muted/20 rounded-full h-2 mt-3">
                <div className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full" style={{ width: `${metrics.hamming}%` }} />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Collision Rate</div>
              <div className="text-3xl font-bold mt-2">{metrics.collision.toFixed(1)}%</div>
              <div className="w-full bg-muted/20 rounded-full h-2 mt-3">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full" style={{ width: `${metrics.collision}%` }} />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Jaccard Similarity</div>
              <div className="text-3xl font-bold mt-2">{metrics.jaccard.toFixed(1)}%</div>
              <div className="w-full bg-muted/20 rounded-full h-2 mt-3">
                <div className="bg-gradient-to-r from-yellow-500 to-orange-5 h-2 rounded-full" style={{ width: `${metrics.jaccard}%` }} />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Sequence Lengths</div>
              <div className="text-xl font-bold mt-2">A: {metrics.lengthA} • B: {metrics.lengthB}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Playback controls */}
      <Card className="glass-card mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Button onClick={() => setIsPlaying(!isPlaying)} disabled={seqA.length === 0 || seqB.length === 0} size="lg">
              {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {isPlaying ? "Pause" : "Play"}
            </Button>
            <Button onClick={() => { setCurrentIndex(0); setIsPlaying(false); }} variant="outline" size="lg">
              <RotateCcw className="h-4 w-4 mr-2" />Reset
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Speed:</span>
              <Button variant={speed === 0.5 ? "default" : "outline"} size="sm" onClick={() => setSpeed(0.5)}>0.5x</Button>
              <Button variant={speed === 1 ? "default" : "outline"} size="sm" onClick={() => setSpeed(1)}>1x</Button>
              <Button variant={speed === 2 ? "default" : "outline"} size="sm" onClick={() => setSpeed(2)}>2x</Button>
              <Button variant={speed === 4 ? "default" : "outline"} size="sm" onClick={() => setSpeed(4)}>4x</Button>
            </div>
            <div className="ml-auto text-sm text-muted-foreground">
              Hop {currentIndex + 1} / {Math.max(seqA.length, seqB.length)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real‑time visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sequence A spectrum */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-blue-500">Sequence A – Channel Hopping</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-64 border border-border rounded-lg p-4 bg-gradient-to-b from-blue-500/5 to-transparent">
              <div className="absolute inset-0 flex items-end justify-around px-4 pb-4">
                {Array.from({ length: 16 }, (_, i) => {
                  const isActive = currentChannelA === i;
                  return (
                    <motion.div
                      key={i}
                      className={`w-3 rounded-t ${isActive ? "bg-blue-500" : "bg-muted/30"}`}
                      animate={{ height: isActive ? "80%" : "20%", boxShadow: isActive ? "0 0 20px rgba(59,130,246,0.8)" : "none" }}
                      transition={{ duration: 0.3 }}
                    >
                      {isActive && (
                        <motion.div
                          className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-blue-500"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {currentChannelA}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-muted-foreground">Channels 0‑15</div>
            </div>
          </CardContent>
        </Card>
        {/* Sequence B spectrum */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-purple-500">Sequence B – Channel Hopping</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-64 border border-border rounded-lg p-4 bg-gradient-to-b from-purple-500/5 to-transparent">
              <div className="absolute inset-0 flex items-end justify-around px-4 pb-4">
                {Array.from({ length: 16 }, (_, i) => {
                  const isActive = currentChannelB === i;
                  return (
                    <motion.div
                      key={i}
                      className={`w-3 rounded-t ${isActive ? "bg-purple-500" : "bg-muted/30"}`}
                      animate={{ height: isActive ? "80%" : "20%", boxShadow: isActive ? "0 0 20px rgba(168,85,247,0.8)" : "none" }}
                      transition={{ duration: 0.3 }}
                    >
                      {isActive && (
                        <motion.div
                          className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-purple-500"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {currentChannelB}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-muted-foreground">Channels 0‑15</div>
            </div>
            {isCollision && (
              <motion.div
                className="mt-2 p-2 bg-red-500/20 border border-red-500 rounded text-center text-sm font-bold text-red-500"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                ⚠️ COLLISION DETECTED!
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Channel distribution bar chart */}
      <Card className="glass-card mb-6">
        <CardHeader>
          <CardTitle>Channel Usage Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={channelDistributionA.map((a, i) => ({ ...a, ...channelDistributionB[i] }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="channel" stroke="rgba(255,255,255,0.5)" fontSize={10} />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }} />
              <Legend />
              <Bar dataKey="countA" fill="#3b82f6" name="Sequence A" />
              <Bar dataKey="countB" fill="#a855f7" name="Sequence B" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Hopping timeline line chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Hopping Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="index" stroke="rgba(255,255,255,0.5)" label={{ value: "Hop Index", position: "insideBottom", offset: -5 }} />
              <YAxis stroke="rgba(255,255,255,0.5)" label={{ value: "Channel", angle: -90, position: "insideLeft" }} />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }} />
              <Legend />
              <Line type="monotone" dataKey="channelA" stroke="#3b82f6" strokeWidth={2} name="Sequence A" dot={{ r: 2 }} />
              <Line type="monotone" dataKey="channelB" stroke="#a855f7" strokeWidth={2} name="Sequence B" dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default HopCompare;
