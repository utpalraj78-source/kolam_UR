/**
 * KolamCaptchaWidget v2
 * Three challenge types that rotate randomly:
 *   1. "Find the 4th Piece"  — pick which quadrant completes the Kolam
 *   2. "Spin to Align"       — rotate slider to upright the tilted Kolam
 *   3. "Slide to Position"   — drag piece to its correct slot in the pattern
 *
 * Fully client-side. Auto-regenerates with a new random type on each failure.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, CheckCircle, XCircle, RotateCw, GripHorizontal, Puzzle } from "lucide-react";

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Kolam Canvas Renderer ────────────────────────────────────────────────────
type Seg = [[number, number], [number, number]];

const GRID = 6;   // 6×6 dot grid
const CELL = 28;  // px between dots
const PAD  = 20;  // padding
const SZ   = PAD * 2 + (GRID - 1) * CELL; // 188 px

function generateSegs(rng: () => number, count = 18): Seg[] {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1],[2,0],[0,2],[2,1],[1,2]];
  const segs: Seg[] = [];
  const seen = new Set<string>();
  for (let a = 0; a < 120 && segs.length < count; a++) {
    const x = Math.floor(rng() * GRID);
    const y = Math.floor(rng() * GRID);
    const [dx, dy] = dirs[Math.floor(rng() * dirs.length)];
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) continue;
    const key = [Math.min(x,nx), Math.min(y,ny), Math.max(x,nx), Math.max(y,ny)].join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    segs.push([[x, y], [nx, ny]]);
  }
  return segs;
}

function drawKolam(
  ctx: CanvasRenderingContext2D,
  segs: Seg[],
  w = SZ, h = SZ,
  skipIdx?: number,
  clipQuadrant?: 0 | 1 | 2 | 3
) {
  ctx.clearRect(0, 0, w, h);

  const ox = PAD, oy = PAD;

  if (clipQuadrant !== undefined) {
    const hw = w / 2, hh = h / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(clipQuadrant % 2 === 0 ? 0 : hw, clipQuadrant < 2 ? 0 : hh, hw, hh);
    ctx.clip();
  }

  // lines
  ctx.strokeStyle = "hsl(174 72% 56%)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  segs.forEach((s, i) => {
    if (skipIdx !== undefined && i === skipIdx) return;
    ctx.beginPath();
    ctx.moveTo(ox + s[0][0] * CELL, oy + s[0][1] * CELL);
    ctx.lineTo(ox + s[1][0] * CELL, oy + s[1][1] * CELL);
    ctx.stroke();
  });

  // dots
  ctx.fillStyle = "hsl(174 72% 72%)";
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++) {
      ctx.beginPath();
      ctx.arc(ox + c * CELL, oy + r * CELL, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

  if (clipQuadrant !== undefined) ctx.restore();
}

// ─── Shared canvas component ──────────────────────────────────────────────────
const KC = ({ draw, w = SZ, h = SZ, className = "" }: {
  draw: (ctx: CanvasRenderingContext2D) => void;
  w?: number; h?: number; className?: string;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    draw(ctx);
  });
  return <canvas ref={ref} width={w} height={h} className={className} />;
};

// ─── Challenge types ──────────────────────────────────────────────────────────

type ChallengeType = "fourth" | "spin" | "slide";

interface WidgetProps { onVerified: () => void }

// ──────────────────────────────────────────────────────────────────────────────
// TYPE 1 — "Find the 4th Piece"
// Show pattern cropped to 3 of 4 quadrants; user picks missing quadrant option
// ──────────────────────────────────────────────────────────────────────────────
const FourthPiece = ({ seed, onSuccess, onFail }: { seed: number; onSuccess: () => void; onFail: () => void }) => {
  const rng = mulberry32(seed);
  const segs = generateSegs(rng);
  const missing: 0|1|2|3 = (seed % 4) as 0|1|2|3;

  // 4 options: missing quadrant + 3 distractors (random segs from other seeds)
  const opts: (0|1|2|3)[] = ([0,1,2,3] as (0|1|2|3)[])
    .filter(q => q !== missing)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  opts.splice(Math.floor(Math.random() * 4), 0, missing);

  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "ok" | "bad">("idle");

  const pick = (q: 0|1|2|3) => {
    if (status !== "idle") return;
    setSelected(q);
    if (q === missing) {
      setStatus("ok");
      setTimeout(onSuccess, 700);
    } else {
      setStatus("bad");
      setTimeout(onFail, 800);
    }
  };

  const mainDraw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, SZ, SZ);
    ([0, 1, 2, 3] as (0|1|2|3)[]).forEach(q => {
      if (q === missing) {
        // draw dashed placeholder box
        const hw = SZ / 2, hh = SZ / 2;
        const qx = q % 2 === 0 ? 0 : hw, qy = q < 2 ? 0 : hh;
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "hsl(174 72% 40%)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(qx + 2, qy + 2, hw - 4, hh - 4);
        ctx.restore();
        ctx.fillStyle = "hsl(174 72% 40% / 0.12)";
        ctx.fillRect(qx, qy, hw, hh);
        ctx.fillStyle = "hsl(174 72% 56% / 0.5)";
        ctx.font = "bold 22px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("?", qx + hw / 2, qy + hh / 2);
      } else {
        drawKolam(ctx, segs, SZ, SZ, undefined, q);
      }
    });
  }, [seed]);

  const optDraw = (q: 0|1|2|3) => (ctx: CanvasRenderingContext2D) => {
    const hw = SZ / 2, hh = SZ / 2;
    ctx.clearRect(0, 0, hw, hh);
    ctx.save();
    ctx.translate(-(q % 2 === 0 ? 0 : hw), -(q < 2 ? 0 : hh));
    drawKolam(ctx, segs, SZ, SZ, undefined, q);
    ctx.restore();
  };

  const labels = ["↖ Top-Left", "↗ Top-Right", "↙ Bottom-Left", "↘ Bottom-Right"];

  return (
    <div className="space-y-3 w-full">
      <p className="text-xs text-muted-foreground text-center">
        Three quadrants are shown — pick which piece completes the Kolam:
      </p>
      <div className="flex justify-center">
        <div className="border border-border/40 rounded-lg overflow-hidden bg-background/50" style={{ width: SZ, height: SZ }}>
          <KC draw={mainDraw} w={SZ} h={SZ} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {opts.map((q, i) => {
          const isSel = selected === q;
          let cls = "border-border/40 hover:border-primary/60 bg-background/40 hover:bg-primary/5";
          if (isSel && status === "ok")  cls = "border-green-500 bg-green-500/10";
          if (isSel && status === "bad") cls = "border-red-500 bg-red-500/10";
          return (
            <motion.button key={i} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => pick(q)}
              className={`relative rounded-lg border-2 transition-all overflow-hidden flex flex-col items-center gap-1 p-1 ${cls}`}
            >
              <KC draw={optDraw(q)} w={SZ / 2} h={SZ / 2} />
              <span className="text-[10px] text-muted-foreground">{labels[q]}</span>
              {isSel && status === "ok"  && <div className="absolute inset-0 flex items-center justify-center bg-green-500/20"><CheckCircle className="h-6 w-6 text-green-500" /></div>}
              {isSel && status === "bad" && <div className="absolute inset-0 flex items-center justify-center bg-red-500/20"><XCircle className="h-6 w-6 text-red-500" /></div>}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// TYPE 2 — "Spin to Align"
// The Kolam is tilted; user must rotate it to 0°
// ──────────────────────────────────────────────────────────────────────────────
const SpinAlign = ({ seed, onSuccess, onFail }: { seed: number; onSuccess: () => void; onFail: () => void }) => {
  const rng = mulberry32(seed);
  const segs = generateSegs(rng);
  // target tilt: one of ±45, ±90, ±135 — avoid tiny tilts
  const tilts = [-135, -90, -45, 45, 90, 135];
  const tilt = tilts[seed % tilts.length]; // the image is shown tilted by this much
  const [angle, setAngle] = useState(0);   // user's correction
  const [submitted, setSubmitted] = useState(false);

  const visual = tilt + angle; // what user sees

  const baseDraw = useCallback((ctx: CanvasRenderingContext2D) => {
    drawKolam(ctx, segs, SZ, SZ);
  }, [seed]);

  const submit = () => {
    if (submitted) return;
    setSubmitted(true);
    const err = Math.abs(((visual % 360) + 360) % 360);
    const ok = err <= 20 || err >= 340; // within ±20° of 0
    if (ok) { setTimeout(onSuccess, 400); }
    else    { setTimeout(onFail, 800); }
  };

  return (
    <div className="space-y-3 w-full">
      <p className="text-xs text-muted-foreground text-center">
        Rotate the Kolam to make it upright (0°). Then click <strong>Confirm</strong>.
      </p>
      <div className="flex justify-center">
        <motion.div
          style={{ rotate: visual }}
          className="border border-primary/30 rounded-xl overflow-hidden bg-background/50"
        >
          <KC draw={baseDraw} w={SZ} h={SZ} />
        </motion.div>
      </div>
      <div className="space-y-1 px-2">
        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
          <span>-180°</span>
          <span className="text-primary font-bold">{angle > 0 ? `+${angle}` : angle}°</span>
          <span>+180°</span>
        </div>
        <input
          type="range" min={-180} max={180} step={1} value={angle}
          onChange={e => setAngle(Number(e.target.value))}
          disabled={submitted}
          className="w-full accent-primary cursor-pointer disabled:opacity-50"
        />
      </div>
      <button
        onClick={submit}
        disabled={submitted}
        className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {submitted ? "Checking…" : "Confirm Rotation"}
      </button>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// TYPE 3 — "Slide to Position"
// Kolam shown with one segment highlighted; slider moves the piece; user confirms
// ──────────────────────────────────────────────────────────────────────────────
const SlidePos = ({ seed, onSuccess, onFail }: { seed: number; onSuccess: () => void; onFail: () => void }) => {
  const rng = mulberry32(seed);
  const segs = generateSegs(rng);
  const targetIdx = seed % segs.length;
  const target = segs[targetIdx];

  // Target x position in a 0-100 track is mapped from the segment's midpoint x
  const midX = (target[0][0] + target[1][0]) / 2;
  const targetPct = Math.round((midX / (GRID - 1)) * 100);
  // shuffle starting position far from target
  const startPct = targetPct < 50 ? 85 : 15;

  const [pos, setPos] = useState(startPct);
  const [submitted, setSubmitted] = useState(false);

  // piece preview draw
  const pieceDraw = useCallback((ctx: CanvasRenderingContext2D) => {
    const pw = 60, ph = 60;
    ctx.clearRect(0, 0, pw, ph);
    ctx.strokeStyle = "hsl(174 72% 56%)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(10, ph / 2);
    ctx.lineTo(50, ph / 2);
    ctx.stroke();
    ctx.fillStyle = "hsl(174 72% 72%)";
    [10, 50].forEach(x => {
      ctx.beginPath(); ctx.arc(x, ph / 2, 5, 0, Math.PI * 2); ctx.fill();
    });
  }, []);

  const mainDraw = useCallback((ctx: CanvasRenderingContext2D) => {
    drawKolam(ctx, segs, SZ, SZ, targetIdx);
    // draw the target slot as dashed
    const x1 = PAD + target[0][0] * CELL, y1 = PAD + target[0][1] * CELL;
    const x2 = PAD + target[1][0] * CELL, y2 = PAD + target[1][1] * CELL;
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "hsl(174 72% 50% / 0.6)";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
    // glow dots at endpoints
    ctx.fillStyle = "hsl(174 72% 56% / 0.4)";
    [[x1,y1],[x2,y2]].forEach(([x,y]) => {
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    });
  }, [seed]);

  const submit = () => {
    if (submitted) return;
    setSubmitted(true);
    const diff = Math.abs(pos - targetPct);
    if (diff <= 12) { setTimeout(onSuccess, 400); }
    else            { setTimeout(onFail, 800); }
  };

  return (
    <div className="space-y-3 w-full">
      <p className="text-xs text-muted-foreground text-center">
        The dashed line is the missing segment. Slide the piece to position it, then confirm.
      </p>
      <div className="flex justify-center">
        <div className="border border-border/40 rounded-lg overflow-hidden bg-background/50">
          <KC draw={mainDraw} w={SZ} h={SZ} />
        </div>
      </div>
      {/* Piece + slider track */}
      <div className="space-y-2 px-2">
        <div className="relative h-12 bg-muted/30 rounded-full border border-border/40 overflow-hidden">
          <motion.div
            animate={{ left: `${pos}%` }}
            transition={{ type: "tween", duration: 0 }}
            style={{ left: `${pos}%` }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none"
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <GripHorizontal className="h-4 w-4 text-primary" />
            </div>
          </motion.div>
        </div>
        <input
          type="range" min={0} max={100} step={1} value={pos}
          onChange={e => setPos(Number(e.target.value))}
          disabled={submitted}
          className="w-full accent-primary cursor-pointer disabled:opacity-50"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>← Left</span>
          <span className="text-primary font-mono">{pos}%</span>
          <span>Right →</span>
        </div>
      </div>
      <button
        onClick={submit}
        disabled={submitted}
        className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {submitted ? "Checking…" : "Confirm Position"}
      </button>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// MAIN WIDGET
// ──────────────────────────────────────────────────────────────────────────────
const TYPES: ChallengeType[] = ["fourth", "spin", "slide"];

const typeInfo: Record<ChallengeType, { label: string; icon: typeof Puzzle; hint: string }> = {
  fourth: { label: "Find the 4th Piece", icon: Puzzle,       hint: "Select which quadrant completes the pattern" },
  spin:   { label: "Spin to Align",      icon: RotateCw,     hint: "Rotate the Kolam to its upright position"    },
  slide:  { label: "Slide to Position",  icon: GripHorizontal, hint: "Move the segment to fill the dashed slot"  },
};

export const KolamCaptchaWidget = ({ onVerified }: WidgetProps) => {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [typeIdx, setTypeIdx] = useState(() => Math.floor(Math.random() * 3));
  const [status, setStatus] = useState<"idle" | "ok" | "bad">("idle");
  const [attempts, setAttempts] = useState(0);

  const type: ChallengeType = TYPES[typeIdx % 3];
  const { label, icon: Icon, hint } = typeInfo[type];

  const regenerate = useCallback((nextTypeIdx?: number) => {
    setSeed(Math.floor(Math.random() * 1e9));
    setTypeIdx(nextTypeIdx !== undefined ? nextTypeIdx : Math.floor(Math.random() * 3));
    setStatus("idle");
  }, []);

  const handleSuccess = () => {
    setStatus("ok");
    setTimeout(onVerified, 500);
  };

  const handleFail = () => {
    setStatus("bad");
    setAttempts(a => a + 1);
    setTimeout(() => regenerate((typeIdx + 1) % 3), 900);
  };

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 backdrop-blur-sm p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold text-foreground">{label}</span>
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground border border-border/40 rounded-full px-2 py-0.5">
            KCaptcha
          </span>
        </div>
        <button onClick={() => regenerate()} title="New challenge"
          className="text-muted-foreground hover:text-primary transition-colors p-1 rounded hover:bg-primary/10">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Challenge */}
      <AnimatePresence mode="wait">
        <motion.div key={seed}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {type === "fourth" && <FourthPiece seed={seed} onSuccess={handleSuccess} onFail={handleFail} />}
          {type === "spin"   && <SpinAlign   seed={seed} onSuccess={handleSuccess} onFail={handleFail} />}
          {type === "slide"  && <SlidePos    seed={seed} onSuccess={handleSuccess} onFail={handleFail} />}
        </motion.div>
      </AnimatePresence>

      {/* Status bar */}
      <AnimatePresence mode="wait">
        {status === "ok" && (
          <motion.div key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-green-500 text-xs font-semibold justify-center">
            <CheckCircle className="h-4 w-4" /> Verified — you're human!
          </motion.div>
        )}
        {status === "bad" && (
          <motion.div key="bad" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-red-400 text-xs font-semibold justify-center">
            <XCircle className="h-4 w-4" /> Incorrect — generating new challenge…
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="flex items-center justify-between text-[9px] text-muted-foreground/50 pt-1 border-t border-border/20">
        <span>🔐 Powered by KolamBasedCommunication</span>
        <span>attempt #{attempts + 1}</span>
      </div>
    </div>
  );
};
