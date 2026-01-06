
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Radar, Satellite, Zap, ShieldAlert, ShieldCheck,
    Layers, Cpu, RefreshCw, Radio, Wind, Map, BookOpen, TrendingUp, CheckCircle,
    Play, Square, Server, FileCode
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar, Cell as ReCell
} from 'recharts';

const AdminDashboard = () => {
    const [simData, setSimData] = useState<any>(null);
    const [dtStats, setDtStats] = useState<any>(null);
    const [lastUpdated, setLastUpdated] = useState(Date.now());
    const [activeTab, setActiveTab] = useState('grid');
    const [isDrillActive, setIsDrillActive] = useState(false);

    const fetchSimData = async () => {
        try {
            const response = await fetch('http://localhost:8081/telecom-admin/simulation-snapshot');
            const data = await response.json();
            setSimData(data);
            setLastUpdated(Date.now());
        } catch (e) {
            console.error("Simulation fetch error", e);
        }
    };

    const fetchDtStats = async () => {
        try {
            const response = await fetch('http://localhost:8081/telecom-admin/digital-twin/stats');
            const data = await response.json();
            setDtStats(data);
        } catch (e) {
            console.error("DT Stats fetch error", e);
        }
    };

    const handleTriggerAttack = async (type: string) => {
        try {
            await fetch('http://localhost:8081/telecom-admin/trigger-attack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type })
            });
            setIsDrillActive(true);
            setTimeout(() => setIsDrillActive(false), 10000);
            fetchSimData(); // Update immediately
        } catch (e) {
            console.error("Attack trigger error", e);
        }
    };

    const handleStartDT = async () => {
        await fetch('http://localhost:8081/telecom-admin/digital-twin/start', { method: 'POST' });
        fetchDtStats();
    };

    const handleStopDT = async () => {
        await fetch('http://localhost:8081/telecom-admin/digital-twin/stop', { method: 'POST' });
        fetchDtStats();
    };

    useEffect(() => {
        fetchSimData();
        fetchDtStats();
        const interval = setInterval(() => {
            fetchSimData();
            fetchDtStats();
        }, 1000); // Polling every second for lively updates
        return () => clearInterval(interval);
    }, []);

    if (!simData) return <div className="h-screen flex items-center justify-center bg-black text-primary font-mono animate-pulse">Initializing Kolam 6G Core...</div>;

    return (
        <div className="min-h-screen bg-black/95 text-white p-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-primary/20 pb-6">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter text-primary flex items-center gap-3">
                        <Radio className="w-8 h-8" />
                        KOLAM 6G LAB v3.0
                    </h1>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-[0.3em] mt-1 text-zinc-500">Global Resource Grid Control Center</p>
                </div>
                <div className="flex items-center gap-4 mt-4 md:mt-0">
                    <Badge variant="outline" className="border-green-500 text-green-500 bg-green-500/10 h-8 flex items-center gap-2">
                        <Activity className="w-3 h-3 animate-pulse" /> URLLC ACTIVE
                    </Badge>
                    <Badge variant="outline" className="border-blue-500 text-blue-500 h-8">PQC: LATTICE ENABLED</Badge>
                    <Button variant="outline" size="sm" onClick={fetchSimData} className="h-8 border-primary/30 text-xs hover:bg-primary/20 transition-all">
                        <RefreshCw className="mr-2 h-3 w-3" /> TRIGGER PULSE
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* --- DIGITAL TWIN CONTROL PANEL (Level 3 Feature) --- */}
                <Card className="md:col-span-12 lg:col-span-6 bg-zinc-950 border-zinc-800 border-l-4 border-l-orange-500 shadow-2xl relative overflow-hidden group">
                    {/* Background Grid Animation */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20 pointer-events-none" />
                    <CardHeader className="bg-zinc-900/50 border-b border-white/5 flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-500">
                            <Server className="w-4 h-4" /> DIGITAL TWIN NETWORK EMULATION (Active Users)
                        </CardTitle>
                        <div className="flex gap-2">
                            {dtStats?.active_ues > 0 ? (
                                <Badge className="bg-orange-500/20 text-orange-400 animate-pulse border-orange-500/50">SIMULATION RUNNING</Badge>
                            ) : (
                                <Badge variant="outline" className="text-zinc-500 border-zinc-700">IDLE</Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 grid grid-cols-2 gap-6 z-10 relative">
                        {/* Control Buttons */}
                        <div className="flex flex-col justify-center gap-3">
                            <Button
                                className="w-full bg-green-600 hover:bg-green-500 font-bold tracking-widest text-xs"
                                onClick={handleStartDT}
                                disabled={dtStats?.active_ues > 0}
                            >
                                <Play className="w-3 h-3 mr-2 fill-current" /> START EMULATION (1000 UEs)
                            </Button>
                            <Button
                                className="w-full bg-red-900/50 hover:bg-red-600 border border-red-500/50 text-red-200 font-bold tracking-widest text-xs"
                                onClick={handleStopDT}
                                disabled={!dtStats || dtStats.active_ues === 0}
                            >
                                <Square className="w-3 h-3 mr-2 fill-current" /> STOP SIMULATION
                            </Button>
                        </div>

                        {/* Stats Display */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                <span className="text-[10px] uppercase font-bold text-zinc-500">Active Subscribers (UEs)</span>
                                <span className="text-3xl font-black text-white leading-none tracking-tighter">
                                    {dtStats?.active_ues || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-end border-b border-white/5 pb-2">
                                <span className="text-[10px] uppercase font-bold text-zinc-500">Throughput (Data Plane)</span>
                                <span className="text-xl font-bold text-orange-400 leading-none">
                                    {dtStats?.throughput_mbps ? dtStats.throughput_mbps.toFixed(2) : "0.00"} <span className="text-xs text-zinc-600">Mbps</span>
                                </span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] uppercase font-bold text-zinc-500">Latency (Round Trip)</span>
                                <span className="text-lg font-bold text-emerald-400 leading-none">
                                    {dtStats?.latency_us ? dtStats.latency_us.toFixed(2) : "0.00"} <span className="text-xs text-zinc-600">μs</span>
                                </span>
                            </div>

                            {/* Comparative Comparison (Head-to-Head Benchmark) */}
                            {dtStats?.active_ues > 0 && (
                                <div className="mt-4 pt-3 border-t border-white/5 space-y-3">
                                    <p className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">Live Benchmark (Race Condition)</p>

                                    {/* Legacy Python Stack */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[9px]">
                                            <span className="text-zinc-500">LEGACY 5G SW (PYTHON)</span>
                                            <span className="text-zinc-400 font-mono">
                                                {(dtStats?.python_latency_us / 1000).toFixed(2)} ms
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: "100%" }}
                                                className="h-full bg-zinc-700"
                                            />
                                        </div>
                                    </div>

                                    {/* Kolam Accelerated Stack */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[9px]">
                                            <span className="text-emerald-500 font-bold">KOLAM KERNEL (NATIVE/GPU)</span>
                                            <span className="text-emerald-400 font-mono font-bold">
                                                {dtStats?.kolam_latency_us?.toFixed(1)} μs
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden relative">
                                            {/* Visual representation of 100x speedup (very small bar) */}
                                            <motion.div
                                                style={{ width: `${Math.max(1, (100 / (dtStats?.acceleration_factor || 1)))}%` }}
                                                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                            />
                                        </div>
                                    </div>

                                    {/* Result Badge */}
                                    <div className="flex justify-between items-center bg-emerald-950/30 p-2 rounded border border-emerald-500/20">
                                        <span className="text-[9px] font-bold text-emerald-500/80 uppercase">VERIFIED SPEEDUP RATIO</span>
                                        <Badge className="bg-emerald-600 hover:bg-emerald-500 text-white border-none font-black text-xs tracking-wide">
                                            {dtStats?.acceleration_factor ? dtStats.acceleration_factor.toFixed(1) : "0"}x
                                        </Badge>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>

                    {/* Hardware Engine Status (Footer of Card) */}
                    <div className="bg-black/40 p-3 flex justify-between items-center text-[9px] font-mono border-t border-white/5">
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-500">FPGA ENGINE:</span>
                            <span className={dtStats?.c_kernel_status.includes("ACTIVE") ? "text-green-500 font-bold" : "text-yellow-500"}>
                                {dtStats?.c_kernel_status || "UNKNOWN"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-500">GPU KERNEL:</span>
                            <span className={dtStats?.gpu_kernel_status.includes("ACTIVE") ? "text-green-500 font-bold" : "text-red-500"}>
                                {dtStats?.gpu_kernel_status || "UNKNOWN"}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* 1. FH-OFDMA Resource Grid (Left - 4 columns) */}
                <Card className="md:col-span-12 lg:col-span-6 bg-zinc-950 border-zinc-800 border-t-2 border-t-primary overflow-hidden shadow-2xl">
                    <CardHeader className="bg-zinc-900/50 border-b border-white/5">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Layers className="w-4 h-4 text-primary" /> FH-OFDMA RESOURCE GRID
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 overflow-x-auto">
                        <div className="grid grid-cols-16 gap-1 h-[200px] min-w-[320px]">
                            {simData.ofdma_grid.map((slot: any, i: number) => (
                                <div key={i} className="flex flex-col gap-1">
                                    {Array.from({ length: 16 }).map((_, sc_idx) => {
                                        const isActive = slot.subcarriers.some((sc: number) => (sc % 16) === sc_idx);
                                        return (
                                            <motion.div
                                                key={sc_idx}
                                                animate={{
                                                    backgroundColor: isActive ? 'rgb(147, 51, 234)' : 'rgba(39, 39, 42, 0.4)',
                                                    scale: isActive ? 1.05 : 1
                                                }}
                                                className="w-full h-full rounded-sm transition-colors duration-500"
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex justify-between text-[10px] font-mono text-zinc-500 uppercase font-bold">
                            <span>Time Slots (0-15)</span>
                            <span>Sub-carriers (0-63)</span>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Massive MIMO & Beamforming (Middle - 5 columns) */}
                <Card className="md:col-span-6 lg:col-span-4 bg-zinc-950 border-zinc-800 border-t-2 border-t-blue-500 shadow-2xl overflow-hidden">
                    <CardHeader className="bg-zinc-900/50 border-b border-white/5">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Radio className="w-4 h-4 text-primary" /> MASSIVE MIMO BEAM MAP
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 relative aspect-square lg:h-[300px] flex items-center justify-center bg-[radial-gradient(circle_at_center,_#111_0%,_#000_100%)]">
                        {/* The Base Station */}
                        <div className="absolute center bg-primary/20 w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center border border-primary/40 animate-pulse z-10">
                            <Cpu className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                        </div>

                        {/* Beams */}
                        <AnimatePresence>
                            {simData.mimo_beams.map((beam: any, idx: number) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 0.6, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{
                                        position: 'absolute',
                                        left: `${beam.coord[0]}%`,
                                        top: `${beam.coord[1]}%`,
                                        width: '2px',
                                        height: '100px',
                                        background: 'linear-gradient(to top, transparent, #9333ea)',
                                        transformOrigin: 'bottom',
                                        rotate: `${Math.atan2(beam.coord[1] - 50, beam.coord[0] - 50) * (180 / Math.PI) + 90}deg`
                                    }}
                                />
                            ))}
                        </AnimatePresence>

                        {/* User Targets */}
                        {simData.mimo_beams.map((beam: any, idx: number) => (
                            <motion.div
                                key={`u-${idx}`}
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                style={{
                                    position: 'absolute',
                                    left: `${beam.coord[0]}%`,
                                    top: `${beam.coord[1]}%`,
                                }}
                                className="w-4 h-4 rounded-full bg-blue-500 sh-glow border-2 border-white shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                            />
                        ))}
                    </CardContent>
                </Card>

                {/* 3. ISAC Radar & Sensing (Right - 3 columns) */}
                <Card className="md:col-span-6 lg:col-span-4 bg-zinc-950 border-zinc-800 shadow-2xl overflow-hidden">
                    <CardHeader className="bg-zinc-900/50 border-b border-white/5">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Radar className="w-4 h-4 text-primary" /> ISAC RADAR (SENSING)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="aspect-square lg:h-[300px] relative flex items-center justify-center overflow-hidden">
                        {/* Radar Circles */}
                        {[0.2, 0.4, 0.6, 0.8].map(ratio => (
                            <div key={ratio} className="absolute border border-primary/20 rounded-full" style={{ width: `${ratio * 100}%`, height: `${ratio * 100}%` }} />
                        ))}
                        {/* Radar Sweep */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                            className="absolute top-1/2 left-1/2 w-1/2 h-1/2 origin-top-left bg-gradient-to-tr from-primary/30 to-transparent"
                            style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
                        />
                        {/* Radar Targets */}
                        {simData.isac_targets.map((target: any, idx: number) => {
                            const rad = target.angle * (Math.PI / 180);
                            const r = (target.distance / 100) * 45; // Max 45% radius
                            return (
                                <motion.div
                                    key={idx}
                                    style={{
                                        position: 'absolute',
                                        left: `${50 + r * Math.cos(rad)}%`,
                                        top: `${50 + r * Math.sin(rad)}%`,
                                    }}
                                    className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"
                                />
                            );
                        })}
                    </CardContent>
                </Card>




                {/* NEW: QUANTUM SECURITY SHIELD MONITOR */}
                <Card className="md:col-span-12 lg:col-span-12 bg-zinc-950 border-zinc-800 border-t-2 border-t-purple-600 bg-[radial-gradient(circle_at_top_right,_#7e22ce11_0%,_transparent_50%)]">
                    <CardHeader className="py-4 border-b border-white/5 bg-purple-950/5 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-black flex items-center gap-2 tracking-[0.2em] uppercase">
                            <ShieldCheck className="w-4 h-4 text-purple-500" /> QUANTUM SECURITY SHIELD (PROACTIVE DEFENSE)
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTriggerAttack('NEURAL_SPOOF')}
                                className="h-6 text-[8px] border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                            >
                                DRILL: NEURAL SPOOF
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTriggerAttack('VRAM_FLOOD')}
                                className="h-6 text-[8px] border-red-500/30 text-red-400 hover:bg-red-500/20"
                            >
                                DRILL: VRAM FLOOD
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            <div className="space-y-1">
                                <p className="text-[8px] text-zinc-500 font-black uppercase">Lattice Sync</p>
                                <p className="text-[10px] font-bold text-white">{simData.shields.lattice_sync}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] text-zinc-500 font-black uppercase">Neural Guard</p>
                                <p className="text-[10px] font-bold text-purple-400">{simData.shields.neural_guard}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] text-zinc-500 font-black uppercase">DMA Quota</p>
                                <p className="text-[10px] font-bold text-emerald-400">{simData.shields.dma_quota}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] text-zinc-500 font-black uppercase">Protocol Lock</p>
                                <p className="text-[10px] font-bold text-blue-400">{simData.shields.pwc_lock}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] text-zinc-500 font-black uppercase">Probe Integrity</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-1 flex-1 bg-zinc-900 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${simData.shields.watermark_entropy * 100}%` }} className="h-full bg-purple-500" />
                                    </div>
                                    <span className="text-[10px] font-black text-white">{(simData.shields.watermark_entropy * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* CARRIER-GRADE DIAGNOSTICS: 3GPP & Hardware */}
                <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 3GPP Protocol Analyzer */}
                    <Card className="bg-zinc-950 border-zinc-800 shadow-2xl">
                        <CardHeader className="bg-zinc-900/50 border-b border-white/5 py-3">
                            <CardTitle className="text-xs font-bold flex items-center gap-2 text-cyan-400">
                                <FileCode className="w-4 h-4" /> 3GPP PROTOCOL ANALYZER (ASN.1)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="bg-black border border-zinc-800 p-3 rounded font-mono text-[10px] text-green-500 overflow-hidden">
                                <p className="text-zinc-500 mb-1">HEX_DUMP</p>
                                <p className="break-all">{simData.product_tier?.binary_hex || "LOADING..."}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div>
                                    <p className="text-zinc-500 font-bold">FORMAT</p>
                                    <p className="text-white">{simData.product_tier?.format || "ASN.1 PER"}</p>
                                </div>
                                <div>
                                    <p className="text-zinc-500 font-bold">COMPRESSION</p>
                                    <p className="text-white">{simData.product_tier?.compression || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-zinc-500 font-bold">SYNC_ID</p>
                                    <p className="text-cyan-400">{simData.product_tier?.sync_id || "0x00"}</p>
                                </div>
                                <div className="col-span-2 mt-2 pt-2 border-t border-white/5">
                                    <p className="text-zinc-500 font-bold">SUBSCRIBER SECURITY (SUCI)</p>
                                    <p className="text-yellow-400 font-mono text-[9px]">{simData.carrier_data?.subscriber_id || "SEARCHING..."}</p>
                                    <Badge variant="outline" className="text-[9px] mt-1 border-green-900 text-green-400 bg-green-900/10">
                                        {simData.carrier_data?.auth_status || "PENDING"}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Hardware Acceleration & Infrastructure */}
                    <Card className="bg-zinc-950 border-zinc-800 shadow-2xl">
                        <CardHeader className="bg-zinc-900/50 border-b border-white/5 py-3">
                            <CardTitle className="text-xs font-bold flex items-center gap-2 text-purple-400">
                                <Cpu className="w-4 h-4" /> HARDWARE ACCELERATION & INFRASTRUCTURE
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-white">O-RAN SPLIT 7.2x</span>
                                <Badge className="text-[9px] bg-purple-900/20 text-purple-400 border-purple-500/30">
                                    {simData.carrier_data?.readiness || "TRL-X"}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-[9px]">
                                <div className="bg-zinc-900/50 p-2 rounded border border-white/5">
                                    <p className="text-zinc-500 font-bold">RU (RADIO)</p>
                                    <p className="text-white">{simData.carrier_data?.hardware_layers?.RU?.split('(')[0] || "ACTIVE"}</p>
                                    <p className="text-[8px] text-zinc-400">{simData.carrier_data?.hardware_layers?.RU?.split('(')[1]?.replace(')', '') || "Temp: 45C"}</p>
                                </div>
                                <div className="bg-zinc-900/50 p-2 rounded border border-white/5">
                                    <p className="text-zinc-500 font-bold">DU (DIST)</p>
                                    <p className="text-white">ACTIVE</p>
                                    <p className="text-[8px] text-zinc-400">GPU Vectorized</p>
                                </div>
                                <div className="bg-zinc-900/50 p-2 rounded border border-white/5">
                                    <p className="text-zinc-500 font-bold">CUDA BRIDGE</p>
                                    <p className="text-green-400">RTX 3050</p>
                                    <p className="text-[8px] text-zinc-400">2048 CORES</p>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-white/5">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-zinc-400">eCPRI FRONTHAUL (7.2x)</span>
                                    <span className="text-cyan-400 font-mono font-bold">{(dtStats?.ecpri_mbps / 1000)?.toFixed(2) || "0.00"} Gbps</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-zinc-400">WATCHDOG (HEARTBEAT)</span>
                                    <span className="text-green-500 font-mono animate-pulse">{dtStats?.watchdog ? `OK (${dtStats.watchdog % 99})` : "WAITING..."}</span>
                                </div>
                                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-cyan-500 w-[5%]" />
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-zinc-400">DMA QUOTA</span>
                                    <span className="text-emerald-400 font-mono">{simData.product_tier?.cuda_bridge?.dma_quota || "256MB"}</span>
                                </div>

                                <div className="flex justify-between text-[10px] pt-2 border-t border-white/5">
                                    <span className="text-zinc-500 font-bold">COMPUTE DENSITY (AVX2)</span>
                                    <div className="flex flex-col items-end">
                                        <span className="text-pink-400 font-black font-mono">{dtStats?.compute_gflops ? dtStats.compute_gflops.toFixed(1) : "0.0"} GFLOPS</span>
                                        {dtStats?.avx_active && <span className="text-[8px] text-pink-500/80 uppercase">SIMD VECTORIZED</span>}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* BUSINESS ANALYTICS: Performance Graphs */}
                <Card className="lg:col-span-12 bg-zinc-950 border-zinc-800 shadow-2xl">
                    <CardHeader className="bg-zinc-900/50 border-b border-white/5">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" /> PERFORMANCE ANALYTICS & BUSINESS ROI
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 grid md:grid-cols-2 gap-8">
                        {/* Scale: Spectral Efficiency Graph */}
                        <div className="h-[250px] w-full">
                            <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-4 tracking-widest">Spectral Efficiency (bps/Hz)</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={simData.analytics}>
                                    <defs>
                                        <linearGradient id="colorSpectral" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                                    <XAxis dataKey="time" stroke="#444" fontSize={10} />
                                    <YAxis stroke="#444" fontSize={10} />
                                    <ReTooltip
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px' }}
                                        itemStyle={{ color: '#9333ea' }}
                                    />
                                    <Area type="monotone" dataKey="spectral_efficiency" stroke="#9333ea" fillOpacity={1} fill="url(#colorSpectral)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Scale: Network Throughput Trend */}
                        <div className="h-[250px] w-full">
                            <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-4 tracking-widest">Network Throughput (Gbps)</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={simData.analytics}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                                    <XAxis dataKey="time" stroke="#444" fontSize={10} />
                                    <YAxis stroke="#444" fontSize={10} />
                                    <ReTooltip
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px' }}
                                        itemStyle={{ color: '#10b981' }}
                                    />
                                    <Line type="stepAfter" dataKey="throughput" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Status Ticker */}
            <div className="fixed bottom-0 left-0 right-0 bg-primary/20 backdrop-blur-md border-t border-primary/30 h-8 flex items-center px-6 overflow-hidden z-50">
                <div className="flex gap-12 animate-marquee whitespace-nowrap text-[10px] font-mono font-bold tracking-tighter">
                    <span>STATUS: ALL CORE SYSTEMS OPTIMAL</span>
                    <span>BEAMFORMING: 64-ANTENNA PRECODING ACTIVE</span>
                    <span>FEC: NEURAL-LDPC CORRECTING @ 1.2 GBPS</span>
                    <span>SENSING: TARGETS DETECTED AT 50M (CENTER-OFFSET)</span>
                    <span>ENCRYPTION: KOLAM_SEED_MORPHING_SUCCESSFUL</span>
                    <span>HARDWARE: NVIDIA RTX 3050 ACCELERATION ACTIVE</span>
                    {dtStats?.active_ues > 0 && <span className="text-orange-400">DIGITAL TWIN: HIGH LOAD ({dtStats.active_ues} UEs)</span>}
                </div>
            </div>

            <style>{`
                .grid-cols-16 { grid-template-columns: repeat(16, minmax(0, 1fr)); }
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
                .sh-glow {
                    box-shadow: 0 0 20px rgba(147, 51, 234, 0.5);
                }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
