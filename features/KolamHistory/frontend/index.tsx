import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { getMyHistory, deleteKolam as apiDeleteKolam, KolamHistoryItem } from "@/api/kolamHistory";
import { toast } from "sonner";
import { Loader2, Trash2, History, Calendar, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { API_BASE_URL } from "@/utils/apiConfig";

const KolamHistory = () => {
    const { user, loading: authLoading } = useAuth();
    const [kolams, setKolams] = useState<KolamHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedKolam, setSelectedKolam] = useState<KolamHistoryItem | null>(null);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);

    useEffect(() => {
        if (!authLoading && user) {
            fetchKolams();
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [user, authLoading]);

    const fetchKolams = async () => {
        try {
            setLoading(true);
            const data = await getMyHistory();
            setKolams(data);
        } catch (err) {
            console.error("Error:", err);
            toast.error("Failed to load kolam history");
        } finally {
            setLoading(false);
        }
    };

    const deleteKolam = async (id: number) => {
        setIsDeleting(id);
        try {
            await apiDeleteKolam(id);
            toast.success("Kolam deleted");
            setKolams(kolams.filter((k) => k.id !== id));
            if (selectedKolam?.id === id) {
                setSelectedKolam(null);
            }
        } catch (err) {
            console.error("Error:", err);
            toast.error("Failed to delete kolam");
        } finally {
            setIsDeleting(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (authLoading || loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="container mx-auto px-6 py-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Please Log In</h1>
                    <p className="text-muted-foreground">You need to be logged in to view your kolam history.</p>
                </div>
            </div>
        );
    }

    // Helper to safely access params
    const getParam = (kolam: KolamHistoryItem, key: string) => {
        return kolam.kolam_params?.[key] || "N/A";
    };

    // Helper to get image URL
    const getImageUrl = (path: string | null) => {
        if (!path) return null;
        // Allows path to remain relative filename, assumes static mount at /generated-images
        return `${API_BASE_URL}/generated-images/${path}`;
    };

    return (
        <div className="container mx-auto px-6 py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div className="flex items-center gap-3 mb-8">
                    <History className="h-8 w-8 text-primary" />
                    <div>
                        <h1 className="text-4xl font-bold gradient-text">My Kolams</h1>
                        <p className="text-muted-foreground">View and manage your generated kolam patterns</p>
                    </div>
                </div>

                {kolams.length === 0 ? (
                    <Card className="glass-card">
                        <CardContent className="pt-6 text-center">
                            <History className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h3 className="text-xl font-semibold mb-2">No Kolams Yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Generate your first kolam to see it here!
                            </p>
                            <Button onClick={() => window.location.href = "/kolam-generator"}>
                                Generate Kolam
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {kolams.map((kolam) => (
                            <motion.div
                                key={kolam.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card className="glass-card hover:border-primary/50 transition-all cursor-pointer group">
                                    <CardHeader>
                                        <CardTitle className="text-lg capitalize">{getParam(kolam, 'symmetry')}</CardTitle>
                                        <CardDescription className="flex items-center gap-2 text-xs">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(kolam.created_at)}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div
                                            className="bg-muted/30 rounded-lg overflow-hidden mb-4 aspect-square flex items-center justify-center relative"
                                            onClick={() => setSelectedKolam(kolam)}
                                        >
                                            {kolam.kolam_image_path ? (
                                                <img
                                                    src={getImageUrl(kolam.kolam_image_path) || ""}
                                                    alt="Kolam Preview"
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="text-muted-foreground text-sm">
                                                    Preview Available in Details
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Grid3x3 className="h-4 w-4" />
                                                <span>Grid: {getParam(kolam, 'k')}×{getParam(kolam, 'k')}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>Randomness: {getParam(kolam, 'randomness')}</span>
                                                <span>Seed: {getParam(kolam, 'seed')}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mt-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => setSelectedKolam(kolam)}
                                            >
                                                View Details
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => deleteKolam(kolam.id)}
                                                disabled={isDeleting === kolam.id}
                                            >
                                                {isDeleting === kolam.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Detail Dialog */}
            <Dialog open={!!selectedKolam} onOpenChange={() => setSelectedKolam(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="capitalize">{selectedKolam && getParam(selectedKolam, 'symmetry')} Kolam</DialogTitle>
                        <DialogDescription>
                            Generated on {selectedKolam && formatDate(selectedKolam.created_at)}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedKolam && (
                        <div className="space-y-6">
                            {/* Image Visual */}
                            {selectedKolam.kolam_image_path && (
                                <div className="flex justify-center bg-muted/20 rounded-lg p-4">
                                    <img
                                        src={getImageUrl(selectedKolam.kolam_image_path) || ""}
                                        alt="Kolam Full"
                                        className="max-h-[400px] w-auto rounded shadow-sm"
                                    />
                                </div>
                            )}

                            {/* Parameters */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="glass-card p-4 rounded-lg">
                                    <h4 className="text-sm font-semibold mb-2">Parameters</h4>
                                    <div className="space-y-1 text-sm text-muted-foreground">
                                        <div>Symmetry: <span className="text-foreground capitalize">{getParam(selectedKolam, 'symmetry')}</span></div>
                                        <div>Grid Size: <span className="text-foreground">{getParam(selectedKolam, 'k')}×{getParam(selectedKolam, 'k')}</span></div>
                                        <div>Randomness: <span className="text-foreground">{getParam(selectedKolam, 'randomness')}</span></div>
                                        <div>Seed: <span className="text-foreground">{getParam(selectedKolam, 'seed')}</span></div>
                                    </div>
                                </div>

                                <div className="glass-card p-4 rounded-lg">
                                    <h4 className="text-sm font-semibold mb-2">Advanced</h4>
                                    <div className="space-y-1 text-sm text-muted-foreground">
                                        <div>Mod Value: <span className="text-foreground">{getParam(selectedKolam, 'mod')}</span></div>
                                        <div>Bits per Cell: <span className="text-foreground">{getParam(selectedKolam, 'bits_per_cell')}</span></div>
                                        <div>Min Hops: <span className="text-foreground">{getParam(selectedKolam, 'min_hops')}</span></div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        deleteKolam(selectedKolam.id);
                                    }}
                                    disabled={isDeleting === selectedKolam.id}
                                >
                                    {isDeleting === selectedKolam.id ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete Kolam
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default KolamHistory;
