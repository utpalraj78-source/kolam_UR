import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Upload, Lock, CheckCircle2, Phone, PhoneOff, Mic, MicOff, Play, Activity, Pause } from 'lucide-react';
import { encodeAudioToKolam, KolamAudioPayload } from '@/utils/kolamDataConverter';
import { toast } from 'sonner';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceCall } from '@/hooks/useVoiceCall';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AudioChunkVisualizer } from '@/components/AudioChunkVisualizer';
import { KolamCanvas } from '@/components/KolamCanvas';

/** Helper to hash params to create a unique Room ID */
async function generateRoomId(params: any): Promise<string> {
    const canonical = {
        symmetry: params.symmetry,
        randomness: params.randomness,
        k: params.k,
        seed: params.seed,
        mod: params.mod,
    };
    const str = JSON.stringify(canonical);
    const msgBuffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 12);
}

const KolamChat = () => {
    // Connection & room state
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'waiting' | 'connected' | 'approval_required' | 'waiting_approval'>('idle');
    const [roomId, setRoomId] = useState<string | null>(null);
    const [userId] = useState(() => 'user_' + Math.random().toString(36).substring(2, 9));
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [kolamParams, setKolamParams] = useState<any>(null);
    const [keyArray, setKeyArray] = useState<number[]>([]);
    // const [messages, setMessages] = useState<any[]>([]); // Text messages removed
    // const [statusLogs, setStatusLogs] = useState<{ content: string, timestamp: number, type: 'system' | 'error' | 'info' }[]>([]); // Removed logs
    // const [inputMsg, setInputMsg] = useState(''); // Text input removed

    // Derived Kolam Size
    const k = kolamParams?.k || 8;
    const channels = k * k;

    // Voice Call & Audio State
    const [sentChunks, setSentChunks] = useState<{ encrypted: Float32Array, noise: Float32Array, channel: number, original: Float32Array }[]>([]);
    const [receivedChunks, setReceivedChunks] = useState<{ decrypted: Float32Array, noise: Float32Array, encrypted: Float32Array, channel: number }[]>([]);
    const [callDuration, setCallDuration] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);

    // Demo Mode State
    const [demoMode, setDemoMode] = useState(false);
    const [selectedDemoChunks, setSelectedDemoChunks] = useState<number[]>([]);
    const [demoAudioFile, setDemoAudioFile] = useState<File | null>(null);
    const [demoIsPlaying, setDemoIsPlaying] = useState(false);
    const [demoPlaybackSpeed, setDemoPlaybackSpeed] = useState(1); // 0.5, 1, 2
    const [demoVisualData, setDemoVisualData] = useState<{
        waveform: number[];
        bits: number[];
        kolam: { k: number, rows: number[][], cols: number[][] } | null;
        channel: number;
    } | null>(null);

    // UI State
    const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
    const [modalImage, setModalImage] = useState<string | null>(null);
    const [selectedChunk, setSelectedChunk] = useState<{ type: 'sent' | 'received', index: number } | null>(null);

    // Refs
    const wsRef = useRef<WebSocket | null>(null);
    const callTimerRef = useRef<NodeJS.Timeout | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Animation Frame for Demo Lab (Only if NOT playing real demo audio)
    const [animFrame, setAnimFrame] = useState(0);
    useEffect(() => {
        let frameId: number;
        const animate = () => {
            setAnimFrame(prev => (prev + 1) % 1000);
            frameId = requestAnimationFrame(animate);
        };
        if (demoMode && !demoIsPlaying) {
            frameId = requestAnimationFrame(animate);
        }
        return () => cancelAnimationFrame(frameId);
    }, [demoMode, demoIsPlaying]);

    // Demo Audio Processing Logic
    const handleDemoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setDemoAudioFile(e.target.files[0]);
            toast.success("Audio loaded for demonstration.");
        }
    };

    const startDemoPlayback = async () => {
        if (!demoAudioFile) return;
        setDemoIsPlaying(true);

        try {
            const arrayBuffer = await demoAudioFile.arrayBuffer();
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            const channelData = audioBuffer.getChannelData(0); // Mono

            // Process in chunks of 4096
            const chunkSize = 4096;
            let offset = 0;

            const processChunk = () => {
                if (offset >= channelData.length || !demoIsPlaying) { // Check demoIsPlaying ref if possible, but state is tricky in loop
                    setDemoIsPlaying(false);
                    return;
                }

                const end = Math.min(offset + chunkSize, channelData.length);
                const chunk = channelData.slice(offset, end);

                // 1. Encode to Kolam
                const kolamPayload = encodeAudioToKolam(chunk);

                // 2. Simulate Channel Hopping (Aggregate bits from key or just random if no key)
                let channel = 0;
                if (keyArray.length > 0) {
                    // Simple simulation of hopping
                    const chunkIdx = Math.floor(offset / chunkSize);
                    let val = 0;
                    for (let i = 0; i < 8; i++) {
                        const keyIdx = (chunkIdx * 8 + i) % keyArray.length;
                        val = (val << 1) | (keyArray[keyIdx] & 1);
                    }
                    channel = val % channels;
                } else {
                    channel = Math.floor(Math.random() * channels);
                }

                // 3. Update Visuals
                // Downsample waveform for UI
                const waveform = [];
                const step = Math.ceil(chunk.length / 64);
                for (let i = 0; i < 64; i++) {
                    waveform.push(Math.abs(chunk[i * step] || 0));
                }

                // Sample bits
                const bits = []; // Just show first 64 bits for UI
                // We can extract bits from kolamPayload rows/cols to be accurate
                let bitCount = 0;
                for (const row of kolamPayload.rows) {
                    for (const bit of row) {
                        if (bitCount < 64) bits.push(bit);
                        bitCount++;
                    }
                }

                setDemoVisualData({
                    waveform,
                    bits,
                    kolam: { k: kolamPayload.k, rows: kolamPayload.rows, cols: kolamPayload.cols },
                    channel
                });

                // Play Audio Chunk (Optional, for feedback)
                // playAudio(chunk); // Might be too choppy without proper scheduling, let's skip audio out for now or implement proper scheduling later.

                offset += chunkSize;

                // Delay for speed control
                // 4096 samples @ 44.1k is ~92ms. 
                // Speed 1x = 92ms delay. 0.5x = 184ms. 2x = 46ms.
                const baseDelay = (chunkSize / audioBuffer.sampleRate) * 1000;
                setTimeout(processChunk, baseDelay / demoPlaybackSpeed);
            };

            processChunk();

        } catch (e) {
            console.error("Demo playback error", e);
            toast.error("Failed to process audio file.");
            setDemoIsPlaying(false);
        }
    };

    const stopDemoPlayback = () => {
        setDemoIsPlaying(false);
        // The loop in startDemoPlayback checks this state, but might run one more time.
        // Ideally use a ref for immediate stop, but this is okay for demo.
    };

    // Callbacks for Voice Call
    const handleChunkSent = useCallback((encrypted: Float32Array, noise: Float32Array, channel: number, original: Float32Array) => {
        setSentChunks(prev => [...prev.slice(-19), { encrypted, noise, channel, original }]);
    }, []);

    const handleChunkReceived = useCallback((decrypted: Float32Array, noise: Float32Array, encrypted: Float32Array, channel: number) => {
        setReceivedChunks(prev => [...prev.slice(-9), { decrypted, noise, encrypted, channel }]);
    }, []);

    // Voice Call Hook
    const {
        isCallActive,
        callStatus,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        isMuted,
        toggleMute,
        handleIncomingCall,
        incomingCaller,
        setIncomingCaller
    } = useVoiceCall({
        roomId,
        userId,
        wsRef,
        isConnected,
        kolamKey: keyArray,
        onChunkSent: handleChunkSent,
        onChunkReceived: handleChunkReceived,
        channels: channels
    });

    // Debug logging for connection
    useEffect(() => {
        console.log('Connection Status Changed:', connectionStatus);
    }, [connectionStatus]);

    // Call Duration Timer
    useEffect(() => {
        if (isCallActive) {
            setSentChunks([]); // Clear previous chunks on new call
            setReceivedChunks([]);
            setCallDuration(0);
            callTimerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (callTimerRef.current) clearInterval(callTimerRef.current);
            // Do not reset duration here, so we can display it in the summary
        }
        return () => {
            if (callTimerRef.current) clearInterval(callTimerRef.current);
        };
    }, [isCallActive]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Log call status changes - REMOVED
    // Auto‑scroll logs - REMOVED

    // Timer for waiting state
    useEffect(() => {
        if (connectionStatus === 'waiting') {
            setTimeLeft(60);
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        setConnectionStatus('idle');
                        setIsConnected(false);
                        toast.error('Connection timed out. No peer found.');
                        wsRef.current?.close();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [connectionStatus]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setUploadedFile(e.target.files[0]);
    };

    const handleConnect = async () => {
        console.log('handleConnect started');
        if (!uploadedFile) return toast.error('Please upload a Kolam credential.');
        setConnectionStatus('connecting');
        try {
            let params: any;
            const api = axios.create({ baseURL: '' });

            console.log('Processing file:', uploadedFile.name, uploadedFile.type);
            if (uploadedFile.type === 'application/json') {
                const text = await uploadedFile.text();
                params = JSON.parse(text);
            } else if (uploadedFile.type.startsWith('image/')) {
                const formData = new FormData();
                formData.append('file', uploadedFile);
                const { data } = await api.post('/lookup-image-config', formData);
                params = data;
            } else {
                throw new Error('Unsupported file type');
            }
            console.log('Params parsed:', params);

            // Validate parameters
            if (!params.symmetry || !params.k || typeof params.k !== 'number') {
                throw new Error('Invalid credential file: Missing or invalid Kolam parameters (symmetry, k).');
            }

            // Generate the actual Kolam Key (Hybrid Key) from the parameters
            console.log('Generating Kolam Key from params...');
            const keyResponse = await api.post('/generate-kolam-key', {
                symmetry: params.symmetry,
                randomness: params.randomness,
                k: params.k,
                seed: params.seed,
                mod: params.mod || 2,
                bits_per_cell: params.bits_per_cell || 1,
                min_hops: params.min_hops,
                layout: params.layout,
                curve_color: params.curve_color,
                dot_color: params.dot_color,
                key: params.key,
                ctr: params.ctr,
                t: params.t
            });

            const generatedKey = keyResponse.data.hybrid_key;
            if (!generatedKey || !Array.isArray(generatedKey) || generatedKey.length === 0) {
                throw new Error('Failed to generate valid Kolam key from parameters.');
            }
            console.log('Kolam Key generated, length:', generatedKey.length);

            setKeyArray(generatedKey);
            setKolamParams(params);

            const rid = await generateRoomId(params);
            console.log('Generated Room ID:', rid);
            setRoomId(rid);

            // Use relative path for WebSocket - Vite proxy will handle it
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws/chat/${rid}/${userId}`;
            console.log('Connecting to WebSocket:', wsUrl);
            const ws = new WebSocket(wsUrl);
            ws.onopen = () => {
                console.log('WS Connected');
                ws.send(JSON.stringify({ type: 'init', params }));
            };
            ws.onmessage = async (event) => {
                if (event.data instanceof Blob) {
                    // binary audio handled by useVoiceCall
                    return;
                }
                const data = JSON.parse(event.data as string);

                if (data.type === 'status') {
                    if (data.status === 'waiting') {
                        setConnectionStatus('waiting');
                    } else if (data.status === 'approval_required') {
                        setConnectionStatus('approval_required');
                        toast.info(data.message);
                    } else if (data.status === 'waiting_approval') {
                        setConnectionStatus('waiting_approval');
                        toast.info(data.message);
                    } else if (data.status === 'connected') {
                        setConnectionStatus('connected');
                        setIsConnected(true);
                        toast.success(data.message);
                    } else if (data.status === 'disconnected') {
                        setConnectionStatus('idle');
                        setIsConnected(false);
                        toast.error(data.message);
                        ws.close();
                    }
                } else if (data.type === 'call_request' && handleIncomingCall) {
                    handleIncomingCall(data.callerId);
                } else if (data.type === 'chat') {
                    // Ignore text chat messages as per requirement
                }
            };
            ws.onclose = () => {
                console.log('WS Closed');
                setIsConnected(false);
                setConnectionStatus('idle');
            };
            wsRef.current = ws;
        } catch (err: any) {
            console.error('Connection error:', err);
            toast.error('Failed to connect: ' + err.message);
            setConnectionStatus('idle');
        }
    };

    const handleApprove = () => {
        wsRef.current?.send(JSON.stringify({ type: 'approve' }));
    };



    const handleDisconnect = () => {
        wsRef.current?.close();
        setConnectionStatus('idle');
        setIsConnected(false);
        setRoomId(null);
        setRoomId(null);
        setKolamParams(null);
        toast.info('Disconnected');
    };

    const closeModal = () => setModalImage(null);

    const playAudio = (data: Float32Array) => {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        const buffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
        buffer.getChannelData(0).set(data);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
    };

    const downloadRecording = () => {
        if (sentChunks.length === 0) {
            console.warn("No sent chunks to record.");
            return;
        }
        // Flatten all encrypted chunks
        const totalLength = sentChunks.reduce((acc, chunk) => acc + chunk.encrypted.length, 0);
        const result = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of sentChunks) {
            result.set(chunk.encrypted, offset);
            offset += chunk.encrypted.length;
        }

        // Convert Float32Array to WAV (simplified, assuming 44.1kHz mono)
        const buffer = new ArrayBuffer(44 + result.length * 2);
        const view = new DataView(buffer);

        // WAV Header
        const writeString = (view: DataView, offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + result.length * 2, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, 44100, true);
        view.setUint32(28, 44100 * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, 'data');
        view.setUint32(40, result.length * 2, true);

        // PCM Data
        for (let i = 0; i < result.length; i++) {
            const s = Math.max(-1, Math.min(1, result[i]));
            view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }

        const blob = new Blob([view], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kolam_encrypted_session_${Date.now()}.wav`;
        a.click();
    };

    return (
        <div className="flex h-screen bg-background overflow-hidden relative">
            {/* Image Modal */}
            <AnimatePresence>
                {modalImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={closeModal}
                    >
                        <motion.img
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                            src={modalImage}
                            alt="Full size Kolam"
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        />
                        <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20" onClick={closeModal}>
                            <span className="text-xl">×</span>
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chunk Inspection Modal */}
            <Dialog open={!!selectedChunk} onOpenChange={() => setSelectedChunk(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Encrypted Chunk Inspection</DialogTitle>
                        <DialogDescription>
                            Visualizing the audio chunk encoded within the Kolam matrix.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedChunk && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">
                                    Listen to the audio encoded in the Kolam:
                                </span>
                                <Button size="sm" onClick={() => playAudio(selectedChunk.type === 'sent'
                                    ? sentChunks[selectedChunk.index].encrypted
                                    : receivedChunks[selectedChunk.index].encrypted)}>
                                    <Play className="h-4 w-4 mr-2" /> Play Audio
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Left Panel: Chat & Connection */}
            <div className="w-1/2 flex flex-col border-r bg-card">
                {/* ... (Left Panel Content) ... */}
                <div className="p-4 border-b flex justify-between items-center bg-muted/20">
                    <div>
                        <h1 className="font-bold text-lg">Kolam Secure Chat</h1>
                        <p className="text-xs text-muted-foreground">
                            FHSS Encrypted • {roomId ? `Room: ${roomId}` : 'Not Connected'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {isConnected && (
                            <>
                                {callStatus === 'calling' ? (
                                    <Button variant="secondary" size="sm" disabled className="animate-pulse">
                                        <Phone className="h-4 w-4 mr-2" /> Calling...
                                    </Button>
                                ) : isCallActive ? (
                                    <div className="flex gap-2 items-center">
                                        <div className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-mono animate-pulse flex items-center gap-2">
                                            <div className="w-2 h-2 bg-red-600 rounded-full" />
                                            {formatDuration(callDuration)}
                                        </div>
                                        <Button variant="secondary" size="sm" onClick={toggleMute}>
                                            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={endCall}>
                                            <PhoneOff className="h-4 w-4 mr-2" /> End Call
                                        </Button>
                                    </div>
                                ) : (
                                    <Button variant="outline" size="sm" onClick={startCall}>
                                        <Phone className="h-4 w-4 mr-2" /> Call
                                    </Button>
                                )}
                                <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                                    Disconnect
                                </Button>
                            </>
                        )}
                    </div>
                </div>
                {!isConnected ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
                        <div className="w-full max-w-md space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Connect to Secure Room</CardTitle>
                                    <CardDescription>Upload your Kolam credential to match with a peer.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid w-full max-w-sm items-center gap-1.5">
                                        <Label htmlFor="kolam-file">Kolam Credential (JSON or PNG)</Label>
                                        <Input id="kolam-file" type="file" onChange={handleFileChange} accept=".json,image/png" />
                                    </div>
                                    {connectionStatus === 'idle' && (
                                        <Button className="w-full" onClick={handleConnect} disabled={!uploadedFile}>
                                            <Upload className="mr-2 h-4 w-4" /> Connect
                                        </Button>
                                    )}
                                    {connectionStatus === 'connecting' && (
                                        <Button className="w-full" disabled>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...
                                        </Button>
                                    )}
                                    {connectionStatus === 'waiting' && (
                                        <div className="text-center space-y-2">
                                            <div className="flex items-center justify-center gap-2 text-yellow-600">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                <span className="text-sm font-medium">Waiting for peer...</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Time remaining: {timeLeft}s</p>
                                        </div>
                                    )}
                                    {connectionStatus === 'approval_required' && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-3 rounded">
                                                <CheckCircle2 className="h-5 w-5" />
                                                <span className="text-sm font-medium">Peer matched! Approve connection?</span>
                                            </div>
                                            <Button className="w-full" onClick={handleApprove}>Approve Connection</Button>
                                        </div>
                                    )}
                                    {connectionStatus === 'waiting_approval' && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                <span className="text-sm font-medium">Waiting for peer to approve...</span>
                                            </div>
                                            <Button className="w-full" disabled>Approval Pending</Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 text-center">
                            <div className="w-32 h-32 rounded-full bg-green-100 flex items-center justify-center animate-pulse">
                                <Lock className="h-16 w-16 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-green-700">Secure Voice Channel Active</h2>
                                <p className="text-muted-foreground">Audio is being encrypted into Kolam structures.</p>
                            </div>
                            <div className="text-4xl font-mono font-bold text-slate-800">
                                {formatDuration(callDuration)}
                            </div>
                            <div className="text-xs text-muted-foreground max-w-xs">
                                Your voice is converted to geometric patterns and transmitted over frequency-hopping channels.
                            </div>
                        </div>
                        {/* Text Input Removed */}
                    </>
                )}
            </div>

            {/* Right Panel: Audio Visualizers & Demo Lab */}
            <div className="w-1/2 p-4 overflow-y-auto flex flex-col gap-4">
                <div className="flex gap-2 border-b pb-2">
                    <Button variant={!demoMode ? "default" : "ghost"} onClick={() => setDemoMode(false)} size="sm">
                        Live Monitor
                    </Button>
                    <Button variant={demoMode ? "default" : "ghost"} onClick={() => setDemoMode(true)} size="sm">
                        Demonstration Lab
                    </Button>
                </div>

                {!demoMode ? (
                    <>
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold">Live Audio Chunks</h2>
                            {sentChunks.length > 0 && (
                                <Button variant="outline" size="sm" onClick={downloadRecording}>
                                    <Activity className="h-4 w-4 mr-2" /> Record Session
                                </Button>
                            )}
                        </div>

                        {/* Channel Usage Grid */}
                        <Card>
                            <CardHeader className="py-3">
                                <CardTitle className="text-sm">Channel Usage (FHSS Hopping)</CardTitle>
                            </CardHeader>
                            <CardContent className="py-3">
                                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${k}, minmax(0, 1fr))` }}>
                                    {Array.from({ length: channels }).map((_, i) => {
                                        const isActive = sentChunks.length > 0 && sentChunks[sentChunks.length - 1].channel === i;
                                        return (
                                            <div key={i} className={`aspect-square rounded-sm transition-colors ${isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-muted/50'}`} />
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-sm font-medium mb-2">Sent (Audio Input)</h3>
                                {sentChunks.map((chunk, i) => (
                                    <AudioChunkVisualizer
                                        key={i}
                                        data={chunk.encrypted}
                                        label={`CH ${chunk.channel}`}
                                        channel={chunk.channel}
                                        onClick={() => setSelectedChunk({ type: 'sent', index: i })}
                                    />
                                ))}
                            </div>
                            <div>
                                <h3 className="text-sm font-medium mb-2">Received (Decoded)</h3>
                                {receivedChunks.map((chunk, i) => (
                                    <AudioChunkVisualizer
                                        key={i}
                                        data={chunk.decrypted}
                                        label={`CH ${chunk.channel}`}
                                        channel={chunk.channel}
                                        onClick={() => setSelectedChunk({ type: 'received', index: i })}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <h3 className="font-semibold">Live Encryption Pipeline</h3>
                                <p className="text-sm text-muted-foreground">
                                    Upload audio to see the exact Kolam generation and transmission process in real-time.
                                </p>
                            </div>

                            {/* Controls */}
                            <div className="flex gap-4 items-end border p-4 rounded-lg bg-muted/20">
                                <div className="grid w-full max-w-xs items-center gap-1.5">
                                    <Label htmlFor="demo-audio">Upload Audio Source</Label>
                                    <Input id="demo-audio" type="file" accept="audio/*" onChange={handleDemoFileUpload} disabled={demoIsPlaying} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Speed</Label>
                                    <div className="flex gap-1">
                                        {[0.5, 1, 2].map(s => (
                                            <Button
                                                key={s}
                                                variant={demoPlaybackSpeed === s ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setDemoPlaybackSpeed(s)}
                                                className="h-8 px-2"
                                            >
                                                {s}x
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <Button
                                    onClick={demoIsPlaying ? stopDemoPlayback : startDemoPlayback}
                                    disabled={!demoAudioFile}
                                    variant={demoIsPlaying ? "destructive" : "default"}
                                >
                                    {demoIsPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                                    {demoIsPlaying ? "Stop" : "Start Demo"}
                                </Button>
                            </div>

                            {/* Live Pipeline Visualizer */}
                            <div className="border rounded-lg p-4 bg-slate-50 space-y-6">
                                {/* Step 1: Audio Input */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-medium uppercase text-muted-foreground">
                                        <span>1. Audio Input (4096 samples)</span>
                                        <span className="text-green-600 animate-pulse">● Live</span>
                                    </div>
                                    <div className="h-12 bg-slate-900 rounded flex items-center justify-center overflow-hidden relative">
                                        {/* Simulated waveform animation */}
                                        <div className="flex items-end gap-0.5 h-full w-full px-1">
                                            {/* Real Waveform or Simulated */}
                                            {(demoIsPlaying && demoVisualData ? demoVisualData.waveform : Array.from({ length: 64 })).map((val, i) => (
                                                <div
                                                    key={i}
                                                    className="bg-green-500 w-1 opacity-80"
                                                    style={{
                                                        height: demoIsPlaying && demoVisualData
                                                            ? `${(val as number) * 100}%`
                                                            : `${20 + Math.random() * 60}%`,
                                                        transition: 'height 0.1s ease'
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Arrow Down */}
                                <div className="flex justify-center"><div className="h-4 w-0.5 bg-slate-300" /></div>

                                {/* Arrow Down */}
                                <div className="flex justify-center"><div className="h-4 w-0.5 bg-slate-300" /></div>

                                {/* Step 3: Kolam Geometry */}
                                <div className="space-y-2">
                                    <div className="text-xs font-medium uppercase text-muted-foreground">3. Geometric Encoding (Kolam)</div>
                                    <div className="aspect-square bg-white border rounded relative overflow-hidden flex items-center justify-center">
                                        {/* Canvas for Kolam - Uses Real Data if playing */}
                                        <KolamCanvas
                                            k={demoIsPlaying && demoVisualData?.kolam ? demoVisualData.kolam.k : k}
                                            seed={Date.now() + animFrame}
                                            rows={demoIsPlaying && demoVisualData?.kolam ? demoVisualData.kolam.rows : undefined}
                                            cols={demoIsPlaying && demoVisualData?.kolam ? demoVisualData.kolam.cols : undefined}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground text-center">
                                        {demoIsPlaying
                                            ? `Generated ${demoVisualData?.kolam?.k}x${demoVisualData?.kolam?.k} Kolam from audio bits.`
                                            : `Bits mapped to ${2 * k * (k + 1)} edges on a ${k}x${k} grid.`}
                                    </p>
                                </div>

                                {/* Arrow Down */}
                                <div className="flex justify-center"><div className="h-4 w-0.5 bg-slate-300" /></div>

                                {/* Step 4: Channel Hopping */}
                                <div className="space-y-2">
                                    <div className="text-xs font-medium uppercase text-muted-foreground">4. FHSS Transmission</div>
                                    <div className="h-8 bg-slate-100 rounded border flex overflow-hidden">
                                        {Array.from({ length: 20 }).map((_, i) => {
                                            // Map 20 slots to channels. If active channel falls in slot, light it up.
                                            const slotStart = Math.floor(i * (channels / 20));
                                            const slotEnd = Math.floor((i + 1) * (channels / 20));
                                            const activeChannel = demoIsPlaying && demoVisualData ? demoVisualData.channel : -1;
                                            const isActive = activeChannel >= slotStart && activeChannel < slotEnd;

                                            return (
                                                <div
                                                    key={i}
                                                    className="flex-1 border-r last:border-r-0 transition-colors duration-75"
                                                    style={{
                                                        backgroundColor: isActive
                                                            ? '#22c55e'
                                                            : (!demoIsPlaying && Math.random() > 0.8 ? '#22c55e' : 'transparent')
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                        <span>Freq Low</span>
                                        <span>Hopping...</span>
                                        <span>Freq High</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Incoming Call Dialog */}
            {
                incomingCaller && (
                    <Dialog open={true} onOpenChange={open => !open && setIncomingCaller(null)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Incoming Call</DialogTitle>
                                <DialogDescription>{`User ${incomingCaller} is calling you.`}</DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={rejectCall} className="mr-2">Reject</Button>
                                <Button onClick={acceptCall}>Accept</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )
            }
        </div >
    );
};

export default KolamChat;
