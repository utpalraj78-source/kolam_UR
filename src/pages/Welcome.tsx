import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";

import { Footer } from "@/components/Footer";

const ParticleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number }[] = [];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
      });
    }

    const animate = () => {
      ctx.fillStyle = "rgba(17, 24, 39, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, i) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(174, 72%, 56%, ${Math.random() * 0.5 + 0.2})`;
        ctx.fill();

        // Draw connections
        particles.slice(i + 1).forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.strokeStyle = `hsla(174, 72%, 56%, ${0.2 - distance / 750})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 opacity-30" />;
};

const Welcome = () => {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-between">
      <ParticleCanvas />

      {/* Gradient glow background */}
      <div className="absolute inset-0 bg-gradient-glow opacity-50" />

      <div className="relative z-10 container mx-auto px-6 pt-32 pb-16 flex-grow flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Kolam-Inspired Security</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="gradient-text">Mathematical Art</span>
            <br />
            Meets Frequency Security
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Transform ancient Kolam patterns into cutting-edge frequency-hopping spread spectrum keys.
            Generate mathematically-derived patterns, convert them to robust FH sequences, and evaluate
            performance metrics like BER, collision probability, and signal-to-interference ratio.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link to="/get-started">
              <Button
                size="lg"
                className="group bg-gradient-primary hover:opacity-90 text-white border-0 px-8 py-6 text-lg shadow-lg shadow-primary/20"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <Link to="/frequency-hopping">
              <Button
                size="lg"
                variant="outline"
                className="glass-card border-2 px-8 py-6 text-lg hover:bg-muted/30"
              >
                View Analytics
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto"
        >
          {[
            {
              title: "Generate Kolams",
              description: "Create intricate mathematical patterns with customizable symmetry, randomness, and grid parameters.",
              gradient: "from-primary/20 to-transparent",
            },
            {
              title: "Extract FH Keys",
              description: "Transform Kolam patterns into frequency-hopping sequences using pure, CSPRNG, and hybrid methods.",
              gradient: "from-secondary/20 to-transparent",
            },
            {
              title: "Analyze Performance",
              description: "Evaluate BER, collision probability, and SIR across varying SNR levels with interactive visualizations.",
              gradient: "from-accent/20 to-transparent",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 + i * 0.1 }}
              className="glass-card p-6 rounded-xl hover:scale-105 transition-transform duration-300"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-xl opacity-50`} />
              <div className="relative z-10">
                <h3 className="text-xl font-semibold mb-3 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

export default Welcome;
