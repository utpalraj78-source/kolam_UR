/**
 * KolamCaptchaWidget — A self-contained, client-side Kolam CAPTCHA
 * that works independently of the backend API.
 *
 * Challenge type: "Complete the Kolam" — the user picks which
 * of 4 numbered segments correctly completes the pattern.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Kolam Pattern Generator ──────────────────────────────────────────────────

type Point = { x: number; y: number };

const GRID = 5; // 5×5 dot grid
const CELL = 36; // px between dots
const PAD = 24;  // canvas padding
const SIZE = PAD * 2 + (GRID - 1) * CELL; // total canvas size

function drawKolamOnCtx(
  ctx: CanvasRenderingContext2D,
  pattern: [Point, Point][],
  dotColor: string,
  lineColor: string,
  missingIdx?: number          // index of segment to omit
) {
  ctx.clearRect(0, 0, SIZE, SIZE);

  // draw lines
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  pattern.forEach(([a, b], i) => {
    if (missingIdx !== undefined && i === missingIdx) return;
    const ax = PAD + a.x * CELL;
    const ay = PAD + a.y * CELL;
    const bx = PAD + b.x * CELL;
    const by = PAD + b.y * CELL;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  });

  // draw dots
  ctx.fillStyle = dotColor;
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      ctx.beginPath();
      ctx.arc(PAD + c * CELL, PAD + r * CELL, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawSingleSegment(
  ctx: CanvasRenderingContext2D,
  seg: [Point, Point],
  lineColor: string,
  dotColor: string
) {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  const [a, b] = seg;
  ctx.beginPath();
  ctx.moveTo(PAD + a.x * CELL, PAD + a.y * CELL);
  ctx.lineTo(PAD + b.x * CELL, PAD + b.y * CELL);
  ctx.stroke();

  // draw only the two endpoints
  ctx.fillStyle = dotColor;
  [a, b].forEach(p => {
    ctx.beginPath();
    ctx.arc(PAD + p.x * CELL, PAD + p.y * CELL, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

// generate a plausible Kolam pattern (random connected lines on the grid)
function generatePattern(seed: number): [Point, Point][] {
  const segs: [Point, Point][] = [];
  const rng = mulberry32(seed);
  const visited = new Set<string>();

  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [2, 0], [0, 2], [2, 1], [1, 2],
  ];

  for (let attempt = 0; attempt < 60; attempt++) {
    const x = Math.floor(rng() * (GRID - 1));
    const y = Math.floor(rng() * (GRID - 1));
    const [dx, dy] = dirs[Math.floor(rng() * dirs.length)];
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) continue;
    const key = [Math.min(x, nx), Math.min(y, ny), Math.max(x, nx), Math.max(y, ny)].join(",");
    if (visited.has(key)) continue;
    visited.add(key);
    segs.push([{ x, y }, { x: nx, y: ny }]);
    if (segs.length >= 20) break;
  }
  return segs;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ─── Sub-canvas (draws via ref) ───────────────────────────────────────────────

const KolamCanvas = ({
  draw,
  size = SIZE,
  className = "",
}: {
  draw: (ctx: CanvasRenderingContext2D) => void;
  size?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (ctx) draw(ctx);
  }, [draw]);
  return <canvas ref={ref} width={size} height={size} className={className} />;
};

// ─── Main Widget ──────────────────────────────────────────────────────────────

interface Props {
  onVerified: () => void;
}

export const KolamCaptchaWidget = ({ onVerified }: Props) => {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [missingIdx, setMissingIdx] = useState(0);
  const [options, setOptions] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "fail">("idle");

  const regenerate = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 1e9);
    setSeed(newSeed);
    setSelected(null);
    setStatus("idle");
  }, []);

  // derive pattern + challenge from seed
  const pattern = generatePattern(seed);
  const mIdx = seed % Math.max(pattern.length, 1);

  useEffect(() => {
    setMissingIdx(mIdx);
    // build 4 option indices: correct + 3 distractors
    const correct = mIdx;
    const allIdx = pattern.map((_, i) => i).filter(i => i !== correct);
    const shuffled = allIdx.sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [correct, ...shuffled].sort(() => Math.random() - 0.5);
    setOptions(opts);
    setSelected(null);
    setStatus("idle");
  }, [seed]);

  const handleSelect = (optIdx: number) => {
    if (status !== "idle") return;
    setSelected(optIdx);
    if (optIdx === missingIdx) {
      setStatus("success");
      setTimeout(() => onVerified(), 600);
    } else {
      setStatus("fail");
      setTimeout(() => {
        setStatus("idle");
        setSelected(null);
      }, 900);
    }
  };

  const lineColor = "hsl(174 72% 56%)";
  const dotColor  = "hsl(174 72% 70%)";
  const lineFaded = "hsl(174 72% 40%)";

  const mainDraw = useCallback(
    (ctx: CanvasRenderingContext2D) =>
      drawKolamOnCtx(ctx, pattern, dotColor, lineColor, missingIdx),
    [seed, missingIdx]
  );

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 backdrop-blur-sm p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
            Kolam Verification
          </p>
        </div>
        <button
          onClick={regenerate}
          title="New challenge"
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        The Kolam pattern below is missing one segment. Pick the correct missing piece.
      </p>

      {/* Main pattern */}
      <div className="flex justify-center">
        <div className="relative rounded-lg overflow-hidden border border-border/40 bg-background/60">
          <KolamCanvas draw={mainDraw} className="block" />
          <div className="absolute bottom-1 right-2 text-[9px] text-muted-foreground/40 font-mono">
            #{(seed % 9999).toString().padStart(4, "0")}
          </div>
        </div>
      </div>

      {/* Options */}
      <p className="text-xs text-center text-muted-foreground">Choose the missing segment:</p>
      <div className="grid grid-cols-4 gap-2">
        {options.map((optIdx, i) => {
          const seg = pattern[optIdx];
          if (!seg) return null;
          const isSelected = selected === optIdx;
          const isCorrect = optIdx === missingIdx;
          let border = "border-border/40 hover:border-primary/50";
          if (isSelected && status === "success") border = "border-green-500 bg-green-500/10";
          if (isSelected && status === "fail")    border = "border-red-500 bg-red-500/10";

          return (
            <motion.button
              key={i}
              whileHover={{ scale: status === "idle" ? 1.05 : 1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(optIdx)}
              className={`rounded-lg border-2 bg-background/60 flex items-center justify-center transition-all ${border} overflow-hidden relative`}
              style={{ height: SIZE / 2, cursor: status === "idle" ? "pointer" : "default" }}
            >
              <KolamCanvas
                draw={(ctx) => drawSingleSegment(ctx, seg, lineColor, dotColor)}
                className="block scale-50 origin-center"
                size={SIZE}
              />
              {isSelected && status === "success" && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              )}
              {isSelected && status === "fail" && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Status message */}
      <AnimatePresence mode="wait">
        {status === "success" && (
          <motion.p
            key="ok"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-center text-green-500 font-semibold"
          >
            ✓ Verified — you're human!
          </motion.p>
        )}
        {status === "fail" && (
          <motion.p
            key="fail"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-center text-red-400 font-semibold"
          >
            ✗ Incorrect — try another piece.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};
