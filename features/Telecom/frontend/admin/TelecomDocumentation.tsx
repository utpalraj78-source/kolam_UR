
import React from 'react';
import { motion } from 'framer-motion';
import {
    BookOpen, ShieldCheck, Zap, Globe, Cpu,
    BarChart3, CheckCircle2, Info, ArrowRight, ShieldAlert, TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TelecomDocumentation = () => {
    return (
        <div className="min-h-screen bg-black text-white p-8 pb-24">
            <header className="max-w-6xl mx-auto mb-16 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-1 text-xs font-black uppercase tracking-widest">
                        6G-Advanced Technical Manifesto
                    </Badge>
                    <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-blue-500">
                        WHY KOLAM 6G?
                    </h1>
                    <p className="text-zinc-500 max-w-2xl mx-auto text-sm font-medium tracking-tight leading-relaxed">
                        Redefining global connectivity through ancient pattern geometry and post-quantum physics.
                        A technical breakdown of our market dominance strategy.
                    </p>
                </motion.div>
            </header>

            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                {/* Value Prop 1 */}
                <Card className="bg-zinc-950 border-zinc-800 hover:border-primary/50 transition-colors group">
                    <CardHeader>
                        <Zap className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform" />
                        <CardTitle className="text-lg">Zero-Collision AFH</CardTitle>
                        <CardDescription className="text-xs text-zinc-500 font-bold uppercase">Spectral Efficiency</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-zinc-400 leading-relaxed">
                        Traditional FHSS suffers from random collisions. Kolam-AFH uses deterministic geometric patterns to ensure
                        <span className="text-white font-bold"> 100% orthogonal channel allocation</span>, even with millions of devices.
                    </CardContent>
                </Card>

                {/* Value Prop 2 */}
                <Card className="bg-zinc-950 border-zinc-800 hover:border-blue-500/50 transition-colors group">
                    <CardHeader>
                        <ShieldCheck className="w-8 h-8 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                        <CardTitle className="text-lg">Quantum Immunity</CardTitle>
                        <CardDescription className="text-xs text-zinc-500 font-bold uppercase">Future-Proof Security</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-zinc-400 leading-relaxed">
                        While 5G's AES-256 is at risk from Shor's algorithm, our
                        <span className="text-blue-400 font-bold"> Lattice-Based PQC</span>
                        wrapped in Kolam seed-morphing is verified against quantum-scale brute force.
                    </CardContent>
                </Card>

                {/* Value Prop 3 */}
                <Card className="bg-zinc-950 border-zinc-800 hover:border-green-500/50 transition-colors group">
                    <CardHeader>
                        <Cpu className="w-8 h-8 text-green-500 mb-2 group-hover:scale-110 transition-transform" />
                        <CardTitle className="text-lg">O-RAN Native</CardTitle>
                        <CardDescription className="text-xs text-zinc-500 font-bold uppercase">Industry Standards</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-zinc-400 leading-relaxed">
                        Total compliance with <span className="text-green-400 font-bold">3GPP Release 19 (6G)</span>.
                        Our software-agnostic design fits seamlessly into standard Nokia/Ericsson Distributed Units (DU).
                    </CardContent>
                </Card>
            </div>

            <section className="max-w-5xl mx-auto mb-24">
                <div className="flex items-center gap-4 mb-10">
                    <div className="h-px flex-1 bg-zinc-800" />
                    <h2 className="text-xl font-black italic tracking-tighter uppercase text-zinc-400 px-4">Technical Deep Dive</h2>
                    <div className="h-px flex-1 bg-zinc-800" />
                </div>

                <div className="space-y-12">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 mb-4">ENGINEERING STACK</Badge>
                            <h3 className="text-2xl font-bold mb-4">Neural-Enhanced LDPC</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed mb-6">
                                We replace standard parity-check matrices with **AI-Native Neural Decoding**.
                                By training on our specific Kolam-FHSS sequences, the receiver predicts and corrects
                                multipath errors with **1.2ms ultra-low latency**, perfect for industrial robotics.
                            </p>
                            <ul className="space-y-3">
                                {[
                                    "Vectorized Hamming (7,4) Pipelining",
                                    "Dynamic CQI Feedback Loops",
                                    "Carrier-Grade DPD Compensation"
                                ].map(item => (
                                    <li key={item} className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                                        <CheckCircle2 className="w-4 h-4 text-primary" /> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-8 font-mono text-xs text-primary/80 overflow-hidden shadow-2xl">
                            <pre className="animate-pulse">
                                {`// 3GPP ASN.1 SIGNALING PACKET (MOCK)
RRCConnectionRequest-v1800 ::= SEQUENCE {
    ue-ID       BIT STRING (SIZE (40)),
    establishmentCause  Emergency,
    kolam-Seed  0x8F92A...
    securityMode    PQC_LATTICE
}`}
                            </pre>
                        </div>
                    </div>
                </div>
            </section>

            {/* Business Case Section */}
            <section className="max-w-6xl mx-auto rounded-3xl bg-gradient-to-br from-zinc-900 to-black border border-white/5 p-6 md:p-12 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -z-1" />

                <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter mb-8 text-center md:text-left">THE BUSINESS CASE FOR 6-KOLAM</h2>

                <div className="grid md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg mb-1">90% Reduction in OPEX</h4>
                                <p className="text-sm text-zinc-500">
                                    Our adaptive hopping drastically reduces retransmission requests, saving massive energy on cooling and processing
                                    at the cell site.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                                <Globe className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg mb-1">Global Spectrum Dominance</h4>
                                <p className="text-sm text-zinc-500">
                                    Because our patterns are mathematically unique, multiple carriers can share the same spectrum
                                    without interference, unlocking billion-dollar spectrum efficiency.
                                </p>
                            </div>
                        </div>
                    </div>

                    <Card className="bg-black/50 border-zinc-800 flex flex-col justify-center p-6 grayscale hover:grayscale-0 transition-all cursor-crosshair">
                        <div className="text-center p-4">
                            <h3 className="text-3xl md:text-4xl font-black italic text-primary mb-2">ROI: 14.5x</h3>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Estimated 3-Year Network Value</p>
                        </div>
                    </Card>
                </div>
            </section>

            <footer className="mt-20 text-center text-[10px] text-zinc-600 font-bold tracking-[0.2em] uppercase">
                Kolam 6G Lab // Classified Intelligence // v3.5 Stable
            </footer>
        </div>
    );
};

export default TelecomDocumentation;
