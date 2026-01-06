import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import client from "@/api/client";
import { saveKolam } from "@/api/kolamHistory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2, Zap, BarChart4, Lock } from "lucide-react";
import { toast } from "sonner";
import useKolamStore, { GenResponse } from "@/store/useKolamStore";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/utils/apiConfig";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";



const KolamGenerator = () => {
  // Use symmetry names compatible with backend `SYMMETRY_MAP`.
  const symmetryOptions = [
    "radial",
    "diagonal",
    "square",
    "180 degree",
    "90 degree",
    "vertical",
    "horizontal",
    "diagonal up",
    "diagonal down",
    "random",
  ];
  const layoutOptions = ["Square grid (no rotate)", "Diamond grid (rotate 45°)"];
  const [layout, setLayout] = useState<string>(layoutOptions[0]);
  const [symmetry, setSymmetry] = useState(symmetryOptions[0]);
  const [randomness, setRandomness] = useState(2);
  const [gridSize, setGridSize] = useState(10);
  // use 0 for a non-deterministic (random) seed by default
  const [seed, setSeed] = useState(0);
  const [mod, setMod] = useState(256);
  const [bitsPerCell, setBitsPerCell] = useState(4);
  const [minHops, setMinHops] = useState(10);
  const [curveColor, setCurveColor] = useState<string>("#800000");
  const [dotColor, setDotColor] = useState<string>("#000000");
  const [gridColor, setGridColor] = useState<string>("#cccccc");
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [useMultiColor, setUseMultiColor] = useState<boolean>(false);
  const [palette, setPalette] = useState<string[]>(["#ff0000", "#00ff00", "#0000ff"]);
  const [newColor, setNewColor] = useState<string>("#ff00ff");
  const [bgColor, setBgColor] = useState<string>("#ffffff");

  const [kolamImage, setKolamImage] = useState<string | null>(null);
  const [keys, setLocalKeys] = useState<GenResponse | null>(null);
  const [matrix, setMatrix] = useState<number[][] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnimationLoading, setIsAnimationLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const setGlobalKeys = useKolamStore((state) => state.setKeys);
  const setVersion = useKolamStore((state) => state.setVersion);
  const clearResults = useKolamStore((state) => state.clearResults);
  const storedKeys = useKolamStore((state) => state.keys);

  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  // Clear previous results on mount to ensure fresh state
  useEffect(() => {
    clearResults();
  }, []);

  // Save kolam to database
  const saveToDatabase = async (generatedKeys: GenResponse, filename: string | null) => {
    if (!user) {
      console.log("User not logged in, skipping database save");
      return;
    }

    try {
      const kolamParams = {
        symmetry,
        randomness,
        k: gridSize,
        seed,
        mod,
        bits_per_cell: bitsPerCell,
        min_hops: minHops,
        pure_key: generatedKeys.pure_key || [],
        csprng_key: generatedKeys.csprng_key || [],
        hybrid_key: generatedKeys.hybrid_key || [],
      };

      // Use backend API to save to SQLite database
      // Pass the filename (e.g. "kolam_gen_123.png") as the image path
      console.log("Saving Kolam...", { API_BASE_URL, kolamParams, filename });
      await saveKolam(kolamParams, filename || undefined);
      toast.success("Kolam saved to history!");
    } catch (err: any) {
      console.error("Error saving kolam:", err);
      console.error("Error details:", err.response?.data);
      const serverError = err.response?.data?.detail;
      toast.error(`Failed to save: ${serverError || err.message || 'Unknown error'}`);
    }
  };



  // Generate lightweight preview only (no heavy analysis / key generation)
  // Clicking Preview New should pick a new random seed each time
  const handlePreviewNew = async () => {
    setIsGenerating(true);
    try {
      const useSeed = Math.floor(Math.random() * 1000000000);
      setSeed(useSeed);
      await generatePreview(useSeed);
      toast.success("Kolam preview generated");
    } catch (err) {
      toast.error("Failed to generate kolam preview");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to create standardized Kolam credential object
  const createCredentialObject = (useSeed: number, includeMatrix: boolean = true) => {
    const credential: any = {
      // Core generation parameters (required for chat)
      symmetry,
      randomness,
      k: gridSize,
      seed: useSeed,
      mod,
      // Additional parameters
      bits_per_cell: bitsPerCell,
      min_hops: minHops,
      layout,
      curve_color: curveColor,
      dot_color: dotColor,
      grid_color: showGrid ? gridColor : null,
      multi_color_palette: useMultiColor ? palette : null,
      bg_color: bgColor,
      // Metadata
      generated_at: new Date().toISOString(),
      version: "1.0"
    };

    // Include matrix data if available and requested
    if (includeMatrix && (matrix || analysis?.matrix_raw)) {
      credential.matrix = matrix || analysis?.matrix_raw;
    }

    // Include analysis data if available
    if (analysis) {
      if (analysis.allRows) credential.allRows = analysis.allRows;
      if (analysis.allCols) credential.allCols = analysis.allCols;
      if (analysis.segments) credential.segments = analysis.segments;
    }

    return credential;
  };

  // Helper to download credential file
  const downloadCredential = (credential: any, filename: string) => {
    const blob = new Blob([JSON.stringify(credential, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };



  // Analyze (heavy): request full analysis + keys from backend
  const [analysis, setAnalysis] = useState<null | {
    allRows?: number[][];
    allCols?: number[][];
    segments?: any;
    matrix_raw?: number[][][];
    kolam_image_base64?: string | null;
  }>(null);

  const [serverFilename, setServerFilename] = useState<string | null>(null);

  const handleGenerateAndAnalyze = async () => {
    setIsGenerating(true);
    // Close animation window if open
    setShowAnimation(false);
    setIsAnimationLoading(false);

    try {
      // Generate new seed
      const useSeed = Math.floor(Math.random() * 1000000000);
      setSeed(useSeed);

      const payload = {
        symmetry,
        randomness,
        k: gridSize,
        seed: useSeed,
        mod,
        bits_per_cell: bitsPerCell,
        min_hops: minHops,
        layout,
        curve_color: curveColor,
        dot_color: dotColor,
        grid_color: showGrid ? gridColor : null,
        multi_color_palette: useMultiColor ? JSON.stringify(palette) : null
      };

      const { data } = await client.post("/generate-kolam-key", payload);

      setAnalysis({
        allRows: data.allRows ?? null,
        allCols: data.allCols ?? null,
        segments: data.segments ?? null,
        matrix_raw: data.matrix_raw ?? null,
        kolam_image_base64: data.kolam_image_png_base64 ?? data.kolam_image_base64 ?? null,
      });

      if (data.filename) {
        setServerFilename(data.filename);
      }

      const generatedKeys: GenResponse = {
        pure_key: data.pure_key,
        csprng_key: data.csprng_key,
        hybrid_key: data.hybrid_key,
        shape: data.shape,
        bits_per_cell: data.bits_per_cell,
        used_mod: data.used_mod ?? mod,
        grid_size: data.shape ? data.shape[0] : gridSize,
      };
      setLocalKeys(generatedKeys);
      setMatrix(data.matrix_raw ?? null);
      setGlobalKeys(generatedKeys);
      setVersion(Date.now());
      clearResults();

      // Update preview image
      await generatePreview(useSeed);

      // Save to database (Links generated kolam to user history in backend DB)
      await saveToDatabase(generatedKeys, data.filename || null);

      toast.success("Generated & Analyzed new Kolam!");
    } catch (e) {
      toast.error("Generation failed");
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePreview = async (useSeed?: number) => {
    try {
      const ts = Date.now();
      const s = useSeed ?? seed;
      const previewUrl = `${API_BASE_URL}/kolam-preview?symmetry=${encodeURIComponent(symmetry)}&randomness=${encodeURIComponent(
        randomness,
      )}&k=${encodeURIComponent(gridSize)}&seed=${encodeURIComponent(s)}&layout=${encodeURIComponent(layout)}&curve_color=${encodeURIComponent(curveColor)}&dot_color=${encodeURIComponent(dotColor)}&grid_color=${encodeURIComponent(showGrid ? gridColor : "")}&multi_color_palette=${encodeURIComponent(useMultiColor ? JSON.stringify(palette) : "")}&mod=${encodeURIComponent(mod)}&bits_per_cell=${encodeURIComponent(bitsPerCell)}&min_hops=${encodeURIComponent(minHops)}&_ts=${ts}`;
      // Use the preview URL as image src (browser will fetch it). Use a cache buster to force refresh.
      setKolamImage(previewUrl);
      setAnimationUrl(`${API_BASE_URL}/kolam-animation?symmetry=${encodeURIComponent(symmetry)}&randomness=${encodeURIComponent(
        randomness,
      )}&k=${encodeURIComponent(gridSize)}&seed=${encodeURIComponent(s)}&layout=${encodeURIComponent(layout)}&curve_color=${encodeURIComponent(curveColor)}&dot_color=${encodeURIComponent(dotColor)}&multi_color_palette=${encodeURIComponent(useMultiColor ? JSON.stringify(palette) : "")}&_ts=${ts}`);
      toast.success("Preview generated");
    } catch (e) {
      toast.error("Failed to generate preview");
      console.error(e);
    }
  };

  const generateMatrixOnly = async () => {
    try {
      setIsGenerating(true);
      const res = await client.get(`/generate-matrix?symmetry=${encodeURIComponent(symmetry)}&randomness=${encodeURIComponent(randomness)}&k=${encodeURIComponent(gridSize)}&seed=${encodeURIComponent(seed)}&layout=${encodeURIComponent(layout)}&curve_color=${encodeURIComponent(curveColor)}&dot_color=${encodeURIComponent(dotColor)}`);
      setMatrix(res.data.matrix_raw ?? null);
      setLocalKeys(null);
      toast.success("Matrix generated");
    } catch (e) {
      toast.error("Failed to generate matrix");
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Matrix visibility
  const [showMatrix, setShowMatrix] = useState(false);
  // Animation URL and visibility
  const [animationUrl, setAnimationUrl] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [isDownloadingGif, setIsDownloadingGif] = useState(false);

  const downloadPreview = async () => {
    if (!kolamImage) return;
    try {
      const res = await fetch(kolamImage);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // CRITICAL: Use server-provided filename if available to ensure mapping link works
      a.download = serverFilename || `kolam_k${gridSize}_s${seed}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Failed to download preview.");
      console.error(e);
    }
  };

  const downloadGif = async () => {
    if (!animationUrl) {
      toast.error("No animation available");
      return;
    }
    setIsDownloadingGif(true);
    try {
      const res = await fetch(animationUrl);
      if (!res.ok) throw new Error("Animation fetch failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kolam_k${gridSize}_s${seed}.gif`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Failed to download animation.");
      console.error(e);
    } finally {
      setIsDownloadingGif(false);
    }
  };

  const renderKeyPreview = (keyData: number[], label: string, color: string, description: string) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="glass-card p-4 rounded-lg cursor-help transition-colors hover:bg-muted/10">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color }}>
              {label}
              <span className="text-muted-foreground text-xs opacity-50">(Hover for info)</span>
            </h4>
            <div className="bg-muted/30 rounded p-3 max-h-48 overflow-y-auto">
              <pre className="text-xs font-mono text-muted-foreground leading-relaxed">
                {keyData.slice(0, 100).join(", ")}
                {keyData.length > 100 && "..."}
              </pre>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Length: {keyData.length}</p>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <p className="text-sm">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const formatMatrix = (m: any) => {
    if (!Array.isArray(m)) return JSON.stringify(m, null, 2);
    // Check if it's 3D (k x k x 4)
    if (m.length > 0 && Array.isArray(m[0]) && Array.isArray(m[0][0])) {
      return "[\n" + m.map(row => "  [" + row.map(cell => JSON.stringify(cell)).join(", ") + "]").join(",\n") + "\n]";
    }
    return JSON.stringify(m, null, 2);
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold mb-2 gradient-text">Kolam Generator</h1>
        <p className="text-muted-foreground mb-8">Configure parameters to generate Kolam patterns and extract frequency-hopping keys</p>



        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Parameters */}
          <div className="glass-card p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="symmetry">Symmetry Pattern</Label>
                <Select value={symmetry} onValueChange={setSymmetry}>
                  <SelectTrigger id="symmetry" className="glass-card border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {symmetryOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Randomness (m): {randomness}</Label>
                  <Slider
                    defaultValue={[randomness]}
                    max={10}
                    step={1}
                    onValueChange={(vals) => setRandomness(vals[0])}
                    className="py-2"
                  />
                </div>
                <div>
                  <Label htmlFor="gridSize">Grid Size (k)</Label>
                  <Input
                    id="gridSize"
                    type="number"
                    value={gridSize}
                    onChange={(e) => setGridSize(Number(e.target.value))}
                    className="glass-card border-border/50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="seed">Seed (Generated)</Label>
                <div className="relative">
                  <Input
                    id="seed"
                    type="text"
                    value={seed}
                    readOnly
                    className="glass-card border-border/50 cursor-default focus-visible:ring-0 bg-muted/20"
                  />
                  <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="curveColor">Line Color</Label>
                  <input id="curveColor" type="color" value={curveColor} onChange={(e) => setCurveColor(e.target.value)} className="w-full h-10 rounded cursor-pointer" />
                </div>
                <div>
                  <Label htmlFor="dotColor">Dot Color</Label>
                  <input id="dotColor" type="color" value={dotColor} onChange={(e) => setDotColor(e.target.value)} className="w-full h-10 rounded cursor-pointer" />
                </div>
                <div>
                  <Label htmlFor="gridColor">Grid Color</Label>
                  <div className="flex flex-col gap-1">
                    <input
                      id="gridColor"
                      type="color"
                      value={gridColor ?? "#cccccc"}
                      onChange={(e) => setGridColor(e.target.value)}
                      disabled={!showGrid}
                      className={`w-full h-10 rounded cursor-pointer ${!showGrid ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="showGrid"
                        checked={showGrid}
                        onChange={(e) => setShowGrid(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="showGrid" className="text-xs text-muted-foreground whitespace-nowrap">Show Grid</label>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="bgColor">Background</Label>
                  <input id="bgColor" type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-full h-10 rounded cursor-pointer" />
                </div>
              </div>

              {/* Multi-Color Palette Section */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <input type="checkbox" id="useMultiColor" checked={useMultiColor} onChange={(e) => setUseMultiColor(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                  <Label htmlFor="useMultiColor">Use Multi-Color Palette (Symmetric)</Label>
                </div>

                {useMultiColor && (
                  <div className="glass-card p-3 rounded space-y-2">
                    <p className="text-xs text-muted-foreground">Add colors to the palette. Loops will be assigned colors from this list.</p>
                    <div className="flex flex-wrap gap-2">
                      {palette.map((c, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 group relative">
                          <div className="w-8 h-8 rounded-full border border-border shadow-sm" style={{ backgroundColor: c }}></div>
                          <button
                            onClick={() => {
                              const newP = [...palette];
                              newP.splice(i, 1);
                              setPalette(newP);
                            }}
                            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                          >×</button>
                        </div>
                      ))}
                      <div className="flex items-center gap-1">
                        <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none p-0 overflow-hidden" />
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => {
                          setPalette([...palette, newColor]);
                        }}>+</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="layout">Layout</Label>
                <Select value={layout} onValueChange={(v) => setLayout(v)}>
                  <SelectTrigger id="layout" className="glass-card border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {layoutOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>



              <div className="flex flex-wrap items-center gap-3 pt-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleGenerateAndAnalyze}
                        disabled={isGenerating}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground flex-none w-full sm:w-auto"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Zap className="mr-2 h-4 w-4" />
                            Generate & Analyze
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Generate a new Kolam pattern and analyze its properties.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => navigate('/restore-kolam')}
                        variant="ghost"
                        className="glass-card flex-none"
                        disabled={isGenerating}
                      >
                        Generate From Image / JSON
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Upload a JSON file to reconstruct a Kolam pattern.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {userRole !== 'learner' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={() => navigate("/frequency-hopping")}
                          disabled={!storedKeys || isGenerating} // Only enable if keys exist in store
                          className="glass-card border border-border/50 flex-none w-full sm:w-auto"
                        >
                          <BarChart4 className="mr-2 h-4 w-4" />
                          Show Analytics
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View detailed frequency hopping analytics for the generated keys.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div className="space-y-6">
            {/* Kolam Image */}
            {kolamImage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="glass-card p-6 rounded-xl"
              >
                <h3 className="text-lg font-semibold mb-4">Generated Kolam Pattern</h3>
                <div className="p-4 rounded-lg flex justify-center items-center min-h-[300px]" style={{ backgroundColor: bgColor }}>
                  <img src={kolamImage} alt="Generated Kolam" className="max-w-full h-auto rounded shadow-lg" />
                </div>
                <div className="pt-4 flex flex-wrap gap-2">
                  <Button onClick={downloadPreview} className="glass-card flex-none">Download PNG</Button>
                  <Button variant="outline" onClick={() => window.open(kolamImage, "_blank")} className="glass-card flex-none">
                    Open in new tab
                  </Button>
                  <Button
                    onClick={() => {
                      if (!showAnimation) {
                        setIsAnimationLoading(true);
                        setShowMatrix(false); // Close matrix
                      }
                      setShowAnimation((s) => !s);
                    }}
                    variant="ghost"
                    className="glass-card flex-none"
                    disabled={isAnimationLoading && !showAnimation}
                  >
                    {isAnimationLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {showAnimation ? 'Hide Animation' : 'Show Build Animation'}
                  </Button>
                  <Button onClick={downloadGif} className="glass-card flex-none" disabled={isDownloadingGif}>{isDownloadingGif ? 'Downloading...' : 'Download GIF'}</Button>

                  {userRole !== 'learner' && (
                    <>
                      <Button
                        onClick={() => {
                          const credential = createCredentialObject(seed);
                          downloadCredential(credential, `kolam_credential_${gridSize}x${gridSize}_${Date.now()}.json`);
                          toast.success("Credential file downloaded! Use this for secure chat.");
                        }}
                        variant="outline"
                        className="glass-card flex-none"
                      >
                        Download Credential
                      </Button>
                      <Button
                        onClick={() => {
                          if (!showMatrix) {
                            if (!matrix) generateMatrixOnly();
                            setShowAnimation(false); // Close animation
                          }
                          setShowMatrix((s) => !s);
                        }}
                        variant="outline"
                        className="glass-card flex-none"
                      >
                        {showMatrix ? 'Hide Matrix' : 'Show Matrix'}
                      </Button>
                    </>
                  )}
                </div>
                {showAnimation && animationUrl && (
                  <div className="pt-4 relative min-h-[300px] flex items-center justify-center" style={{ backgroundColor: bgColor }}>
                    {isAnimationLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                    <img
                      src={animationUrl}
                      alt="Kolam build animation"
                      className="w-full max-w-lg mx-auto h-auto rounded shadow-lg"
                      onLoad={() => setIsAnimationLoading(false)}
                    />
                  </div>
                )}
                {showMatrix && matrix && (
                  <div className="pt-4 bg-muted/10 rounded p-3 overflow-auto">
                    <pre className="text-xs font-mono whitespace-pre">{formatMatrix(matrix)}</pre>
                  </div>
                )}
              </motion.div>
            )}

            {/* Key Visualizers */}
            {userRole !== 'learner' && keys && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold">Extracted Keys</h3>
                {renderKeyPreview(
                  keys.pure_key,
                  "Pure Kolam Key",
                  "hsl(174, 72%, 56%)",
                  "Derived directly from the cumulative sum of the Kolam matrix cells (modulo 256). Represents the raw geometric entropy."
                )}
                {renderKeyPreview(
                  keys.csprng_key,
                  "CSPRNG Key",
                  "hsl(258, 90%, 66%)",
                  "Generated using a Cryptographically Secure Pseudo-Random Number Generator (HMAC-DRBG) seeded with the Kolam's properties."
                )}
                {renderKeyPreview(
                  keys.hybrid_key,
                  "Hybrid Key",
                  "hsl(340, 82%, 52%)",
                  "The final key used for encryption. It is the XOR combination of the Pure Kolam Key and the CSPRNG Key, combining geometric structure with cryptographic randomness."
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default KolamGenerator;
