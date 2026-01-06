import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Info } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TelecomPricing = () => {
    const [users, setUsers] = useState(50);

    // Simple dynamic pricing logic
    // Base $15 per user, discount as volume increases
    const getPricePerUser = (n: number) => {
        if (n < 20) return 25;
        if (n < 100) return 20;
        if (n < 500) return 15;
        return 10;
    };

    const pricePerUser = getPricePerUser(users);
    const totalPrice = users * pricePerUser;

    return (
        <div className="min-h-screen py-10 px-6 container mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-16"
            >
                <h1 className="text-4xl font-bold mb-4">Transparent Pricing for Teams</h1>
                <p className="text-xl text-muted-foreground">Scale your secure communication infrastructure.</p>
            </motion.div>

            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                <Card className="glass-card p-6">
                    <CardHeader>
                        <CardTitle className="text-2xl">Estimate Your Cost</CardTitle>
                        <CardDescription>Drag to adjust the number of active users (N)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="font-bold text-lg">Active Users (N)</Label>
                                <span className="text-2xl font-bold text-primary">{users}</span>
                            </div>
                            <Slider
                                value={[users]}
                                min={5}
                                max={1000}
                                step={5}
                                onValueChange={(vals) => setUsers(vals[0])}
                                className="py-4"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>5 Users</span>
                                <span>1000 Users</span>
                            </div>
                        </div>

                        <div className="bg-muted/20 p-4 rounded-lg space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Price per user</span>
                                <span className="font-medium">${pricePerUser}/mo</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Volume Discount</span>
                                <span className="text-green-500 font-medium">-{users > 100 ? '25%' : (users > 20 ? '10%' : '0%')} Applied</span>
                            </div>
                            <div className="border-t pt-2 mt-2 flex justify-between items-end">
                                <span className="font-bold">Total Monthly</span>
                                <span className="text-4xl font-bold text-primary">${totalPrice.toLocaleString()}</span>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full text-lg h-12">Contact Sales to Deploy</Button>
                    </CardFooter>
                </Card>

                <div className="space-y-6">
                    <div className="flex gap-4 items-start">
                        <div className="bg-primary/20 p-2 rounded-full mt-1">
                            <Check className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Dedicated Server Instance</h3>
                            <p className="text-muted-foreground">Your own isolated FHSS environment for maximum privacy.</p>
                        </div>
                    </div>
                    <div className="flex gap-4 items-start">
                        <div className="bg-primary/20 p-2 rounded-full mt-1">
                            <Check className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">24/7 Priority encryption key rotation</h3>
                            <p className="text-muted-foreground">Keys are automatically regenerated every 24 hours.</p>
                        </div>
                    </div>
                    <div className="flex gap-4 items-start">
                        <div className="bg-primary/20 p-2 rounded-full mt-1">
                            <Check className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">On-Premise Option</h3>
                            <p className="text-muted-foreground">For N &gt; 500, we offer on-premise deployment on your own hardware.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TelecomPricing;
