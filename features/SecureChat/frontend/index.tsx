import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getAllUsers } from "@/api/auth";
import { User } from "@/types/auth";
import { createSession, getMySessions, sendMessage, getMessages } from "@/api/chat";
import { ChatSession, ChatMessage } from "@/types/chat";
import { VisualizationPanel } from "./VisualizationPanel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Send, MessageSquare, ChevronRight, Lock, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from "@/utils/apiConfig";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import { Mic, PhoneOff } from "lucide-react";

const SecureChat = () => {
    const { user, loading: authLoading } = useAuth();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [isCreatingSession, setIsCreatingSession] = useState(false);
    const [newRecipientUsername, setNewRecipientUsername] = useState("");
    const [selectedMessageForViz, setSelectedMessageForViz] = useState<ChatMessage | null>(null);
    const [audioVizState, setAudioVizState] = useState<{ sent: any, received: any }>({ sent: null, received: null });
    const [showViz, setShowViz] = useState(true);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);

    // Handshake State
    const [handshakeStatus, setHandshakeStatus] = useState<'INIT' | 'UPLOADED' | 'MATCHED' | 'APPROVED' | 'MISMATCH' | 'TIMEOUT'>('INIT');
    const [myKeyUploaded, setMyKeyUploaded] = useState(false);
    const [partnerUploaded, setPartnerUploaded] = useState(false);
    const [partnerApproved, setPartnerApproved] = useState(false);
    const [myApproved, setMyApproved] = useState(false);
    const [fileUploading, setFileUploading] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    const wsParamsRef = useRef<WebSocket | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Refs for stale closure fix in WS listeners
    const activeSessionRef = useRef<number | null>(null);
    const handshakeStatusRef = useRef(handshakeStatus);
    const myKeyUploadedRef = useRef(myKeyUploaded);
    const myApprovedRef = useRef(myApproved);
    const partnerApprovedRef = useRef(partnerApproved);
    const timeLeftRef = useRef(timeLeft);

    // Sync Refs
    useEffect(() => { activeSessionRef.current = activeSessionId; }, [activeSessionId]);
    useEffect(() => { handshakeStatusRef.current = handshakeStatus; }, [handshakeStatus]);
    useEffect(() => { myKeyUploadedRef.current = myKeyUploaded; }, [myKeyUploaded]);
    useEffect(() => { myApprovedRef.current = myApproved; }, [myApproved]);
    useEffect(() => { partnerApprovedRef.current = partnerApproved; }, [partnerApproved]);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

    // Store Auth Config
    const authConfigRef = useRef<any>(null);

    // Channels Logic: 0-15 (16 channels) if grid size is 4.
    const gridSize = authConfigRef.current?.grid_size || 4;
    const channelCount = gridSize * gridSize;

    // Voice Call Hook
    const {
        callStatus,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        incomingCaller,
        isMuted,
        toggleMute
    } = useVoiceCall({
        wsRef: wsParamsRef,
        kolamKey: authConfigRef.current?.key || null, // Pass numeric key if available
        isConnected: handshakeStatus === 'APPROVED',
        userId: user?.id?.toString() || "",
        onIncomingCall: (callerId) => toast.info(`Incoming call from ${callerId}`),
        onChunkSent: (data) => {
            if (!showViz) return;
            // Differentiate Sender vs Receiver
            // Sender: Chunk ID starts with "Audio Segment"
            // Receiver: Chunk ID starts with "Received Segment"
            // This is a heuristic based on useVoiceCall implementation
            const label = data?.encrypted_payload?.chunk_details?.[0]?.chunk || "";
            if (label.startsWith("Received")) {
                setAudioVizState(prev => ({ ...prev, received: data }));
            } else {
                setAudioVizState(prev => ({ ...prev, sent: data }));
            }
        },
        onChunkReceived: (d, n, e, ch) => {
            // Handled internally by hook for consistency now
        },
        channels: channelCount, // Enforce grid-based max channels (e.g., 16)
        roomId: activeSessionId?.toString() // Pass SessionID to hook
    });

    // Session Disconnect Logic
    const handleDisconnectSession = () => {
        if (wsParamsRef.current) {
            // Closing the socket triggers backend to notify partner
            wsParamsRef.current.close();
        }
        // Reset Local State
        setHandshakeStatus('INIT');
        setMessages([]);
        setActiveSessionId(null);
        setMyKeyUploaded(false);
        setPartnerUploaded(false);
        setMyApproved(false);
        setPartnerApproved(false);
        toast.info("Session Disconnected.");
    };
    useEffect(() => {
        if (!authLoading && user) {
            loadSessions();
            connectWebSocket();
        }
    }, [user, authLoading]);

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        // Only run timer if we are waiting (UPLOADED state).
        // Once MATCHED, the verification time window constraint is satisfied.
        if (timeLeft !== null && timeLeft > 0 && handshakeStatus === 'UPLOADED') {
            interval = setInterval(() => {
                setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
            }, 1000);
        } else if (timeLeft === 0) {
            // Only timeout if we were still waiting in UPLOADED state
            if (handshakeStatus === 'UPLOADED') {
                setHandshakeStatus('TIMEOUT');
            }
        }
        return () => clearInterval(interval);
    }, [timeLeft, handshakeStatus]);

    // Cleanup WS
    useEffect(() => {
        return () => {
            if (wsParamsRef.current) wsParamsRef.current.close();
        };
    }, []);

    // Load messages when active session changes
    useEffect(() => {
        if (activeSessionId) {
            resetHandshake();
            loadMessages(activeSessionId);
        }
    }, [activeSessionId]);

    const resetHandshake = () => {
        setHandshakeStatus('INIT');
        setMyKeyUploaded(false);
        setPartnerUploaded(false);
        setPartnerApproved(false);
        setMyApproved(false);
        setTimeLeft(null);
    }

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // Timeout Logic
    useEffect(() => {
        if (timeLeft === 0) {
            setHandshakeStatus('TIMEOUT');
            toast.error("Connection Lost: Verification timed out.");
            // Optional: Disconnect or reset
        }

        if (!timeLeft) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);
    const connectWebSocket = () => {
        if (!user) return;
        const wsUrl = API_BASE_URL.replace("http", "ws") + `/api/secure-chat/ws/${user.id}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log("WS Connected");
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("WS Message:", data);

            // Use REF for current session, as closure might be stale
            const currentSessionId = activeSessionRef.current;

            if (data.type === "new_message") {
                const msg = data.message;
                if (currentSessionId === msg.session_id) {
                    processIncomingMessage(msg);
                }
            } else if (data.type === "handshake_signal") {
                if (currentSessionId === data.session_id) {
                    processIncomingMessage(data);
                }
            } else if (data.type === "handshake_status") {
                // Server Verification Update
                if (currentSessionId === data.session_id) {
                    handleServerStatus(data.status, data);
                }
            } else if (data.type === "partner_disconnected") {
                if (currentSessionId === data.session_id) {
                    toast.error(data.message || "Partner disconnected.");
                    // Reset Session State to initial
                    setHandshakeStatus('INIT');
                    setMyKeyUploaded(false);
                    setPartnerUploaded(false);
                    setPartnerApproved(false);
                    setMyApproved(false);
                    setTimeLeft(null);
                    setActiveSessionId(null);
                    setMessages([]);
                }
            }
        };

        ws.onclose = () => {
            console.log("WS Disconnected. Attempting to reconnect...");
            // Simple exponential backoff or fixed retry
            setTimeout(() => {
                if (user) connectWebSocket();
            }, 3000);
        };

        wsParamsRef.current = ws;
    };

    // Robust State Transition: If both approved, ensure we go to APPROVED
    useEffect(() => {
        if (myApproved && partnerApproved && handshakeStatus === 'MATCHED') {
            setMessages([]); // Clear history for fresh secure session
            setHandshakeStatus('APPROVED');
            toast.success("Both parties approved! Secure Chat Unlocked.");
        }
    }, [myApproved, partnerApproved, handshakeStatus]);

    // Real-time Clock
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleServerStatus = (status: string, data?: any) => {
        console.log("Server Status:", status);
        if (data && data.auth_config) {
            authConfigRef.current = data.auth_config;
        }

        if (status === 'MATCH') {
            // Server verified keys match. Transition to MATCHED state.
            // We DO NOT auto-approve. Both users must manually approve to enter.
            setPartnerUploaded(true);
            setHandshakeStatus('MATCHED');
            setTimeLeft(null);
            toast.success("Identity Verified! Please Approve to Enter Chat.");
        } else if (status === 'MISMATCH') {
            setHandshakeStatus('MISMATCH');
            setTimeLeft(0); // Stop timer
        } else if (status === 'TIMEOUT') {
            setHandshakeStatus('TIMEOUT');
            setTimeLeft(0);
        } else if (status === 'WAITING') {
            // Means one uploaded, waiting for other
            // Use REF to check if *I* have uploaded, because state might be stale in closure
            if (!myKeyUploadedRef.current) {
                // That means PARTNER uploaded first
                setPartnerUploaded(true);
                // We transition to UPLOADED state to show the UI prompt
                setHandshakeStatus('UPLOADED');

                // Start the countdown if not already running
                // This gives the current user 60s to upload their key to match
                if (timeLeftRef.current === null) {
                    toast.info("Partner uploaded a key. You have 60s to verify!");
                    setTimeLeft(60);
                }
            } else {
                // I uploaded first, waiting for partner.
                // Ideally I should also see a countdown or "Waiting for partner..."
                // The requirement says "from uploads it should wait for the 1 minute shoung countdown"
                // This implies the countdown applies to the handshake window.
                if (timeLeftRef.current === null) {
                    setTimeLeft(60);
                }
            }
        }
    }

    const processIncomingMessage = (msg: any) => {
        // Handle signals first (Raw JSON objects)
        if (msg.type === "handshake_signal") {
            if (msg.action === "APPROVE") {
                setPartnerApproved(true);
                toast.success("Partner confirmed.");

                // Fix deadlock: Reply if we are already approved and they asked for confirmation
                // Use activeSessionRef.current because closure might be stale
                // Use myApprovedRef.current because closure might be stale
                if (myApprovedRef.current && msg.request_confirmation) {
                    wsParamsRef.current?.send(JSON.stringify({
                        type: "handshake_signal",
                        action: "APPROVE",
                        session_id: activeSessionRef.current,
                        sender_id: user?.id,
                        request_confirmation: false // Reply, don't ask back
                    }));
                }
            }
            return;
        }

        // Handle Chat Messages
        const text = msg.decrypted_message;
        const sender = msg.sender_id;
        if (sender === user?.id) return;

        if (text?.startsWith("$$HS:")) {
            // Deprecated logic kept for backward compat
            const parts = text.split(":");
            if (parts[1] === "APPROVE") {
                setPartnerApproved(true);
            }
        } else {
            if (handshakeStatusRef.current === 'APPROVED') {
                setMessages((prev) => [...prev, msg]);
            }
        }
    };

    const loadSessions = async () => {
        try {
            const data = await getMySessions();
            setSessions(data);
            if (data.length > 0 && !activeSessionId) {
                // optional auto-select
            }
            setLoading(false);
        } catch (error) {
            toast.error("Failed to load sessions");
            setLoading(false);
        }
    };

    const loadMessages = async (sessionId: number) => {
        setLoading(true);
        try {
            const data = await getMessages(sessionId);
            setMessages(data);
            setLoading(false);
        } catch (error) {
            toast.error("Failed to load messages");
            setLoading(false);
        }
    }


    useEffect(() => {
        if (isCreatingSession) {
            loadUsers();
        }
    }, [isCreatingSession]);

    const loadUsers = async () => {
        try {
            const users = await getAllUsers();

            if (user?.company_name) {
                const companyUsers = users.filter(u => u.company_name === user.company_name);
                setAvailableUsers(companyUsers);
                toast.info(`Showing users in ${user.company_name}`);
            } else {
                setAvailableUsers(users);
            }

        } catch (error) {
            console.error("Failed to load users", error);
            toast.error("Failed to load user list");
        }
    };

    const handleCreateSession = async () => {
        if (!newRecipientUsername) return;
        try {
            const session = await createSession(newRecipientUsername);
            setSessions(prev => [...prev, session]);
            setActiveSessionId(session.id);
            setIsCreatingSession(false);
            setNewRecipientUsername("");
            toast.success("Chat started! Please upload credential to verify.");
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Failed to start chat");
        }
    };

    const sendSignal = async (text: string) => {
        if (!activeSessionId) return;
        try {
            await sendMessage(activeSessionId, text);
        } catch (e) {
            console.error("Signal send failed", e);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeSessionId) return;

        try {
            const msg = await sendMessage(activeSessionId, newMessage);
            setMessages(prev => [...prev, msg]);
            setNewMessage("");
            setSelectedMessageForViz(msg);
        } catch (error) {
            toast.error("Failed to send message");
        }
    };

    // --- Handshake Handlers ---

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeSessionId) return;

        setFileUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            // New endpoint for Server-Side Verification
            const url = `${API_BASE_URL}/api/secure-chat/upload-verification-key?session_id=${activeSessionId}`;
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
                },
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Verification upload failed");
            }

            const data = await res.json();

            setMyKeyUploaded(true);
            setHandshakeStatus('UPLOADED'); // Will update to MATCHED if server says so

            if (data.match_status === 'MATCH') {
                setHandshakeStatus('MATCHED');
                setPartnerUploaded(true);
            } else if (data.match_status === 'MISMATCH') {
                setHandshakeStatus('MISMATCH');
            } else {
                // Waiting
                setTimeLeft(60); // Start timer logic
            }

            toast.success("Key uploaded successfully!");

        } catch (err) {
            console.error(err);
            toast.error("Failed to upload/verify key");
        } finally {
            setFileUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleApprove = async () => {
        if (!activeSessionId || !wsParamsRef.current) return;

        // Optimistic Entry: User confirms they are ready.
        // We do not block them on network signals, preventing deadlocks.
        setMessages([]);
        setMyApproved(true);
        // Do NOT set APPROVED yet. Wait for partner signal or check if partner already approved.

        // Send Unencrypted Signal via WebSocket (notify partner)
        wsParamsRef.current.send(JSON.stringify({
            type: "handshake_signal",
            action: "APPROVE",
            session_id: activeSessionId,
            sender_id: user?.id,
            request_confirmation: true
        }));

        toast.info("Approved. Waiting for partner to join...");
    };

    const getOtherUserId = (session: ChatSession) => {
        return session.user_a_id === user?.id ? session.user_b_id : session.user_a_id;
    };

    if (authLoading || loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    if (!user) return <div>Please log in</div>;

    return (
        <div className="flex h-[calc(100vh-5rem)] bg-background">
            {/* Sidebar - Sessions */}
            <div className="w-80 border-r border-border flex flex-col bg-muted/10">
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="font-bold">Messages</h2>
                    <Button size="icon" variant="ghost" onClick={() => setIsCreatingSession(true)}>
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-2">
                        {sessions.map((session, index) => (
                            <button
                                key={`sess-${session.id}-${index}`}
                                onClick={() => setActiveSessionId(session.id)}
                                className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeSessionId === session.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"}`}
                            >
                                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                    {getOtherUserId(session)}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="font-semibold truncate">User {getOtherUserId(session)}</div>
                                    <div className="text-xs text-muted-foreground truncate">Secure Session</div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </button>
                        ))}
                        {sessions.length === 0 && <div className="p-4 text-center text-muted-foreground text-sm">No active chats</div>}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col max-w-3xl border-r border-border">
                {activeSessionId ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-border flex items-center gap-3 bg-background/50 backdrop-blur">
                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                                {getOtherUserId(sessions.find(s => s.id === activeSessionId)!)}
                            </div>
                            <div className="flex-1">
                                User {getOtherUserId(sessions.find(s => s.id === activeSessionId)!)}
                                <span className={`flex items-center text-[10px] px-1.5 py-0.5 rounded border ${handshakeStatus === 'APPROVED' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"}`}>
                                    <Lock className="h-3 w-3 mr-1" /> {handshakeStatus === 'APPROVED' ? "Encrypted" : "Verify Identity"}
                                </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                                {currentTime.toLocaleTimeString()}
                            </div>

                            {timeLeft !== null && timeLeft > 0 && handshakeStatus !== 'APPROVED' && (
                                <div className="text-xs font-mono font-bold text-orange-500 bg-orange-100 px-2 py-1 rounded">
                                    Time Remaining: {timeLeft}s
                                </div>
                            )}

                            {handshakeStatus === 'APPROVED' && (
                                <>
                                    <Button variant="destructive" size="sm" onClick={handleDisconnectSession} title="Disconnect Session">
                                        <PhoneOff className="h-4 w-4 mr-2" />
                                        Disconnect
                                    </Button>

                                    {callStatus === 'idle' ? (
                                        <Button variant="outline" size="sm" onClick={startCall} title="Start Secure Call">
                                            <Phone className="h-4 w-4 mr-2" />
                                            Call
                                        </Button>
                                    ) : callStatus === 'active' ? (
                                        <Button variant="destructive" size="sm" onClick={endCall} title="End Call">
                                            <PhoneOff className="h-4 w-4 mr-2" />
                                            End Call
                                        </Button>
                                    ) : (
                                        <Button variant="secondary" size="sm" disabled>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            {callStatus === 'calling' ? 'Calling...' : 'Ringing...'}
                                        </Button>
                                    )}
                                </>
                            )}

                            {handshakeStatus === 'APPROVED' && (
                                <Button variant={showViz ? "secondary" : "ghost"} size="sm" onClick={() => setShowViz(!showViz)}>
                                    {showViz ? "Hide Process" : "Show Process"}
                                </Button>
                            )}
                        </div>

                        {/* Content Body */}
                        {handshakeStatus === 'APPROVED' ? (
                            <>
                                {/* Active Call Status Bar */}
                                {callStatus === 'active' && (
                                    <div className="bg-green-100 dark:bg-green-900/30 p-2 text-center text-xs font-bold text-green-700 dark:text-green-300 flex items-center justify-center gap-4 animate-in slide-in-from-top border-b border-green-200">
                                        <span className="flex items-center gap-2"><Lock className="h-3 w-3" /> Secure Voice Channel Active</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleMute}>
                                            {isMuted ? <PhoneOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                                        </Button>
                                    </div>
                                )}
                                {/* Chat Messages */}
                                <ScrollArea className="flex-1 p-4">
                                    <div className="space-y-4">
                                        {messages.map((msg, index) => {
                                            const isMe = msg.sender_id === user.id;
                                            // Fallback key to prevent duplicates
                                            const msgKey = msg.id ? `msg-${msg.id}` : `idx-${index}`;
                                            return (
                                                <motion.div
                                                    key={msgKey}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                                                >
                                                    <div
                                                        className={`max-w-[70%] rounded-2xl px-4 py-2 cursor-pointer transition-all ${isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted rounded-tl-none hover:bg-muted/80"} ${selectedMessageForViz?.id === msg.id ? "ring-2 ring-ring ring-offset-2" : ""}`}
                                                        onClick={() => {
                                                            setSelectedMessageForViz(msg);
                                                            setShowViz(true);
                                                        }}
                                                    >
                                                        <div className="text-sm">{msg.decrypted_message}</div>
                                                        <div className="text-[10px] opacity-50 mt-1 flex items-center gap-1 justify-end">
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            {isMe && <Lock className="h-3 w-3" />}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                        <div ref={scrollRef} />
                                    </div>
                                </ScrollArea>

                                {/* Input */}
                                <div className="p-4 border-t border-border bg-background">
                                    <form onSubmit={handleSendMessage} className="flex gap-2">
                                        <Input
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Type an encrypted message..."
                                            className="flex-1"
                                        />
                                        <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            /* Handshake Interface */
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                                <div className="p-4 rounded-full bg-primary/10 mb-4">
                                    <Lock className="h-12 w-12 text-primary" />
                                </div>
                                <h2 className="text-2xl font-bold">Secure Verification Required</h2>
                                <p className="text-muted-foreground max-w-md">
                                    To ensure secure communication, both parties must prove possession of the shared Kolam Key {timeLeft ? `within ${timeLeft}s` : ""}.
                                </p>

                                <div className="glass-card p-6 w-full max-w-md space-y-4 text-left relative overflow-hidden">
                                    {/* Timeout / Error Overlay */}
                                    {(handshakeStatus === 'TIMEOUT' || handshakeStatus === 'MISMATCH') && (
                                        <div className="absolute inset-0 bg-background/90 z-10 flex flex-col items-center justify-center text-center p-6">
                                            <div className="text-red-500 font-bold text-xl mb-2">
                                                {handshakeStatus === 'TIMEOUT' ? "Verification Timed Out" : "Keys Did Not Match"}
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                The secure handshake failed. Please restart the session verification.
                                            </p>
                                            {/* Note: In real app, we might need to properly reset server state or just client state */}
                                            {/* For now, just reset client state via navigating away or refetching session */}
                                            <div className="text-xs text-muted-foreground">(Re-open chat to try again)</div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${myKeyUploaded ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>1</div>
                                        <div>
                                            <h4 className="font-semibold">Upload Your Key</h4>
                                            <p className="text-xs text-muted-foreground">Upload the .png Image linked to your Kolam.</p>
                                        </div>

                                        {!myKeyUploaded ? (
                                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={fileUploading}>
                                                {fileUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
                                            </Button>
                                        ) : (
                                            <span className="text-green-600 text-xs font-bold ml-auto">Verified ✓</span>
                                        )}
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/png" onChange={handleFileUpload} />
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${partnerUploaded ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>2</div>
                                        <div>
                                            <h4 className="font-semibold">Match Partner Key</h4>
                                            <p className="text-xs text-muted-foreground">{partnerUploaded ? "Partner uploaded." : "Waiting for partner..."}</p>
                                        </div>
                                        {partnerUploaded && <span className="text-green-600 text-xs font-bold ml-auto">Received ✓</span>}
                                    </div>

                                    {handshakeStatus === 'MATCHED' && (
                                        <div className="pt-4 border-t border-border mt-4">
                                            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded mb-4">
                                                <Lock className="h-4 w-4" />
                                                <span className="text-sm font-bold">Server Verified Database Match!</span>
                                            </div>
                                            <Button onClick={handleApprove} className="w-full" disabled={myApproved}>
                                                {myApproved ? "Waiting for Partner..." : "Approve & Enter Chat"}
                                            </Button>
                                        </div>
                                    )}

                                    {myApproved && !partnerApproved && (
                                        <p className="text-center text-xs text-muted-foreground animate-pulse">Waiting for partner to approve...</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center flex-col text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                        <p>Select a chat to start messaging</p>
                    </div>
                )}
            </div>

            {/* Visualization Panel */}
            <AnimatePresence>
                {showViz && activeSessionId && (
                    <motion.div
                        initial={{ width: 0, opacity: 0, flexGrow: 0 }}
                        animate={{ width: "auto", opacity: 1, flexGrow: 1 }}
                        exit={{ width: 0, opacity: 0, flexGrow: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-l border-border bg-muted/10 h-full overflow-hidden min-w-[500px]"
                    >
                        {/* Priority: Audio Viz > Selected Message > Default */}
                        {callStatus === 'active' && (audioVizState.sent || audioVizState.received) ? (
                            <VisualizationPanel message={audioVizState.sent || audioVizState.received} receivedMessage={audioVizState.received} />
                        ) : selectedMessageForViz ? (
                            <VisualizationPanel message={selectedMessageForViz} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-center p-8 text-muted-foreground text-sm">
                                <div className="space-y-2">
                                    <Lock className="h-8 w-8 mx-auto opacity-20" />
                                    <p>Click on any message to view the Kolam encryption process details.</p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Incoming Call Dialog */}
            <Dialog open={!!incomingCaller} onOpenChange={() => rejectCall()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Incoming Secure Call</DialogTitle>
                        <DialogDescription>
                            {incomingCaller} is requesting a secure voice connection.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2">
                        <Button variant="destructive" onClick={rejectCall}>Reject</Button>
                        <Button onClick={acceptCall}>Accept</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* New Session Dialog */}
            <Dialog open={isCreatingSession} onOpenChange={setIsCreatingSession}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Start New Secure Chat</DialogTitle>
                        <DialogDescription>
                            Select a user from the list below to verify identity and start an encrypted session.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {availableUsers.length === 0 ? (
                            <div className="text-center text-muted-foreground py-4">No other users found.</div>
                        ) : (
                            <ScrollArea className="h-64 border rounded-md">
                                <div className="p-2 space-y-2">
                                    {availableUsers.map((u, idx) => (
                                        <button
                                            key={`${u.id}-${idx}`}
                                            onClick={() => setNewRecipientUsername(u.username)}
                                            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${newRecipientUsername === u.username ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"}`}
                                        >
                                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                                                {u.id}
                                            </div>
                                            <div>
                                                <div className="font-semibold">{u.username}</div>
                                                <div className="text-xs text-muted-foreground">{u.email}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreatingSession(false)}>Cancel</Button>
                        <Button onClick={handleCreateSession} disabled={!newRecipientUsername}>Start Chat</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default SecureChat;
