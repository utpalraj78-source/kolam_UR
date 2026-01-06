import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, Cell, LabelList
} from "recharts";
import { Activity, TrendingDown, Radio, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import useKolamStore from "@/store/useKolamStore";
import type { SimulationMetricSet, SimulationResults } from "@/types/analytics";
import { keyToHops } from "@/utils/fhssUtils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type ChartPoint = {
  snr: number;
  pure: number;
  random: number;
  hybrid: number;
};

const api = axios.create({
  baseURL: "",
});

const buildChartData = (snr: number[], metric?: SimulationMetricSet | null): ChartPoint[] => {
  if (!metric) return [];
  return snr.map((value, index) => ({
    snr: value,
    pure: metric.pure[index] ?? 0,
    random: metric.random[index] ?? 0,
    hybrid: metric.hybrid[index] ?? 0,
  }));
};

const getMin = (values?: number[]) => (values && values.length ? Math.min(...values) : null);
const getAverage = (values?: number[]) => (values && values.length ? values.reduce((sum, val) => sum + val, 0) / values.length : null);

// ---------------------------------------------------------------------------
// HEATMAP COMPONENT
// ---------------------------------------------------------------------------

import { HeatmapData } from "@/types/analytics";

const heatmapColor = (intensity: number) => {
  const h = 240 - (intensity * 180); // 240 -> 60
  const l = 10 + (intensity * 50);   // 10 -> 60
  const s = 80;                      // Keep saturation high
  return `hsl(${h}, ${s}%, ${l}%)`;
};

