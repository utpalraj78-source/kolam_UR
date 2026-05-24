import { motion } from "framer-motion";
import { Check, Shield, BarChart4, Lock, Globe, Server, User, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

const TelecomDashboard = () => {
    return (
        <div className="min-h-screen py-10 px-6 container mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-10 space-y-4"
            >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm mb-4">
                    <Shield className="w-4 h-4" /> Secure Enterprise Communication
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                    Why Choose <span className="text-primary">KolamBasedCommunication</span>?
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Outperform standard encryption with geometrically-derived frequency hopping.
                    Lower latency, zero collisions, and mathematically unbreakable security.
                </p>
            </motion.div>

            {/* API Key Display */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="max-w-xl mx-auto mb-16 bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-center justify-between backdrop-blur-sm shadow-sm"
            >
                <div className="flex items-center gap-4">
                    <div className="bg-primary/20 p-2.5 rounded-lg">
                        <Key className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Your API License Key</p>
                        <p className="font-mono text-lg font-bold text-foreground tracking-tight">Kolam_Binary Beasts_52</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigator.clipboard.writeText("Kolam_Binary Beasts_52")}>
                    Copy Key
                </Button>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
                <Card className="glass-card hover:border-primary/50 transition-all">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-primary" /> Unbreakable Security</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Unlike static keys, our FHSS sequences derived from Kolam patterns offer <span className="text-foreground font-bold">10^12+ variations</span>. Pattern complexity coupled with chaos theory ensures no two sessions are alike.</p>
                    </CardContent>
                </Card>
                <Card className="glass-card hover:border-primary/50 transition-all">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BarChart4 className="w-5 h-5 text-primary" /> Zero Collision Guarantee</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Our Adaptive Frequency Hopping (AFH) algorithm ensures <span className="text-foreground font-bold">0% packet collision</span> even in crowded spectrums, maintaining crystal clear voice quality.</p>
                    </CardContent>
                </Card>
                <Card className="glass-card hover:border-primary/50 transition-all">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> Cost Efficiency</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Save up to <span className="text-foreground font-bold">40%</span> compared to satellite options. No dedicated hardware required—runs on standard mobile infrastructure.</p>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-2xl bg-secondary/10 border border-border/50 p-8 md:p-12">
                <h2 className="text-3xl font-bold mb-8 text-center">Competitive Analysis</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="p-4 font-bold text-muted-foreground">Feature</th>
                                <th className="p-4 font-bold text-primary text-lg">KolamBasedCommunication</th>
                                <th className="p-4 font-bold text-muted-foreground">Standard AES-256</th>
                                <th className="p-4 font-bold text-muted-foreground">Satellite Enc.</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-border/10">
                                <td className="p-4 font-medium">Hopping Entropy</td>
                                <td className="p-4 text-green-500 font-bold">Geometric (High)</td>
                                <td className="p-4">Pseudo-Random (Med)</td>
                                <td className="p-4">Static (Low)</td>
                            </tr>
                            <tr className="border-b border-border/10">
                                <td className="p-4 font-medium">Latency</td>
                                <td className="p-4 text-green-500 font-bold">&lt; 20ms</td>
                                <td className="p-4">~45ms</td>
                                <td className="p-4">&gt; 500ms</td>
                            </tr>
                            <tr className="border-b border-border/10">
                                <td className="p-4 font-medium">Setup Cost (100 Users)</td>
                                <td className="p-4 text-green-500 font-bold">$1,500/mo</td>
                                <td className="p-4">$2,200/mo</td>
                                <td className="p-4">$15,000/mo</td>
                            </tr>
                            <tr>
                                <td className="p-4 font-medium">Hardware req.</td>
                                <td className="p-4 text-green-500 font-bold">None (Software)</td>
                                <td className="p-4">None</td>
                                <td className="p-4">Dish/Receiver</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TelecomDashboard;
