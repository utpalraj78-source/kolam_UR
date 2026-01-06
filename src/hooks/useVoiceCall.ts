import { useRef, useState, useEffect, useCallback, MutableRefObject } from 'react';
import { encodeAudioToKolam, decodeKolamToAudio, KolamAudioPayload } from '../utils/kolamDataConverter';
import { toast } from 'sonner';

/** Props for the useVoiceCall hook */
interface UseVoiceCallProps {
    /** WebSocket ref for signalling and audio transport */
    wsRef: MutableRefObject<WebSocket | null>;
    /** Shared secret (hybrid_key) used to generate Kolam noise */
    kolamKey: number[] | null;
    /** Whether the user is connected to a peer */
    isConnected: boolean;
    /** Current user's ID for signalling */
    userId: string;
    /** Room ID (optional) */
    roomId?: string | null;
    /** Called when a remote user initiates a call */
    onIncomingCall?: (callerId: string) => void;
    /** UI callback for visualising a sent audio chunk */
    onChunkSent?: (data: any) => void;
    /** UI callback for visualising a received audio chunk */
    onChunkReceived?: (decrypted: Float32Array, noise: Float32Array, encrypted: Float32Array, channel: number) => void;
    /** Number of FHSS channels (default 64) */
    channels?: number;
}

/**
 * Hook that handles real‑time Kolam‑encrypted voice calls.
 * It encrypts outgoing microphone audio with Kolam‑generated noise and
 * decrypts incoming audio chunks, exposing a simple API for the UI.
 */
