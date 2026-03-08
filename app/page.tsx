"use client"; // Fondamentale per Next.js per far funzionare le animazioni

import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView, animate } from 'framer-motion';
import { ArrowRight, Check, Activity, ShieldAlert, Cpu } from 'lucide-react';

// --- CUSTOM HOOK: LENIS SMOOTH SCROLL ---
const useLenis = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@studio-freight/lenis@1.0.39/dist/lenis.min.js';
    script.async = true;
    script.onload = () => {
      const lenis = new window.Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      const raf = (time) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);
};

// --- CUSTOM HOOK: MOUSE POSITION ---
const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const updateMousePosition = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', updateMousePosition);
    return () => window.removeEventListener('mousemove', updateMousePosition);
  }, []);
  return mousePosition;
};

// --- COMPONENT: CUSTOM CURSOR ---
const CustomCursor = () => {
  const { x, y } = useMousePosition();
  return (
    <motion.div
      className="fixed top-0 left-0 w-6 h-6 bg-white rounded-full pointer-events-none z-[9999] mix-blend-difference"
      animate={{ x: x - 12, y: y - 12 }}
      transition={{ type: 'tween', ease: 'backOut', duration: 0.1 }}
    />
  );
};

// --- COMPONENT: MAGNETIC BUTTON ---
const MagneticButton = ({ children, onClick, className = '' }) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.2, y: middleY * 0.2 });
  };

  const reset = () => setPosition({ x: 0, y: 0 });

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
      onClick={onClick}
      className={`relative overflow-hidden group rounded-full bg-[#FF6B00] text-black font-bold uppercase tracking-widest px-8 py-4 flex items-center gap-3 transition-colors hover:bg-white ${className}`}
    >
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </motion.button>
  );
};

// --- COMPONENT: BACKGROUND CANVAS (NEURAL NETWORK / NOISE) ---
const BackgroundCanvas = () => {
  const canvasRef = useRef(null);
  const mouse = useMousePosition();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 1.5;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 150) {
          this.x -= dx * 0.01;
          this.y -= dy * 0.01;
        }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 107, 0, 0.3)';
        ctx.fill();
      }
    }

    for (let i = 0; i < 80; i++) particles.push(new Particle());

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.update();
        p.draw();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 - dist / 1000})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mouse]);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full z-[-1]" />;
};

// --- COMPONENT: PRELOADER ---
const Preloader = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let val = 0;
    const interval = setInterval(() => {
      val += Math.floor(Math.random() * 8) + 2;
      if (val >= 100) {
        val = 100;
        clearInterval(interval);
        setTimeout(() => onComplete(), 800);
      }
      setProgress(val);
    }, 40);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{ y: progress === 100 ? '-100%' : 0 }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1], delay: 0.2 }}
      className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center font-mono"
    >
      <div className="w-full max-w-md px-8">
        <div className="flex justify-between text-xs tracking-widest text-white/50 mb-4">
          <span>SYSTEM.BOOT</span>
          <span>NOVAGROWTH_AI</span>
        </div>
        <div className="text-8xl md:text-9xl font-extrabold tracking-tighter text-[#FF6B00]">
          {progress}%
        </div>
        <div className="h-[1px] w-full bg-white/10 mt-8 relative overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 h-full bg-[#FF6B00]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-4 text-xs text-white/30 uppercase tracking-widest text-center">
          {progress < 100 ? 'Inizializzazione Rete Neurale...' : 'Sistema Operativo.'}
        </div>
      </div>
    </motion.div>
  );
};

