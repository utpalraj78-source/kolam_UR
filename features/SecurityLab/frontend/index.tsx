
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck,
    ShieldAlert,
    Zap,
    Activity,
    Terminal,
    Wifi,
    AlertTriangle,
    Play,
    Square,
    Radio
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import axios from 'axios';
import { useToast } from "@/components/ui/use-toast";

const API_BASE = "http://127.0.0.1:8081/security-lab";

const SecurityLab = () => {
    const { toast } = useToast();
    const [status, setStatus] = useState({
        active: false,
        under_attack: false,
        bluetooth_mode: false,
        current_frequency: 2437000000,
        attack_frequency: 2437000000,
        logs: []
    });
    const [loading, setLoading] = useState(false);

    // Poll status every second
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await axios.get(`${API_BASE}/status`);
                setStatus(res.data);
            } catch (e) {
                console.error("Failed to poll status", e);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleStartStop = async () => {
        setLoading(true);
        try {
            if (status.active) {
                await axios.post(`${API_BASE}/stop`);
                toast({ title: "Drill Stopped", description: "HackRF transmission ceased." });
            } else {
                await axios.post(`${API_BASE}/start`);
                toast({ title: "Drill Started", description: "6G FHSS Core is now active on HackRF." });
            }
        } catch (e) {
            toast({ variant: "destructive", title: "Operation Failed", description: "Check if backend is running." });
        }
        setLoading(false);
    };

    const handleBluetoothTest = async () => {
        setLoading(true);
        try {
            if (status.bluetooth_mode) {
                await axios.post(`${API_BASE}/stop`);
                toast({ title: "BT Mode Stopped" });
            } else {
                await axios.post(`${API_BASE}/start-bluetooth-test`);
                toast({
                    title: "BLUETOOTH DOMINANCE ACTIVE",
                    description: "Hybrid Seed FHSS Engaged across 2.4GHz Band."
                });
            }
        } catch (e) {
            toast({ variant: "destructive", title: "BT Action Failed" });
        }
        setLoading(false);
    };

    const handleToggleAttack = async () => {
        try {
            const res = await axios.post(`${API_BASE}/toggle-attack`);
            const mode = res.data.under_attack ? "JAMMER ACTIVE" : "JAMMER DISABLED";
            toast({
                title: mode,
                description: res.data.under_attack ? "Simulated jamming on 2.437 GHz" : "Channel is now clean."
            });
        } catch (e) {
            toast({ variant: "destructive", title: "Attack Failed", description: "Backend error." });
        }
    };

    // Prepare chart data (Expanded for Bluetooth mode)
    const channelCount = status.bluetooth_mode ? 20 : 5;
    const startFreq = status.bluetooth_mode ? 2402000000 : 2412000000;
    const step = status.bluetooth_mode ? 4000000 : 12500000;

    const channels = Array.from({ length: channelCount }).map((_, i) => {
        const f = startFreq + (i * step);
        const isTransmitting = Math.abs(status.current_frequency - f) < step;
        return {
            name: status.bluetooth_mode ? `${f / 1e6}` : `CH ${[1, 3, 6, 9, 11][i]}`,
            freq: f,
            intensity: isTransmitting ? 100 : (status.under_attack && f === status.attack_frequency ? 80 : 5),
            type: isTransmitting ? 'TRANSMITTING' : (status.under_attack && f === status.attack_frequency ? 'ATTACK' : 'IDLE')
        };
    });

    return (
        <div className="min-h-screen bg-black text-white p-8 font-mono">
            {/* Header Area */}
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col lg:flex-row justify-between items-center bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 backdrop-blur-xl gap-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${status.active ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-800 text-zinc-500'} animate-pulse`}>
                            {status.bluetooth_mode ? <Zap size={32} /> : <Radio size={32} />}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tighter uppercase">
                                6G {status.bluetooth_mode ? 'BT-Dominace v1' : 'Security Lab'}
                            </h1>
                            <p className="text-zinc-500 text-sm">HARDWARE-IN-THE-LOOP {status.bluetooth_mode ? 'RANDOM SEED FHSS' : 'ADAPTIVE HOPPING'}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-4">
                        {!status.bluetooth_mode && (
                            <button
                                onClick={handleStartStop}
                                disabled={loading}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${status.active
                                    ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                                    }`}
                            >
                                {status.active ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                                {status.active ? "STOP DRILL" : "START DRILL"}
                            </button>
                        )}

                        <button
                            onClick={handleBluetoothTest}
                            disabled={loading || (status.active && !status.bluetooth_mode)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${status.bluetooth_mode
                                ? 'bg-purple-500 hover:bg-purple-600 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                                : 'bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-purple-400'
                                }`}
                        >
                            <Zap size={18} />
                            {status.bluetooth_mode ? "STOP BT MODE" : "BT DOMINANCE"}
                        </button>

                        {!status.bluetooth_mode && (
                            <button
                                onClick={handleToggleAttack}
                                disabled={!status.active}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all border ${status.under_attack
                                    ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-amber-500/50 hover:text-amber-500'
                                    }`}
                            >
                                <AlertTriangle size={18} />
                                {status.under_attack ? "CEASE JAMMING" : "SIMULATE ATTACK"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Status Column */}
                    <div className="space-y-8">
                        <div className={`bg-zinc-900/40 p-6 rounded-2xl border transition-colors ${status.bluetooth_mode ? 'border-purple-500/30' : 'border-zinc-800'}`}>
                            <h2 className="text-xs font-bold text-zinc-500 mb-6 tracking-widest uppercase flex items-center gap-2">
                                <Activity size={14} /> System Telemetry
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <span className="block text-zinc-600 text-[10px] mb-1">MODE</span>
                                    <div className={`text-xl font-bold flex items-center gap-2 ${status.bluetooth_mode ? 'text-purple-400' : (status.under_attack ? 'text-amber-500' : 'text-emerald-500')}`}>
                                        {status.bluetooth_mode ? <Zap size={20} /> : (status.under_attack ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />)}
                                        {status.bluetooth_mode ? 'BT-DOMINANCE' : (status.under_attack ? 'UNDER ATTACK' : 'SECURE')}
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-zinc-600 text-[10px] mb-1">HOP FREQUENCY</span>
                                    <div className="text-2xl text-blue-400 font-black">{status.current_frequency / 1e6} MHz</div>
                                </div>
                                <div>
                                    <span className="block text-zinc-600 text-[10px] mb-1">SEED SOURCE</span>
                                    <div className="text-sm font-bold text-zinc-300">
                                        {status.bluetooth_mode ? 'HYBRID ENTROPY (TIME + HW)' : 'KOLAM DETERMINISTIC'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800 h-64 overflow-hidden flex flex-col">
                            <h2 className="text-xs font-bold text-zinc-500 mb-4 tracking-widest uppercase flex items-center gap-2">
                                <Terminal size={14} /> Live Logs
                            </h2>
                            <div className="flex-1 overflow-y-auto space-y-2 text-[10px]">
                                {status.logs.map((log, i) => (
                                    <div key={i} className="flex gap-2 border-l border-zinc-700 pl-2 py-1">
                                        <span className="text-zinc-600">[{new Date().toLocaleTimeString()}]</span>
                                        <span className={log.includes('ATTACK') ? 'text-amber-400 font-bold' : 'text-zinc-400'}>{log}</span>
                                    </div>
                                ))}
                                {status.logs.length === 0 && <span className="text-zinc-700 italic">No logs available. Start drill to begin.</span>}
                            </div>
                        </div>
                    </div>

                    {/* Visualizer Column */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-zinc-900/40 p-8 rounded-2xl border border-zinc-800 h-[500px] flex flex-col">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-xl font-bold">SPECTRUM ANALYSIS</h2>
                                    <p className="text-zinc-500 text-xs mt-1">REAL-TIME RF INTENSITY PER CHANNEL (dBm)</p>
                                </div>
                                <div className="flex gap-4 text-[10px]">
                                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full" /> 6G LINK</div>
                                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> INTERFERENCE</div>
                                </div>
                            </div>

                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={channels}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                        <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis domain={[0, 100]} hide />
                                        <Tooltip
                                            cursor={{ fill: '#18181b' }}
                                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '10px' }}
                                        />
                                        <Bar dataKey="intensity" radius={[4, 4, 0, 0]}>
                                            {channels.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.type === 'ATTACK' ? '#ef4444' : (entry.type === 'TRANSMITTING' ? '#3b82f6' : '#27272a')}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="mt-8 grid grid-cols-5 gap-2">
                                {status.bluetooth_mode ? (
                                    [2402, 2420, 2440, 2460, 2480].map(f => (
                                        <div key={f} className="text-center">
                                            <div className="text-[8px] text-zinc-600 mb-1">{f}MHz</div>
                                            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                {Math.abs(status.current_frequency - f * 1e6) < 10e6 && (
                                                    <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-purple-500 shadow-[0_0_10px_#a855f7]" />
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    [1, 3, 6, 9, 11].map(ch => (
                                        <div key={ch} className="text-center">
                                            <div className="text-[8px] text-zinc-600 mb-1">CH {ch}</div>
                                            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                {status.current_frequency === (2407000000 + ch * 5000000) && (
                                                    <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className={`bg-gradient-to-br p-6 rounded-2xl border flex items-center justify-between ${status.bluetooth_mode ? 'from-purple-500/10 border-purple-500/20' : 'from-blue-500/10 border-blue-500/20'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${status.bluetooth_mode ? 'bg-purple-500/20 text-purple-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold">{status.bluetooth_mode ? 'HYBRID FHSS ACTIVE' : 'ADAPTIVE ENGINE STATUS'}</h3>
                                    <p className="text-zinc-500 text-xs">
                                        {status.bluetooth_mode
                                            ? 'Randomized seed generation using Hardware + Time entropy.'
                                            : `AI-driven frequency selection is currently ${status.under_attack ? 'ACTIVE' : 'STANDBY'}`}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-2xl font-black ${status.bluetooth_mode ? 'text-purple-400' : 'text-blue-400'}`}>
                                    {status.bluetooth_mode ? '0.04ms' : '0.15ms'}
                                </div>
                                <div className="text-[8px] text-zinc-500 tracking-tighter uppercase">Hopping Latency</div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SecurityLab;