const HeatmapCard = ({ heatmapData }: { heatmapData: HeatmapData }) => {
  const [selectedKey, setSelectedKey] = useState<"pure" | "random" | "hybrid">("pure");
  const grid = heatmapData[selectedKey];
  const gridSize = heatmapData.grid_size;

  return (
    <div className="glass-card p-6 rounded-xl border border-white/10 bg-white/5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-semibold">Channel Usage Heatmap</h3>
          <p className="text-sm text-muted-foreground">
            Intensity indicates frequency of channel selection.
          </p>
        </div>
        <div className="flex bg-black/20 p-1 rounded-lg">
          {(["pure", "random", "hybrid"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setSelectedKey(k)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${selectedKey === k
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
            >
              {k === "pure" ? "Pure Kolam" : k === "random" ? "CSPRNG" : "Hybrid"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center">
        <div
          className="grid gap-1 p-4 bg-black/40 rounded-xl border border-white/5 shadow-inner"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            maxWidth: "fit-content"
          }}
        >
          {grid.flat().map((value, idx) => (
            <div
              key={idx}
              title={`Channel: ${idx}\nIntensity: ${value.toFixed(3)}`}
              style={{ backgroundColor: heatmapColor(value) }}
              className="w-5 h-5 md:w-6 md:h-6 rounded-sm transition-colors hover:ring-2 hover:ring-white/50 cursor-help"
            />
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span>Low Usage</span>
          <div className="h-3 w-32 rounded-full bg-gradient-to-r from-[hsl(240,80%,10%)] via-[hsl(150,80%,35%)] to-[hsl(60,80%,60%)]" />
          <span>High Usage</span>
        </div>
      </div>
    </div>
  );
};

const FrequencyHopping = () => {
  const keys = useKolamStore((state) => state.keys);
  const version = useKolamStore((state) => state.version);
  const storedResults = useKolamStore((state) => state.results);
  const setResults = useKolamStore((state) => state.setResults);

  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState({
    pure: true,
    csprng: true,
    hybrid: true,
  });

  const navigate = useNavigate();

  // Use stored results if available
  const results = storedResults;

  const berChartData = useMemo(() => buildChartData(results?.snr_db ?? [], results?.ber ?? null), [results]);
  const collisionChartData = useMemo(() => buildChartData(results?.snr_db ?? [], results?.collision_prob ?? null), [results]);
  const sirChartData = useMemo(() => buildChartData(results?.snr_db ?? [], results?.sir ?? null), [results]);

  const bestHybridBer = results ? getMin(results.ber.hybrid) : null;
  const minHybridCollision = results ? getMin(results.collision_prob.hybrid) : null;
  const avgHybridSir = results ? getAverage(results.sir.hybrid) : null;

  // Calculate hopping sequences for graph visualization
  const hoppingSequences = useMemo(() => {
    // If simulation results exist, use their authoritative sequences (which include Adaptive Hopping logic)
    if (results?.sequences) {
      return {
        ...results.sequences,
        channels: results.heatmap?.grid_size ? results.heatmap.grid_size ** 2 : 16 // Fallback
      };
    }

    // Fallback: Local calculation (won't show AFH logic, just raw keys)
    if (!keys) return null;
    const channels = keys.grid_size * keys.grid_size;
    return {
      pure: keyToHops(keys.pure_key, channels, keys.bits_per_cell),
      csprng: keyToHops(keys.csprng_key, channels, keys.bits_per_cell),
      hybrid: keyToHops(keys.hybrid_key, channels, keys.bits_per_cell),
      hybrid_raw: undefined,
      channels
    };
  }, [keys, results]);

  const graphChartData = useMemo(() => {
    if (!hoppingSequences) return [];
    const limit = 50;
    const data = [];
    for (let i = 0; i < limit; i++) {
      const point: any = { step: i };
      if (hoppingSequences.pure?.[i] !== undefined) point.pure = hoppingSequences.pure[i];
      if (hoppingSequences.random?.[i] !== undefined) point.csprng = hoppingSequences.random[i];
      else if (hoppingSequences.csprng?.[i] !== undefined) point.csprng = hoppingSequences.csprng[i]; // Handle naming mismatch

      if (hoppingSequences.hybrid?.[i] !== undefined) point.hybrid = hoppingSequences.hybrid[i];

      // Add 'intended' path if available and different
      if (
        hoppingSequences.hybrid_raw?.[i] !== undefined &&
        hoppingSequences.hybrid?.[i] !== undefined &&
        hoppingSequences.hybrid_raw[i] !== hoppingSequences.hybrid[i]
      ) {
        point.hybrid_raw = hoppingSequences.hybrid_raw[i];
      }

      data.push(point);
    }
    return data;
  }, [hoppingSequences]);

  const handleRunSimulation = async () => {
    if (!keys) return;

    setIsSimulating(true);
    try {
      const channels = keys.grid_size * keys.grid_size;
      const { data } = await api.post<SimulationResults>("/simulate", {
        pure_key: keys.pure_key,
        csprng_key: keys.csprng_key,
        hybrid_key: keys.hybrid_key,
        shape: keys.shape,
        bits_per_cell: keys.bits_per_cell,
        channels: channels,
        snr_db_list: [0, 5, 10, 15, 20],
        num_trials: 5,
        seed: 0,
      });
      setResults(data);
      toast.success(`Simulation completed using live Kolam keys (${channels} channels).`);
    } catch (error) {
      toast.error("Failed to run simulation. Is the backend running?");
      console.error(error);
    } finally {
      setIsSimulating(false);
    }
  };

  // Auto-run simulation if keys exist but no results
  useEffect(() => {
    if (keys && !results && !isSimulating) {
      handleRunSimulation();
    }
  }, [keys, results]);

  if (!keys) {
    return (
      <div className="container mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-4xl font-bold mb-4 gradient-text">Frequency Hopping Analytics</h1>
          <div className="glass-card p-6 rounded-xl">
            <p className="text-muted-foreground mb-4">Generate keys first from Kolam Generator to unlock the analytics dashboard.</p>
            <Button onClick={() => navigate("/kolam-generator")} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Go to Kolam Generator
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        <div className="mb-8">
          <h1 className="text-5xl font-extrabold mb-2 gradient-text tracking-tight drop-shadow-lg">AFH DEMONSTRATION</h1>
          <p className="text-muted-foreground">
            Performance metrics for Kolam-derived frequency-hopping spread spectrum keys.
            <br />
            <span className="text-xs font-mono text-primary/80">Session ID: {version}</span>
          </p>
        </div>

        <div className="glass-card p-6 rounded-xl mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Loaded Kolam FHSS keys</p>
            <p className="text-base font-semibold">Shape: {keys.shape[0]} × {keys.shape[1]}, Bits / cell: {keys.bits_per_cell}</p>
          </div>
          <Button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSimulating ? "Running Simulation..." : "Run Simulation Again"}
          </Button>
        </div>

        {/* Channel Selection Graph */}
        {hoppingSequences && (
          <Card className="glass-card mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Channel Selection Graph
              </CardTitle>
              <CardDescription>Visualizing first 50 hops (Channels 0-{hoppingSequences.channels - 1})</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={graphChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="step" label={{ value: 'Hop Step', position: 'insideBottomRight', offset: -10 }} />
                    <YAxis
                      label={{ value: `Channel (0-${hoppingSequences.channels - 1})`, angle: -90, position: 'insideLeft' }}
                      domain={[0, 'dataMax']}
                      allowDataOverflow={false}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }}
                    />
                    <Legend />
                    {selectedTypes.pure && (
                      <Line type="step" dataKey="pure" stroke="#3b82f6" strokeWidth={2} dot={false} name="Pure Kolam" />
                    )}
                    {selectedTypes.csprng && (
                      <Line type="step" dataKey="csprng" stroke="#22c55e" strokeWidth={2} dot={false} name="CSPRNG" />
                    )}
                    {selectedTypes.hybrid && (
                      <Line type="step" dataKey="hybrid" stroke="#a855f7" strokeWidth={2} dot={false} name="Hybrid" />
                    )}
                    {selectedTypes.hybrid && (
                      <Line type="step" dataKey="hybrid_raw" stroke="#a855f7" strokeWidth={2} strokeDasharray="5 5" opacity={0.6} dot={false} name="Intended path (Collision)" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center space-x-6 justify-center">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-pure"
                    checked={selectedTypes.pure}
                    onCheckedChange={(c) => setSelectedTypes(prev => ({ ...prev, pure: !!c }))}
                  />
                  <Label htmlFor="show-pure" className="text-blue-500 font-medium">Pure Kolam</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-csprng"
                    checked={selectedTypes.csprng}
                    onCheckedChange={(c) => setSelectedTypes(prev => ({ ...prev, csprng: !!c }))}
                  />
                  <Label htmlFor="show-csprng" className="text-green-500 font-medium">CSPRNG</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-hybrid"
                    checked={selectedTypes.hybrid}
                    onCheckedChange={(c) => setSelectedTypes(prev => ({ ...prev, hybrid: !!c }))}
                  />
                  <Label htmlFor="show-hybrid" className="text-purple-500 font-medium">Hybrid</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!results && (
          <div className="glass-card p-6 rounded-xl mb-8">
            <p className="text-muted-foreground">Run the simulation to generate analytics using the latest Kolam keys.</p>
          </div>
        )}

        {results && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateX: 20 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              whileHover={{ scale: 1.05, translateY: -5 }}
              className="glass-card p-6 rounded-xl transition-all shadow-lg hover:shadow-primary/20"
            >
              <div className="flex items-center gap-3 mb-3">
                <TrendingDown className="h-6 w-6 text-primary animate-pulse" />
                <h3 className="text-lg font-semibold">Best BER</h3>
              </div>
              <p className="text-3xl font-bold text-primary">{bestHybridBer?.toFixed(3) ?? "—"}</p>
              <p className="text-sm text-muted-foreground mt-1">Hybrid Kolam key minimum</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateX: 20 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              whileHover={{ scale: 1.05, translateY: -5 }}
              className="glass-card p-6 rounded-xl transition-all shadow-lg hover:shadow-secondary/20"
            >
              <div className="flex items-center gap-3 mb-3">
                <Radio className="h-6 w-6 text-secondary animate-pulse" />
                <h3 className="text-lg font-semibold">Min Collision</h3>
              </div>
              <p className="text-3xl font-bold text-secondary">{minHybridCollision?.toFixed(3) ?? "—"}</p>
              <p className="text-sm text-muted-foreground mt-1">Hybrid key collision probability</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateX: 20 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
              whileHover={{ scale: 1.05, translateY: -5 }}
              className="glass-card p-6 rounded-xl transition-all shadow-lg hover:shadow-accent/20"
            >
              <div className="flex items-center gap-3 mb-3">
                <Award className="h-6 w-6 text-accent animate-pulse" />
                <h3 className="text-lg font-semibold">Avg SIR</h3>
              </div>
              <p className="text-3xl font-bold text-accent">{avgHybridSir?.toFixed(1) ?? "—"} dB</p>
              <p className="text-sm text-muted-foreground mt-1">Hybrid key average</p>
            </motion.div>
          </div>
        )}

        {results && (
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="glass-card p-6 rounded-xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <Activity className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Bit Error Rate vs SNR</h2>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={berChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" />
                  <XAxis
                    dataKey="snr"
                    stroke="hsl(215 20% 65%)"
                    label={{ value: "SNR (dB)", position: "insideBottom", offset: -5 }}
                  />
                  <YAxis
                    stroke="hsl(215 20% 65%)"
                    label={{ value: "BER", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(222 47% 8%)",
                      border: "1px solid hsl(174 72% 56% / 0.2)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="pure"
                    stroke="hsl(174, 72%, 56%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(174, 72%, 56%)" }}
                    name="Pure Kolam"
                  />
                  <Line
                    type="monotone"
                    dataKey="random"
                    stroke="hsl(258, 90%, 66%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(258, 90%, 66%)" }}
                    name="CSPRNG"
                  />
                  <Line
                    type="monotone"
                    dataKey="hybrid"
                    stroke="hsl(340, 82%, 52%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(340, 82%, 52%)" }}
                    name="Hybrid"
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="glass-card p-6 rounded-xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <Award className="h-5 w-5 text-accent" />
                <h2 className="text-xl font-semibold">Signal-to-Interference Ratio vs SNR</h2>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sirChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" />
                  <XAxis
                    dataKey="snr"
                    stroke="hsl(215 20% 65%)"
                    label={{ value: "SNR (dB)", position: "insideBottom", offset: -5 }}
                  />
                  <YAxis
                    stroke="hsl(215 20% 65%)"
                    label={{ value: "SIR (dB)", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(222 47% 8%)",
                      border: "1px solid hsl(174 72% 56% / 0.2)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="pure"
                    stroke="hsl(174, 72%, 56%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(174, 72%, 56%)" }}
                    name="Pure Kolam"
                  />
                  <Line
                    type="monotone"
                    dataKey="random"
                    stroke="hsl(258, 90%, 66%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(258, 90%, 66%)" }}
                    name="CSPRNG"
                  />
                  <Line
                    type="monotone"
                    dataKey="hybrid"
                    stroke="hsl(340, 82%, 52%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(340, 82%, 52%)" }}
                    name="Hybrid"
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        {/* Collision Probability Comparison */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="glass-card p-6 rounded-xl mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <Radio className="h-5 w-5 text-secondary" />
              <h2 className="text-xl font-semibold">Collision Probability Comparison</h2>
            </div>

            {/* Bar Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Pure Kolam', value: results.collision_prob.pure[0], color: 'hsl(174, 72%, 56%)' },
                { name: 'CSPRNG', value: results.collision_prob.random[0], color: 'hsl(258, 90%, 66%)' },
                { name: 'Hybrid', value: results.collision_prob.hybrid[0], color: 'hsl(340, 82%, 52%)' }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" />
                <XAxis
                  dataKey="name"
                  stroke="hsl(215 20% 65%)"
                  label={{ value: "Key Type", position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  stroke="hsl(215 20% 65%)"
                  label={{ value: "Collision Probability", angle: -90, position: "insideLeft" }}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    backgroundColor: "hsl(222 47% 8%)",
                    border: "1px solid hsl(174 72% 56% / 0.2)",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => value.toFixed(4)}
                />
                <Bar
                  dataKey="value"
                  radius={[8, 8, 0, 0]}
                  isAnimationActive={false}
                >
                  {[
                    { name: 'Pure Kolam', value: results.collision_prob.pure[0], color: 'hsl(174, 72%, 56%)' },
                    { name: 'CSPRNG', value: results.collision_prob.random[0], color: 'hsl(258, 90%, 66%)' },
                    { name: 'Hybrid', value: results.collision_prob.hybrid[0], color: 'hsl(340, 82%, 52%)' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                  <LabelList dataKey="value" position="top" formatter={(value: number) => value.toFixed(3)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Summary Table */}
            <div className="mt-6 glass-card p-4 rounded-lg bg-white/5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 font-semibold">Key</th>
                    <th className="text-right py-2 font-semibold">Collision Probability</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/5">
                    <td className="py-2 text-muted-foreground">Pure Kolam</td>
                    <td className="py-2 text-right font-mono">{results.collision_prob.pure[0].toFixed(4)}</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 text-muted-foreground">CSPRNG</td>
                    <td className="py-2 text-right font-mono">{results.collision_prob.random[0].toFixed(4)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-muted-foreground">Hybrid</td>
                    <td className="py-2 text-right font-mono">{results.collision_prob.hybrid[0].toFixed(4)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Explanation */}
            <p className="mt-4 text-sm text-muted-foreground">
              Lower collision probability indicates less chance of frequency overlap between users.
              Hybrid typically achieves the lowest collision probability due to structure + randomness.
            </p>
          </motion.div>
        )}

        {/* Security Scorecard - REMOVED per user request */}

        {/* Heatmap Section */}
        {results && results.heatmap && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-8 mb-12"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold gradient-text flex items-center gap-3">
                  <Activity className="h-8 w-8 text-primary" />
                  Frequency Distribution Heatmap
                </h2>
                <p className="text-muted-foreground mt-2">
                  Visualizing channel usage frequency. Pure Kolam shows structure; CSPRNG is uniform.
                </p>
              </div>
            </div>

            <HeatmapCard heatmapData={results.heatmap} />
          </motion.div>
        )}

        {/* Comparison Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.7 }}
          className="mt-8 grid md:grid-cols-3 gap-6"
        >
          <div className="glass-card p-6 rounded-xl">
            <h3 className="font-semibold mb-3 text-primary">Pure Kolam Key</h3>
            <p className="text-sm text-muted-foreground">
              Mathematical pattern-based sequences offer predictable structure with moderate performance.
              Best for applications requiring deterministic behavior.
            </p>
          </div>

          <div className="glass-card p-6 rounded-xl">
            <h3 className="font-semibold mb-3 text-secondary">CSPRNG Key</h3>
            <p className="text-sm text-muted-foreground">
              Cryptographically secure random sequences provide high unpredictability but lack
              mathematical structure advantages.
            </p>
          </div>

          <div className="glass-card p-6 rounded-xl border-2 border-accent/30">
            <h3 className="font-semibold mb-3 text-accent">Hybrid Key ⭐</h3>
            <p className="text-sm text-muted-foreground">
              Combines Kolam structure with randomness, achieving optimal BER, lowest collision rates,
              and highest SIR across all SNR ranges.
            </p>
          </div>
        </motion.div>


      </motion.div>
    </div>
  );
};

export default FrequencyHopping;
