import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Shield, Zap, RefreshCw, Server, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Pricing = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen py-10 px-6 container mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-16 space-y-4"
            >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm mb-4">
                    <Shield className="w-4 h-4" /> B2B Bot Prevention
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                    KCaptcha <span className="text-primary">Enterprise</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    The world's first mathematically impossible-to-simulate CAPTCHA.
                    Protect your infrastructure with pure chaos theory.
                </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                {/* Free Tier */}
                <Card className="glass-card border-border/50 relative overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-2xl">Developer</CardTitle>
                        <CardDescription>For testing and small sites</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-4xl font-bold">$0 <span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                        <ul className="space-y-2 text-sm">
                            <li className="flex gap-2"><Check className="text-green-500 w-4 h-4" /> 1,000 Challenges/mo</li>
                            <li className="flex gap-2"><Check className="text-green-500 w-4 h-4" /> Standard Difficulty</li>
                            <li className="flex gap-2"><Check className="text-green-500 w-4 h-4" /> Community Support</li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" variant="outline" onClick={() => navigate('/payment?plan=Developer&price=0')}>Get API Key</Button>
                    </CardFooter>
                </Card>

                {/* Startup Tier */}
                <Card className="glass-card border-border/50 relative overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-2xl">Startup</CardTitle>
                        <CardDescription>Growing applications</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-4xl font-bold">$49 <span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                        <ul className="space-y-2 text-sm">
                            <li className="flex gap-2"><Check className="text-green-500 w-4 h-4" /> 100,000 Challenges/mo</li>
                            <li className="flex gap-2"><Check className="text-green-500 w-4 h-4" /> Adaptive Complexity</li>
                            <li className="flex gap-2"><Check className="text-green-500 w-4 h-4" /> Email Support</li>
                            <li className="flex gap-2"><Check className="text-green-500 w-4 h-4" /> Dashboard Analytics</li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={() => navigate('/payment?plan=Startup&price=49')}>Subscribe</Button>
                    </CardFooter>
                </Card>

                {/* Business Tier (Best Value) */}
                <Card className="glass-card border-primary relative overflow-hidden shadow-lg shadow-primary/10 scale-105 z-10">
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg font-bold">POPULAR</div>
                    <CardHeader>
                        <CardTitle className="text-2xl flex items-center gap-2">Business <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" /></CardTitle>
                        <CardDescription>High volume platforms</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-4xl font-bold text-primary">$199 <span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                        <ul className="space-y-2 text-sm">
                            <li className="flex gap-2"><Check className="text-green-500 w-4 h-4" /> 2M Challenges/mo</li>
                            <li className="flex gap-2"><Check className="text-green-500 w-4 h-4" /> Custom Kolam Seeds</li>
                            <li className="flex gap-2"><Check className="text-green-500 w-4 h-4" /> Priority 24/7 Support</li>
                            <li className="flex gap-2"><Check className="text-green-500 w-4 h-4" /> Fraud Intelligence</li>
                            <li className="flex gap-2"><Check className="text-green-500 w-4 h-4" /> SLA Guarantee</li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold" onClick={() => navigate('/payment?plan=Business&price=199')}>Start Free Trial</Button>
                    </CardFooter>
                </Card>

                {/* Enterprise */}
                <Card className="glass-card border-border/50 relative overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-2xl">Enterprise</CardTitle>
                        <CardDescription>Global scale security</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-4xl font-bold">Custom</div>
                        <ul className="space-y-2 text-sm">
                            <li className="flex gap-2"><Check className="text-green-500 w-4 h-4" /> Unlimited Volume</li>
                            <li className="flex gap-2"><Check className="text-green-500 w-4 h-4" /> On-Premise Deployment</li>
                            <li className="flex gap-2"><Check className="text-green-500 w-4 h-4" /> Custom ML Models</li>
                            <li className="flex gap-2"><Check className="text-green-500 w-4 h-4" /> Dedicated Account Manager</li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" variant="ghost" onClick={() => navigate('/payment?plan=Enterprise&price=Custom')}>Contact Sales</Button>
                    </CardFooter>
                </Card>
            </div>

            <div className="mt-20 max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-8 text-center">Why Switch to KCaptcha?</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center p-4">
                        <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Server className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-2">99.99% Uptime</h3>
                        <p className="text-sm text-muted-foreground">Global edge network ensures your users never wait for verification.</p>
                    </div>
                    <div className="text-center p-4">
                        <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                            <RefreshCw className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-2">Zero Friction</h3>
                        <p className="text-sm text-muted-foreground">Gamified experience actually increases user conversion rates.</p>
                    </div>
                    <div className="text-center p-4">
                        <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Globe className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-2">Bot-Proof</h3>
                        <p className="text-sm text-muted-foreground">Dynamic geometry renders traditional CV/ML solver bots useless.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Pricing;
