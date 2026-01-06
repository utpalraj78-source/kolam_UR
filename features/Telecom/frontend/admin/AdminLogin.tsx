
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, ArrowRight, Loader2, Sparkles, Cpu } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AdminLogin = ({ onLoginSuccess }: { onLoginSuccess: (token: string) => void }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [credentials, setCredentials] = useState({ username: '', password: '' });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:8081/telecom-admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });

            if (response.ok) {
                const data = await response.json();
                toast.success("Admin access granted. Initializing 6G Simulation...");
                onLoginSuccess(data.token);
            } else {
                toast.error("Access Denied: Invalid Quantum Credentials");
            }
        } catch (error) {
            toast.error("Connection Failed: Simulation Server Offline");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-8 space-y-2">
                    <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
                        <Cpu className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter">TELECOM <span className="text-primary">ADMIN</span></h1>
                    <p className="text-muted-foreground font-medium">Quantum-Secure Simulation Gateway</p>
                </div>

                <Card className="glass-card border-primary/20 shadow-2xl overflow-hidden">
                    <div className="h-1 w-full bg-gradient-to-r from-primary via-blue-500 to-primary animate-shimmer" />
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" />
                            Identity Verification
                        </CardTitle>
                        <CardDescription>Enter administrative credentials to access the 6G Lab.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Admin ID</label>
                                <Input
                                    placeholder="admin"
                                    className="bg-secondary/50 border-primary/10 h-12"
                                    value={credentials.username}
                                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Encryption Key</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    className="bg-secondary/50 border-primary/10 h-12"
                                    value={credentials.password}
                                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full h-12 font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>Initialize Session <ArrowRight className="ml-2 w-4 h-4" /></>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center mt-6 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    Controlled by Kolam Security Protocol v2.4.0
                </p>
            </motion.div>
        </div>
    );
};

export default AdminLogin;
