import { useState, useEffect, Suspense, useMemo, Component, ReactNode } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ShoppingBag, RefreshCw, Palette, Download, Rotate3d, Layers, ShoppingCart, X, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { API_BASE_URL } from "@/utils/apiConfig";

class ErrorBoundary extends Component<{ children: ReactNode, fallback?: ReactNode }, { hasError: boolean, error: any }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("WebGL Context Error caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                    <Rotate3d className="w-12 h-12 mb-4 opacity-20" />
                    <p className="font-semibold">3D Rendering Error</p>
                    <p className="text-xs max-w-[200px] overflow-hidden truncate text-red-400 mt-2">
                        {this.state.error?.message || "Unknown error"}
                    </p>
                    <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" onClick={() => this.setState({ hasError: false, error: null })}>
                            Retry
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                            Reload Page
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// 3D Imports
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, Stage, RoundedBox, useTexture, Decal, Cylinder, Html } from "@react-three/drei";
import * as THREE from "three";
// @ts-ignore
import { OBJLoader } from "three-stdlib";

// Product definitions with 3D configuration
const PRODUCTS = [
    {
        id: "phone",
        name: "Premium Phone Case",
        image: "/merch/phone.png",
        overlayStyle: { top: "14%", left: "34%", width: "36%", height: "72%", borderRadius: "20px" },
        type: "3d_box",
        dimensions: [1.2, 2.4, 0.1],
        radius: 0.1,
        price: "$24.99",
    },
    {
        id: "mug",
        name: "Ceramic Mug",
        image: "/merch/mug.png",
        overlayStyle: { top: "30%", left: "30%", width: "40%", height: "55%", borderRadius: "0 0 10px 10px" },
        type: "3d_cylinder",
        dimensions: [0.8, 0.8, 2, 32],
        radius: 0,
        price: "$14.99"
    },
    {
        id: "tile",
        name: "Decorative Tile",
        image: "/merch/tile.png",
        overlayStyle: { top: "21%", left: "21%", width: "58%", height: "58%" },
        type: "3d_box",
        dimensions: [1.2, 1.2, 0.1],
        radius: 0.02,
        price: "$19.99"
    },
    {
        id: "tshirt",
        name: "Classic Tee",
        image: "/merch/tshirt.png",
        overlayStyle: { top: "20%", left: "30%", width: "40%", height: "50%" },
        type: "3d_box",
        dimensions: [2, 2.5, 0.2],
        radius: 0.1,
        price: "$29.99"
    },
];

const ObjModel = ({ product, texture, scale, verticalOffset, horizontalOffset, layoutType }) => {
    // Correctly using useLoader inside this component which is only mounted when needed
    const obj = useLoader(OBJLoader, product.modelPath || "");

    // Memoize the geometry processing
    const scene = useMemo(() => {
        if (obj) {
            const clonedScene = (obj as THREE.Group).clone();
            clonedScene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (!child.geometry.attributes.normal) {
                        child.geometry.computeVertexNormals();
                    }
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0xffffff,
                        roughness: product.id === 'tshirt' ? 0.8 : 0.4,
                        metalness: product.id === 'phone' ? 0.1 : 0.05,
                        side: THREE.DoubleSide
                    });
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            return clonedScene;
        }
        return null;
    }, [obj, product.id]);

    // Calculate decal position and rotation
    const isDiamond = layoutType?.includes("Diamond");
    const patternRotationZ = isDiamond ? Math.PI / 4 : 0;
    const basePos = product.decalPosition || [0, 0, 0.5];
    const baseRot = product.decalRotation || [0, 0, 0];

    // Vertical offset affects Y. Horizontal affects X.
    const decalPos = new THREE.Vector3(basePos[0] + horizontalOffset, basePos[1] + verticalOffset, basePos[2]);
    const decalRot = [baseRot[0], baseRot[1], baseRot[2] + patternRotationZ];

    return (
        <group
            scale={product.scale_factor || 1}
            rotation={product.baseRotation ? new THREE.Euler(...product.baseRotation) : new THREE.Euler(0, 0, 0)}
        >
            <ambientLight intensity={0.4} />
            <primitive object={scene} />
            {scene.children.length > 0 && scene.children[0] instanceof THREE.Mesh && (
                <mesh geometry={(scene.children[0] as THREE.Mesh).geometry}>
                    <meshStandardMaterial color="white" roughness={0.5} opacity={0} transparent />
                    <Decal
                        position={decalPos}
                        rotation={decalRot as any}
                        scale={[
                            (product.decalScale || 0.5) * (scale / 100),
                            (product.decalScale || 0.5) * (scale / 100),
                            0.15
                        ]}
                    >
                        <meshBasicMaterial map={texture} transparent polygonOffset polygonOffsetFactor={-1} depthTest={true} depthWrite={false} side={THREE.DoubleSide} />
                    </Decal>
                </mesh>
            )}
        </group>
    );
};

