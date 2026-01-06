
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    BarChart, Bar, Cell, LabelList, ComposedChart, Scatter
} from "recharts";
import { Loader2, Upload, Activity, Shield, Radio, Award, TrendingDown } from "lucide-react";
import axios from "axios";
import { motion } from "framer-motion";

import { keyToHops } from "@/utils/fhssUtils";

const HoppingComparison = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [simulationResults, setSimulationResults] = useState<any>(null);
    const [hoppingSequences, setHoppingSequences] = useState<{
        pure: number[];
        random: number[];
        hybrid: number[];
        hybrid_raw?: number[];
    } | null>(null);
    const [channelCount, setChannelCount] = useState<number>(64);
    const [simulationNonce, setSimulationNonce] = useState<number>(0);

    const [selectedTypes, setSelectedTypes] = useState({
        pure: true,
        random: true,
        hybrid: true,
        hybrid_raw: true, // New toggle for Raw vs Adaptive
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setSimulationResults(null);
            setHoppingSequences(null);
            setSimulationNonce(0);
            toast.success("File selected. Ready to simulate.");
        }
    };

    const runSimulation = async () => {
        if (!file) {
            toast.error("Please upload a Kolam JSON file first.");
            return;
        }

        setIsLoading(true);
        try {
            const text = await file.text();
            const json = JSON.parse(text);

            // Extract params
            const params = json.kolam_params ? JSON.parse(json.kolam_params) : json;

            // Calculate channels based on grid size (k * k)
            const k = params.k || 12;
            const calculatedChannels = k * k;
            setChannelCount(calculatedChannels);

            // Generate a random nonce for this simulation run to ensure variability
            // This satisfies the requirement: "after every simulation it should randomly generate random seed"
            const currentNonce = Math.floor(Math.random() * 0xFFFFFF);
            setSimulationNonce(currentNonce);

            // Determine dynamic parameters
            // If key is present: random 't' (session) changes the Kolam & Keys
            // If key is absent: random 'seed' changes the Kolam. Random key is already system-random.
            const dynamicT = params.key ? currentNonce : (params.t || 0);
            const dynamicSeed = params.key ? (params.seed || 0) : currentNonce;

            toast.info(`Simulating with Nonce: ${currentNonce} (t=${dynamicT}, seed=${dynamicSeed})`);

            // 1. Generate Keys
            const genPayload = {
                symmetry: params.symmetry || "radial",
                randomness: parseFloat(params.randomness) || 0.0,
                k: parseInt(k),
                seed: parseInt(dynamicSeed),
                mod: parseInt(params.mod) || 2,
                bits_per_cell: parseInt(params.bits_per_cell) || 1,
                min_hops: parseInt(params.min_hops) || 100,
                layout: params.layout || "Square grid (no rotate)",
                curve_color: params.curve_color || "#800000",
                dot_color: params.dot_color || "#000000",
                key: params.key || null,
                ctr: parseInt(params.ctr) || 0,
                t: parseInt(dynamicT)
            };
            console.log("Generating keys with payload:", JSON.stringify(genPayload, null, 2));
            const genResponse = await axios.post("/generate-kolam-key", genPayload, {
                headers: { 'Content-Type': 'application/json' }
            });

            const { pure_key, csprng_key, hybrid_key, shape, bits_per_cell } = genResponse.data;

            // 2. Compute Hopping Sequences locally for Graph
            const pureHops = keyToHops(pure_key, calculatedChannels, bits_per_cell);
            const csprngHops = keyToHops(csprng_key, calculatedChannels, bits_per_cell);
            const hybridHops = keyToHops(hybrid_key, calculatedChannels, bits_per_cell);

            setHoppingSequences({
                pure: pureHops,
                random: csprngHops,
                hybrid: hybridHops
            });

            // 3. Run Simulation for Analytics
            const simPayload = {
                pure_key,
                csprng_key,
                hybrid_key,
                shape,
                channels: calculatedChannels,
                snr_db_list: [0, 5, 10, 15, 20],
                num_bits_per_trial: 1000,
                num_trials: 5,
                jammer_fraction: 0.2,
                bits_per_cell,
                num_users: 20
            };
            console.log("Sending simulation request:", simPayload);
            const simResponse = await axios.post("/simulate", simPayload);

            const results = simResponse.data;
            setSimulationResults(results);

            // Use BACKEND sequences (which include Adaptive Hopping logic)
            if (results.sequences) {
                setHoppingSequences({
                    pure: results.sequences.pure,
                    random: results.sequences.random,
                    hybrid: results.sequences.hybrid,
                    hybrid_raw: results.sequences.hybrid_raw
                });
            } else {
                setHoppingSequences({ pure: pureHops, random: csprngHops, hybrid: hybridHops });
            }

            toast.success(`Simulation #${currentNonce} complete! Using ${calculatedChannels} channels.`);

        } catch (error: any) {
            console.error("Simulation failed:", error);
            console.error("Error response:", error.response?.data);
            console.error("Error status:", error.response?.status);
            toast.error(`Simulation failed: ${error.response?.data?.detail || error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Custom Tooltip for detailed collision info
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            // Extract data
            const pure = payload.find((p: any) => p.dataKey === "pure");
            const csprng = payload.find((p: any) => p.dataKey === "csprng");
            const hybrid = payload.find((p: any) => p.dataKey === "hybrid");
            const avoided = payload.find((p: any) => p.dataKey === "avoided");

            return (
                <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-lg shadow-xl text-xs text-white">
                    <p className="font-bold mb-2 text-slate-400">Hop Step: {label}</p>

                    {pure && (
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span>Pure Kolam: <span className="font-mono">{pure.value}</span></span>
                        </div>
                    )}
                    {csprng && (
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span>CSPRNG: <span className="font-mono">{csprng.value}</span></span>
                        </div>
                    )}
                    {hybrid && (
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                            <span>Hybrid (Adaptive): <span className="font-mono text-purple-400 font-bold">{hybrid.value}</span></span>
                        </div>
                    )}

                    {/* Collision Avoidance Alert */}
                    {avoided && (avoided.value !== undefined) && (
                        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded">
                            <div className="flex items-center gap-1 text-red-400 font-bold mb-1">
                                <Shield className="h-3 w-3" />
                                <span>Collision Avoided!</span>
                            </div>
                            <div className="text-slate-300">
                                Intended Channel: <span className="text-red-400 font-mono line-through">{avoided.value}</span>
                            </div>
                            <div className="text-slate-300">
                                Jumped To: <span className="text-green-400 font-mono font-bold">{hybrid ? hybrid.value : '?'}</span>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 italic">
                                Original channel was recently used (Self-Collision).
                            </div>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    // Prepare data for chart
    const getChartData = () => {
        if (!hoppingSequences) return [];
        const limit = 50;
        const data = [];
        for (let i = 0; i < limit; i++) {
            const point: any = { step: i };
            if (hoppingSequences.pure?.[i] !== undefined) point.pure = hoppingSequences.pure[i];
            if (hoppingSequences.random?.[i] !== undefined) point.csprng = hoppingSequences.random[i];
            if (hoppingSequences.hybrid?.[i] !== undefined) point.hybrid = hoppingSequences.hybrid[i];

            // Adaptive avoidance check
            if (hoppingSequences.hybrid_raw?.[i] !== undefined && hoppingSequences.hybrid?.[i] !== undefined) {
                if (hoppingSequences.hybrid_raw[i] !== hoppingSequences.hybrid[i]) {
                    point.avoided = hoppingSequences.hybrid_raw[i]; // The OLD (colliding) channel
                }
            }
            data.push(point);
        }
        return data;
    };

    const chartData = getChartData();

    // Prepare Analytics Data
    const berChartData = useMemo(() => {
        if (!simulationResults) return [];
        return simulationResults.snr_db.map((snr: number, index: number) => ({
            snr,
            pure: simulationResults.ber.pure[index],
            random: simulationResults.ber.random[index],
            hybrid: simulationResults.ber.hybrid[index]
        }));
    }, [simulationResults]);

    const sirChartData = useMemo(() => {
        if (!simulationResults) return [];
        return simulationResults.snr_db.map((snr: number, index: number) => ({
            snr,
            pure: simulationResults.sir.pure[index],
            random: simulationResults.sir.random[index],
            hybrid: simulationResults.sir.hybrid[index]
        }));
    }, [simulationResults]);

    return (
        <div className="container mx-auto p-6 space-y-8 animate-fade-in">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                    Frequency Hopping Comparison
                </h1>
                <p className="text-muted-foreground text-lg">
                    Compare Pure Kolam, CSPRNG, and Hybrid key generation strategies.
                </p>
                {simulationNonce > 0 && (
                    <div className="text-xs text-slate-500 font-mono">
                        Simulation Run ID: {simulationNonce}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Control Panel */}
                <Card className="md:col-span-1 glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-primary" />
                            Configuration
                        </CardTitle>
                        <CardDescription>Upload a Kolam JSON to start</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="file-upload">Kolam JSON File</Label>
                            <Input
                                id="file-upload"
                                type="file"
                                accept=".json"
                                onChange={handleFileChange}
                                className="cursor-pointer"
                            />
                        </div>

                        <Button
                            onClick={runSimulation}
                            disabled={!file || isLoading}
                            className="w-full"
                            size="lg"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Simulating...
                                </>
                            ) : (
                                <>
                                    <Activity className="mr-2 h-4 w-4" />
                                    Run Simulation
                                </>
                            )}
                        </Button>

                        {hoppingSequences && (
                            <div className="space-y-4 pt-4 border-t">
                                <Label>Graph Visibility</Label>
                                <div className="space-y-2">
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
                                            checked={selectedTypes.random}
                                            onCheckedChange={(c) => setSelectedTypes(prev => ({ ...prev, random: !!c }))}
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
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="show-hybrid-raw"
                                            checked={selectedTypes.hybrid_raw}
                                            onCheckedChange={(c) => setSelectedTypes(prev => ({ ...prev, hybrid_raw: !!c }))}
                                        />
                                        <Label htmlFor="show-hybrid-raw" className="text-red-500 font-medium text-sm">Collisions (Raw)</Label>
                                    </div>
                                </div>
                                <div className="pt-2 text-sm text-muted-foreground">
                                    Total Channels: <span className="font-mono font-bold">{channelCount}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Graph Area */}
                <Card className="md:col-span-2 glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Channel Selection Graph
                        </CardTitle>
                        <CardDescription>
                            Visualizing first 50 hops. <span className="text-red-400 font-bold">Red X</span> indicates where a collision was detected and avoided.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        {hoppingSequences ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart key={simulationNonce} data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis dataKey="step" label={{ value: 'Hop Step', position: 'insideBottomRight', offset: -10 }} />
                                    <YAxis
                                        label={{ value: `Channel (0-${channelCount - 1})`, angle: -90, position: 'insideLeft' }}
                                        domain={[0, 'dataMax']}
                                        allowDataOverflow={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    {selectedTypes.pure && (
                                        <Line type="step" dataKey="pure" stroke="#3b82f6" strokeWidth={2} dot={false} name="Pure Kolam" />
                                    )}
                                    {selectedTypes.random && (
                                        <Line type="step" dataKey="csprng" stroke="#22c55e" strokeWidth={2} dot={false} name="CSPRNG" />
                                    )}
                                    {selectedTypes.hybrid && (
                                        <Line type="step" dataKey="hybrid" stroke="#a855f7" strokeWidth={2} dot={false} name="Hybrid" />
                                    )}
                                    {selectedTypes.hybrid_raw && (
                                        <Scatter name="Collision Avoided" dataKey="avoided" fill="#ef4444" shape="cross" legendType="cross" />
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                Run simulation to view graph
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            {/* Detailed Analytics Section */}
            {simulationResults && (
                <div className="space-y-8 animate-fade-in">
                    <div className="flex items-center gap-3 mb-6">
                        <Award className="h-8 w-8 text-primary" />
                        <h2 className="text-3xl font-bold gradient-text">Detailed Analytics</h2>
                    </div>

                    {/* Security Scorecard - REMOVED per user request */}

                    {/* Only keep BER and SIR Charts */}
                    <div className="grid lg:grid-cols-2 gap-8">
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingDown className="h-5 w-5 text-primary" />
                                    Bit Error Rate vs SNR
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
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
                                        <Line type="monotone" dataKey="pure" stroke="hsl(174, 72%, 56%)" strokeWidth={2} dot={{ fill: "hsl(174, 72%, 56%)" }} name="Pure Kolam" />
                                        <Line type="monotone" dataKey="random" stroke="hsl(258, 90%, 66%)" strokeWidth={2} dot={{ fill: "hsl(258, 90%, 66%)" }} name="CSPRNG" />
                                        <Line type="monotone" dataKey="hybrid" stroke="hsl(340, 82%, 52%)" strokeWidth={2} dot={{ fill: "hsl(340, 82%, 52%)" }} name="Hybrid" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Award className="h-5 w-5 text-accent" />
                                    SIR vs SNR
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
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
                                        <Line type="monotone" dataKey="pure" stroke="hsl(174, 72%, 56%)" strokeWidth={2} dot={{ fill: "hsl(174, 72%, 56%)" }} name="Pure Kolam" />
                                        <Line type="monotone" dataKey="random" stroke="hsl(258, 90%, 66%)" strokeWidth={2} dot={{ fill: "hsl(258, 90%, 66%)" }} name="CSPRNG" />
                                        <Line type="monotone" dataKey="hybrid" stroke="hsl(340, 82%, 52%)" strokeWidth={2} dot={{ fill: "hsl(340, 82%, 52%)" }} name="Hybrid" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HoppingComparison;
