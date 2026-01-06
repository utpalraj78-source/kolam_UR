import React, { useEffect, useRef } from 'react';

interface KolamCanvasProps {
    k: number;
    seed?: number;
    rows?: number[][];
    cols?: number[][];
}

export const KolamCanvas: React.FC<KolamCanvasProps> = ({ k, seed, rows, cols }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Grid
        const padding = 10;
        const size = Math.min(canvas.width, canvas.height) - padding * 2;
        const cellSize = size / Math.max(k, 1);

        // Draw Dots (Optimization: Draw all dots in one path)
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        for (let r = 0; r <= k; r++) {
            for (let c = 0; c <= k; c++) {
                const x = padding + c * cellSize;
                const y = padding + r * cellSize;
                ctx.moveTo(x + 1.5, y); // approximate circle
                ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            }
        }
        ctx.fill();

        // Draw Edges
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        if (rows && cols) {
            // Render Real Data
            // Horizontal Edges (rows)
            for (let r = 0; r < rows.length; r++) {
                if (!rows[r]) continue;
                for (let c = 0; c < rows[r].length; c++) {
                    if (rows[r][c]) {
                        const x = padding + c * cellSize;
                        const y = padding + r * cellSize;
                        ctx.moveTo(x, y);
                        ctx.lineTo(x + cellSize, y);
                    }
                }
            }
            // Vertical Edges (cols)
            for (let c = 0; c < cols.length; c++) {
                if (!cols[c]) continue;
                for (let r = 0; r < cols[c].length; r++) {
                    if (cols[c][r]) {
                        const x = padding + c * cellSize;
                        const y = padding + r * cellSize;
                        ctx.moveTo(x, y);
                        ctx.lineTo(x, y + cellSize);
                    }
                }
            }
        } else if (seed !== undefined) {
            // Random Simulation (Fallback)
            let localSeed = seed;
            const random = () => {
                localSeed = (localSeed * 9301 + 49297) % 233280;
                return localSeed / 233280;
            };

            for (let r = 0; r <= k; r++) {
                for (let c = 0; c < k; c++) {
                    if (random() > 0.5) {
                        const x = padding + c * cellSize;
                        const y = padding + r * cellSize;
                        ctx.moveTo(x, y);
                        ctx.lineTo(x + cellSize, y);
                    }
                }
            }
            for (let r = 0; r < k; r++) {
                for (let c = 0; c <= k; c++) {
                    if (random() > 0.5) {
                        const x = padding + c * cellSize;
                        const y = padding + r * cellSize;
                        ctx.moveTo(x, y);
                        ctx.lineTo(x, y + cellSize);
                    }
                }
            }
        }
        ctx.stroke();

    }, [k, seed, rows, cols]);

    return <canvas ref={canvasRef} width={300} height={300} className="w-full h-full" />;
};
