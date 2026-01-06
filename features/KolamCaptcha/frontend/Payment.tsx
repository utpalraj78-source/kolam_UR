import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, CheckCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";

const Payment = () => {
    const [searchParams] = useSearchParams();
    const plan = searchParams.get('plan') || "Business";
    const price = searchParams.get('price') || "$99";
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePayment = (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        // Simulate API call
        setTimeout(() => {
            setIsProcessing(false);
            toast.success("Payment Successful! License key sent to email.");
            navigate('/kcaptcha-docs');
        }, 2000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 container mx-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg"
            >
                <Card className="glass-card shadow-xl">
                    <CardHeader className="text-center border-b pb-6">
                        <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                            <Lock className="w-6 h-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Secure Checkout</CardTitle>
                        <CardDescription>Completing purchase for <span className="text-foreground font-bold">{plan} Plan ({price}/mo)</span></CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handlePayment} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label>Cardholder Name</Label>
                                    <Input placeholder="John Doe" required className="bg-background/50" />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>Card Number</Label>
                                    <div className="relative">
                                        <Input placeholder="0000 0000 0000 0000" required className="bg-background/50 pl-10" />
                                        <CreditCard className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Expiry</Label>
                                    <Input placeholder="MM/YY" required className="bg-background/50" />
                                </div>
                                <div className="space-y-2">
                                    <Label>CVC</Label>
                                    <Input placeholder="123" required className="bg-background/50" />
                                </div>
                            </div>

                            <div className="bg-muted/10 p-4 rounded text-xs text-muted-foreground flex items-center gap-2 mt-4">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                Payments are processed securely. We do not store your card details.
                            </div>

                            <Button type="submit" disabled={isProcessing} className="w-full h-12 text-lg mt-4">
                                {isProcessing ? "Processing..." : `Pay ${price}`}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => navigate(-1)} className="w-full mt-2">
                                Cancel
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default Payment;