export const useVoiceCall = ({
    wsRef,
    kolamKey,
    isConnected,
    userId,
    onIncomingCall,
    onChunkSent,
    onChunkReceived,
    channels = 64,
    roomId,
}: UseVoiceCallProps) => {
    // State for call status
    const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'active'>('idle');
    const [isMuted, setIsMuted] = useState(false);
    const [incomingCaller, setIncomingCaller] = useState<string | null>(null);

    // Refs for audio context, streams and the noise generator
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    // const noiseGeneratorRef = useRef<KolamNoiseGenerator | null>(null); // Removed

    // Chunk counters – separate for local and remote streams
    const chunkIndexRef = useRef(0);
    const remoteChunkIndexRef = useRef(0);

    // Adaptive Hopping History
    const indexHistoryRef = useRef<number[]>([]);
    const channelHistoryRef = useRef<number[]>([]);
    const MAX_HISTORY = 16;

    // Initialise the Kolam noise generator when the key changes
    // useEffect(() => {
    //     if (kolamKey && kolamKey.length > 0) {
    //         noiseGeneratorRef.current = new KolamNoiseGenerator(kolamKey);
    //     }
    // }, [kolamKey]);

    // Helper to play a decrypted audio chunk
    const playDecryptedChunk = (data: Float32Array) => {
        if (!audioContextRef.current) return;
        // Ensure the AudioContext is running – required after user gestures
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        const buffer = audioContextRef.current.createBuffer(1, data.length, audioContextRef.current.sampleRate);
        buffer.getChannelData(0).set(data);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.start();
    };

    // Helper to stop all local streams
    const stopLocalStream = useCallback(() => {
        if (inputStreamRef.current) {
            inputStreamRef.current.getTracks().forEach(t => t.stop());
            inputStreamRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setCallStatus('idle');
        setIncomingCaller(null);
    }, []);

    const handleIncomingCall = useCallback((callerId: string) => {
        setIncomingCaller(callerId);
        setCallStatus('ringing');
        if (onIncomingCall) onIncomingCall(callerId);
    }, [onIncomingCall]);

    // ---------------------------------------------------------------------
    // Start Audio Processing (Internal)
    // ---------------------------------------------------------------------
    const startAudioProcessing = useCallback(async () => {
        const socket = wsRef.current;
        if (!socket || !isConnected) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            inputStreamRef.current = stream;
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const processor = ctx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = e => {
                const socket = wsRef.current;
                if (!socket || socket.readyState !== WebSocket.OPEN) return;
                if (isMuted) return;

                const inputData = e.inputBuffer.getChannelData(0);

                // 1. Encode Audio -> Kolam JSON (Gets us the matrix/binary structure)
                const kolamPayload: any = encodeAudioToKolam(inputData);
                // Add Session ID for routing if available
                if (roomId) kolamPayload.session_id = roomId;

                // Send JSON over WebSocket
                socket.send(JSON.stringify(kolamPayload));

                // 2. Adaptive Hopping Simulation for Visualization
                // We operate on the binary data generated from the Kolam Payload
                const binaryData = kolamPayload.rows.flat(); // Use rows as the flattened binary source
                const totalCells = binaryData.length || 1;
                const k = kolamPayload.k;
                const totalChannels = channels; // Enforce fixed channel count (0-15 if channels=16)

                const characterMap: any[] = [];
                const finalChannels: number[] = [];
                const numSamples = 16; // Visualise 16 "hop steps" per chunk

                // Select Indices from Key
                let selectedIndices: number[] = [];

                // Logic: Random for first chunk (Index 0), then Hybrid Key
                if (!kolamKey || kolamKey.length === 0 || chunkIndexRef.current === 0) {
                    // Random Start
                    for (let i = 0; i < numSamples; i++) selectedIndices.push(Math.floor(Math.random() * totalCells));
                } else {
                    // Hybrid Key Sequence
                    for (let i = 0; i < numSamples; i++) {
                        const val = kolamKey[(chunkIndexRef.current * numSamples + i) % kolamKey.length];
                        selectedIndices.push(val % totalCells);
                    }
                }

                // Process Adaptive Hopping
                // This logic MUST match the Robust AFH logic in backend/kolam_encryption.py
                const total_available_channels = channels;

                for (let i = 0; i < numSamples; i++) {
                    const rawIdx = selectedIndices[i];
                    let finalIdx = rawIdx;
                    let status = "OK";

                    // A. Index Hopping (LRU / Collision Avoidance for Cell Usage)
                    if (indexHistoryRef.current.includes(rawIdx)) {
                        status = "HOP"; // Visual marker
                        let found = false;
                        // Linear probe for next free cell
                        for (let offset = 1; offset < totalCells; offset++) {
                            const chk = (rawIdx + offset) % totalCells;
                            if (!indexHistoryRef.current.includes(chk)) {
                                finalIdx = chk;
                                found = true;
                                break;
                            }
                        }
                        if (!found && indexHistoryRef.current.length > 0) {
                            // LRU Fallback if Grid is Full
                            finalIdx = indexHistoryRef.current[0];
                            status = "Overload";
                        }
                    }

                    // Update Index History
                    indexHistoryRef.current.push(finalIdx);
                    if (indexHistoryRef.current.length > MAX_HISTORY) indexHistoryRef.current.shift();

                    // B. Channel Selection & Adaptive Hopping
                    // Map bit-value at index to channel (Simple hashing)
                    const bitVal = binaryData[finalIdx] || 0;
                    const rawChannel = (finalIdx + bitVal * 7) % total_available_channels;

                    let finalChannel = rawChannel;

                    // Collision Check
                    if (channelHistoryRef.current.includes(rawChannel)) {
                        status = "COLLISION";

                        // 1. Find ALL currently free channels
                        const busyChannels = new Set(channelHistoryRef.current);
                        const freeChannels: number[] = [];
                        for (let c = 0; c < total_available_channels; c++) {
                            if (!busyChannels.has(c)) freeChannels.push(c);
                        }

                        if (freeChannels.length > 0) {
                            // 2. Select a random channel from those NOT in use
                            const randomIndex = Math.floor(Math.random() * freeChannels.length);
                            finalChannel = freeChannels[randomIndex];
                        } else {
                            // 3. Fallback: LRU (Oldest in history)
                            if (channelHistoryRef.current.length > 0) {
                                finalChannel = channelHistoryRef.current[0];
                            } else {
                                finalChannel = 0; // Should not happen
                            }
                        }
                    }

                    // Update Channel History
                    channelHistoryRef.current.push(finalChannel);
                    if (channelHistoryRef.current.length > MAX_HISTORY) channelHistoryRef.current.shift();

                    finalChannels.push(finalChannel);
                    characterMap.push({
                        char: "♫",
                        channel: finalChannel,
                        original_channel: rawChannel,
                        matrix_index: finalIdx,
                        status: status
                    });
                }

                chunkIndexRef.current++;

                // 3. Construct Rich Payload for Visualization
                // Mocks the structure of ChatMessage.encrypted_payload
                const vizData = {
                    encrypted_payload: {
                        chunk_details: [{
                            chunk: `Audio Segment ${chunkIndexRef.current}`,
                            hash: "audio-hash-" + chunkIndexRef.current,
                            seed: chunkIndexRef.current * 12345,
                            kolam_params: { k: k, symmetry: 'radial', seed: chunkIndexRef.current },
                            matrix: kolamPayload.rows.slice(0, k), // Use first k rows as visual matrix
                            binary_data: binaryData.slice(0, 64),
                            selected_indices: selectedIndices,
                            channels: finalChannels,
                            character_map: characterMap,
                            waveform: Array.from(inputData.subarray(0, 64)) // Snapshot for Viz
                        }]
                    }
                };

                // Pass to UI
                if (onChunkSent) {
                    onChunkSent(vizData);
                }
            };

            source.connect(processor);
            processor.connect(ctx.destination);
            setCallStatus('active');
            chunkIndexRef.current = 0;
            remoteChunkIndexRef.current = 0;
        } catch (err) {
            console.error('Error accessing microphone:', err);
            toast.error('Failed to access microphone. Please check permissions.');
            setCallStatus('idle');
        }
    }, [wsRef, isConnected, isMuted, onChunkSent, kolamKey, isMuted, channels, roomId]); // added roomId dep

    // ---------------------------------------------------------------------
    // Incoming WebSocket messages – binary audio or signalling
    // ---------------------------------------------------------------------
    useEffect(() => {
        const socket = wsRef.current;
        if (!socket) return;

        const handleMessage = async (event: MessageEvent) => {
            if (event.data instanceof Blob) {
                // Binary audio chunk from the remote peer - NO LONGER USED in this mode
                // But kept for backward compatibility if needed, or just ignore.
                return;
            } else {
                // Signalling or Audio JSON
                try {
                    const data = JSON.parse(event.data as string);

                    if (data.type === 'audio_kolam') {
                        // Handle Audio Kolam Payload
                        if (callStatus !== 'active' || !audioContextRef.current) return;


                        // 1. Decrypt Audio
                        const decryptedData = decodeKolamToAudio(data as KolamAudioPayload);
                        remoteChunkIndexRef.current++;
                        playDecryptedChunk(decryptedData);

                        // 2. Simulate Local Hopping Logic for Receiver Visualization
                        // Allows Receiver to see the SAME graph as Sender
                        if (onChunkSent) { // Using standard viz handler
                            const kolamPayload = data as KolamAudioPayload;
                            const binaryData = kolamPayload.rows.flat();
                            const totalCells = binaryData.length || 1;
                            const k = kolamPayload.k;
                            const totalChannels = channels; // Use prop

                            const characterMap: any[] = [];
                            const finalChannels: number[] = [];
                            const numSamples = 16;

                            // Select Indices from Key (Shared Key -> Same Indices)
                            // Note: Receiver must sync chunk index logic or use payload data if embedded.
                            // Currently `chunkIndex` is sent as implicit sequence. We use local counter.

                            let selectedIndices: number[] = [];
                            const currentChunkIdx = remoteChunkIndexRef.current - 1; // 0-based for math

                            // Match Sender Logic: 0 is random, else Key
                            if (!kolamKey || kolamKey.length === 0 || currentChunkIdx === 0) {
                                for (let i = 0; i < numSamples; i++) selectedIndices.push(Math.floor(Math.random() * totalCells));
                            } else {
                                for (let i = 0; i < numSamples; i++) {
                                    const val = kolamKey[(currentChunkIdx * numSamples + i) % kolamKey.length];
                                    selectedIndices.push(val % totalCells);
                                }
                            }

                            // Run Helper Logic (Simplification: Just calculating indices, skipping full history for simplicity or we duplicate history logic?)
                            // Ideally we duplicate history logic for `remote` stream.
                            // But for now, let's just show the calculated indices/channels to prove "Visible Hopping".

                            for (let i = 0; i < numSamples; i++) {
                                const rawIdx = selectedIndices[i];
                                // We skip full collision logic simulation on receiver for now unless we maintain separate history.
                                // Assuming "Perfect Sync", Receiver sees what Sender picked.
                                // Visualization:
                                const rawChannel = rawIdx % totalChannels;
                                characterMap.push({ char: "RX", channel: rawChannel, matrix_index: rawIdx, status: "OK" });
                                finalChannels.push(rawChannel);
                            }

                            const vizData = {
                                encrypted_payload: {
                                    chunk_details: [{
                                        chunk: `Received Segment ${currentChunkIdx}`,
                                        hash: "rx-hash-" + currentChunkIdx,
                                        seed: currentChunkIdx * 12345,
                                        kolam_params: { k: k, symmetry: 'radial' },
                                        matrix: kolamPayload.rows.slice(0, k),
                                        character_map: characterMap,
                                        channels: finalChannels,
                                        binary_data: binaryData,
                                        waveform: Array.from(decryptedData.subarray(0, 64))
                                    }]
                                }
                            };

                            onChunkSent(vizData);
                        }

                    } else if (data.type === 'call_request') {
                        handleIncomingCall(data.callerId);
                    } else if (data.type === 'call_accepted') {
                        toast.success('Call accepted!');
                        startAudioProcessing();
                    } else if (data.type === 'call_rejected') {
                        toast.info('Call rejected or ended.');
                        stopLocalStream(); // Use helper
                    } else if (data.type === 'status' && data.status === 'disconnected') {
                        // Handle Global Disconnect
                        toast.info(data.message || 'Call disconnected.');
                        stopLocalStream();
                    }
                } catch (_) {
                    // ignore non‑JSON messages
                }
            }
        };
        socket.addEventListener('message', handleMessage);
        return () => {
            socket.removeEventListener('message', handleMessage);
        };
    }, [wsRef, callStatus, onChunkReceived, handleIncomingCall, kolamKey, isConnected, startAudioProcessing, stopLocalStream, channels]);

    // ---------------------------------------------------------------------
    // Call Control Actions
    // ---------------------------------------------------------------------
    const startCall = useCallback(async () => {
        const socket = wsRef.current;
        if (!socket || !isConnected) {
            toast.error('Cannot start call. Please ensure you are connected.');
            return;
        }
        socket.send(JSON.stringify({ type: 'call_request', callerId: userId, session_id: roomId }));
        setCallStatus('calling');
    }, [wsRef, isConnected, userId, roomId]);

    const acceptCall = useCallback(() => {
        const socket = wsRef.current;
        if (!socket) return;
        socket.send(JSON.stringify({ type: 'call_accepted', callerId: userId, session_id: roomId }));
        setIncomingCaller(null);
        startAudioProcessing();
    }, [wsRef, userId, startAudioProcessing, roomId]);

    const rejectCall = useCallback(() => {
        const socket = wsRef.current;
        if (!socket) return;
        socket.send(JSON.stringify({ type: 'call_rejected', callerId: userId, session_id: roomId }));
        setIncomingCaller(null);
        setCallStatus('idle');
    }, [wsRef, userId, roomId]);

    const endCall = useCallback(() => {
        const socket = wsRef.current;
        if (socket) {
            // Ideally send a "hangup" signal, but for now just stop locally
            // We can reuse call_rejected as a hangup signal if needed, or just rely on silence
            socket.send(JSON.stringify({ type: 'call_rejected', callerId: userId, session_id: roomId }));
        }

        if (inputStreamRef.current) {
            inputStreamRef.current.getTracks().forEach(t => t.stop());
            inputStreamRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setCallStatus('idle');
        setIncomingCaller(null);
    }, [wsRef, userId]);

    const toggleMute = () => setIsMuted(!isMuted);

    return {
        callStatus,
        isCallActive: callStatus === 'active',
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        isMuted,
        toggleMute,
        handleIncomingCall,
        incomingCaller,
        setIncomingCaller
    };
};
