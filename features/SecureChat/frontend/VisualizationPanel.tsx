import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage } from "@/types/chat";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Hash, Grid3x3, ArrowRight, Activity, X, Loader2, Info } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ZAxis } from "recharts";
import { API_BASE_URL } from "@/utils/apiConfig";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface VisualizationPanelProps {
    message: ChatMessage;
    receivedMessage?: ChatMessage | null;
}

export const VisualizationPanel = ({ message, receivedMessage }: VisualizationPanelProps) => {
    const sentPayload = message.encrypted_payload;
    const recvPayload = receivedMessage?.encrypted_payload;

    // We default to showing the 'message' (usually sent or selected) for the main graph
    // But now we want to show BOTH if available.

    // Use message payload for the main graph for now, or combine?
    // User wants "Sender and Receiver" chunks shown.

    const [selectedChunkIndex, setSelectedChunkIndex] = useState<number | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [activeKolamUrl, setActiveKolamUrl] = useState<string | null>(null);

    // Determines active payload for detail view
    const activePayload = sentPayload || recvPayload;

    // Auto-generate URL for the active chunk's Kolam
    useEffect(() => {
        if (selectedChunkIndex !== null && activePayload && activePayload.chunk_details[selectedChunkIndex]) {
            const chunk = activePayload.chunk_details[selectedChunkIndex];
            const params = chunk.kolam_params;
            const baseUrl = API_BASE_URL || "";
            const url = `${baseUrl}/kolam-preview?` + new URLSearchParams({
                symmetry: params.symmetry || "radial",
                randomness: (params.randomness || 0).toString(),
                k: (params.k || 12).toString(),
                seed: (params.seed || 0).toString(),
                mod: (params.mod || 2).toString(),
                bits_per_cell: (params.bits_per_cell || 4).toString(),
                layout: params.layout || "Square grid (no rotate)",
                curve_color: "#800000",
                dot_color: "#000000"
            }).toString();
            setActiveKolamUrl(url);
        } else {
            setActiveKolamUrl(null);
        }
    }, [selectedChunkIndex, activePayload]);

    if (!activePayload || !activePayload.chunk_details) return null;

    // Prepare Data for Graph (Use Sent data if available, else Recv)
    const graphData = (sentPayload || recvPayload).chunk_details.flatMap((chunk: any, chunkIndex: number) => {
        if (chunk.character_map) {
            return chunk.character_map.map((mapItem: any, charIndex: number) => ({
                x: chunkIndex * 32 + charIndex,
                y: mapItem.channel,
                char: mapItem.char,
                status: mapItem.status,
                matrix_index: mapItem.matrix_index,
                chunk_index: chunkIndex,
                original_channel: mapItem.original_channel
            }));
        }
        return [];
    });

    const handleShowKolam = (params: any) => {
        // Construct standard generator URL
        // If API_BASE_URL is relative (empty), we use window.location.origin
        const baseUrl = API_BASE_URL || "";
        const url = `${baseUrl}/kolam-preview?` + new URLSearchParams({
            symmetry: params.symmetry || "radial",
            randomness: (params.randomness || 0).toString(),
            k: (params.k || 12).toString(),
            seed: (params.seed || 0).toString(),
            mod: (params.mod || 2).toString(),
            bits_per_cell: (params.bits_per_cell || 4).toString(),
            layout: params.layout || "Square grid (no rotate)",
            curve_color: "#800000",
            dot_color: "#000000"
        }).toString();

        setPreviewUrl(url);
    };

    return (
        <div className="flex flex-col h-full bg-background border-l border-border w-full flex-1 shadow-2xl relative">
            {/* Header */}
            <div className="p-4 border-b border-border bg-muted/20">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Kolam-FHSS Visualizer
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                    Real-time visualization of hybrid key channel hopping.
                </p>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">

                    {/* 0. Voice Stream Comparison (Visible only for Audio Chunks) */}
                    {(sentPayload?.chunk_details[0]?.waveform || recvPayload?.chunk_details[0]?.waveform) && (
                        <Card className="bg-gradient-to-r from-slate-900 to-slate-800 border-none text-white overflow-hidden relative">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                            <div className="p-4 relative z-10">
                                <h4 className="text-xs font-bold uppercase tracking-widest mb-4 opacity-70 flex items-center justify-between">
                                    <span>Secure Voice Transmission</span>
                                    <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px] animate-pulse">LIVE</span>
                                </h4>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Sender Section */}
                                    <div className="space-y-2 p-2 bg-black/20 rounded border border-white/5">
                                        <div className="text-[10px] font-mono text-blue-400 font-bold mb-1">SENT (AUDIO INPUT)</div>
                                        <div className="h-24 bg-black/50 rounded-lg flex items-end justify-center gap-0.5 px-2 overflow-hidden border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                            {sentPayload?.chunk_details[0]?.waveform ? (
                                                sentPayload.chunk_details[0].waveform.map((val: number, i: number) => (
                                                    <motion.div
                                                        key={`s-${i}`}
                                                        className="w-1 bg-blue-500 rounded-t-full opacity-80"
                                                        initial={{ height: 4 }}
                                                        animate={{ height: Math.abs(val) * 80 + 4 }}
                                                        transition={{ type: "tween", ease: "linear", duration: 0.1 }}
                                                    />
                                                ))) : <div className="text-xs text-muted-foreground self-center">No Data</div>}
                                        </div>
                                        <div className="flex justify-between text-[9px] text-white/50 font-mono">
                                            <span>CH: {sentPayload?.chunk_details[0]?.character_map?.[0]?.channel ?? "--"}</span>
                                            <span>IDX: {sentPayload?.chunk_details[0]?.character_map?.[0]?.matrix_index ?? "--"}</span>
                                        </div>
                                    </div>

                                    {/* Receiver Section */}
                                    <div className="space-y-2 p-2 bg-black/20 rounded border border-white/5">
                                        <div className="text-[10px] font-mono text-green-400 font-bold mb-1">RECEIVED (DECODED)</div>
                                        <div className="h-24 bg-black/50 rounded-lg flex items-end justify-center gap-0.5 px-2 overflow-hidden border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                                            {recvPayload?.chunk_details[0]?.waveform ? (
                                                recvPayload.chunk_details[0].waveform.map((val: number, i: number) => (
                                                    <motion.div
                                                        key={`r-${i}`}
                                                        className="w-1 bg-green-500 rounded-t-full opacity-80"
                                                        initial={{ height: 4 }}
                                                        animate={{ height: Math.abs(val) * 80 + 4 }}
                                                        transition={{ type: "tween", ease: "linear", duration: 0.1 }}
                                                    />
                                                ))) : <div className="text-xs text-muted-foreground self-center">Waiting...</div>}
                                        </div>
                                        <div className="flex justify-between text-[9px] text-white/50 font-mono">
                                            <span>CH: {recvPayload?.chunk_details[0]?.character_map?.[0]?.channel ?? "--"}</span>
                                            <span>IDX: {recvPayload?.chunk_details[0]?.character_map?.[0]?.matrix_index ?? "--"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* 1. Frequency Hopping Graph */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold">Channel Hopping Spectrum</CardTitle>
                            <CardDescription className="text-xs">Channels selected via Kolam Matrix hybrid keys</CardDescription>
                        </CardHeader>
                        <CardContent className="h-48 p-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis type="number" dataKey="x" name="Sequence" tick={false} />
                                    <YAxis type="number" dataKey="y" name="Channel" domain={[0, 64]} fontSize={10} />
                                    <ZAxis type="category" dataKey="char" name="Char" />
                                    <RechartsTooltip
                                        cursor={{ strokeDasharray: '3 3' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-background border border-border p-2 rounded shadow-lg text-xs">
                                                        <div className="font-bold">Char: "{data.char}"</div>
                                                        <div>Channel: {data.y}</div>
                                                        <div>Mat Idx: {data.matrix_index}</div>
                                                        <div className={data.status === 'COLLISION' ? "text-red-500 font-bold" : "text-green-500"}>
                                                            {data.status}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Scatter data={graphData} shape="circle">
                                        {graphData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.status === 'COLLISION' ? '#ef4444' : '#22c55e'} />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* 2. Character Flow Explorer */}

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold">Transmission Log</h4>
                            <span className="text-xs text-muted-foreground">{activePayload.chunk_details.length} Chunks Processed</span>
                        </div>


                        <div className="space-y-2">
                            {activePayload.chunk_details.map((chunk: any, index: number) => (
                                <Card key={index} className={`cursor-pointer transition-all hover:border-primary/50 ${selectedChunkIndex === index ? 'border-primary bg-primary/5' : ''}`}
                                    onClick={() => setSelectedChunkIndex(index === selectedChunkIndex ? null : index)}
                                >
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center font-mono font-bold text-lg">
                                                {chunk.chunk === " " ? "␣" : chunk.chunk}
                                            </div>
                                            <div className="text-xs">
                                                <div className="font-mono opacity-70">Hash: {chunk.hash.substring(0, 8)}...</div>
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                    <Hash className="h-3 w-3" /> Seed: {chunk.seed}
                                                </div>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs">
                                            {selectedChunkIndex === index ? "Hide" : "Show Kolam"}
                                        </Button>
                                    </CardContent>

                                    {/* Expanded Kolam Process View */}
                                    <AnimatePresence>
                                        {selectedChunkIndex === index && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden border-t border-border/50"
                                            >
                                                <div className="p-4 bg-muted/10 space-y-4">

                                                    {/* The Pipeline Visualization */}
                                                    <div className="flex items-center justify-between text-xs text-center relative">
                                                        {/* Step A: Sender */}
                                                        <div className="space-y-1 z-10 cursor-pointer group relative" onClick={(e) => { e.stopPropagation(); handleShowKolam(chunk.kolam_params); }}>
                                                            <div className="font-bold text-primary group-hover:underline">Sender</div>
                                                            <div className="bg-background p-2 rounded border border-border shadow-sm group-hover:ring-2 ring-primary transition-all">
                                                                <Grid3x3 className="h-6 w-6 mx-auto text-primary mb-1" />
                                                                <div className="text-[10px] font-bold">Kolam Gen</div>
                                                                <div className="text-[8px] text-muted-foreground opacity-50 bg-muted/50 rounded px-1 mt-1">Click to View</div>
                                                            </div>
                                                        </div>

                                                        {/* Arrow */}
                                                        <div className="flex-1 h-px bg-border absolute top-1/2 left-0 right-0 -z-0"></div>
                                                        <ArrowRight className="h-4 w-4 text-muted-foreground z-10 bg-background" />

                                                        {/* Step B: Selection */}
                                                        <div className="space-y-1 z-10">
                                                            <div className="font-bold">Select</div>
                                                            <div className="bg-background p-2 rounded border border-border shadow-sm">
                                                                <div className="text-lg font-bold">{chunk.character_map?.[0]?.matrix_index ?? "?"}</div>
                                                                <div className="text-[9px] text-muted-foreground">Index (Rnd)</div>
                                                            </div>
                                                        </div>

                                                        {/* Arrow */}
                                                        <ArrowRight className="h-4 w-4 text-muted-foreground z-10 bg-background" />

                                                        {/* Step C: Channel */}
                                                        <div className="space-y-1 z-10">
                                                            <div className="font-bold">Channel</div>
                                                            <div className={`bg-background p-2 rounded border border-border shadow-sm ${chunk.character_map?.[0]?.status === 'COLLISION' ? 'border-red-500 bg-red-50' : ''}`}>
                                                                <div className="text-lg font-bold">{chunk.character_map?.[0]?.channel ?? "?"}</div>
                                                                <div className="text-[9px] text-muted-foreground">Freq Hop</div>
                                                            </div>
                                                        </div>

                                                        {/* Arrow */}
                                                        <ArrowRight className="h-4 w-4 text-muted-foreground z-10 bg-background" />

                                                        {/* Step X: The Kolam Image (Transmission) */}
                                                        <HoverCard>
                                                            <HoverCardTrigger asChild>
                                                                <div className="space-y-1 z-10 cursor-pointer group" onClick={(e) => { e.stopPropagation(); if (activeKolamUrl) setPreviewUrl(activeKolamUrl); }}>
                                                                    <div className="font-bold text-indigo-500 flex items-center justify-center gap-1">
                                                                        Signal <Info className="h-3 w-3 opacity-50" />
                                                                    </div>
                                                                    <div className="bg-background p-1 rounded border border-border shadow-sm hover:ring-2 ring-indigo-500 transition-all flex flex-col items-center">
                                                                        {activeKolamUrl ? (
                                                                            <img src={activeKolamUrl} alt="Kolam" className="w-10 h-10 object-contain rounded bg-muted/20" />
                                                                        ) : (
                                                                            <div className="w-10 h-10 flex items-center justify-center bg-muted/20 rounded"><Loader2 className="h-4 w-4 animate-spin" /></div>
                                                                        )}
                                                                        <div className="text-[8px] mt-1 font-mono">Kolam Image</div>
                                                                    </div>
                                                                </div>
                                                            </HoverCardTrigger>
                                                            <HoverCardContent className="w-80 p-4 z-50 bg-popover">
                                                                <div className="space-y-2">
                                                                    <h4 className="text-sm font-semibold">Real-World Implementation</h4>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        In a physical RF system, this <strong>Kolam Image</strong> acts as the <strong>Spectrogram (Time-Frequency Map)</strong> of the signal.
                                                                    </p>
                                                                    <ul className="text-xs list-disc list-inside space-y-1 text-muted-foreground">
                                                                        <li><strong>Y-Axis:</strong> Frequency Carrier (Channel)</li>
                                                                        <li><strong>X-Axis:</strong> Time Slot (Hop Duration)</li>
                                                                        <li><strong>Dots:</strong> Active Frequency Channels used for transmission</li>
                                                                    </ul>
                                                                    <p className="text-xs text-muted-foreground mt-2 border-t pt-2 border-border">
                                                                        The transmitter "draws" this pattern in the airwaves. An interceptor hears random noise, but the receiver (with the key) knows exactly which "dots" to listen to.
                                                                    </p>
                                                                </div>
                                                            </HoverCardContent>
                                                        </HoverCard>

                                                        {/* Arrow */}
                                                        <ArrowRight className="h-4 w-4 text-muted-foreground z-10 bg-background" />

                                                        {/* Step D: Receiver */}
                                                        <div className="space-y-1 z-10 cursor-pointer group relative" onClick={(e) => { e.stopPropagation(); handleShowKolam(chunk.kolam_params); }}>
                                                            <div className="font-bold text-green-600 group-hover:underline">Receiver</div>
                                                            <div className="bg-background p-2 rounded border border-border shadow-sm group-hover:ring-2 ring-green-500 transition-all">
                                                                <Grid3x3 className="h-6 w-6 mx-auto text-green-600 mb-1" />
                                                                <div className="text-[10px] font-bold">Decode</div>
                                                                <div className="text-[8px] text-muted-foreground opacity-50 bg-muted/50 rounded px-1 mt-1">Click to View</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Detailed Matrix View */}
                                                    <div className="bg-card p-3 rounded border border-border/50">
                                                        <h5 className="text-xs font-bold mb-2 flex items-center gap-2">
                                                            <Grid3x3 className="h-3 w-3" /> Unique Kolam Pattern (Seed: {chunk.seed})
                                                        </h5>
                                                        <div className="grid gap-1 p-2 bg-background/50 rounded border border-border/50 mx-auto w-fit"
                                                            style={{ gridTemplateColumns: `repeat(${chunk.kolam_params.k}, 1fr)` }}>
                                                            {chunk.matrix.flat().map((cell: number, i: number) => {
                                                                const isSelected = chunk.character_map?.[0]?.matrix_index === i;
                                                                return (
                                                                    <div key={i} className={`w-6 h-6 flex items-center justify-center text-[10px] rounded transition-all ${isSelected ? 'bg-primary text-primary-foreground font-bold scale-110 ring-2 ring-offset-1 ring-primary' : 'bg-muted/20 text-muted-foreground'}`}>
                                                                        {cell}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <p className="text-[10px] text-center text-muted-foreground mt-2">
                                                            Matrix Index <strong>{chunk.character_map?.[0]?.matrix_index}</strong> selected via Uploaded Hybrid Key logic.
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            ))}
                        </div>
                    </div>

                </div>
            </ScrollArea>

            {/* Kolam Preview Modal */}
            <AnimatePresence>
                {previewUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
                        onClick={() => setPreviewUrl(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-background rounded-lg p-2 max-w-lg w-full relative shadow-2xl border border-border"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute right-2 top-2 z-10 rounded-full bg-background/50 hover:bg-background"
                                onClick={() => setPreviewUrl(null)}
                            >
                                <X className="h-4 w-4" />
                            </Button>

                            <div className="p-4 text-center">
                                <h3 className="font-bold text-lg mb-1">Generated Kolam Pattern</h3>
                                <p className="text-xs text-muted-foreground mb-4">Unique key generated from Chunk Seed</p>

                                <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center relative min-h-[300px]">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground opacity-20" />
                                    </div>
                                    <img
                                        src={previewUrl}
                                        alt="Kolam Preview"
                                        className="w-full h-full object-contain relative z-10"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            // Maybe show error text
                                        }}
                                    />
                                </div>
                                <div className="mt-4 flex justify-between text-xs text-muted-foreground font-mono bg-muted/20 p-2 rounded">
                                    <span>Seed: {new URLSearchParams(previewUrl.split('?')[1]).get("seed")}</span>
                                    <span>Sym: {new URLSearchParams(previewUrl.split('?')[1]).get("symmetry")}</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
