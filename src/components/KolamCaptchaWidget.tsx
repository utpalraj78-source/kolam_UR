/**
 * KolamCaptchaWidget — Auth-page wrapper that uses the real KCaptcha backend
 * (features/KolamCaptcha) API endpoints.
 *
 * Types used (randomly selected, cycles on failure):
 *   1. Assembler  — reassemble 4 shuffled Kolam quadrants
 *   2. Completion — pick the missing quadrant from 5 options
 *   3. Memory     — memorise pattern then recall from 4 options
 *   4. Rotate     — slide to match target angle
 *   5. Slider     — drag piece into the hole (2-D)
 *
 * On failure → auto-regenerate with next type + fresh challenge.
 */
import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, CheckCircle, XCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { API_BASE_URL } from "@/utils/apiConfig";

const api = axios.create({ baseURL: API_BASE_URL });

/* ─── small helpers ──────────────────────────────────────────────────────── */
type Status = "idle" | "loading" | "ready" | "ok" | "bad";

const Img = ({ b64, className = "" }: { b64: string; className?: string }) => (
  <img src={`data:image/png;base64,${b64}`} className={className} alt="kolam" />
);

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE 1 — Assembler
   Pick the shuffled pieces and drop them into Q1-Q4 to restore the Kolam.
═══════════════════════════════════════════════════════════════════════════ */
const AssemblerChallenge = ({ onOk, onFail }: { onOk: () => void; onFail: () => void }) => {
  const [challengeId, setChallengeId] = useState<number | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [slots, setSlots] = useState<(number | null)[]>([null, null, null, null]);
  const [selSrc, setSelSrc] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const load = async () => {
    setStatus("loading"); setSlots([null, null, null, null]); setImages([]); setSelSrc(null);
    try {
      const r = await api.get("/api/captcha/generate-assembler");
      setChallengeId(r.data.challenge_id);
      setImages(r.data.images);
      setStatus("ready");
    } catch { toast.error("Could not load CAPTCHA"); setStatus("ready"); }
  };

  useEffect(() => { load(); }, []);

  const pickSrc = (i: number) => { if (slots.includes(i)) return; setSelSrc(i); };
  const pickSlot = (s: number) => {
    if (selSrc !== null) {
      const n = [...slots]; n[s] = selSrc; setSlots(n); setSelSrc(null);
    } else if (slots[s] !== null) {
      const n = [...slots]; n[s] = null; setSlots(n);
    }
  };

  const verify = async () => {
    if (slots.some(s => s === null)) { toast.warning("Fill all 4 slots."); return; }
    try {
      const r = await api.post("/api/captcha/verify", { challenge_id: challengeId, answer: slots });
      if (r.data.success) { setStatus("ok"); setTimeout(onOk, 600); }
      else { setStatus("bad"); setTimeout(() => { setStatus("ready"); onFail(); }, 900); }
    } catch { toast.error("Verification error"); }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <p className="text-xs text-muted-foreground text-center">
        Arrange the 4 pieces into the correct quadrant (Q1→Q4) to restore the Kolam.
      </p>
      {status === "loading" && <div className="animate-pulse text-xs text-muted-foreground py-6">Generating challenge…</div>}
      {status !== "loading" && (
        <>
          {/* Slots grid */}
          <div className="grid grid-cols-2 gap-1.5 w-[200px] h-[200px]">
            {[0,1,2,3].map(s => (
              <motion.div key={s} onClick={() => pickSlot(s)} whileHover={{ scale: 1.02 }}
                className={`border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer overflow-hidden
                  ${slots[s] !== null ? "border-primary/60" : "border-border/40 bg-muted/20"}`}>
                {slots[s] !== null
                  ? <Img b64={images[slots[s]!]} className="w-full h-full object-cover" />
                  : <span className="text-muted-foreground/40 text-sm font-bold">Q{s+1}</span>}
              </motion.div>
            ))}
          </div>
          {/* Source pieces */}
          <div className="flex gap-2 justify-center flex-wrap">
            {images.map((img, i) => (
              <motion.div key={i} onClick={() => pickSrc(i)} whileHover={{ scale: 1.05 }}
                className={`w-14 h-14 rounded-lg border-2 cursor-pointer overflow-hidden
                  ${slots.includes(i) ? "opacity-25 grayscale" : ""}
                  ${selSrc === i ? "border-primary ring-2 ring-primary" : "border-border/40"}`}>
                <Img b64={img} className="w-full h-full object-cover" />
              </motion.div>
            ))}
          </div>
          {/* Actions */}
          <div className="flex gap-2 w-full">
            <button onClick={load} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border/50 text-xs text-muted-foreground hover:text-primary hover:border-primary/50 transition-all">
              <RefreshCw className="h-3 w-3" /> Reset
            </button>
            <button onClick={verify} disabled={status === "ok"}
              className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              Verify
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE 2 — Completion
   Pick which of 5 options fills the masked quadrant.
═══════════════════════════════════════════════════════════════════════════ */
const CompletionChallenge = ({ onOk, onFail }: { onOk: () => void; onFail: () => void }) => {
  const [challengeId, setChallengeId] = useState<number | null>(null);
  const [questionImg, setQuestionImg] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const load = async () => {
    setStatus("loading"); setQuestionImg(null); setOptions([]); setSelected(null);
    try {
      const r = await api.get("/api/captcha/generate-completion");
      setChallengeId(r.data.challenge_id);
      setQuestionImg(r.data.question_image);
      setOptions(r.data.options);
      setStatus("ready");
    } catch { toast.error("Could not load CAPTCHA"); setStatus("ready"); }
  };

  useEffect(() => { load(); }, []);

  const verify = async (idx: number) => {
    if (status !== "ready") return;
    setSelected(idx);
    try {
      const r = await api.post("/api/captcha/verify", { challenge_id: challengeId, answer: idx });
      if (r.data.success) { setStatus("ok"); setTimeout(onOk, 600); }
      else { setStatus("bad"); setTimeout(() => { setStatus("ready"); setSelected(null); onFail(); }, 900); }
    } catch { toast.error("Verification error"); }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <p className="text-xs text-muted-foreground text-center">
        The white box hides part of the Kolam. Pick the piece that fills it correctly.
      </p>
      {status === "loading" && <div className="animate-pulse text-xs text-muted-foreground py-6">Generating challenge…</div>}
      {questionImg && <Img b64={questionImg} className="w-[200px] rounded-lg border border-border/30 shadow" />}
      <div className="grid grid-cols-5 gap-1.5">
        {options.map((opt, i) => {
          const isSel = selected === i;
          let cls = "border-border/40 hover:border-primary/60 hover:scale-105";
          if (isSel && status === "ok")  cls = "border-green-500 bg-green-500/10";
          if (isSel && status === "bad") cls = "border-red-500 bg-red-500/10 animate-shake";
          return (
            <motion.div key={i} onClick={() => verify(i)} whileHover={{ scale: 1.05 }}
              className={`w-14 h-14 rounded-lg border-2 cursor-pointer overflow-hidden transition-all ${cls}`}>
              <Img b64={opt} className="w-full h-full object-cover" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE 3 — Memory
   Memorise the shown pattern (3 s), then pick it from 4 options.
═══════════════════════════════════════════════════════════════════════════ */
const MemoryChallenge = ({ onOk, onFail }: { onOk: () => void; onFail: () => void }) => {
  const [challengeId, setChallengeId] = useState<number | null>(null);
  const [targetImg, setTargetImg] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [phase, setPhase] = useState<"loading" | "memorize" | "recall" | "done">("loading");
  const [timeLeft, setTimeLeft] = useState(3);
  const [selected, setSelected] = useState<number | null>(null);
  const [ok, setOk] = useState(false);

  const load = async () => {
    setPhase("loading"); setTimeLeft(3); setSelected(null); setOk(false);
    try {
      const r = await api.get("/api/captcha/generate-memory");
      setChallengeId(r.data.challenge_id);
      setTargetImg(r.data.target_image);
      setOptions(r.data.options);
      setPhase("memorize");
    } catch { toast.error("Could not load CAPTCHA"); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (phase !== "memorize") return;
    const t = setInterval(() => setTimeLeft(p => {
      if (p <= 1) { clearInterval(t); setPhase("recall"); return 0; }
      return p - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const verify = async (idx: number) => {
    if (phase !== "recall") return;
    setSelected(idx);
    try {
      const r = await api.post("/api/captcha/verify", { challenge_id: challengeId, answer: idx });
      setOk(r.data.success);
      setPhase("done");
      if (r.data.success) setTimeout(onOk, 700);
      else setTimeout(() => { onFail(); }, 900);
    } catch { toast.error("Verification error"); }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {phase === "loading" && <div className="animate-pulse text-xs text-muted-foreground py-6">Generating challenge…</div>}
      {phase === "memorize" && (
        <>
          <p className="text-xs text-yellow-400 font-semibold animate-pulse">Memorise this pattern! ({timeLeft}s)</p>
          <motion.div className="w-[190px] h-[190px] rounded-xl overflow-hidden border-2 border-yellow-500/40 shadow-lg shadow-yellow-500/10">
            {targetImg && <Img b64={targetImg} className="w-full h-full object-cover" />}
          </motion.div>
        </>
      )}
      {(phase === "recall" || phase === "done") && (
        <>
          <p className="text-xs text-muted-foreground text-center">Which pattern did you just see?</p>
          <div className="grid grid-cols-2 gap-2">
            {options.map((opt, i) => {
              const isSel = selected === i;
              let cls = "border-border/40 hover:border-primary/60";
              if (isSel && phase === "done" && ok)  cls = "border-green-500 bg-green-500/10";
              if (isSel && phase === "done" && !ok) cls = "border-red-500 bg-red-500/10";
              return (
                <motion.div key={i} whileHover={{ scale: phase === "recall" ? 1.04 : 1 }}
                  onClick={() => verify(i)}
                  className={`w-[88px] h-[88px] rounded-xl border-2 cursor-pointer overflow-hidden relative transition-all ${cls}`}>
                  <Img b64={opt} className="w-full h-full object-cover" />
                  {isSel && phase === "done" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      {ok ? <CheckCircle className="text-green-400 w-7 h-7" /> : <XCircle className="text-red-400 w-7 h-7" />}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
          {phase === "done" && !ok && (
            <button onClick={load} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
              <RefreshCw className="h-3 w-3" /> Try again
            </button>
          )}
        </>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE 4 — Rotate
   Drag the slider to rotate the image from its initial angle to the target.
═══════════════════════════════════════════════════════════════════════════ */
const RotateChallenge = ({ onOk, onFail }: { onOk: () => void; onFail: () => void }) => {
  const [challengeId, setChallengeId] = useState<number | null>(null);
  const [img, setImg] = useState<string | null>(null);
  const [initialAngle, setInitialAngle] = useState(0);
  const [targetAngle, setTargetAngle] = useState(0);
  const [userAngle, setUserAngle] = useState(0);
  const [status, setStatus] = useState<Status>("loading");

  const load = async () => {
    setStatus("loading"); setImg(null); setUserAngle(0);
    try {
      const r = await api.get("/api/captcha/generate-rotate");
      setChallengeId(r.data.challenge_id);
      setImg(r.data.image);
      setInitialAngle(r.data.initial_angle);
      setTargetAngle(r.data.target_angle);
      setStatus("ready");
    } catch { toast.error("Could not load CAPTCHA"); }
  };

  useEffect(() => { load(); }, []);

  const verify = async () => {
    const totalAngle = (initialAngle + userAngle + 360) % 360;
    try {
      const r = await api.post("/api/captcha/verify", { challenge_id: challengeId, answer: totalAngle });
      if (r.data.success) { setStatus("ok"); setTimeout(onOk, 600); }
      else { setStatus("bad"); setTimeout(() => { onFail(); }, 900); }
    } catch { toast.error("Verification error"); }
  };

  const visual = initialAngle + userAngle;

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <p className="text-xs text-muted-foreground text-center">
        Rotate the Kolam to match <span className="text-yellow-400 font-bold">{targetAngle}°</span>
        <span className="opacity-50 text-[10px] block">(starts at {initialAngle}°)</span>
      </p>
      {status === "loading" && <div className="animate-pulse text-xs text-muted-foreground py-6">Generating challenge…</div>}
      {img && (
        <>
          {/* Dial */}
          <div className="relative w-[190px] h-[190px]">
            {/* Target marker (red, static) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ rotate: `${targetAngle}deg` }}>
              <div className="w-0.5 h-5 bg-red-500 absolute -top-2.5 shadow-[0_0_6px_red]" />
            </div>
            {/* Current marker (green, dynamic) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ rotate: `${visual}deg` }}>
              <div className={`w-0.5 h-5 absolute -top-2.5 shadow-[0_0_6px_lime] ${status === "bad" ? "bg-red-500" : "bg-green-400"}`} />
            </div>
            <motion.div style={{ rotate: visual }} className="w-full h-full rounded-full overflow-hidden border-2 border-border/30">
              <Img b64={img} className="w-full h-full object-cover" />
            </motion.div>
          </div>
          {/* Slider */}
          <div className="w-full px-2 space-y-1">
            <Slider min={-180} max={180} step={1} value={[userAngle]}
              onValueChange={v => setUserAngle(v[0])}
              disabled={status === "ok" || status === "bad"}
              className="cursor-pointer" />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>-180°</span>
              <span className="text-primary">{userAngle > 0 ? `+${userAngle}` : userAngle}°</span>
              <span>+180°</span>
            </div>
          </div>
          <div className="flex gap-2 w-full">
            <button onClick={load} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border/50 text-xs text-muted-foreground hover:text-primary hover:border-primary/50 transition-all">
              <RefreshCw className="h-3 w-3" /> Reset
            </button>
            <button onClick={verify} disabled={status === "ok" || status === "bad"}
              className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50">
              Verify
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE 5 — Slider (2-D drag puzzle)
   Slide the piece horizontally (and vertically) into the dark hole.
═══════════════════════════════════════════════════════════════════════════ */
const SliderChallenge = ({ onOk, onFail }: { onOk: () => void; onFail: () => void }) => {
  const [challengeId, setChallengeId] = useState<number | null>(null);
  const [bgImg, setBgImg] = useState<string | null>(null);
  const [pieceImg, setPieceImg] = useState<string | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState<Status>("loading");

  const load = async () => {
    setStatus("loading"); setBgImg(null); setPieceImg(null);
    try {
      const r = await api.get("/api/captcha/generate-slider");
      setChallengeId(r.data.challenge_id);
      setBgImg(r.data.background);
      setPieceImg(r.data.piece);
      setStartPos(r.data.start);
      setPos(r.data.start);
      setStatus("ready");
    } catch { toast.error("Could not load CAPTCHA"); }
  };

  useEffect(() => { load(); }, []);

  const verify = async () => {
    try {
      const r = await api.post("/api/captcha/verify", { challenge_id: challengeId, answer: pos });
      if (r.data.success) { setStatus("ok"); setTimeout(onOk, 600); }
      else { setStatus("bad"); setTimeout(() => { setPos(startPos); onFail(); }, 900); }
    } catch { toast.error("Verification error"); }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <p className="text-xs text-muted-foreground text-center">
        Use the sliders to drag the piece into the dark hole, then verify.
      </p>
      {status === "loading" && <div className="animate-pulse text-xs text-muted-foreground py-6">Generating challenge…</div>}
      {bgImg && (
        <>
          <div className="flex gap-3 items-start">
            {/* Image */}
            <div className="relative w-[200px] h-[200px] rounded-xl overflow-hidden border border-border/30 bg-black">
              <Img b64={bgImg} className="absolute inset-0 w-full h-full object-cover" />
              {pieceImg && (
                <motion.div animate={{ x: pos.x, y: pos.y }} transition={{ type: "tween", duration: 0 }}
                  className="absolute w-[60px] h-[60px] top-0 left-0 z-10">
                  <Img b64={pieceImg} className="w-full h-full object-cover" />
                </motion.div>
              )}
            </div>
            {/* Vertical slider */}
            <div className="h-[200px] w-10 bg-muted/30 border border-border/30 p-2 rounded-xl flex flex-col items-center">
              <Slider orientation="vertical" min={0} max={240} step={1}
                value={[240 - pos.y]}
                onValueChange={v => setPos(p => ({ ...p, y: 240 - v[0] }))}
                className="cursor-pointer h-full"
                disabled={status !== "ready"} />
            </div>
          </div>
          {/* Horizontal slider */}
          <div className="w-[200px] bg-muted/20 border border-border/30 p-3 rounded-xl">
            <Slider min={0} max={240} step={1} value={[pos.x]}
              onValueChange={v => setPos(p => ({ ...p, x: v[0] }))}
              className="cursor-pointer"
              disabled={status !== "ready"} />
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">← Horizontal →</p>
          </div>
          <div className="flex gap-2 w-full">
            <button onClick={load} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border/50 text-xs text-muted-foreground hover:text-primary hover:border-primary/50 transition-all">
              <RefreshCw className="h-3 w-3" /> Reset
            </button>
            <button onClick={verify} disabled={status !== "ready"}
              className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50">
              Verify Puzzle
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN WIDGET
═══════════════════════════════════════════════════════════════════════════ */
type CType = "assembler" | "completion" | "memory" | "rotate" | "slider";
const ALL: CType[] = ["assembler", "completion", "memory", "rotate", "slider"];
const LABELS: Record<CType, string> = {
  assembler:  "Assemble the Kolam",
  completion: "Complete the Pattern",
  memory:     "Memory Match",
  rotate:     "Rotate to Align",
  slider:     "Slide the Piece",
};

interface WidgetProps { onVerified: () => void }

export const KolamCaptchaWidget = ({ onVerified }: WidgetProps) => {
  const [typeIdx, setTypeIdx] = useState(() => Math.floor(Math.random() * ALL.length));
  const [key, setKey] = useState(0);         // changing key forces remount of challenge
  const [status, setStatus] = useState<"idle" | "ok" | "bad">("idle");
  const [attempts, setAttempts] = useState(0);

  const type = ALL[typeIdx % ALL.length];

  const handleOk = useCallback(() => {
    setStatus("ok");
    setTimeout(onVerified, 500);
  }, [onVerified]);

  const handleFail = useCallback(() => {
    setStatus("bad");
    setAttempts(a => a + 1);
    setTimeout(() => {
      setTypeIdx(i => (i + 1) % ALL.length);   // cycle to next type
      setKey(k => k + 1);                        // remount fresh challenge
      setStatus("idle");
    }, 800);
  }, []);

  return (
    <div className="rounded-xl border border-border/60 bg-muted/15 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-muted/10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold text-foreground">{LABELS[type]}</span>
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground border border-border/40 rounded-full px-2 py-0.5 hidden sm:inline">
            KCaptcha
          </span>
        </div>
        <button onClick={() => { setKey(k => k + 1); setStatus("idle"); }}
          title="New challenge"
          className="text-muted-foreground hover:text-primary transition-colors p-1 rounded hover:bg-primary/10">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Challenge body */}
      <div className="px-4 py-3">
        <AnimatePresence mode="wait">
          <motion.div key={`${type}-${key}`}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {type === "assembler"  && <AssemblerChallenge  key={key} onOk={handleOk} onFail={handleFail} />}
            {type === "completion" && <CompletionChallenge key={key} onOk={handleOk} onFail={handleFail} />}
            {type === "memory"     && <MemoryChallenge     key={key} onOk={handleOk} onFail={handleFail} />}
            {type === "rotate"     && <RotateChallenge     key={key} onOk={handleOk} onFail={handleFail} />}
            {type === "slider"     && <SliderChallenge     key={key} onOk={handleOk} onFail={handleFail} />}
          </motion.div>
        </AnimatePresence>

        {/* Status feedback */}
        <AnimatePresence mode="wait">
          {status === "ok" && (
            <motion.div key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2 mt-2 text-green-500 text-xs font-semibold">
              <CheckCircle className="h-4 w-4" /> Verified — you're human!
            </motion.div>
          )}
          {status === "bad" && (
            <motion.div key="bad" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2 mt-2 text-red-400 text-xs font-semibold">
              <XCircle className="h-4 w-4" /> Incorrect — loading next challenge…
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border/20 text-[9px] text-muted-foreground/40">
        <span>🔐 KolamBasedCommunication · KCaptcha Service</span>
        <span>attempt #{attempts + 1}</span>
      </div>
    </div>
  );
};