const GeometryModel = ({ product, texture, scale, verticalOffset, horizontalOffset, layoutType }) => {
    const isDiamond = layoutType?.includes("Diamond");
    const patternRotationZ = isDiamond ? Math.PI / 4 : 0;

    return (
        <group>
            {product.type === "3d_box" && (
                <RoundedBox args={product.dimensions} radius={product.radius} smoothness={4}>
                    <meshStandardMaterial color="white" roughness={0.3} />
                    <Decal
                        position={[0 + horizontalOffset, 0 + verticalOffset, product.dimensions[2] / 2 + 0.001]}
                        rotation={[0, 0, patternRotationZ]}
                        scale={[
                            product.dimensions[0] * 0.8 * (scale / 100),
                            product.dimensions[1] * 0.6 * (scale / 100),
                            0.1
                        ]}
                    >
                        <meshBasicMaterial
                            map={texture}
                            polygonOffset
                            polygonOffsetFactor={-1}
                            transparent
                            side={THREE.FrontSide}
                        />
                    </Decal>
                </RoundedBox>
            )}
            {product.type === "3d_cylinder" && (
                <group rotation={[0, 0, 0]}>
                    <Cylinder args={product.dimensions}>
                        <meshStandardMaterial color="white" roughness={0.3} />
                        <Decal
                            position={[0 + horizontalOffset, 0 + verticalOffset, product.dimensions[0] + 0.001]}
                            rotation={[0, 0, patternRotationZ]}
                            scale={[
                                product.dimensions[0] * 1.5 * (scale / 100),
                                product.dimensions[2] * 0.6 * (scale / 100),
                                0.1
                            ]}
                        >
                            <meshBasicMaterial
                                map={texture}
                                polygonOffset
                                polygonOffsetFactor={-1}
                                transparent
                                side={THREE.FrontSide}
                            />
                        </Decal>
                    </Cylinder>
                </group>
            )}
        </group>
    );
};

const Product3D = ({ product, textureUrl, scale, verticalOffset = 0, horizontalOffset = 0, layoutType }) => {
    const texture = useTexture(textureUrl);

    if (product.type === '3d_obj') {
        return <ObjModel product={product} texture={texture} scale={scale} verticalOffset={verticalOffset} horizontalOffset={horizontalOffset} layoutType={layoutType} />;
    }

    return <GeometryModel product={product} texture={texture} scale={scale} verticalOffset={verticalOffset} horizontalOffset={horizontalOffset} layoutType={layoutType} />;
};

