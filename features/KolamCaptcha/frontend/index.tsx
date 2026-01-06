import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle, GripHorizontal, Brain, RotateCw, SlidersHorizontal } from 'lucide-react';
import { Slider } from "@/components/ui/slider";

const api = axios.create();

const CaptchaPage = () => {
    const [activeTab, setActiveTab] = useState<'assembler' | 'completion' | 'memory' | 'rotate' | 'slider'>('slider');
    const [isBotMode, setIsBotMode] = useState(false);

    return (
        <div className="container mx-auto px-6 py-8 min-h-screen">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
            >
                {/* Marketing Header */}
                <div className="mb-12 text-center space-y-4">
                    <h1 className="text-5xl font-black mb-2 gradient-text tracking-tight">Kolam Captcha Lab</h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        The world's most aesthetic, culture-driven, and secure captcha solution.
                        Designed to verify <span className="text-primary font-bold">Humans</span>, not robots.
                    </p>

                    {/* Trust Signals */}
                    <div className="flex justify-center gap-8 mt-6 text-sm font-medium text-zinc-400">
                        <div className="flex items-center gap-2"><CheckCircle className="text-green-500 w-4 h-4" /> 99.9% Bot Rejection</div>
                        <div className="flex items-center gap-2"><Brain className="text-purple-500 w-4 h-4" /> Cognitive Verification</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> Real-time Analysis</div>
                    </div>
                </div>

                {/* Mode Toggle */}
                <div className="flex justify-center mb-10">
                    <div className="bg-zinc-900 border border-white/10 p-1 rounded-full flex relative overflow-hidden">
                        <motion.div
                            className="absolute inset-y-1 w-[140px] bg-zinc-800 rounded-full shadow-lg"
                            animate={{ x: isBotMode ? 140 : 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                        <button
                            onClick={() => setIsBotMode(false)}
                            className={`relative z-10 w-[140px] py-2 rounded-full font-bold transition-colors ${!isBotMode ? 'text-white' : 'text-zinc-500'}`}
                        >
                            Human Mode
                        </button>
                        <button
                            onClick={() => setIsBotMode(true)}
                            className={`relative z-10 w-[140px] py-2 rounded-full font-bold transition-colors ${isBotMode ? 'text-red-400' : 'text-zinc-500'}`}
                        >
                            Bot Simulation
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                {/* Only show tabs if not in bot mode (or show them disabled/for context) - keeping them enabled for demo flexibility */}
                <div className="flex justify-center flex-wrap gap-4 mb-8">
                    <Button variant={activeTab === 'assembler' ? 'default' : 'outline'} onClick={() => setActiveTab('assembler')} className="gap-2">
                        <GripHorizontal className="h-4 w-4" /> Type 1: Assembler
                    </Button>
                    <Button variant={activeTab === 'completion' ? 'default' : 'outline'} onClick={() => setActiveTab('completion')} className="gap-2">
                        <CheckCircle className="h-4 w-4" /> Type 2: Completion
                    </Button>
                    <Button variant={activeTab === 'memory' ? 'default' : 'outline'} onClick={() => setActiveTab('memory')} className="gap-2">
                        <Brain className="h-4 w-4" /> Type 3: Memory Mode
                    </Button>
                    <Button variant={activeTab === 'rotate' ? 'default' : 'outline'} onClick={() => setActiveTab('rotate')} className="gap-2">
                        <RotateCw className="h-4 w-4" /> Type 4: Rotate
                    </Button>
                    <Button variant={activeTab === 'slider' ? 'default' : 'outline'} onClick={() => setActiveTab('slider')} className="gap-2">
                        <SlidersHorizontal className="h-4 w-4" /> Type 5: Slider
                    </Button>
                </div>

                {/* Content Area */}
                <div className="glass-card p-8 rounded-xl max-w-4xl mx-auto min-h-[600px] flex flex-col items-center relative border border-white/5">

                    {/* Bot Mode Overlay Indicators */}
                    {isBotMode && (
                        <div className="absolute top-4 right-4 bg-red-500/10 border border-red-500/50 px-4 py-2 rounded-full flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                            <span className="text-red-400 font-mono text-sm font-bold">BOT_ATTACK_DETECTED</span>
                        </div>
                    )}

                    <div className="w-full flex justify-center flex-grow items-center">
                        {activeTab === 'assembler' && <AssemblerCaptcha isBotMode={isBotMode} />}
                        {activeTab === 'completion' && <CompletionCaptcha isBotMode={isBotMode} />}
                        {activeTab === 'memory' && <MemoryCaptcha isBotMode={isBotMode} />}
                        {activeTab === 'rotate' && <RotateCaptcha isBotMode={isBotMode} />}
                        {activeTab === 'slider' && <SliderCaptcha isBotMode={isBotMode} />}
                    </div>

                    {/* Footer Trust Message */}
                    <div className="mt-8 pt-6 border-t border-white/5 w-full text-center">
                        {isBotMode ? (
                            <p className="text-red-400 font-mono text-sm">
                                &gt; SYSTEM: Intuitive patterns confuse automated solvers.<br />
                                &gt; RESULT: Access Denied.
                            </p>
                        ) : (
                            <p className="text-zinc-500 text-sm">
                                Verify you are human by solving the cultural pattern above.
                            </p>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default CaptchaPage;

// ----------------------------------------------------------------------
// TYPE 1: Assembler Captcha
// ----------------------------------------------------------------------
const AssemblerCaptcha = ({ isBotMode }: { isBotMode?: boolean }) => {
    const [challengeId, setChallengeId] = useState<number | null>(null);
    const [images, setImages] = useState<string[]>([]);
    const [slots, setSlots] = useState<(number | null)[]>([null, null, null, null]);
    const [selectedSourceIdx, setSelectedSourceIdx] = useState<number | null>(null);
    const [status, setStatus] = useState<'idle' | 'success' | 'fail'>('idle');

    // Bot Simulation Logic
    useEffect(() => {
        if (!isBotMode) { setSlots([null, null, null, null]); setStatus('idle'); return; }

        const botAction = async () => {
            setSlots([null, null, null, null]);
            setStatus('idle');
            await new Promise(r => setTimeout(r, 800)); // Bot "thinking"

            // Bot randomly fills slots incorrectly
            const randomFill = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
            // Often bots just try linear filling 0,1,2,3 which is wrong if pieces are shuffled
            setSlots(randomFill);

            await new Promise(r => setTimeout(r, 600));
            toast.error("Bot verification failed: Pattern Mismatch");
            setStatus('fail');
        };
        botAction();
        const interval = setInterval(botAction, 4000);
        return () => clearInterval(interval);
    }, [isBotMode]);

    const fetchChallenge = async () => {
        setStatus('idle');
        setSlots([null, null, null, null]);
        setSelectedSourceIdx(null);
        setImages([]);
        try {
            const res = await api.get('/api/captcha/generate-assembler');
            setChallengeId(res.data.challenge_id);
            setImages(res.data.images);
        } catch (e) {
            toast.error("Failed to load captcha challenge");
        }
    };

    useEffect(() => { fetchChallenge(); }, []);

    const handleSourceClick = (idx: number) => {
        if (isBotMode) return;
        if (slots.includes(idx)) return;
        setSelectedSourceIdx(idx);
    };

    const handleSlotClick = (slotIdx: number) => {
        if (isBotMode) return;
        if (selectedSourceIdx !== null) {
            const newSlots = [...slots];
            newSlots[slotIdx] = selectedSourceIdx;
            setSlots(newSlots);
            setSelectedSourceIdx(null);
        } else if (slots[slotIdx] !== null) {
            const newSlots = [...slots];
            newSlots[slotIdx] = null;
            setSlots(newSlots);
        }
    };

    const verify = async () => {
        if (slots.some(s => s === null)) {
            toast.warning("Please fill all 4 slots.");
            return;
        }
        try {
            const res = await api.post('/api/captcha/verify', {
                challenge_id: challengeId,
                answer: slots
            });
            if (res.data.success) {
                setStatus('success');
                toast.success("Correct Pattern!");
            } else {
                setStatus('fail');
                toast.error("Incorrect. Try again.");
            }
        } catch (e) {
            toast.error("Verification error");
        }
    };

    return (
        <div className="flex flex-col items-center w-full">
            <h2 className="text-xl font-bold mb-4">Assemble the Kolam</h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">
                Place the shuffled pieces into quadrants 1, 2, 3, 4 to form the image.
            </p>

            <motion.div
                layout
                className={`grid grid-cols-2 gap-2 mb-8 bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-xl relative w-[320px] h-[320px] ${status === 'fail' ? 'border-red-500/50' : ''}`}
                animate={isBotMode && status === 'fail' ? { x: [-5, 5, -5, 5, 0] } : {}}
            >
                {[0, 1, 2, 3].map(i => (
                    <motion.div key={i} onClick={() => handleSlotClick(i)} whileHover={{ scale: 1.02 }} className={`border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer overflow-hidden relative ${slots[i] !== null ? 'border-primary/50' : 'border-white/10'}`}>
                        {slots[i] !== null ? <img src={`data:image/png;base64,${images[slots[i]!]}`} className="w-full h-full object-cover" /> : <span className="text-2xl text-white/20">Q{i + 1}</span>}
                    </motion.div>
                ))}
            </motion.div>

            <div className="flex gap-4 mb-8">
                {images.map((img, idx) => (
                    <motion.div key={idx} onClick={() => handleSourceClick(idx)} className={`w-16 h-16 rounded border-2 cursor-pointer ${slots.includes(idx) ? 'grayscale opacity-30' : ''} ${selectedSourceIdx === idx ? 'border-primary ring-2 ring-primary' : 'border-white/20'}`}>
                        <img src={`data:image/png;base64,${img}`} className="w-full h-full object-cover" />
                    </motion.div>
                ))}
            </div>

            <div className={`flex gap-4 ${isBotMode ? 'opacity-50 pointer-events-none' : ''}`}>
                <Button onClick={fetchChallenge} variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" /> Reset</Button>
                <Button onClick={verify} disabled={status === 'success'}>Verify</Button>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// TYPE 2: Completion Captcha
// ----------------------------------------------------------------------
const CompletionCaptcha = ({ isBotMode }: { isBotMode?: boolean }) => {
    const [challengeId, setChallengeId] = useState<number | null>(null);
    const [questionImg, setQuestionImg] = useState<string | null>(null);
    const [options, setOptions] = useState<string[]>([]);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [status, setStatus] = useState<'idle' | 'success' | 'fail'>('idle');

    useEffect(() => {
        if (!isBotMode) { setSelectedOption(null); setStatus('idle'); return; }
        const botAction = async () => {
            setSelectedOption(null);
            setStatus('idle');
            await new Promise(r => setTimeout(r, 1000));
            // Bot guesses randomly
            setSelectedOption(Math.floor(Math.random() * 4));
            await new Promise(r => setTimeout(r, 500));
            setStatus('fail');
            toast.error("Bot verification failed: Context Missing");
        }
        botAction();
        const interval = setInterval(botAction, 3500);
        return () => clearInterval(interval);
    }, [isBotMode]);

    const fetchChallenge = async () => {
        setStatus('idle'); setSelectedOption(null); setQuestionImg(null); setOptions([]);
        try {
            const res = await api.get('/api/captcha/generate-completion');
            setChallengeId(res.data.challenge_id);
            setQuestionImg(res.data.question_image);
            setOptions(res.data.options);
        } catch (e) { toast.error("Failed to load captcha"); }
    };
    useEffect(() => { fetchChallenge(); }, []);

    const verify = async () => {
        if (selectedOption === null) return;
        try {
            const res = await api.post('/api/captcha/verify', { challenge_id: challengeId, answer: selectedOption });
            if (res.data.success) { setStatus('success'); toast.success("Correct!"); } else { setStatus('fail'); toast.error("Incorrect."); }
        } catch (e) { toast.error("Error verifying"); }
    };

    return (
        <div className="flex flex-col items-center w-full">
            <h2 className="text-xl font-bold mb-4">Complete the Pattern</h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">Identiy the missing piece.</p>
            {questionImg && <img src={`data:image/png;base64,${questionImg}`} className="w-[300px] rounded-lg shadow-lg mb-8" />}
            <div className={`flex gap-4 justify-center mb-8 ${status === 'fail' && isBotMode ? 'shake-animation' : ''}`}>
                {options.map((opt, idx) => (
                    <motion.div
                        key={idx}
                        onClick={() => !isBotMode && setSelectedOption(idx)}
                        className={`w-20 h-20 rounded border-2 cursor-pointer 
                        ${selectedOption === idx ? (status === 'fail' ? 'border-red-500 bg-red-500/20' : 'border-primary ring-2') : 'border-white/20'}
                        `}
                        animate={isBotMode && selectedOption === idx ? { scale: [1, 1.1, 1] } : {}}
                    >
                        <img src={`data:image/png;base64,${opt}`} className="w-full h-full object-cover" />
                    </motion.div>
                ))}
            </div>
            <div className={`flex gap-4 ${isBotMode ? 'opacity-50 pointer-events-none' : ''}`}>
                <Button onClick={fetchChallenge} variant="outline"><RefreshCw className="h-4 w-4 mr-2" /> New</Button>
                <Button onClick={verify} disabled={status === 'success'}>Verify</Button>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// TYPE 3: Memory Mode Captcha
// ----------------------------------------------------------------------
const MemoryCaptcha = ({ isBotMode }: { isBotMode?: boolean }) => {
    const [challengeId, setChallengeId] = useState<number | null>(null);
    const [targetImg, setTargetImg] = useState<string | null>(null);
    const [options, setOptions] = useState<string[]>([]);
    const [phase, setPhase] = useState<'loading' | 'memorize' | 'recall' | 'result'>('loading');
    const [timeLeft, setTimeLeft] = useState(3);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    // Note: Bot logic for Memory is tricky as it relies on timing. 
    // We'll simplify: Bot "checks" image instantly then fails recall.
    useEffect(() => {
        if (!isBotMode) return;
        // If in memorize phase, bot waits.
        if (phase === 'recall') {
            const timeout = setTimeout(() => {
                setSelectedOption(Math.floor(Math.random() * 4)); // Random guess
                setPhase('result');
                setIsSuccess(false);
                toast.error("Bot verification failed: Memory Buffer Empty");
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [phase, isBotMode]);

    const fetchChallenge = async () => {
        setPhase('loading');
        setTimeLeft(3);
        setSelectedOption(null);
        setIsSuccess(false);
        try {
            const res = await api.get('/api/captcha/generate-memory');
            setChallengeId(res.data.challenge_id);
            setTargetImg(res.data.target_image);
            setOptions(res.data.options);
            setPhase('memorize');
        } catch (e) {
            console.error(e);
            toast.error("Failed to load memory challenge");
        }
    };

    useEffect(() => { fetchChallenge(); }, []);

    useEffect(() => {
        if (phase === 'memorize') {
            const interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        setPhase('recall');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000); // Standard human timing, bot observes this
            return () => clearInterval(interval);
        }
    }, [phase]);

    const verify = async () => {
        if (selectedOption === null) return;
        try {
            const res = await api.post('/api/captcha/verify', { challenge_id: challengeId, answer: selectedOption });
            setIsSuccess(res.data.success);
            setPhase('result');
            if (res.data.success) toast.success("Memory Verified!");
            else toast.error("Incorrect. Try again.");
        } catch (e) { toast.error("Verification error"); }
    };

    return (
        <div className="flex flex-col items-center w-full min-h-[400px]">
            <h2 className="text-xl font-bold mb-2">Memory Match</h2>
            {phase === 'loading' && <div className="animate-pulse">Loading...</div>}
            {phase === 'memorize' && (
                <div className="flex flex-col items-center">
                    <p className="text-sm text-yellow-500 mb-4 animate-pulse font-bold">Memorize this pattern! ({timeLeft}s)</p>
                    <motion.div className="w-[280px] h-[280px] rounded-xl overflow-hidden shadow-2xl border-4 border-yellow-500/50">
                        <img src={`data:image/png;base64,${targetImg}`} className="w-full h-full object-cover" />
                    </motion.div>
                </div>
            )}
            {(phase === 'recall' || phase === 'result') && (
                <div className="flex flex-col items-center">
                    <p className="text-sm text-muted-foreground mb-6">Select the pattern you just saw.</p>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        {options.map((opt, idx) => (
                            <motion.div key={idx} whileHover={phase === 'recall' && !isBotMode ? { scale: 1.05 } : {}} onClick={() => { if (phase === 'recall' && !isBotMode) setSelectedOption(idx); }} className={`w-32 h-32 rounded-lg border-2 cursor-pointer overflow-hidden relative ${selectedOption === idx ? 'border-primary ring-2 ring-primary' : 'border-white/10'} ${phase === 'result' && isSuccess && selectedOption === idx ? 'bg-green-500/20 border-green-500' : ''} ${phase === 'result' && !isSuccess && selectedOption === idx ? 'bg-red-500/20 border-red-500' : ''}`}>
                                <img src={`data:image/png;base64,${opt}`} className="w-full h-full object-cover" />
                                {phase === 'result' && selectedOption === idx && <div className="absolute inset-0 flex items-center justify-center bg-black/40">{isSuccess ? <CheckCircle className="text-green-500 w-8 h-8" /> : <span className="text-red-500 font-bold text-xl">X</span>}</div>}
                            </motion.div>
                        ))}
                    </div>
                    {phase === 'recall' && <Button onClick={verify} disabled={selectedOption === null || isBotMode} className="w-full max-w-xs">{isBotMode ? 'Bot Analysing...' : 'Confirm Selection'}</Button>}
                    {phase === 'result' && <Button onClick={fetchChallenge} variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" /> Try Again</Button>}
                </div>
            )}
        </div>
    );
};

// ----------------------------------------------------------------------
// TYPE 4: Rotate Captcha
// ----------------------------------------------------------------------
const RotateCaptcha = ({ isBotMode }: { isBotMode?: boolean }) => {
    const [challengeId, setChallengeId] = useState<number | null>(null);
    const [img, setImg] = useState<string | null>(null);
    const [initialAngle, setInitialAngle] = useState(0);
    const [targetAngle, setTargetAngle] = useState(0);
    const [userAngle, setUserAngle] = useState(0);
    const [status, setStatus] = useState<'idle' | 'success' | 'fail'>('idle');

    useEffect(() => {
        if (!isBotMode) { setUserAngle(0); setStatus('idle'); return; }
        const botAction = async () => {
            // Bot spins wildly
            setStatus('idle');
            setUserAngle(Math.random() * 360 - 180);
            await new Promise(r => setTimeout(r, 200));
            setUserAngle(Math.random() * 360 - 180);
            await new Promise(r => setTimeout(r, 200));
            setUserAngle(Math.random() * 360 - 180); // Can't find the angle
            await new Promise(r => setTimeout(r, 500));
            setStatus('fail');
            toast.error("Bot verification failed: No Visual Convergence");
        }
        const interval = setInterval(botAction, 2500);
        return () => clearInterval(interval);
    }, [isBotMode]);

    const fetchChallenge = async () => {
        setStatus('idle'); setUserAngle(0); setImg(null);
        try {
            const res = await api.get('/api/captcha/generate-rotate');
            setChallengeId(res.data.challenge_id);
            setImg(res.data.image);
            setInitialAngle(res.data.initial_angle);
            setTargetAngle(res.data.target_angle);
        } catch (e) { toast.error("Failed to load rotate captcha"); }
    };
    useEffect(() => { fetchChallenge(); }, []);

    const verify = async () => {
        try {
            // Calculate total angle normalized to 0-360
            const totalAngle = (initialAngle + userAngle + 360) % 360;
            const res = await api.post('/api/captcha/verify', { challenge_id: challengeId, answer: totalAngle });
            if (res.data.success) { setStatus('success'); toast.success("Perfect alignment!"); }
            else { setStatus('fail'); toast.error("Incorrect angle."); }
        } catch (e) { toast.error("Error verifying"); }
    };

    // Visual angle for the image
    const currentVisualAngle = (initialAngle + userAngle);

    return (
        <div className="flex flex-col items-center w-full">
            <h2 className="text-xl font-bold mb-2">Rotate Match</h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">
                Rotate to match <span className="text-yellow-500 font-bold">{targetAngle}°</span>
                <span className="text-xs opacity-50 block mt-1">(Start: {initialAngle}°)</span>
            </p>

            <div className={`bg-black/40 p-8 rounded-full border border-white/10 shadow-2xl mb-8 relative group ${status === 'fail' && isBotMode ? 'border-red-500' : ''}`}>
                {/* Guide ring */}
                <div className="absolute inset-0 rounded-full border border-dashed border-white/10 pointer-events-none" />

                {/* Target Indicator (Static red marker) */}
                <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60 transition-all duration-500"
                    style={{ rotate: `${targetAngle}deg` }}
                >
                    <div className="w-1 h-5 bg-red-500 absolute -top-2.5 shadow-[0_0_8px_red]" />
                    <div className="w-full h-px bg-red-500/20 absolute" />
                </div>

                {/* Current Indicator (Dynamic green marker) */}
                <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                    style={{ rotate: `${currentVisualAngle}deg` }}
                >
                    <div className={`w-1 h-5 ${status === 'fail' ? 'bg-red-500' : 'bg-green-500'} absolute -top-2.5 shadow-[0_0_8px_lime]`} />
                </div>

                <motion.div
                    className="w-56 h-56 rounded-full overflow-hidden relative z-10"
                    style={{ rotate: currentVisualAngle }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    {img && <img src={`data:image/png;base64,${img}`} className="w-full h-full object-cover" />}
                </motion.div>
            </div>

            <div className={`w-64 mb-8 ${isBotMode ? 'opacity-50 pointer-events-none' : ''}`}>
                <Slider
                    defaultValue={[0]}
                    max={180}
                    min={-180}
                    step={1}
                    value={[userAngle]}
                    onValueChange={(val) => setUserAngle(val[0])}
                    className="cursor-pointer"
                    slideOnly={true}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2 font-mono">
                    <span>-180</span>
                    <span className="text-yellow-500 font-bold">{userAngle > 0 ? `+${userAngle}` : userAngle}°</span>
                    <span>+180</span>
                </div>
            </div>

            <div className={`flex gap-4 ${isBotMode ? 'opacity-50 pointer-events-none' : ''}`}>
                <Button onClick={fetchChallenge} variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" /> Reset</Button>
                <Button onClick={verify} disabled={status === 'success'}>Verify Alignment</Button>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// TYPE 5: Slider Captcha (2D Drag)
// ----------------------------------------------------------------------
const SliderCaptcha = ({ isBotMode }: { isBotMode?: boolean }) => {
    const [challengeId, setChallengeId] = useState<number | null>(null);
    const [bgImg, setBgImg] = useState<string | null>(null);
    const [pieceImg, setPieceImg] = useState<string | null>(null);

    // Position state
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

    const [status, setStatus] = useState<'idle' | 'success' | 'fail'>('idle');

    useEffect(() => {
        if (!isBotMode) { setStatus('idle'); return; }
        const botAction = async () => {
            // Bot moves sliders erratically
            setCurrentPos({ x: Math.random() * 200, y: Math.random() * 200 });
            await new Promise(r => setTimeout(r, 400));
            setCurrentPos({ x: Math.random() * 200, y: Math.random() * 200 });
            await new Promise(r => setTimeout(r, 600));
            setStatus('fail');
            toast.error("Bot verification failed: Trajectory Unnatural");
            setCurrentPos(startPos); // Reset
        }
        const interval = setInterval(botAction, 3000);
        return () => clearInterval(interval);
    }, [isBotMode, startPos]);

    const fetchChallenge = async () => {
        setStatus('idle'); setBgImg(null); setPieceImg(null);
        try {
            const res = await api.get('/api/captcha/generate-slider');
            setChallengeId(res.data.challenge_id);
            setBgImg(res.data.background);
            setPieceImg(res.data.piece);
            setStartPos(res.data.start);
            setCurrentPos(res.data.start); // Init current pos
        } catch (e) { toast.error("Failed to load slider captcha"); }
    };
    useEffect(() => { fetchChallenge(); }, []);

    const verify = async () => {
        try {
            const res = await api.post('/api/captcha/verify', { challenge_id: challengeId, answer: currentPos });
            if (res.data.success) { setStatus('success'); toast.success("Puzzle Solved!"); }
            else { setStatus('fail'); toast.error("Incorrect position."); }
        } catch (e) { toast.error("Error verifying"); }
    };

    return (
        <div className="flex flex-col items-center w-full">
            <h2 className="text-xl font-bold mb-2">Drag to Fill</h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">
                Use the slider below to fill the hole.
            </p>

            <div className="flex gap-6 items-start">
                {/* Image Container */}
                <div className={`relative w-[300px] h-[300px] rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl mb-6 bg-black group touch-none ${status === 'fail' && isBotMode ? 'border-red-500' : ''}`}>
                    {bgImg && <img src={`data:image/png;base64,${bgImg}`} className="absolute inset-0 w-full h-full object-cover opacity-90" />}

                    {pieceImg && (
                        <motion.div
                            initial={{ x: startPos.x, y: startPos.y }}
                            animate={{ x: currentPos.x, y: currentPos.y }}
                            transition={{ type: "tween", duration: isBotMode ? 0.3 : 0 }}
                            className="absolute w-[60px] h-[60px] z-20 top-0 left-0" // Exact 60x60 size
                        >
                            {/* Image Layer - Exact 60x60, no shrinking */}
                            <img src={`data:image/png;base64,${pieceImg}`} className="w-full h-full object-cover" />

                            {/* Border/Highlight Overlay - Removed CSS border, backend handles red border inside 60x60 */}
                            <div className={`absolute inset-0 shadow-[0_0_10px_rgba(0,0,0,0.5)] opacity-100 pointer-events-none`} />

                            {/* Inner Shine */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent pointer-events-none mix-blend-overlay" />
                        </motion.div>
                    )}
                </div>

                {/* Vertical Slider Control */}
                <div className={`h-[300px] w-12 bg-zinc-800 border border-zinc-700 p-2 rounded-xl z-30 flex flex-col items-center justify-between py-4 ${isBotMode ? 'opacity-50 pointer-events-none' : ''}`}>
                    <p className="text-[10px] text-muted-foreground writing-vertical-lr rotate-180 mb-2">Vertical</p>
                    <Slider
                        defaultValue={[0]}
                        max={240}
                        step={1}
                        orientation="vertical"
                        value={[240 - currentPos.y]} // Inverted for UI intuition (up is up)
                        onValueChange={(val) => setCurrentPos(prev => ({ ...prev, y: 240 - val[0] }))}
                        className="cursor-pointer h-full"
                    />
                </div>
            </div>

            {/* Horizontal Slider Control */}
            <div className={`w-[300px] mb-8 bg-zinc-800 border border-zinc-700 p-4 rounded-xl z-30 relative ${isBotMode ? 'opacity-50 pointer-events-none' : ''}`}>
                <Slider
                    defaultValue={[0]}
                    max={240}
                    step={1}
                    value={[currentPos.x || 0]}
                    onValueChange={(val) => setCurrentPos(prev => ({ ...prev, x: val[0] }))}
                    className="cursor-pointer py-4"
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">Horizontal Position</p>
            </div>

            <div className={`flex gap-4 ${isBotMode ? 'opacity-50 pointer-events-none' : ''}`}>
                <Button onClick={fetchChallenge} variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" /> Reset</Button>
                <Button onClick={verify} disabled={status === 'success'}>Verify Puzzle</Button>
            </div>
        </div>
    );
};