// --- COMPONENT: SPLIT TEXT ANIMATION ---
const SplitText = ({ text, delay = 0 }) => {
  const words = text.split(" ");
  return (
    <span className="flex flex-wrap inline-flex overflow-hidden">
      {words.map((word, i) => (
        <span key={i} className="overflow-hidden inline-flex">
          <motion.span
            initial={{ y: "110%", rotateZ: 5 }}
            whileInView={{ y: 0, rotateZ: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: delay + i * 0.05 }}
            className="inline-block mr-[0.25em]"
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
};

// --- MAIN APP ---
export default function Page() {
  const [loading, setLoading] = useState(true);
  useLenis();

  return (
    <div className="bg-black text-white min-h-screen selection:bg-[#FF6B00] selection:text-black overflow-x-clip font-sans antialiased">
      {loading && <Preloader onComplete={() => setLoading(false)} />}
      <CustomCursor />
      <BackgroundCanvas />

      {!loading && (
        <main>
          <HeroSection />
          <ScrollyTellingSection />
          <MathProofSection />
          <PricingSection />
          <FooterSection />
        </main>
      )}
    </div>
  );
}

// --- SECTIONS ---
const HeroSection = () => {
  return (
    <section className="relative h-screen flex flex-col items-center justify-center px-6 pt-20">
      <div className="absolute top-8 left-8 flex items-center gap-2 font-mono text-xs tracking-widest text-white/50 uppercase">
        <div className="w-2 h-2 rounded-full bg-[#FF6B00] animate-pulse" />
        NovaGrowth // Milano
      </div>

      <div className="text-center max-w-5xl z-10">
        <h1 className="text-6xl md:text-[8rem] leading-[0.9] font-extrabold tracking-tighter uppercase mb-8 mix-blend-difference">
          <SplitText text="ACQUISIZIONE." delay={0.2} /> <br />
          <span className="text-transparent border-text" style={{ WebkitTextStroke: '2px #FF6B00' }}>
            <SplitText text="AUTONOMA." delay={0.4} />
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto font-mono mb-12"
        >
          Sostituiamo la latenza umana con l&apos;Intelligenza Artificiale. <br className="hidden md:block" />
          <span className="text-white">Zero sforzo, calendario pieno.</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="flex justify-center"
        >
          <MagneticButton>
            Prenota Demo <ArrowRight size={18} />
          </MagneticButton>
        </motion.div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-widest text-white/30 uppercase flex flex-col items-center gap-2">
        <span>Scroll per esplorare</span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-[#FF6B00] to-transparent animate-pulse" />
      </div>
    </section>
  );
};

const ScrollyTellingSection = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 20 });

  const opacity1 = useTransform(smoothProgress, [0, 0.15, 0.3], [1, 1, 0]);
  const scale1 = useTransform(smoothProgress, [0, 0.3], [1, 1.1]);

  const opacity2 = useTransform(smoothProgress, [0.25, 0.4, 0.6, 0.7], [0, 1, 1, 0]);
  const y2 = useTransform(smoothProgress, [0.25, 0.4], [50, 0]);

  const opacity3 = useTransform(smoothProgress, [0.65, 0.8, 1], [0, 1, 1]);
  const scale3 = useTransform(smoothProgress, [0.65, 0.8], [0.9, 1]);

  return (
    <section ref={containerRef} className="h-[300vh] relative">
      <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center">

        {/* Phase 1: Il Problema */}
        <motion.div style={{ opacity: opacity1, scale: scale1 }} className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center overflow-hidden bg-black">
          <div className="absolute inset-0 z-[-1] bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.08)_0%,transparent_50%)]" />

          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
            {Array.from({ length: 25 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-[1px] h-32 bg-gradient-to-b from-transparent via-red-600 to-transparent"
                style={{ left: `${Math.random() * 100}%`, top: '-20%' }}
                animate={{ top: '120%' }}
                transition={{ duration: 1.5 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 3, ease: "linear" }}
              />
            ))}
          </div>

          <motion.div animate={{ y: [-5, 5, -5] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
            <ShieldAlert className="text-red-500 w-20 h-20 mb-8 drop-shadow-[0_0_20px_rgba(220,38,38,0.4)]" />
          </motion.div>

          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase max-w-4xl leading-[1.1] relative">
            <span className="text-white relative z-10">La tua segreteria</span> <br />
            <motion.span
              animate={{ textShadow: ['0 0 10px rgba(239,68,68,0.4)', '0 0 35px rgba(239,68,68,0.9)', '0 0 10px rgba(239,68,68,0.4)'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="text-red-500 inline-block mt-2"
            >
              È LENTA.
            </motion.span>
          </h2>

          <div className="mt-12 bg-white/[0.02] px-10 py-5 border border-white/5 rounded-full backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-10 relative">
            <p className="font-mono text-white/60 text-lg md:text-xl">
              Perdi il <strong className="text-red-500 font-bold text-2xl mx-1">78%</strong> dei pazienti prima del primo contatto.
            </p>
          </div>
        </motion.div>

        {/* Phase 2: Trust */}
        <motion.div style={{ opacity: opacity2, y: y2 }} className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black/90 backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none mix-blend-screen opacity-70">
            <motion.div animate={{ rotate: 360, scale: [1, 1.1, 1] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="w-[80vw] h-[80vw] md:w-[50vw] md:h-[50vw] rounded-full border border-white/5 absolute" style={{ background: 'conic-gradient(from 0deg, transparent, rgba(255,107,0,0.1), transparent)' }} />
            <motion.div animate={{ rotate: -360, scale: [1.1, 1, 1.1] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="w-[60vw] h-[60vw] md:w-[35vw] md:h-[35vw] rounded-full border border-[#FF6B00]/10 absolute border-dashed" />
            <motion.div animate={{ scale: [0.9, 1.4, 0.9], opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="w-[30vw] h-[30vw] bg-[#FF6B00]/10 blur-[100px] rounded-full absolute" />
          </div>

          <motion.div animate={{ height: ["0px", "80px", "0px"], opacity: [0, 1, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="w-[2px] bg-gradient-to-b from-transparent via-[#FF6B00] to-transparent mb-12 shadow-[0_0_15px_rgba(255,107,0,1)]" />

          <h2 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase max-w-5xl text-white relative z-10 drop-shadow-[0_0_40px_rgba(255,255,255,0.2)]">
            La Fiducia <br />
            <motion.span animate={{ color: ['#ffffff', '#FF6B00', '#ffffff'], textShadow: ['0 0 0px #000', '0 0 40px #FF6B00', '0 0 0px #000'] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="italic font-light">
              dell&apos;Influencer.
            </motion.span>
          </h2>

          <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="mt-12 relative z-10">
            <p className="font-mono text-white/80 max-w-lg text-sm md:text-base leading-relaxed border border-[#FF6B00]/20 bg-black/40 p-8 rounded-2xl backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,107,0,0.05)]">
              I pazienti oggi non aspettano. Pretendono risposte immediate, <span className="text-[#FF6B00] font-bold">24/7</span>.
              <br /><br />L&apos;attenzione è il nuovo petrolio.
            </p>
          </motion.div>
        </motion.div>

        {/* Phase 3: Solution */}
        <motion.div style={{ opacity: opacity3, scale: scale3 }} className="absolute inset-0 flex flex-col md:flex-row items-center justify-center p-8 md:p-24 gap-12 bg-[#050505]">
          <div className="flex-1 text-left relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#FF6B00]/30 rounded-full text-[#FF6B00] font-mono text-xs mb-6">
              <span className="w-2 h-2 rounded-full bg-[#FF6B00] animate-pulse" />
              Agente Voice AI
            </div>
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase leading-[0.9]">
              In <span className="text-[#FF6B00]">5 Secondi</span> Esatti.
            </h2>
            <p className="font-mono text-white/60 mt-8 text-lg max-w-md">
              Il paziente è qualificato, rassicurato e fissato a calendario. Mentre tu dormi.
            </p>
          </div>
          <div className="flex-1 relative z-10">
            <div className="aspect-square rounded-full border border-white/10 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full border border-[#FF6B00]/20 animate-[ping_3s_linear_infinite]" />
              <div className="absolute inset-4 rounded-full border border-[#FF6B00]/40 animate-[ping_3s_linear_infinite_0.5s]" />
              <Cpu className="w-24 h-24 text-[#FF6B00]" />
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

const MathProofSection = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-20%" });
  const [displayAmount, setDisplayAmount] = useState("€ 0");

  useEffect(() => {
    if (isInView) {
      // 45 Lead * 300€ = 13.500€
      animate(0, 13500, {
        duration: 3,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (latest) => setDisplayAmount(`€ ${Math.round(latest).toLocaleString('it-IT')}`)
      });
    }
  }, [isInView]);

  return (
    <section ref={sectionRef} className="py-32 px-6 md:px-12 border-t border-white/10 bg-black">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase mb-16">
          La Matematica <span className="text-white/30">Non Mente.</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">

          <div className="p-8 border border-white/5 bg-white/[0.02] rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity className="w-32 h-32 text-red-500" />
            </div>
            <div className="font-mono text-xs tracking-widest text-red-500/80 mb-8">STATUS ATTUALE (MANUALE)</div>

            <div className="space-y-6 font-mono text-sm text-white/60">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span>Lead non risposti in &lt; 5 min:</span>
                <span className="text-white">~45 / mese</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span>Valore Medio Paziente (LTV):</span>
                <span className="text-white">€ 300,00</span>
              </div>
              <div className="flex justify-between pt-4">
                <span className="text-white">Perdita Fisiologica Mensile:</span>
                <span className="text-red-500 font-bold">€ -13.500</span>
              </div>
            </div>
          </div>

          <div className="p-8 border border-[#FF6B00]/30 bg-[#FF6B00]/5 rounded-2xl relative overflow-hidden shadow-[0_0_50px_rgba(255,107,0,0.1)]">
            <div className="font-mono text-xs tracking-widest text-[#FF6B00] mb-8">INFRASTRUTTURA NOVAGROWTH</div>

            <div className="space-y-6 font-mono text-sm text-white/80">
              <div className="flex justify-between border-b border-[#FF6B00]/20 pb-2">
                <span>Lead gestiti dall&apos;AI in 2 sec:</span>
                <span className="text-[#FF6B00]">100%</span>
              </div>
              <div className="flex justify-between border-b border-[#FF6B00]/20 pb-2">
                <span>Tasso di Conversione AI:</span>
                <span className="text-[#FF6B00]">+ 38%</span>
              </div>

              <div className="pt-8">
                <div className="text-xs text-white/50 mb-2 uppercase tracking-widest">Fatturato Recuperato / Mese</div>
                <motion.div className="text-5xl md:text-7xl font-bold tracking-tighter text-[#FF6B00]">
                  {displayAmount}
                </motion.div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

const PricingSection = () => {
  return (
    <section className="py-32 px-6 md:px-12 relative bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase">
            Piani di <span className="text-transparent border-text" style={{ WebkitTextStroke: '1px #ffffff' }}>Partnership</span>
          </h2>
          <p className="font-mono text-white/50 mt-6">Scegli la velocità con cui vuoi scalare.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">

          <div className="p-8 border border-white/10 bg-white/5 backdrop-blur-md rounded-2xl md:translate-y-4 hover:border-white/30 transition-colors">
            <div className="font-mono text-xs text-white/50 mb-2">VALIDAZIONE</div>
            <h3 className="text-3xl font-bold uppercase tracking-tight mb-6">3 Mesi</h3>
            <div className="text-white/60 font-mono text-sm space-y-4 mb-8">
              <div className="flex gap-3 items-start"><Check size={16} className="text-[#FF6B00] mt-0.5" /> Setup infrastruttura base</div>
              <div className="flex gap-3 items-start"><Check size={16} className="text-[#FF6B00] mt-0.5" /> Agente AI Voce e Chat</div>
              <div className="flex gap-3 items-start"><Check size={16} className="text-[#FF6B00] mt-0.5" /> Supporto via Slack (48h)</div>
            </div>
            <button className="w-full py-3 border border-white/20 uppercase font-mono text-xs tracking-widest hover:bg-white hover:text-black transition-colors">
              Quota Standard
            </button>
          </div>

          <div className="relative p-[1px] rounded-2xl bg-gradient-to-b from-[#FF6B00] to-black transform md:-translate-y-4 shadow-[0_0_80px_rgba(255,107,0,0.15)] z-10">
            <div className="h-full w-full bg-[#0a0a0a] backdrop-blur-xl rounded-2xl p-8">
              <div className="absolute top-0 right-8 transform -translate-y-1/2">
                <span className="bg-[#FF6B00] text-black text-[10px] font-bold px-3 py-1 uppercase tracking-widest rounded-full">
                  Più Richiesto
                </span>
              </div>
              <div className="font-mono text-xs text-[#FF6B00] mb-2">SCALING TOTALE</div>
              <h3 className="text-4xl font-bold uppercase tracking-tight mb-2">12 Mesi</h3>
              <div className="text-[#FF6B00] font-mono text-sm mb-6">-15% sul canone mensile</div>

              <div className="text-white/80 font-mono text-sm space-y-4 mb-8">
                <div className="flex gap-3 items-start"><Check size={16} className="text-[#FF6B00] mt-0.5" /> Partnership esclusiva</div>
                <div className="flex gap-3 items-start"><Check size={16} className="text-[#FF6B00] mt-0.5" /> Clone Vocale Personalizzato</div>
                <div className="flex gap-3 items-start"><Check size={16} className="text-[#FF6B00] mt-0.5" /> Integrazione CRM Custom</div>
                <div className="flex gap-3 items-start"><Check size={16} className="text-[#FF6B00] mt-0.5" /> Supporto VIP &lt; 2h</div>
              </div>
              <MagneticButton className="w-full justify-center !py-4">
                Inizia Ora
              </MagneticButton>
            </div>
          </div>

          <div className="p-8 border border-white/10 bg-white/5 backdrop-blur-md rounded-2xl md:translate-y-4 hover:border-white/30 transition-colors">
            <div className="font-mono text-xs text-white/50 mb-2">CRESCITA</div>
            <h3 className="text-3xl font-bold uppercase tracking-tight mb-2">6 Mesi</h3>
            <div className="text-white/40 font-mono text-sm mb-6">-10% sul canone</div>
            <div className="text-white/60 font-mono text-sm space-y-4 mb-8">
              <div className="flex gap-3 items-start"><Check size={16} className="text-[#FF6B00] mt-0.5" /> Tutto il piano 3 Mesi</div>
              <div className="flex gap-3 items-start"><Check size={16} className="text-[#FF6B00] mt-0.5" /> Ottimizzazione script mensile</div>
              <div className="flex gap-3 items-start"><Check size={16} className="text-[#FF6B00] mt-0.5" /> Reportistica avanzata</div>
            </div>
            <button className="w-full py-3 border border-white/20 uppercase font-mono text-xs tracking-widest hover:bg-white hover:text-black transition-colors">
              Richiedi Info
            </button>
          </div>

        </div>
      </div>
    </section>
  );
};

const FooterSection = () => {
  return (
    <footer className="relative bg-black pt-32 pb-12 overflow-hidden border-t border-white/5">
      <div className="max-w-[100rem] mx-auto px-6 relative z-10 flex flex-col items-center">

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-12"
        >
          <motion.h2
            animate={{
              backgroundPosition: ["0% 50%", "200% 50%"],
              filter: [
                "drop-shadow(0px 0px 10px rgba(255,107,0,0.1))",
                "drop-shadow(0px 0px 30px rgba(255,107,0,0.4))",
                "drop-shadow(0px 0px 10px rgba(255,107,0,0.1))"
              ]
            }}
            transition={{
              backgroundPosition: { duration: 7, repeat: Infinity, ease: "linear" },
              filter: { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
            }}
            className="text-[12vw] leading-[1.05] font-extrabold tracking-tighter uppercase text-center pb-4"
            style={{
              backgroundImage: "linear-gradient(90deg, #FF6B00 0%, #FFD6B3 20%, #FF6B00 40%, #FF6B00 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            DOMINA IL<br />MERCATO.
          </motion.h2>
        </motion.div>

        <div className="flex flex-col md:flex-row items-center justify-center w-full max-w-5xl border-y border-white/10 py-8 mb-12 gap-8">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center shrink-0">
              <ShieldAlert size={20} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-white uppercase tracking-wider text-sm">Risk Reversal 100%</div>
              <div className="font-mono text-xs text-white/50">Test 14 gg. Nessun paziente = Nessun costo.</div>
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col md:flex-row justify-between items-center font-mono text-[10px] text-white/30 uppercase tracking-widest gap-4">
          <div>© {new Date().getFullYear()} NovaGrowth. All Rights Reserved.</div>
          <div className="flex gap-8">
            <a href="/" className="hover:text-white transition-colors">Privacy</a>
            <a href="/" className="hover:text-white transition-colors">Termini</a>
            <a href="/" className="hover:text-white transition-colors">Instagram</a>
          </div>
        </div>

      </div>
    </footer>
  );
};