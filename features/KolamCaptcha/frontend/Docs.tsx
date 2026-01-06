import { motion } from "framer-motion";
import { Bot, Shield, Code, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const KCaptchaDocs = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen py-10 px-6 container mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto"
            >
                <div className="mb-12 text-center">
                    <h1 className="text-4xl font-bold mb-4 gradient-text">KCaptcha Documentation</h1>
                    <p className="text-xl text-muted-foreground">Integrating Kolam-based reverse-turing tests.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    <div className="glass-card p-8 rounded-xl">
                        <Shield className="w-10 h-10 text-primary mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Entropy-Based</h2>
                        <p className="text-muted-foreground mb-4">
                            Unlike image recognition captchas that bots are now good at, KCaptcha relies on <span className="text-foreground">spatial entropy</span>. Humans can intuitively spot symmetry breaks; algorithms struggle without massive compute.
                        </p>
                    </div>
                    <div className="glass-card p-8 rounded-xl">
                        <Bot className="w-10 h-10 text-primary mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Bot Resistant</h2>
                        <p className="text-muted-foreground mb-4">
                            Generated on the fly on the server using a chaotic seed. No static database of images to train against.
                        </p>
                    </div>
                </div>

                <div className="bg-secondary/10 border border-border/50 rounded-xl p-8 mb-12">
                    <h2 className="text-2xl font-bold mb-6">Integration Types</h2>
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="bg-background/80 p-2 rounded h-fit font-mono text-sm border">Type A</div>
                            <div>
                                <h3 className="font-semibold">Symmetry Identification</h3>
                                <p className="text-sm text-muted-foreground">User must identify which quadrant breaks the symmetry. Lowest friction.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-background/80 p-2 rounded h-fit font-mono text-sm border">Type B</div>
                            <div>
                                <h3 className="font-semibold">Path Tracing</h3>
                                <p className="text-sm text-muted-foreground">User follows the infinite loop path. High security for banking/crypto.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <Button size="lg" onClick={() => navigate('/captcha')} className="text-lg px-8 py-6 h-auto gap-2">
                        <Code className="w-5 h-5" />
                        Try Demo in KCaptcha Lab
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                    <p className="text-sm text-muted-foreground mt-4">Takes you to the live implementation sandbox</p>
                </div>
            </motion.div>
        </div>
    );
};

export default KCaptchaDocs;