const MerchandiseStore = () => {
    const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
    const [kolamSeed, setKolamSeed] = useState(2);
    const [kolamColor, setKolamColor] = useState("#e11d48");
    const [bgColor, setBgColor] = useState("transparent");
    const [scale, setScale] = useState(90);
    const [kolamUrl, setKolamUrl] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"2d" | "3d">("3d");
    const [verticalOffset, setVerticalOffset] = useState(0);
    const [horizontalOffset, setHorizontalOffset] = useState(0);

    // Cart State
    const [cart, setCart] = useState<any[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const navigate = useNavigate();

    // New variations state

    // New variations state
    const [symmetryType, setSymmetryType] = useState<string>("square");
    const [layoutType, setLayoutType] = useState<string>("Square grid (no rotate)");

    // Persist 3D view mode preference but fallback to 2D if current product strictly 2d (none now)
    const effectiveViewMode = selectedProduct.type === "2d_only" ? "2d" : viewMode;

    useEffect(() => {
        generateNewKolam();
    }, []);

    const generateNewKolam = () => {
        const newSeed = Math.floor(Math.random() * 1000000);
        setKolamSeed(newSeed);
    };

    useEffect(() => {
        const k = 12;
        const randomness = 3;
        const bgParam = bgColor === "transparent" ? "" : bgColor;

        // Pass layout and symmetry
        const url = `${API_BASE_URL}/kolam-preview?symmetry=${encodeURIComponent(symmetryType)}&layout=${encodeURIComponent(layoutType)}&randomness=${randomness}&k=${k}&seed=${kolamSeed}&curve_color=${encodeURIComponent(kolamColor)}&dot_color=${encodeURIComponent("#000000")}&bg_color=${encodeURIComponent(bgParam)}&_ts=${Date.now()}`;
        setKolamUrl(url);
    }, [kolamSeed, kolamColor, bgColor, symmetryType, layoutType]);

    // Variation Helpers
    const setSquare = () => { setSymmetryType("square"); setLayoutType("Square grid (no rotate)"); };
    const setDiamond = () => { setSymmetryType("square"); setLayoutType("Diamond (rotate 45)"); }; // Assuming backend supports this combination
    const setRadial = () => { setSymmetryType("radial"); setLayoutType("Square grid (no rotate)"); }; // Radial symmetry
    // Star usually implies radial or hexagonal? Let's try radial with correct params

    const addToCart = () => {
        const item = {
            id: Date.now(),
            product: selectedProduct,
            price: selectedProduct.price,
            kolamSeed,
            kolamUrl // In a real app, store config to recreate or the generated image blob
        };
        setCart([...cart, item]);
        toast.success("Added to cart!");
        setIsCartOpen(true);
    };

    const removeFromCart = (id: number) => {
        setCart(cart.filter(c => c.id !== id));
    };

    const cartTotal = cart.reduce((sum, item) => sum + parseFloat(item.price.replace('$', '')), 0);

    const proceedToPayment = () => {
        navigate(`/payment?amount=${cartTotal.toFixed(2)}&description=Merchandise Purchase (${cart.length} items)`);
    };

    return (
        <div className="container mx-auto px-6 py-8 min-h-screen relative">
            {/* Cart Drawer */}
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: isCartOpen ? 0 : '100%' }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed inset-y-0 right-0 w-full md:w-96 bg-background/95 backdrop-blur-xl border-l border-border shadow-2xl z-50 p-6 flex flex-col"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" /> Your Cart
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4">
                    {cart.length === 0 ? (
                        <div className="text-center text-muted-foreground py-10">
                            Your cart is empty.
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.id} className="flex gap-4 items-center bg-muted/20 p-3 rounded-lg border border-border/50">
                                <img src={item.product.image} className="w-12 h-12 object-contain bg-white rounded-md" alt={item.product.name} />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate">{item.product.name}</p>
                                    <p className="text-xs text-muted-foreground">Seed: {item.kolamSeed}</p>
                                    <p className="text-sm font-bold text-primary">{item.price}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeFromCart(item.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>

                <div className="border-t pt-4 mt-4 space-y-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <Button className="w-full" size="lg" disabled={cart.length === 0} onClick={proceedToPayment}>
                        Checkout Now
                    </Button>
                </div>
            </motion.div>

            {/* Backdrop for Cart */}
            {isCartOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                    onClick={() => setIsCartOpen(false)}
                />
            )}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <h1 className="text-4xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                    Kolam Merchandise Studio
                </h1>
                <p className="text-muted-foreground max-w-xl mx-auto mb-4">
                    Visualize algorithmic heritage on premium goods in 3D.
                </p>
                <div className="absolute top-6 right-6">
                    <Button variant="outline" size="icon" className="relative" onClick={() => setIsCartOpen(true)}>
                        <ShoppingCart className="w-5 h-5" />
                        {cart.length > 0 && (
                            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-background">
                                {cart.length}
                            </span>
                        )}
                    </Button>
                </div>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-8 items-start">
                {/* Controls - Optimized UI with Sticky Layout. Order-2 on mobile so Preview is seen first. */}
                <div className="space-y-6 lg:sticky lg:top-24 order-2 lg:order-1">
                    <Card className="p-5 glass-card backdrop-blur-xl border-primary/10 shadow-lg">
                        <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-primary" />
                            Select Product
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {PRODUCTS.map((product) => (
                                <div
                                    key={product.id}
                                    onClick={() => setSelectedProduct(product)}
                                    className={`cursor-pointer rounded-lg p-2 transition-all duration-300 border-2 ${selectedProduct.id === product.id
                                        ? "border-primary bg-primary/5 shadow-md scale-102"
                                        : "border-transparent hover:bg-muted/50"
                                        }`}
                                >
                                    <div className="relative aspect-square mb-2 rounded bg-white p-2">
                                        <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
                                        {/* Badge for 3D capability */}
                                        <div className="absolute top-1 right-1 bg-black/10 rounded px-1 text-[10px] font-bold">3D</div>
                                    </div>
                                    <p className="font-medium text-xs text-center truncate">{product.name}</p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-5 glass-card border-primary/10">
                        <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
                            <Palette className="w-4 h-4 text-primary" />
                            Kolam Pattern
                        </h3>
                        <div className="space-y-5">
                            {/* Variations Buttons */}
                            <div>
                                <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Pattern Style</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant={symmetryType === "square" && layoutType.includes("Square") ? "default" : "outline"}
                                        size="sm" onClick={setSquare}
                                    >
                                        Square
                                    </Button>
                                    <Button
                                        variant={layoutType.includes("Diamond") ? "default" : "outline"}
                                        size="sm" onClick={setDiamond}
                                    >
                                        Diamond
                                    </Button>
                                    <Button
                                        variant={symmetryType === "radial" ? "default" : "outline"}
                                        size="sm" onClick={setRadial}
                                    >
                                        Circular
                                    </Button>
                                    <Button
                                        variant={symmetryType === "star" ? "default" : "outline"}
                                        size="sm" onClick={() => { setSymmetryType("radial"); generateNewKolam(); }} // Simulate star via randomness + radial
                                    >
                                        Star
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Color</Label>
                                <div className="flex flex-wrap gap-2">
                                    {['#000000', '#e11d48', '#2563eb', '#16a34a', '#d97706', '#9333ea'].map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => setKolamColor(c)}
                                            className={`w-6 h-6 rounded-full border-2 transition-transform ${kolamColor === c ? 'border-primary ring-2 ring-primary/20 scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                    <input type="color" value={kolamColor} onChange={(e) => setKolamColor(e.target.value)} className="w-6 h-6 p-0 border-0 rounded-full cursor-pointer overflow-hidden" />
                                </div>
                            </div>

                            <div>
                                <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Pattern Scale ({scale}%)</Label>
                                <Slider value={[scale]} onValueChange={(val) => setScale(val[0])} min={50} max={150} step={1} />
                            </div>

                            <Button onClick={generateNewKolam} className="w-full" variant="secondary">
                                <RefreshCw className="w-4 h-4 mr-2" /> Randomize Pattern
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Preview Area. Order-1 on mobile to appear at top. */}
                <div className="lg:col-span-2 space-y-4 order-1 lg:order-2">
                    <div className="flex justify-between items-center bg-muted/20 p-2 rounded-lg backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="text-sm font-medium px-2">
                                {selectedProduct.name} Preview
                            </div>
                            {selectedProduct.price && (
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold border border-primary/20">
                                    {selectedProduct.price}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={effectiveViewMode === "2d" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setViewMode("2d")}
                                className="gap-2 h-8 text-xs"
                            >
                                <Layers className="w-3 h-3" /> 2D Overlay
                            </Button>
                            <Button
                                variant={effectiveViewMode === "3d" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setViewMode("3d")}
                                disabled={selectedProduct.type === "2d_only"}
                                className="gap-2 h-8 text-xs"
                            >
                                <Rotate3d className="w-3 h-3" /> 3D Rotation
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex gap-4 items-start">
                            {/* Vertical Position Slider (Left of preview) */}
                            <div className="flex flex-col items-center justify-center space-y-2 bg-muted/10 p-2 rounded-lg">
                                <Label className="text-[10px] uppercase rotate-[-90deg] whitespace-nowrap mb-4 text-muted-foreground tracking-wider">Vertical Pos</Label>
                                <div className="h-64">
                                    <Slider
                                        orientation="vertical"
                                        value={[verticalOffset]}
                                        onValueChange={(val) => setVerticalOffset(val[0])}
                                        min={-0.3}
                                        max={0.3}
                                        step={0.001}
                                        className="h-full"
                                    />
                                </div>
                            </div>

                            <motion.div
                                layout
                                id="merch-canvas-container"
                                className="relative w-full aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-inner overflow-hidden border border-border/40 flex-1"
                            >
                                {effectiveViewMode === "3d" ? (
                                    <ErrorBoundary fallback={
                                        <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                                            <Rotate3d className="w-12 h-12 mb-4 opacity-20" />
                                            <p className="font-semibold">3D Rendering Unavailable</p>
                                            <p className="text-sm">Your browser or device does not support WebGL.</p>
                                            <Button variant="outline" size="sm" className="mt-4" onClick={() => setViewMode('2d')}>
                                                Switch to 2D View
                                            </Button>
                                        </div>
                                    }>
                                        <Canvas
                                            shadows={false}
                                            dpr={1}
                                            camera={{ fov: 45, position: [0, 0, 4] }}
                                            gl={{
                                                preserveDrawingBuffer: true,
                                                powerPreference: "default",
                                                antialias: true,
                                                failIfMajorPerformanceCaveat: false
                                            }}
                                        >
                                            <Suspense fallback={<Html center><div className="text-muted-foreground font-bold whitespace-nowrap">Loading 3D Model...</div></Html>}>
                                                <Stage environment="city" intensity={0.6}>
                                                    {kolamUrl && (
                                                        <Product3D
                                                            product={selectedProduct}
                                                            textureUrl={kolamUrl}
                                                            scale={scale}
                                                            verticalOffset={verticalOffset}
                                                            horizontalOffset={horizontalOffset}
                                                            layoutType={layoutType}
                                                        />
                                                    )}
                                                </Stage>
                                                <OrbitControls makeDefault enableZoom={true} />
                                            </Suspense>
                                        </Canvas>
                                    </ErrorBoundary>
                                ) : (
                                    // 2D View
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <img src={selectedProduct.image} alt={selectedProduct.name} className="h-[80%] w-auto object-contain z-10" />
                                        {kolamUrl && (
                                            <div
                                                className="absolute z-20 pointer-events-none"
                                                style={{
                                                    ...selectedProduct.overlayStyle,
                                                    mixBlendMode: 'multiply',
                                                    top: `calc(${selectedProduct.overlayStyle.top} + ${-verticalOffset * 100}%)`,
                                                    left: `calc(${selectedProduct.overlayStyle.left} + ${horizontalOffset * 100}%)`
                                                }}
                                            >
                                                <div style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transform: `scale(${scale / 100}) rotate(${layoutType.includes("Diamond") ? 45 : 0}deg)`
                                                }}>
                                                    <img src={kolamUrl} alt="Kolam" className="w-[120%] h-[120%] object-contain opacity-90" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Loading Overlay */}
                                {!kolamUrl && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-50">
                                        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* Horizontal Position Slider (Below preview) */}
                        <div className="flex items-center space-x-4 bg-muted/10 p-2 rounded-lg ml-[4rem]"> {/* Align with canvas */}
                            <Label className="text-[10px] uppercase whitespace-nowrap text-muted-foreground tracking-wider w-16 text-right">Horizontal</Label>
                            <Slider
                                value={[horizontalOffset]}
                                onValueChange={(val) => setHorizontalOffset(val[0])}
                                min={-0.3}
                                max={0.3}
                                step={0.001}
                                className="flex-1"
                            />
                        </div>
                    </div>

                    <div className="flex justify-center gap-4 pt-4">
                        <Button size="lg" className="shadow-lg shadow-primary/20 w-48" onClick={addToCart}>
                            Add to Cart
                            <span className="ml-2 opacity-80 text-xs">({selectedProduct.price})</span>
                        </Button>
                        <Button size="lg" variant="ghost" onClick={async () => {
                            if (effectiveViewMode === '3d') {
                                // 3D Capture
                                const canvas = document.querySelector('#merch-canvas-container canvas') as HTMLCanvasElement;
                                if (canvas) {
                                    const link = document.createElement('a');
                                    link.href = canvas.toDataURL('image/png');
                                    link.download = `kolam-${selectedProduct.id}-${kolamSeed}.png`;
                                    link.click();
                                    toast.success("Design downloaded!");
                                }
                            } else {
                                // 2D Composite Generation
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                const productImg = new Image();
                                productImg.crossOrigin = "anonymous";

                                productImg.onload = () => {
                                    canvas.width = productImg.width;
                                    canvas.height = productImg.height;

                                    // Draw Product
                                    ctx?.drawImage(productImg, 0, 0);

                                    if (kolamUrl && ctx) {
                                        const kolamImg = new Image();
                                        kolamImg.crossOrigin = "anonymous";
                                        kolamImg.onload = () => {
                                            // Parse percentage styles
                                            const parsePct = (str: string, total: number) => parseFloat(str) / 100 * total;
                                            const top = parsePct(selectedProduct.overlayStyle.top as string, canvas.height);
                                            const left = parsePct(selectedProduct.overlayStyle.left as string, canvas.width);
                                            const width = parsePct(selectedProduct.overlayStyle.width as string, canvas.width);
                                            const height = parsePct(selectedProduct.overlayStyle.height as string, canvas.height);

                                            const vOffsetPx = -verticalOffset * canvas.height;
                                            const hOffsetPx = horizontalOffset * canvas.width;

                                            ctx.save();
                                            // Move to center of decal area to handle rotation and scale
                                            const cx = left + width / 2 + hOffsetPx;
                                            const cy = top + height / 2 + vOffsetPx;
                                            ctx.translate(cx, cy);

                                            // Apply Scale
                                            const s = scale / 100;
                                            ctx.scale(s, s);

                                            // Apply Rotation
                                            if (layoutType.includes("Diamond")) {
                                                ctx.rotate(45 * Math.PI / 180);
                                            }

                                            // Draw Image centered
                                            ctx.globalAlpha = 0.9;
                                            ctx.globalCompositeOperation = 'multiply'; // Blend mode
                                            ctx.drawImage(kolamImg, -width / 2, -height / 2, width, height);
                                            ctx.restore();

                                            // Download
                                            const link = document.createElement('a');
                                            link.href = canvas.toDataURL('image/png');
                                            link.download = `merch-preview-${kolamSeed}.png`;
                                            link.click();
                                            toast.success("Mockup downloaded!");
                                        };
                                        kolamImg.src = kolamUrl;
                                    }
                                };
                                productImg.src = selectedProduct.image;
                            }
                        }}>
                            <Download className="w-5 h-5 mr-2" /> Download Merchandise
                        </Button>
                    </div>
                </div >
            </div >
        </div >
    );
};

export default MerchandiseStore;
