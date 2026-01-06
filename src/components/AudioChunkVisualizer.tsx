import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface AudioChunkVisualizerProps {
    data: Float32Array;
    // optional label to differentiate sent/received
    label?: string;
    onClick?: () => void;
    channel?: number;
}

export const AudioChunkVisualizer: React.FC<AudioChunkVisualizerProps> = ({ data, label, onClick, channel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = label === 'sent' ? '#4ade80' : '#60a5fa'; // green for sent, blue for received
        ctx.lineWidth = 2;
        ctx.beginPath();
        const step = Math.max(1, Math.floor(data.length / width));
        for (let i = 0; i < width; i++) {
            const sample = data[i * step] ?? 0;
            const y = height / 2 - (sample * height) / 2; // normalize to canvas height
            if (i === 0) ctx.moveTo(i, y);
            else ctx.lineTo(i, y);
        }
        ctx.stroke();
    }, [data, label]);

    return (
        <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            transition={{ duration: 0.3 }}
            className="my-2 cursor-pointer hover:ring-2 hover:ring-primary rounded"
            onClick={onClick}
        >
            <canvas ref={canvasRef} width={300} height={80} className="rounded" />
            <div className="flex justify-between items-center mt-1 px-1">
                {label && <div className="text-xs text-muted-foreground">{label}</div>}
                {channel !== undefined && <div className="text-xs font-mono text-yellow-500">CH: {channel}</div>}
            </div>
        </motion.div>
    );
};
