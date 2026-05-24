import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Target,
  Rocket,
  Users,
  ShieldCheck,
  Cpu,
  Radio,
  GraduationCap,
  Building2,
  FlaskConical,
  Mail,
  Linkedin,
  Github,
  ArrowRight,
} from "lucide-react";

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
    for (let i = 0; i < 50; i++) {
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
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(174, 72%, 56%, ${Math.random() * 0.5 + 0.2})`;
        ctx.fill();
        particles.slice(i + 1).forEach((o) => {
          const dx = p.x - o.x;
          const dy = p.y - o.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(o.x, o.y);
            ctx.strokeStyle = `hsla(174, 72%, 56%, ${0.2 - dist / 750})`;
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

  return <canvas ref={canvasRef} className="fixed inset-0 opacity-30 pointer-events-none" />;
};

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7 },
};

const ReachUs = () => {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <ParticleCanvas />
      <div className="absolute inset-0 bg-gradient-glow opacity-50 pointer-events-none" />

      <div className="relative z-10 container mx-auto px-6 py-24 space-y-32">

        {/* ── Hero ────────────────────────────────────── */}
        <motion.section {...fadeUp} className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card">
            <Rocket className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Let's Build Together</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight">
            <span className="gradient-text">Reach Us</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Whether you're a researcher, a telecom engineer, or a defense contractor — we want to hear from you.
            Learn who we are, what we're building, and how we can collaborate.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <a href="mailto:utpalraj6311@gmail.com">
              <Button size="lg" className="group bg-gradient-primary text-white border-0 px-8 py-6 text-base shadow-lg shadow-primary/20">
                <Mail className="mr-2 h-4 w-4" />
                Email Us
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            <a href="https://www.linkedin.com/in/utpal-raj-61a465323/" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="glass-card border-2 px-8 py-6 text-base hover:bg-muted/30">
                <Linkedin className="mr-2 h-4 w-4" />
                LinkedIn
              </Button>
            </a>
            <a href="https://github.com/utpalraj78-source" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="glass-card border-2 px-8 py-6 text-base hover:bg-muted/30">
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </Button>
            </a>
          </div>
        </motion.section>

        {/* ── What We're Building ─────────────────────── */}
        <motion.section {...fadeUp} className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              What We're <span className="gradient-text">Building</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A high-fidelity, cloud-native simulation platform where ancient geometric art meets next-generation radio security.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Radio,
                title: "Kolam-Derived FHSS Engine",
                desc: "We translate traditional South Indian Kolam dot-patterns into cryptographically-strong frequency hopping sequences, generating 10¹² unique channel permutations per session — orders of magnitude above conventional PRNG-based systems.",
              },
              {
                icon: Cpu,
                title: "C++ AVX2 High-Performance Kernel",
                desc: "The core DSP layer runs on a native C++ engine using Intel AVX2 SIMD intrinsics, processing 128k IQ samples per TTI at < 150 µs latency — matching commercial O-RAN Distributed Unit performance on standard x86 hardware.",
              },
              {
                icon: ShieldCheck,
                title: "KCaptcha — Geometric Bot Shield",
                desc: "A proprietary CAPTCHA system built on Kolam spatial entropy, replacing brittle text/image challenges with geometric pattern validation that is intuitive to humans and computationally intractable for bots.",
              },
              {
                icon: Target,
                title: "O-RAN Split 7.2x Simulator",
                desc: "A full eCPRI-framing simulation that mirrors commercial 5G/6G fronthaul deployments from Nokia and Ericsson, enabling engineers to test control-plane signaling, latency constraints, and spectrum allocation without physical hardware.",
              },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-card p-6 rounded-2xl border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-foreground">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Our Goal ────────────────────────────────── */}
        <motion.section {...fadeUp} className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Our <span className="gradient-text">Goal</span>
            </h2>
          </div>
          <div className="glass-card rounded-2xl p-10 border border-border/50 space-y-6 text-left">
            <p className="text-lg text-foreground/90 leading-relaxed">
              We are building the world's first <strong>Kolam-pattern-derived telecommunications security platform</strong> —
              a TRL-9-grade simulation engine that proves geometric art can encode stronger entropy than conventional RNG algorithms.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Our goal is to bridge the gap between academic research and commercial telco deployment by providing a software-only,
              hardware-agnostic O-RAN prototype that any engineer can deploy in a Docker container, benchmark on standard hardware,
              and integrate into existing 5G/6G RAN test frameworks — at a fraction of the cost of proprietary lab setups.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Beyond simulation, we aim to standardize Kolam-based key generation as an open specification for next-generation
              Adaptive Frequency Hopping — contributing to global spectrum security, especially in high-interference and contested RF environments.
            </p>
          </div>
        </motion.section>

        {/* ── Who We're Building For ───────────────────── */}
        <motion.section {...fadeUp} className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Who We're Building <span className="gradient-text">For</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Our platform is designed for a spectrum of users — from curious students to defense contractors.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: GraduationCap,
                label: "Academic Researchers",
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
                border: "hover:border-emerald-500/30",
                desc: "PhD students and research labs studying spread-spectrum communications, cryptographic entropy, or cultural computing. Free tier, immediate access, no hardware needed.",
              },
              {
                icon: Building2,
                label: "Telecom Engineers & Enterprises",
                color: "text-primary",
                bg: "bg-primary/10",
                border: "hover:border-primary/30",
                desc: "Network architects, RAN engineers, and 5G/6G system integrators who need a cost-effective O-RAN test bench that runs on cloud VMs and benchmarks against commercial specs.",
              },
              {
                icon: FlaskConical,
                label: "Defense & Security Labs",
                color: "text-violet-400",
                bg: "bg-violet-500/10",
                border: "hover:border-violet-500/30",
                desc: "SIGINT, EW, and RF security teams building anti-jamming, covert communication, or frequency agility systems. Custom enterprise tier with full API access and SLA support.",
              },
            ].map(({ icon: Icon, label, color, bg, border, desc }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className={`glass-card rounded-2xl p-7 border border-border/50 ${border} transition-all duration-300 flex flex-col gap-4`}
              >
                <div className={`p-3 rounded-xl ${bg} w-fit`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <h3 className="font-bold text-foreground text-lg">{label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── CTA ─────────────────────────────────────── */}
        <motion.section
          {...fadeUp}
          className="max-w-3xl mx-auto text-center space-y-6 py-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to <span className="gradient-text">Collaborate?</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Whether you want a demo, a custom deployment, or just want to say hello — drop us a line.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="mailto:utpalraj6311@gmail.com">
              <Button size="lg" className="bg-gradient-primary text-white border-0 px-10 py-6 text-base shadow-lg shadow-primary/20">
                <Mail className="mr-2 h-4 w-4" /> utpalraj6311@gmail.com
              </Button>
            </a>
            <Link to="/get-started">
              <Button size="lg" variant="outline" className="glass-card border-2 px-10 py-6 text-base hover:bg-muted/30">
                Get Started Free
              </Button>
            </Link>
          </div>
        </motion.section>

      </div>
    </div>
  );
};

export default ReachUs;
