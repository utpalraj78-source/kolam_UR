import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Zap, Download, ExternalLink, Play, Grid3X3, FileJson, Image as ImageIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const KolamFromJson = () => {
  // Axios instance – proxy will forward to backend
  const api = axios.create({ baseURL: "" });

  const { state } = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initial payload from navigation or local storage
  const [payload, setPayload] = useState<any>(state?.response ?? null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [restoredParams, setRestoredParams] = useState<any>(null);

  // UI States for result view
  const [kolamImage, setKolamImage] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [isAnimationLoading, setIsAnimationLoading] = useState(false);
  const [isDownloadingGif, setIsDownloadingGif] = useState(false);
  const [animationUrl, setAnimationUrl] = useState<string | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const [newColor, setNewColor] = useState<string>("#ff00ff");

  // ML Comparison State
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [isComparing, setIsComparing] = useState(false);

  // State to store the exact config used for the current result
  const [currentConfig, setCurrentConfig] = useState<any>(null);

  const [libraryItems, setLibraryItems] = useState<any[]>([]);


  useEffect(() => {
    // Auto-fetch library items
    axios.get('/list-generated-kolams')
      .then(res => {
        if (Array.isArray(res.data)) {
          setLibraryItems(res.data);
        } else {
          console.error("Library response is not an array:", res.data);
          setLibraryItems([]);
        }
      })
      .catch(() => setLibraryItems([]));
  }, []);

  // Load saved response from localStorage on mount
  // Load saved response from localStorage on mount - DISABLED for clean state
  /* 
  useEffect(() => {
    if (!payload) {
      const s = localStorage.getItem('kolam_from_json_response');
      if (s) {
        try {
          setPayload(JSON.parse(s));
        } catch { }
      }
    }
  }, []);
  */

  // When payload changes, extract the PNG base64
  useEffect(() => {
    if (payload) {
      const png_b64 = payload.kolam_image_png_base64 ?? payload.kolam_image_base64 ?? null;
      if (png_b64) setKolamImage(`data:image/png;base64,${png_b64}`);
    }
  }, [payload]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      // Reset previous results
      setPayload(null);
      setKolamImage(null);
      setComparisonResult(null);
      setRestoredParams(null);
      setCurrentConfig(null);

      // Analyze image immediately if it's an image file
      if (file.type.startsWith("image/")) {
        await handleImageLookup(file);
      }
    }
  };

  const [editParams, setEditParams] = useState({
    randomness: 2,
    dotColor: "#000000",
    curveColor: "#800000",
    bgColor: "#ffffff",
    useMultiColor: false,
    palette: ["#ff0000", "#00ff00", "#0000ff"],
  });

  useEffect(() => {
    if (restoredParams) {
      let restoredPalette = ["#ff0000", "#00ff00", "#0000ff"];
      let useMulti = false;
      try {
        if (restoredParams.multi_color_palette) {
          const parsed = JSON.parse(restoredParams.multi_color_palette);
          if (Array.isArray(parsed)) {
            restoredPalette = parsed;
            useMulti = true;
          }
        }
      } catch (e) { }

      setEditParams({
        randomness: restoredParams.randomness ?? 2,
        dotColor: restoredParams.dot_color ?? "#000000",
        curveColor: restoredParams.curve_color ?? "#800000",
        bgColor: restoredParams.bg_color ?? "#ffffff",
        useMultiColor: useMulti,
        palette: restoredPalette
      });
    }
  }, [restoredParams]);

  const handleImageLookup = async (file: File) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await api.post("/lookup-image-config", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setRestoredParams(data);
      toast.success("Image params retrieved from database.");
    } catch (err: any) {
      console.error(err);
      toast.error("Could not find configuration for this image.");
      setRestoredParams(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerate = async (mode: 'image' | 'json') => {
    // Check file only if NOT in "Library" flow (where we might have restoredParams but no file)
    // Actually, "image" mode usually implies "Draw from Image" tab which uses file.
    // If we loaded from Library, we are essentially in a state where we have params but maybe no file.
    // But let's assume if uploadedFile is present, we use the robust backend endpoint.
    if (mode === 'image' && !uploadedFile && !restoredParams) {
      toast.error("Please upload an image or load a pattern.");
      return;
    }

    if (mode === 'json' && !uploadedFile) {
      toast.error("Please upload a JSON file.");
      return;
    }

    setIsProcessing(true);
    try {
      let responseData;
      let usedConfig;

      if (mode === 'image') {
        // Whether file is present or not, if we have restoredParams and user might have edited them,
        // we should force using the generate-kolam-key endpoint with the explicit (potentially edited) params.
        // This ensures edits like color/randomness are applied.

        if (restoredParams) {
          const reqBody = {
            symmetry: restoredParams.symmetry ?? "radial",
            randomness: editParams.randomness, // Use edited value
            k: restoredParams.k, // Keep original grid size
            seed: restoredParams.seed ?? 0,
            mod: restoredParams.mod ?? 256,
            bits_per_cell: restoredParams.bits_per_cell ?? 4,
            min_hops: restoredParams.min_hops ?? 10,
            layout: restoredParams.layout ?? "Square grid (no rotate)",
            curve_color: editParams.curveColor, // Use edited value
            dot_color: editParams.dotColor, // Use edited value
            key: restoredParams.key,
            ctr: restoredParams.ctr ?? 0,
            t: restoredParams.t ?? 0,
            multi_color_palette: editParams.useMultiColor ? JSON.stringify(editParams.palette) : null,
          };
          usedConfig = reqBody;
          const { data } = await api.post('/generate-kolam-key', reqBody);
          responseData = data;
        } else if (uploadedFile) {
          // Fallback if no lookup happened (unlikely given logic, but just in case)
          // This path uses the mapping strictly without edits (since we have no UI for it yet if lookup failed)
          const formData = new FormData();
          formData.append("file", uploadedFile);
          const { data } = await api.post('/generate-from-image-mapping', formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          responseData = data;
          usedConfig = responseData; // or infer?
        } else {
          throw new Error("No image or parameters found.");
        }

      } else {
        // JSON Flow
        const text = await uploadedFile!.text();
        const json = JSON.parse(text);

        if (json.symmetry && json.randomness && json.k) {
          const reqBody = {
            symmetry: json.symmetry,
            randomness: json.randomness,
            k: json.k,
            seed: json.seed ?? 0,
            mod: json.mod ?? 256,
            bits_per_cell: json.bits_per_cell ?? 4,
            min_hops: json.min_hops ?? 10,
            layout: json.layout ?? "Square grid (no rotate)",
            curve_color: json.curve_color ?? "#800000",
            dot_color: json.dot_color ?? "#000000",
            key: json.key,
            ctr: json.ctr ?? 0,
            t: json.t ?? 0,
            multi_color_palette: editParams.useMultiColor ? JSON.stringify(editParams.palette) : json.multi_color_palette
          };
          usedConfig = reqBody;
          const { data } = await api.post('/generate-kolam-key', reqBody);
          responseData = data;
        } else if (json.matrix_raw || (json.allRows && json.allCols)) {
          if (!json.layout) json.layout = "Square grid (no rotate)";
          usedConfig = json;
          const { data } = await api.post('/generate-from-json', json);
          responseData = data;
        } else if (json.latent_vector && json.type === "compressed_vae") {
          usedConfig = json;
          const { data } = await api.post('/generate-from-vae', json);
          responseData = data;
        } else {
          throw new Error("Invalid JSON format");
        }
      }

      setPayload(responseData);
      const finalConfig = { ...usedConfig, bg_color: editParams.bgColor };
      setCurrentConfig(finalConfig);
      localStorage.setItem('kolam_from_json_response', JSON.stringify(responseData));

      // Set Animation URL
      const query = new URLSearchParams({
        symmetry: finalConfig.symmetry || "radial",
        randomness: String(finalConfig.randomness ?? 2),
        k: String(finalConfig.k || 4),
        seed: String(finalConfig.seed || 0),
        layout: finalConfig.layout || "Square grid (no rotate)",
        curve_color: finalConfig.curve_color || "#800000",
        dot_color: finalConfig.dot_color || "#000000",
      });
      setAnimationUrl(`/kolam-animation?${query.toString()}`);

      toast.success(mode === 'image' ? "Kolam restored from image!" : "Kolam generated from JSON!");
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message || "Failed to process file.";
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadPreview = () => {
    if (!kolamImage) return;
    const link = document.createElement("a");
    link.href = kolamImage;
    link.download = `kolam_preview_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadGif = async () => {
    let params: any = {};
    if (currentConfig) {
      // Priority 1: Use the exact config used for the current generation
      params = currentConfig;
    } else if (restoredParams) {
      // Priority 2: Use restored params if we are in restoration flow
      params = restoredParams;
    } else if (uploadedFile && !uploadedFile.type.startsWith("image/")) {
      // Priority 3: Try to parse uploaded JSON file for params
      try {
        const txt = await uploadedFile.text();
        params = JSON.parse(txt);
      } catch { }
    } else if (payload && payload.shape) {
      // Priority 4: Infer from payload shape if all else fails
      params = { k: payload.shape[0] }; // Use shape[0] as k, avoiding mismatch
    }

    const query = new URLSearchParams({
      symmetry: params.symmetry || "radial",
      randomness: String(editParams.randomness ?? params.randomness ?? 2), // Use edited
      k: String(params.k || 4),
      seed: String(params.seed || 0),
      layout: params.layout || "Square grid (no rotate)",
      curve_color: editParams.curveColor ?? params.curve_color ?? "#800000", // Use edited
      dot_color: editParams.dotColor ?? params.dot_color ?? "#000000", // edited
      multi_color_palette: editParams.useMultiColor ? JSON.stringify(editParams.palette) : (params.multi_color_palette ?? ""),
    });
    try {
      const response = await api.get(`/kolam-animation?${query.toString()}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `kolam_animation_${Date.now()}.gif`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (e) {
      console.error("Failed to download GIF:", e);
      toast.error("Failed to download GIF");
    }
  };

  const handleCompareML = async () => {
    if (!uploadedFile) return;
    setIsComparing(true);
    try {
      let params = restoredParams;
      if (!params) {
        const text = await uploadedFile.text();
        params = JSON.parse(text);
        // Strictly use k
      }

      if (!params.symmetry || !params.k) {
        toast.error("JSON must contain symmetry and k for ML comparison");
        return;
      }

      const reqBody = {
        symmetry: params.symmetry,
        randomness: params.randomness,
        k: params.k,
        seed: params.seed ?? 0,
        layout: params.layout ?? "Square grid (no rotate)",
        curve_color: params.curve_color ?? "#800000",
        dot_color: params.dot_color ?? "#000000",
      };

      const { data } = await api.post('/compare-ml-gen', reqBody);
      setComparisonResult(data);
      toast.success("ML Comparison complete");
    } catch (err) {
      console.error(err);
      toast.error("Failed to run ML comparison");
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="glass-card p-6 rounded-xl mb-8">
        <h1 className="text-2xl font-bold mb-4">Restore / Generate Kolam</h1>
        <Button onClick={() => navigate('/kolam-generator')} variant="ghost" className="mb-6">← Back to Generator</Button>

        <Tabs defaultValue="image" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="image" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Draw from Kolam Image
            </TabsTrigger>
            <TabsTrigger value="json" className="flex items-center gap-2">
              <FileJson className="w-4 h-4" /> Draw from JSON
            </TabsTrigger>
            {/* <TabsTrigger value="library" className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" /> Pattern Library
            </TabsTrigger> */}
          </TabsList>

          <TabsContent value="image">
            <div className="flex flex-col gap-4 max-w-md">
              <div className="bg-muted/20 p-4 rounded-lg border border-dashed border-border mb-2">
                <Label htmlFor="uploadImage" className="block mb-2 font-medium">Upload Kolam Image (PNG/JPG)</Label>
                <p className="text-xs text-muted-foreground mb-4">
                  Upload a Kolam image. The system will look up the original configuration (Grid Size 'k', Randomness, etc.) from the database.
                </p>
                <Input
                  id="uploadImage"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="glass-card border-border/50 cursor-pointer"
                />
              </div>

              {/* Display Restored Parameters with EDIT CONTROLS */}
              {restoredParams && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-secondary/10 rounded-lg border border-secondary/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Restored Parameters</h3>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Editable</span>
                  </div>

                  {/* Read-Only Info */}
                  <div className="grid grid-cols-2 gap-2 text-sm text-foreground/80 mb-4">
                    <div>
                      <span className="block text-xs font-bold text-muted-foreground uppercase">Grid Size (k)</span>
                      {restoredParams.k}
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-muted-foreground uppercase">Symmetry</span>
                      {restoredParams.symmetry ?? "radial"}
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-muted-foreground uppercase">Seed</span>
                      {restoredParams.seed}
                    </div>
                  </div>

                  {/* Editable Controls */}
                  <div className="space-y-4 border-t pt-4">
                    <div>
                      <Label className="uppercase text-xs font-bold text-muted-foreground mb-2 block">Randomness: {editParams.randomness}</Label>
                      <Slider
                        value={[editParams.randomness]}
                        min={0}
                        max={10}
                        step={1}
                        onValueChange={(val) => setEditParams(p => ({ ...p, randomness: val[0] }))}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="uppercase text-xs font-bold text-muted-foreground mb-1 block">Dot</Label>
                        <input type="color" className="w-full h-8 cursor-pointer rounded" value={editParams.dotColor} onChange={e => setEditParams(p => ({ ...p, dotColor: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="uppercase text-xs font-bold text-muted-foreground mb-1 block">Curve</Label>
                        <input type="color" className="w-full h-8 cursor-pointer rounded" value={editParams.curveColor} onChange={e => setEditParams(p => ({ ...p, curveColor: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="uppercase text-xs font-bold text-muted-foreground mb-1 block">BG</Label>
                        <input type="color" className="w-full h-8 cursor-pointer rounded" value={editParams.bgColor} onChange={e => setEditParams(p => ({ ...p, bgColor: e.target.value }))} />
                      </div>
                    </div>

                    {/* Multi-Color Palette Section */}
                    <div className="pt-2 border-t mt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <input type="checkbox" id="useMultiColorJson" checked={editParams.useMultiColor}
                          onChange={(e) => setEditParams(p => ({ ...p, useMultiColor: e.target.checked }))}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                        <Label htmlFor="useMultiColorJson" className="text-xs font-bold uppercase text-muted-foreground">Use Multi-Color Palette (Symmetric)</Label>
                      </div>

                      {editParams.useMultiColor && (
                        <div className="bg-background/50 p-3 rounded space-y-2 border border-border/50">
                          <p className="text-[10px] text-muted-foreground">Add colors to the palette. Loops will be assigned colors from this list.</p>
                          <div className="flex flex-wrap gap-2">
                            {editParams.palette.map((c, i) => (
                              <div key={i} className="flex flex-col items-center gap-1 group relative">
                                <div className="w-6 h-6 rounded-full border border-border shadow-sm" style={{ backgroundColor: c }}></div>
                                <button
                                  onClick={() => {
                                    const newP = [...editParams.palette];
                                    newP.splice(i, 1);
                                    setEditParams(p => ({ ...p, palette: newP }));
                                  }}
                                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-3 h-3 flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                                >×</button>
                              </div>
                            ))}
                            <div className="flex items-center gap-1">
                              <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-none p-0 overflow-hidden" />
                              <Button size="sm" variant="ghost" className="h-6 px-1 text-xs" onClick={() => {
                                setEditParams(p => ({ ...p, palette: [...p.palette, newColor] }));
                              }}>+</Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </motion.div>
              )}

              {uploadedFile && uploadedFile.type.startsWith("image/") && restoredParams && (
                <Button onClick={() => handleGenerate('image')} disabled={isProcessing} className="w-full sm:w-auto">
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Restore & Apply Edits"
                  )}
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="json">
            <div className="flex flex-col gap-4 max-w-md">
              <div className="bg-muted/20 p-4 rounded-lg border border-dashed border-border mb-2">
                <Label htmlFor="uploadJson" className="block mb-2 font-medium">Upload Configuration JSON</Label>
                <p className="text-xs text-muted-foreground mb-4">
                  Upload a standard Kolam parameter JSON file to re-generate the pattern.
                </p>
                <Input
                  id="uploadJson"
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="glass-card border-border/50 cursor-pointer"
                />
              </div>
              {uploadedFile && !uploadedFile.type.startsWith("image/") && (
                <>
                  <Button onClick={() => handleGenerate('json')} disabled={isProcessing} className="w-full sm:w-auto">
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate from JSON"
                    )}
                  </Button>

                  <div className="pt-4 border-t mt-4">
                    <Button
                      onClick={handleCompareML}
                      disabled={isComparing}
                      variant="secondary"
                      className="w-full sm:w-auto"
                    >
                      {isComparing ? "Comparing..." : "Compare with ML Model"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="library">
            <div className="p-4 bg-muted/20 rounded-lg border border-border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Saved Patterns Database</h3>
                <Button variant="outline" size="sm" onClick={() => {
                  // Refresh logic
                  api.get('/list-generated-kolams').then(res => setLibraryItems(res.data));
                }}>Refresh</Button>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Filename</th>
                      <th className="px-3 py-2">Sym</th>
                      <th className="px-3 py-2">k</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(libraryItems) && libraryItems.map((item: any, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/30">
                        <td className="px-3 py-2 truncate max-w-[150px]">{item.filename}</td>
                        <td className="px-3 py-2">{item.symmetry}</td>
                        <td className="px-3 py-2">{item.k}</td>
                        <td className="px-3 py-2">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                            // Logic to load this JSON
                            // We can fetch the JSON content directly as it is exposed?
                            // Currently we only have a listing. We need to be able to FETCH the content or use it.
                            // We can re-use the 'register-kolam' endpoint logic but in reverse? 
                            // Actually, we can just "Lookup" it?
                            // Wait, we have the JSON filename. We don't have an endpoint to GET a specific generated JSON directly via API easily unless we expose static or add endpoint.
                            // But we know /lookup-image-config loads it if we have the IMAGE filename.
                            // The library lists JSON filenames.
                            // Let's add a quick client-side fetch if possible, or just mock it by saying "Select this"
                            // Actually, for now, let's just show it.
                            // BETTER: Load it into the params!
                            setRestoredParams(item); // It has k, symmetry.
                            toast.success("Loaded params from library! Switch to 'Draw from Image' to verify or just Generate.");
                          }}>
                            <Download className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {libraryItems.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No saved patterns yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Shared Result Section */}
        {(kolamImage || payload) && (
          <div className="mt-8 border-t pt-8 animate-in fade-in zoom-in duration-500">
            <h2 className="text-xl font-semibold mb-4 text-center">Result</h2>
            {kolamImage && (
              <div className="flex flex-col items-center gap-4">
                <img src={kolamImage} alt="Kolam preview" className="max-w-full h-auto rounded-lg shadow-lg border" />
                <div className="flex gap-2 flex-wrap justify-center">
                  <Button onClick={downloadPreview} variant="secondary">
                    <Download className="w-4 h-4 mr-2" /> Download PNG
                  </Button>
                  <Button onClick={downloadGif} variant="secondary" disabled={isDownloadingGif}>
                    {isDownloadingGif ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    Download GIF
                  </Button>

                  <Button
                    onClick={() => {
                      if (!showAnimation) setIsAnimationLoading(true);
                      setShowAnimation(!showAnimation);
                    }}
                    variant="ghost"
                    className="glass-card"
                    disabled={isAnimationLoading && !showAnimation}
                  >
                    {isAnimationLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {showAnimation ? 'Hide Animation' : 'Show Build Animation'}
                  </Button>

                  <Button onClick={async () => {
                    if (!kolamImage || !currentConfig) {
                      toast.error("Cannot save: No generated config available.");
                      return;
                    }

                    try {
                      await api.post('/register-kolam', {
                        image_base64: kolamImage,
                        config: currentConfig
                      });
                      toast.success("Saved to Gallery! The parameters (k=" + currentConfig.k + ") are now stored.");
                    } catch (e) {
                      toast.error("Failed to save to gallery.");
                    }
                  }} variant="outline">
                    <Upload className="w-4 h-4 mr-2" /> Save to Gallery
                  </Button>
                </div>

                {showAnimation && animationUrl && (
                  <div className="pt-4 relative min-h-[300px] flex items-center justify-center bg-white/5 rounded-lg border border-white/10 mt-4">
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
              </div>
            )}

            {comparisonResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 max-w-2xl mx-auto"
              >
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">Model Accuracy Analysis</h3>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${comparisonResult.accuracy_score > 90 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {comparisonResult.accuracy_score ?? "N/A"}% Match
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    MSE: {comparisonResult.mse}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-center">
                      <span className="text-xs font-medium text-muted-foreground">Mathematical Ground Truth</span>
                      <img src={`data:image/png;base64,${comparisonResult.ground_truth_b64}`} className="w-full rounded border bg-white" />
                    </div>
                    <div className="space-y-2 text-center">
                      <span className="text-xs font-medium text-muted-foreground">ML Model Reconstruction</span>
                      <img src={`data:image/png;base64,${comparisonResult.ml_generated_b64}`} className="w-full rounded border bg-white" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KolamFromJson;
