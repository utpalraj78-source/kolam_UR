import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Building2, ShieldCheck, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const roles = [
    {
        id: "learner",
        title: "Learner / Researcher",
        description: "Explore Kolam patterns, generate designs, and understand the mathematical foundations.",
        icon: GraduationCap,
        gradient: "from-blue-500 to-cyan-500",
    },
    {
        id: "telecom",
        title: "Telecom Business",
        description: "Enterprise solutions for Frequency Hopping, Secure Chat, and Signal Analysis.",
        icon: Building2,
        gradient: "from-purple-500 to-pink-500",
    },
    {
        id: "kcaptcha",
        title: "KCaptcha Service",
        description: "Deploy bot prevention services. Manage API keys and view business plans.",
        icon: ShieldCheck,
        gradient: "from-green-500 to-emerald-500",
    },
    {
        id: "merch",
        title: "Merchandise Customer",
        description: "Browse and customize Kolam-inspired merchandise in our 3D store.",
        icon: ShoppingBag,
        gradient: "from-orange-500 to-red-500",
    },
];

const RoleSelection = () => {
    const navigate = useNavigate();

    const handleSelectRole = (roleId: string) => {
        navigate(`/auth?role=${roleId}`);
    };

    return (
        <div className="min-h-screen py-20 px-6 flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
            <div className="max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">Choose Your Journey</h1>
                    <p className="text-xl text-muted-foreground">Select how you want to interact with the Kolam Platform</p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
                    {roles.map((role, index) => (
                        <motion.div
                            key={role.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <Card
                                className="group relative overflow-hidden cursor-pointer border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl h-full"
                                onClick={() => handleSelectRole(role.id)}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${role.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                                <CardContent className="p-8 flex flex-col h-full">
                                    <div className={`mb-6 p-4 rounded-2xl bg-gradient-to-br ${role.gradient} w-fit text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                        <role.icon className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3">{role.title}</h3>
                                    <p className="text-muted-foreground mb-6 flex-grow">{role.description}</p>

                                    <div className="flex items-center text-primary font-semibold group-hover:translate-x-2 transition-transform duration-300">
                                        Get Started <ArrowRight className="ml-2 h-4 w-4" />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RoleSelection;
