"use client";

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  Activity, BarChart3, DollarSign, MessageSquare, Zap,
  ChevronDown, X, ArrowRight, User,
  TrendingUp, Video, Bell, Brain, Star, Check,
  Sparkles, Globe, Lock
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   COSMIC NEBULA BACKGROUND — Rich particle cloud canvas
   ═══════════════════════════════════════════════════════════ */
interface Particle {
  x: number; y: number; r: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  hue: number; saturation: number; lightness: number; alpha: number;
}

export function CosmicNebulaBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    const particles: Particle[] = [];
    const PARTICLE_COUNT = 160;

    function createParticle(init = false): Particle {
      const cx = width * (0.55 + Math.random() * 0.4);
      const cy = height * (0.15 + Math.random() * 0.55);
      const spread = 200 + Math.random() * 250;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * spread;
      return {
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        r: Math.random() * 3 + 0.5,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.08 - 0.04,
        life: init ? Math.random() * 600 : 0,
        maxLife: 400 + Math.random() * 400,
        hue: 260 + Math.random() * 60,
        saturation: 70 + Math.random() * 30,
        lightness: 55 + Math.random() * 25,
        alpha: 0.3 + Math.random() * 0.5,
      };
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(createParticle(true));

    const stars: { x: number; y: number; r: number; a: number; pulse: number }[] = [];
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * width, y: Math.random() * height,
        r: Math.random() * 1.2 + 0.2, a: Math.random() * 0.5 + 0.1,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, width, height);

      // Nebula base glows
      const g1 = ctx!.createRadialGradient(width * 0.68, height * 0.35, 0, width * 0.68, height * 0.35, width * 0.35);
      g1.addColorStop(0, 'rgba(147, 51, 234, 0.07)');
      g1.addColorStop(0.3, 'rgba(192, 38, 211, 0.035)');
      g1.addColorStop(0.6, 'rgba(129, 140, 248, 0.015)');
      g1.addColorStop(1, 'transparent');
      ctx!.fillStyle = g1;
      ctx!.fillRect(0, 0, width, height);

      const g2 = ctx!.createRadialGradient(width * 0.75, height * 0.5, 0, width * 0.75, height * 0.5, width * 0.25);
      g2.addColorStop(0, 'rgba(167, 139, 250, 0.05)');
      g2.addColorStop(0.5, 'rgba(139, 92, 246, 0.025)');
      g2.addColorStop(1, 'transparent');
      ctx!.fillStyle = g2;
      ctx!.fillRect(0, 0, width, height);

      const g3 = ctx!.createRadialGradient(width * 0.6, height * 0.4, 0, width * 0.6, height * 0.4, width * 0.2);
      g3.addColorStop(0, 'rgba(236, 72, 153, 0.04)');
      g3.addColorStop(0.5, 'rgba(219, 39, 119, 0.015)');
      g3.addColorStop(1, 'transparent');
      ctx!.fillStyle = g3;
      ctx!.fillRect(0, 0, width, height);

      for (const star of stars) {
        const twinkle = Math.sin(time * 0.001 + star.pulse) * 0.3 + 0.7;
        ctx!.beginPath();
        ctx!.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(200, 180, 255, ${star.a * twinkle})`;
        ctx!.fill();
      }

      ctx!.globalCompositeOperation = 'screen';
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++; p.x += p.vx; p.y += p.vy;
        const lifeFrac = p.life / p.maxLife;
        let fadeAlpha = lifeFrac < 0.15 ? lifeFrac / 0.15 : lifeFrac > 0.8 ? (1 - lifeFrac) / 0.2 : 1;
        if (p.life >= p.maxLife || p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50) {
          particles[i] = createParticle(false); continue;
        }
        const alpha = p.alpha * Math.max(fadeAlpha, 0);
        if (alpha < 0.01) continue;
        const grad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        grad.addColorStop(0, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${alpha * 0.9})`);
        grad.addColorStop(0.4, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${alpha * 0.3})`);
        grad.addColorStop(1, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, 0)`);
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalCompositeOperation = 'source-over';
      animationId = requestAnimationFrame(draw);
    }

    animationId = requestAnimationFrame(draw);
    const handleResize = () => {
      width = window.innerWidth; height = window.innerHeight;
      const newDpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * newDpr; canvas.height = height * newDpr;
      canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
      ctx.setTransform(newDpr, 0, 0, newDpr, 0, 0);
    };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', handleResize); };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#04010a] via-[#080416] to-[#0a0a12]" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0" style={{
        background: `
          linear-gradient(to right, rgba(4,1,10,0.92) 0%, rgba(4,1,10,0.65) 35%, transparent 55%, transparent 100%),
          linear-gradient(to bottom, transparent 70%, rgba(10,10,18,1) 100%),
          linear-gradient(to top, transparent 85%, rgba(4,1,10,0.3) 100%)
        `
      }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, isVisible };
}

function AnimatedCounter({ target, suffix = '', prefix = '' }: { target: string; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, isVisible } = useScrollReveal(0.3);
  const numericTarget = parseInt(target.replace(/[^0-9]/g, ''), 10);
  useEffect(() => {
    if (!isVisible || isNaN(numericTarget)) return;
    let start = 0;
    const duration = 1800;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * numericTarget));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isVisible, numericTarget]);
  return <span ref={ref}>{prefix}{isVisible ? count : 0}{suffix}</span>;
}

/* ═══════════════════════════════════════════════
   MINI DASHBOARD VISUAL — CSS-rendered mockup
   Used inside the hero to show, not just tell
   ═══════════════════════════════════════════════ */
function MiniDashboardVisual() {
  const { ref, isVisible } = useScrollReveal(0.1);
  return (
    <div
      ref={ref}
      className={`w-full max-w-[430px] xl:max-w-[490px] transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'} z-20`}
      style={{ perspective: '1200px' }}
    >
      {/* Dynamic ambient backdrop glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] bg-purple-600/15 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '6s' }} />

      <div
        className="relative rounded-2xl overflow-hidden border border-white/[0.08] backdrop-blur-3xl transition-all duration-500 hover:border-purple-500/30 group/browser"
        style={{
          transform: 'rotateY(-8deg) rotateX(3deg)',
          background: 'linear-gradient(135deg, rgba(16,16,35,0.75), rgba(8,8,18,0.9))',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 50px rgba(130,0,219,0.12), inset 0 0 20px rgba(255,255,255,0.02)',
        }}
      >
        {/* Browser chrome */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.03]">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]/80" />
          </div>
          <div className="bg-white/[0.04] rounded-lg px-4 py-1 text-[10px] text-gray-400 font-mono flex items-center gap-1.5 border border-white/[0.03]">
            <Lock className="w-2.5 h-2.5 text-green-400/70" />
            app.studiopulse.io
          </div>
          <div className="flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[8px] text-green-400 font-bold tracking-wider uppercase font-mono">LIVE</span>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-4.5 space-y-3.5">
          {/* Top stat row */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'Views', value: '2.4M', change: '+12.3%', color: 'text-green-400', glow: 'hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:border-green-500/20' },
              { label: 'Revenue', value: '$18,247', change: '+8.1%', color: 'text-green-400', glow: 'hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:border-green-500/20' },
              { label: 'Followers', value: '847K', change: '+3.2%', color: 'text-green-400', glow: 'hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:border-green-500/20' },
            ].map((stat, i) => (
              <div key={i} className={`bg-white/[0.02] rounded-xl p-2.5 border border-white/[0.04] transition-all duration-300 hover:scale-[1.03] hover:bg-white/[0.05] ${stat.glow}`}>
                <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">{stat.label}</div>
                <div className="text-white text-sm font-bold tracking-tight">{stat.value}</div>
                <div className={`text-[9px] ${stat.color} font-semibold flex items-center gap-1 mt-0.5`}>
                  <span className="w-1 h-1 rounded-full bg-green-400 animate-ping" />
                  {stat.change}
                </div>
              </div>
            ))}
          </div>

          {/* Mini chart */}
          <div className="bg-[#07070d]/50 rounded-xl p-3 border border-white/[0.04] hover:border-purple-500/20 transition-all duration-300 hover:shadow-[0_0_20px_rgba(130,0,219,0.08)]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] text-gray-400 font-medium">Engagement Rate</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-purple-400 font-bold font-mono">+14.2%</span>
                <span className="text-[8px] px-1.5 py-0.5 bg-purple-500/10 text-purple-300 rounded font-mono">7D</span>
              </div>
            </div>
            <svg viewBox="0 0 200 50" className="w-full h-10">
              <defs>
                <linearGradient id="chartGradMini" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c084fc" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="chartLineGradMini" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8200DB" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
              </defs>
              <path d="M0,40 Q25,30 50,35 T100,20 T150,28 T200,12" fill="none" stroke="url(#chartLineGradMini)" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M0,40 Q25,30 50,35 T100,20 T150,28 T200,12 L200,50 L0,50Z" fill="url(#chartGradMini)" />
              <circle cx="200" cy="12" r="2.5" fill="#c084fc" className="animate-ping" style={{ transformOrigin: '200px 12px' }} />
              <circle cx="200" cy="12" r="1.5" fill="#c084fc" />
            </svg>
          </div>

          {/* Content list */}
          <div className="space-y-1.5">
            {[
              { title: 'How I Hit 1M Subscribers', views: '842K', status: 'Viral', statusColor: 'bg-green-400/10 text-green-400 border border-green-500/20' },
              { title: 'Creator Economy 2026', views: '312K', status: 'Growing', statusColor: 'bg-purple-400/10 text-purple-400 border border-purple-500/20' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 bg-white/[0.01] rounded-lg px-2.5 py-2 border border-white/[0.03] hover:border-white/[0.08] hover:bg-white/[0.03] transition duration-200">
                <div className="w-8 h-6 rounded bg-gradient-to-br from-purple-500/20 to-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Video className="w-3 h-3 text-purple-400/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-300 font-medium truncate">{item.title}</div>
                  <div className="text-[9px] text-gray-500">{item.views} views</div>
                </div>
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${item.statusColor}`}>{item.status}</span>
              </div>
            ))}
          </div>

          {/* Active Campaigns - Brand Deal Tracker */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5 hover:border-pink-500/10 transition duration-300">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] text-gray-500 font-bold tracking-wider uppercase">Active Campaigns</span>
              <span className="text-[9px] text-pink-400 font-mono font-bold">$4,500 pending</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-gray-300">
              <span className="font-semibold truncate max-w-[200px]">Apex Gaming Sponsor</span>
              <span className="text-pink-400 bg-pink-500/10 border border-pink-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold">Review Draft</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   HERO CONTENT — Left-aligned, reference-matching
   ═══════════════════════════════════════════════ */
function HeroContent() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center relative py-24 lg:py-0">
      <div className="container mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Text content */}
          <div className="lg:col-span-7 max-w-2xl text-center lg:text-left flex flex-col items-center lg:items-start mx-auto lg:mx-0">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 bg-purple-500/[0.08] border border-purple-500/15 rounded-full px-3 sm:px-4 py-1.5 mb-6 sm:mb-8 opacity-0 animate-fade-in-up">
            <span className="text-purple-400 text-xs sm:text-sm">✦</span>
            <span className="text-[9px] sm:text-[11px] font-semibold text-purple-300/90 tracking-[0.15em] sm:tracking-[0.2em] uppercase">The Creator Operating System</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5.25rem] font-extrabold leading-[1.05] tracking-tight mb-5 sm:mb-7 opacity-0 animate-fade-in-up animation-delay-200">
            <span className="text-white block">Your Creator</span>
            <span className="text-gradient-hero block">Command Center.</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-8 sm:mb-10 opacity-0 animate-fade-in-up animation-delay-400 text-gray-400 max-w-xl leading-relaxed">
            One dashboard for all your analytics, revenue, collaborations, and AI-powered growth insights. Stop managing tools — start creating content.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-4 opacity-0 animate-fade-in-up animation-delay-600">
            <button
              onClick={() => navigate('/sign-up')}
              className="group bg-gradient-to-r from-[#8200DB] to-[#6d28d9] hover:from-[#7000c0] hover:to-[#5b21b6] text-white font-semibold py-3.5 px-8 rounded-full transition-all duration-300 border border-purple-400/20 hover:shadow-[0_0_40px_rgba(130,0,219,0.35)] active:scale-[0.97] flex items-center justify-center gap-2 text-sm sm:text-[15px]"
              id="hero-signup-btn"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>
            <button
              onClick={() => navigate('/sign-in')}
              className="bg-white/[0.05] border border-white/[0.12] hover:border-white/20 text-gray-300 hover:text-white font-medium py-3.5 px-8 rounded-full transition-all duration-300 flex items-center justify-center gap-2.5 hover:bg-white/[0.08] text-sm sm:text-[15px]"
              id="hero-signin-btn"
            >
              <User className="w-4 h-4" />
              Sign In
            </button>
          </div>
          
          {/* Trust badges — below CTAs */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 mt-8 opacity-0 animate-fade-in-up animation-delay-800">
            {[
              { icon: '🔒', label: 'SOC 2 Compliant' },
              { icon: '⚡', label: 'Setup in 2 min' },
              { icon: '💳', label: 'No credit card' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.04] text-gray-400 text-[10px] sm:text-xs hover:border-purple-500/20 hover:text-white transition duration-300">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Dashboard Mockup */}
        <div className="lg:col-span-5 w-full flex justify-center opacity-0 animate-fade-in-up animation-delay-800">
          <MiniDashboardVisual />
        </div>
      </div>
    </div>
  </div>
  );
}

/* ═══════════════════════════════════════════════
   SOCIAL PROOF BAR — Compact, editorial
   ═══════════════════════════════════════════════ */
function SocialProofBar() {
  const { ref, isVisible } = useScrollReveal();
  const platforms = [
    { name: 'YouTube', color: 'hover:text-[#FF0000] hover:border-[#FF0000]/20 hover:bg-[#FF0000]/5' },
    { name: 'Instagram', color: 'hover:text-[#E1306C] hover:border-[#E1306C]/20 hover:bg-[#E1306C]/5' },
    { name: 'TikTok', color: 'hover:text-[#00F2FE] hover:border-[#00F2FE]/20 hover:bg-[#00F2FE]/5' },
    { name: 'Twitch', color: 'hover:text-[#9146FF] hover:border-[#9146FF]/20 hover:bg-[#9146FF]/5' },
    { name: 'Spotify', color: 'hover:text-[#1DB954] hover:border-[#1DB954]/20 hover:bg-[#1DB954]/5' },
    { name: 'X (Twitter)', color: 'hover:text-[#FFFFFF] hover:border-[#FFFFFF]/20 hover:bg-[#FFFFFF]/5' },
    { name: 'LinkedIn', color: 'hover:text-[#0A66C2] hover:border-[#0A66C2]/20 hover:bg-[#0A66C2]/5' },
    { name: 'Pinterest', color: 'hover:text-[#BD081C] hover:border-[#BD081C]/20 hover:bg-[#BD081C]/5' },
  ];
  
  const doublePlatforms = [...platforms, ...platforms, ...platforms];

  return (
    <section className="relative py-10 overflow-hidden border-y border-white/[0.04]" ref={ref}>
      <div className="absolute inset-0 bg-[#07070d]" />
      <div className="absolute top-0 bottom-0 left-0 w-24 md:w-48 bg-gradient-to-r from-[#0a0a12] to-transparent z-10 pointer-events-none" />
      <div className="absolute top-0 bottom-0 right-0 w-24 md:w-48 bg-gradient-to-l from-[#0a0a12] to-transparent z-10 pointer-events-none" />

      <div className={`relative z-10 flex items-center gap-6 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <span className="text-[10px] text-gray-500 tracking-widest uppercase font-bold pl-6 shrink-0 hidden sm:inline-block">Supported Platforms</span>
        <div className="h-4 w-px bg-white/10 shrink-0 hidden sm:block" />
        
        <div className="overflow-hidden flex-1">
          <div className="animate-marquee flex gap-6">
            {doublePlatforms.map((p, i) => (
              <div
                key={i}
                className={`flex items-center justify-center px-5 py-2 rounded-full border border-white/[0.04] bg-white/[0.01] text-gray-400 text-xs font-semibold tracking-wide transition-all duration-300 ${p.color} shrink-0 cursor-default`}
              >
                {p.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   DASHBOARD PREVIEW — Show, don't tell
   Full-width mockup with browser chrome
   ═══════════════════════════════════════════════ */
function DashboardShowcase() {
  const { ref, isVisible } = useScrollReveal(0.05);

  return (
    <section className="relative py-16 md:py-24 overflow-hidden" id="dashboard-preview">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-purple-600/[0.04] rounded-full blur-[120px]" />

      <div ref={ref} className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.97]'}`}>
          {/* Browser frame */}
          <div className="max-w-5xl mx-auto rounded-2xl overflow-hidden border border-white/[0.06]"
            style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(130,0,219,0.06)' }}
          >
            {/* Chrome bar */}
            <div className="flex items-center gap-3 px-5 py-3 bg-[#0e0e1a] border-b border-white/[0.05]">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white/[0.04] rounded-lg px-5 py-1.5 text-xs text-gray-500 font-mono flex items-center gap-2 border border-white/[0.04]">
                  <Lock className="w-3 h-3 text-green-400/50" />
                  app.studiopulse.io/dashboard
                </div>
              </div>
            </div>

            {/* Dashboard body */}
            <div className="bg-[#0a0a14] p-5 md:p-6">
              {/* Top bar */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-white font-semibold text-sm">Studio<span className="text-purple-400">Pulse</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[8px] font-bold text-white">A</div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Total Views', value: '2.4M', change: '+12.3%', up: true },
                  { label: 'Revenue', value: '$18,247', change: '+8.1%', up: true },
                  { label: 'Subscribers', value: '847K', change: '+3.2%', up: true },
                  { label: 'Engagement', value: '4.8%', change: '-0.3%', up: false },
                ].map((s, i) => (
                  <div key={i} className="bg-white/[0.03] rounded-xl p-3.5 border border-white/[0.04]">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1.5">{s.label}</div>
                    <div className="text-white text-lg font-bold tracking-tight">{s.value}</div>
                    <div className={`text-[10px] font-semibold mt-0.5 ${s.up ? 'text-green-400' : 'text-red-400'}`}>
                      {s.change}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chart + sidebar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Main chart */}
                <div className="md:col-span-2 bg-white/[0.03] rounded-xl p-4 border border-white/[0.04]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-400 font-medium">Views Over Time</span>
                    <div className="flex gap-2">
                      {['7D', '30D', '90D'].map((t, i) => (
                        <button key={i} className={`text-[9px] px-2 py-0.5 rounded-md font-medium ${i === 1 ? 'bg-purple-500/20 text-purple-300' : 'text-gray-500 hover:text-gray-400'}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <svg viewBox="0 0 400 120" className="w-full" style={{ height: '120px' }}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8200DB" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#8200DB" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    {[30, 60, 90].map(y => (
                      <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(255,255,255,0.03)" />
                    ))}
                    <path d="M0,100 C30,95 50,85 80,80 C110,75 130,60 160,55 C190,50 210,45 240,35 C270,28 300,30 330,22 C360,15 380,12 400,10" fill="none" stroke="#8200DB" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M0,100 C30,95 50,85 80,80 C110,75 130,60 160,55 C190,50 210,45 240,35 C270,28 300,30 330,22 C360,15 380,12 400,10 L400,120 L0,120Z" fill="url(#areaGrad)" />
                    {/* Dot highlight */}
                    <circle cx="330" cy="22" r="4" fill="#8200DB" />
                    <circle cx="330" cy="22" r="7" fill="none" stroke="#8200DB" strokeWidth="1" opacity="0.3" />
                  </svg>
                </div>

                {/* Top content sidebar */}
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.04]">
                  <span className="text-xs text-gray-400 font-medium block mb-3">Top Content</span>
                  <div className="space-y-2.5">
                    {[
                      { title: 'How I Hit 1M Subs', views: '842K', tag: 'Viral', tagColor: 'bg-green-400/10 text-green-400' },
                      { title: 'Creator Economy 2026', views: '312K', tag: 'Growing', tagColor: 'bg-purple-400/10 text-purple-400' },
                      { title: 'Studio Tour Setup', views: '198K', tag: 'Stable', tagColor: 'bg-blue-400/10 text-blue-400' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5 py-1.5">
                        <div className="w-8 h-6 rounded bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                          <Video className="w-3 h-3 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-gray-300 font-medium truncate">{item.title}</div>
                          <div className="text-[9px] text-gray-500">{item.views} views</div>
                        </div>
                        <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${item.tagColor} shrink-0`}>{item.tag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   FEATURES — Asymmetric Bento with visual content
   ═══════════════════════════════════════════════ */
function FeaturesSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-24 md:py-32 relative overflow-hidden" id="features-section">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.07] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/[0.02] rounded-full blur-[140px] pointer-events-none" />

      <div ref={ref} className="container mx-auto px-5 sm:px-6 lg:px-8 relative z-10">
        <div className={`text-center mb-12 sm:mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 bg-purple-500/[0.08] border border-purple-500/15 rounded-full px-3.5 py-1.5 mb-5">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] sm:text-xs font-semibold text-purple-300/90 tracking-widest uppercase">Features</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight leading-tight">
            Built for how creators <span className="text-gradient-purple">actually work</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base lg:text-lg leading-relaxed">
            Not another generic dashboard. An intelligent, designer-crafted operating system for your creative business.
          </p>
        </div>

        {/* Bento grid — 2-column asymmetric */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-4">

          {/* LARGE: Analytics — spans 7 cols */}
          <div className={`md:col-span-7 group relative rounded-3xl overflow-hidden border border-white/[0.06] bg-[#0d0d1a]/80 backdrop-blur-xl transition-all duration-700 hover:border-purple-500/25 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`} style={{ transitionDelay: '100ms' }}>
            <div className="p-6 pb-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Multi-Platform Analytics</h3>
              </div>
              <p className="text-gray-400 text-xs md:text-sm leading-relaxed max-w-sm">YouTube, Instagram, TikTok, Twitch, Spotify — unified. One glance, every single metric.</p>
            </div>
            
            {/* Visual: Glowing SVG Gradient Chart */}
            <div className="px-6 pb-6">
              <div className="bg-[#07070d]/50 rounded-2xl p-4 border border-white/[0.04] relative overflow-hidden group/chart glow-border-purple bg-mesh-glow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                    <span className="text-[9px] text-gray-500 font-mono tracking-wider uppercase">Live Audience Acceleration</span>
                  </div>
                  <span className="text-xs text-purple-400 font-bold font-mono">+28.4%</span>
                </div>
                <svg viewBox="0 0 500 120" className="w-full h-20">
                  <defs>
                    <linearGradient id="bentoChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c084fc" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="chartLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8200DB" />
                      <stop offset="50%" stopColor="#c084fc" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                  <path d="M0,90 Q50,75 100,85 T200,50 T300,70 T400,25 T500,20" fill="none" stroke="url(#chartLineGrad)" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M0,90 Q50,75 100,85 T200,50 T300,70 T400,25 T500,20 L500,120 L0,120Z" fill="url(#bentoChartGrad)" />
                  <circle cx="400" cy="25" r="4.5" fill="#c084fc" className="animate-ping" style={{ transformOrigin: '400px 25px' }} />
                  <circle cx="400" cy="25" r="3" fill="#c084fc" />
                </svg>
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/[0.04] text-[9px] text-gray-600 font-mono">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span className="text-purple-400/80 font-bold">NOW</span>
                </div>
              </div>
            </div>
          </div>

          {/* MEDIUM: Revenue — spans 5 cols */}
          <div className={`md:col-span-5 group relative rounded-3xl overflow-hidden border border-white/[0.06] bg-[#0d0d1a]/80 backdrop-blur-xl transition-all duration-700 hover:border-purple-500/25 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`} style={{ transitionDelay: '200ms' }}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Revenue Tracking</h3>
              </div>
              <p className="text-gray-400 text-xs md:text-sm leading-relaxed mb-4">AdSense, sponsorships, affiliate payouts, and digital product sales — unified.</p>
              
              {/* Visual: Sponsorship Goal Tracker */}
              <div className="bg-[#07070d]/50 rounded-2xl p-4 border border-white/[0.04] relative overflow-hidden group/rev">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] text-gray-500 font-bold tracking-wider uppercase font-mono">Monthly Sponsors Goal</span>
                  <span className="text-xs font-bold text-green-400 font-mono">$18,247 <span className="text-gray-600 font-normal">/ $25K</span></span>
                </div>
                <div className="w-full h-2.5 bg-white/[0.04] rounded-full overflow-hidden mb-3.5 relative">
                  <div className="h-full bg-gradient-to-r from-green-500 via-emerald-400 to-teal-400 rounded-full" style={{ width: '73%' }} />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/[0.02] border border-white/[0.03] rounded-xl p-2 text-center hover:bg-white/[0.04] transition duration-200">
                    <div className="text-[8px] text-gray-500 font-mono">PENDING</div>
                    <div className="text-xs font-bold text-amber-400 font-mono">$4,500</div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/[0.03] rounded-xl p-2 text-center hover:bg-white/[0.04] transition duration-200">
                    <div className="text-[8px] text-gray-500 font-mono">NEXT PAYOUT</div>
                    <div className="text-xs font-bold text-blue-400 font-mono">12 Days</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* LARGE: AI Assistant — spans 5 cols */}
          <div className={`md:col-span-5 group relative rounded-3xl overflow-hidden border border-white/[0.06] bg-[#0d0d1a]/80 backdrop-blur-xl transition-all duration-700 hover:border-purple-500/25 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`} style={{ transitionDelay: '300ms' }}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-400">
                  <Brain className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">AI Growth Assistant</h3>
              </div>
              <p className="text-gray-400 text-xs md:text-sm leading-relaxed mb-4">Data-backed answers. Pitch drafts. Content optimizations.</p>
              
              {/* Visual: Chat feed mockup */}
              <div className="space-y-2.5">
                <div className="flex justify-end">
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl rounded-tr-md px-3 py-1.5 max-w-[85%] text-left">
                    <span className="text-[10px] text-purple-200 leading-normal">Are my sponsorships valued correctly?</span>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-[#07070d]/50 border border-white/[0.05] rounded-2xl rounded-bl-md px-3 py-2.5 max-w-[95%] text-left relative overflow-hidden bg-mesh-glow">
                    <div className="flex items-center gap-1 mb-1">
                      <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
                      <span className="text-[8px] text-purple-400 font-bold uppercase tracking-wider font-mono">Valuation Engine</span>
                    </div>
                    <span className="text-[10px] text-gray-300 leading-normal block">
                      Based on your metrics, you are underpricing sponsorships by <span className="text-green-400 font-semibold">$1.2K/video</span>. Let's draft a pitch email.
                    </span>
                    <span className="inline-block w-1 h-3 bg-purple-400 ml-0.5 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 3 stacked compact cards — spans 7 cols */}
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: <MessageSquare className="w-5 h-5" />, title: 'Brand Manager', desc: 'Auto-detect brand deals from DMs. Track contracts and deadlines easily.', color: 'text-pink-400', bg: 'bg-pink-500/10' },
              { icon: <Bell className="w-5 h-5" />, title: 'Smart Alerts', desc: 'Instant notifications when videos go viral or click-rates drop.', color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { icon: <Video className="w-5 h-5" />, title: 'Video Hub', desc: 'Every video, every platform. Automatically synchronized and labeled.', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
            ].map((f, i) => (
              <div
                key={i}
                className={`group rounded-2xl p-5 border border-white/[0.06] bg-[#0d0d1a]/85 backdrop-blur-xl hover:border-purple-500/20 hover:bg-[#0f0f20]/90 transition-all duration-300 hover:shadow-[0_10px_25px_rgba(130,0,219,0.05)] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${400 + i * 100}ms` }}
              >
                <div className={`w-9 h-9 ${f.bg} rounded-xl flex items-center justify-center ${f.color} mb-3.5 group-hover:scale-110 transition-transform duration-300`}>
                  {f.icon}
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5">{f.title}</h3>
                <p className="text-gray-500 text-[11px] leading-relaxed group-hover:text-gray-400 transition-colors duration-200">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   STATS — Compact inline with visual accents
   ═══════════════════════════════════════════════ */
function StatsSection() {
  const { ref, isVisible } = useScrollReveal();
  const stats = [
    { value: '10', suffix: 'K+', label: 'Creators' },
    { value: '50', suffix: 'M+', label: 'Videos Tracked' },
    { value: '2', prefix: '$', suffix: 'M+', label: 'Revenue Managed' },
    { value: '99', suffix: '.9%', label: 'Uptime' },
  ];

  return (
    <section className="py-10 sm:py-12 relative" ref={ref}>
      <div className="container mx-auto px-5 sm:px-6 lg:px-8 relative z-10">
        <div className={`max-w-4xl mx-auto transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-white/[0.04]">
            {stats.map((stat, i) => (
              <div key={i} className="text-center py-5 sm:py-6 px-3 sm:px-4" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 tracking-tight">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} prefix={stat.prefix || ''} />
                </div>
                <div className="text-gray-500 text-[9px] sm:text-[11px] font-medium tracking-widest uppercase">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   HOW IT WORKS — Horizontal visual flow
   ═══════════════════════════════════════════════ */
function HowItWorksSection() {
  const { ref, isVisible } = useScrollReveal();
  const steps = [
    { step: '01', title: 'Connect Accounts', description: 'Securely link YouTube, TikTok, and Instagram in just two clicks. Fully OAuth compliant.', icon: <Globe className="w-5 h-5" /> },
    { step: '02', title: 'Real-time Sync', description: 'All metrics, contracts, and revenue automatically import and stay up-to-date.', icon: <TrendingUp className="w-5 h-5" /> },
    { step: '03', title: 'Actionable Insights', description: 'Our AI engine identifies brand deals, posting optimizations, and revenue gaps.', icon: <Sparkles className="w-5 h-5" /> },
  ];

  return (
    <section className="py-24 md:py-32 relative overflow-hidden border-b border-white/[0.02]" id="how-it-works">
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-purple-500/[0.02] rounded-full blur-[120px] pointer-events-none" />
      <div ref={ref} className="container mx-auto px-5 sm:px-6 lg:px-8 relative z-10">
        <div className={`flex flex-col lg:flex-row items-start lg:items-center gap-8 sm:gap-12 lg:gap-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Left: heading */}
          <div className="lg:w-[320px] shrink-0 text-left">
            <div className="inline-flex items-center gap-2 bg-purple-500/[0.08] border border-purple-500/15 rounded-full px-3.5 py-1.5 mb-5">
              <span className="text-[10px] sm:text-xs font-semibold text-purple-300/90 tracking-widest uppercase">How it works</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
              Three steps. <br /><span className="text-gradient-purple">Zero friction.</span>
            </h2>
            <p className="text-gray-400 mt-4 text-xs sm:text-sm leading-relaxed max-w-sm">
              Stop logging into dozens of dashboards. Set up Studio Pulse in minutes and automate your creator business workflow.
            </p>
          </div>

          {/* Right: steps with glowing timeline */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 relative w-full">
            {/* Neon Connector Line - vertical on mobile, horizontal on desktop */}
            <div className="absolute left-[46px] top-[40px] bottom-[40px] w-[2px] bg-gradient-to-b from-purple-500/10 via-purple-500/30 to-indigo-500/10 z-0 md:hidden" />
            <div className="hidden md:block absolute top-[28px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-purple-500/10 via-purple-500/30 to-indigo-500/10 z-0" />
            
            {steps.map((item, i) => (
              <div
                key={i}
                className={`relative z-10 group rounded-2xl border border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.03] hover:border-purple-500/20 p-6 transition-all duration-300 hover:shadow-[0_10px_30px_rgba(130,0,219,0.06)] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${200 + i * 150}ms` }}
              >
                {/* Step number + icon */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform duration-300 group-hover:shadow-[0_0_15px_rgba(130,0,219,0.3)]">
                    {item.icon}
                  </div>
                  <span className="text-xs font-bold tracking-[0.2em] text-purple-400/40 uppercase font-mono">{item.step}</span>
                </div>
                <h3 className="text-white font-bold text-base mb-2 group-hover:text-purple-300 transition-colors duration-200">{item.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed group-hover:text-gray-400 transition-colors duration-200">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   TESTIMONIALS — Premium with visual variety
   ═══════════════════════════════════════════════ */
function TestimonialsSection() {
  const { ref, isVisible } = useScrollReveal();
  const testimonials = [
    {
      quote: "I was spending 2 hours a day checking 5 different dashboards. Now I check Studio Pulse for 10 minutes and I'm done.",
      name: "Arjun Mehta", role: "YouTube · 1.2M subs", initials: "AM",
      metric: '10x', metricLabel: 'faster workflow',
      gradient: 'from-purple-500 to-violet-600',
    },
    {
      quote: "The AI predicted my best posting times and my engagement went up 40% in a month. This thing actually works.",
      name: "Sarah Chen", role: "Multi-Platform Creator", initials: "SC",
      metric: '+40%', metricLabel: 'engagement',
      gradient: 'from-pink-500 to-rose-600',
    },
    {
      quote: "Finally I can see exactly how much I'm earning across YouTube, sponsorships, and my webinars in one place.",
      name: "David Park", role: "Creator & Instructor", initials: "DP",
      metric: '$48K', metricLabel: 'tracked/mo',
      gradient: 'from-blue-500 to-indigo-600',
    },
  ];

  return (
    <section className="py-24 md:py-32 relative overflow-hidden" id="testimonials">
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[400px] bg-purple-500/[0.02] rounded-full blur-[140px] pointer-events-none" />
      <div ref={ref} className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 bg-purple-500/[0.08] border border-purple-500/15 rounded-full px-4 py-1.5 mb-5">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-semibold text-purple-300/90 tracking-widest uppercase">Testimonials</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Real results from <span className="text-gradient-purple">real creators</span>
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto text-sm md:text-base mt-4 leading-relaxed">
            Don't just take our word for it — hear from creators who transformed their workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className={`group relative rounded-2xl overflow-hidden transition-all duration-700 hover:translate-y-[-4px] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              style={{ transitionDelay: `${200 + i * 120}ms` }}
            >
              {/* Gradient border effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-purple-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative rounded-2xl border border-white/[0.06] bg-[#0c0c1a] group-hover:border-purple-500/15 transition-colors duration-300 overflow-hidden">
                {/* Metric highlight with gradient accent */}
                <div className="relative px-6 pt-7 pb-4">
                  <div className="absolute top-0 left-6 w-10 h-[2px] bg-gradient-to-r from-purple-500 to-violet-500" />
                  <div className="text-3xl font-extrabold text-gradient-purple tracking-tight">{t.metric}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mt-1">{t.metricLabel}</div>
                </div>

                <div className="px-6 pb-6">
                  {/* Quote SVG mark */}
                  <svg className="w-6 h-6 text-purple-500/15 mb-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
                  </svg>
                  <p className="text-gray-300 text-[13px] leading-relaxed mb-5">{t.quote}</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white/[0.06]`}>
                      {t.initials}
                    </div>
                    <div>
                      <div className="text-white text-sm font-semibold">{t.name}</div>
                      <div className="text-gray-500 text-[11px]">{t.role}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



/* ═══════════════════════════════════════════════
   CTA — Clean, confident
   ═══════════════════════════════════════════════ */
function CTASection() {
  const navigate = useNavigate();
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-16 sm:py-24 md:py-32 relative overflow-hidden" id="cta-section">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-purple-600/[0.06] rounded-full blur-[140px] pointer-events-none" />

      <div ref={ref} className={`container mx-auto px-5 sm:px-6 lg:px-8 relative z-10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-98'}`}>
        <div className="max-w-4xl mx-auto rounded-2xl sm:rounded-3xl p-7 sm:p-10 md:p-16 relative overflow-hidden border border-white/[0.06] bg-[#0d0d1a]/85 backdrop-blur-2xl text-center glow-border-purple bg-mesh-glow">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
          
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white mb-4 sm:mb-5 tracking-tight leading-tight">
            Ready to take control <br className="hidden sm:inline" />of your creator career?
          </h2>
          <p className="text-gray-400 text-sm md:text-base lg:text-lg mb-8 sm:mb-10 leading-relaxed max-w-xl mx-auto">
            Join thousands of professional creators who optimized their workflow, increased their sponsorship rates, and automated their reports with Studio Pulse.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-4">
            <button
              onClick={() => navigate('/sign-up')}
              className="w-full sm:w-auto group bg-gradient-to-r from-[#8200DB] to-[#6d28d9] hover:from-[#7000c0] hover:to-[#5b21b6] text-white font-bold py-3.5 sm:py-4 px-8 sm:px-10 rounded-full transition-all duration-300 border border-purple-400/20 hover:shadow-[0_0_40px_rgba(130,0,219,0.4)] active:scale-[0.98] text-sm sm:text-base inline-flex items-center justify-center gap-2"
              id="cta-signup-btn"
            >
              Get Started — It's Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 mt-8 sm:mt-10 text-[10px] sm:text-xs text-gray-500">
            {['No credit card required', 'Free forever tier', 'Setup in 2 minutes'].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 sm:gap-2">
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400/60" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="border-t border-white/[0.04] pt-14 pb-8 relative w-full overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-2">
            <a href="/" className="flex items-center gap-2 mb-4 group flex-shrink-0">
              <img src="/image.png" alt="Studio Pulse" className="w-8 h-8 object-contain flex-shrink-0" />
              <span className="text-white font-bold text-lg tracking-tight flex-shrink-0">Studio<span className="text-purple-400">Pulse</span></span>
            </a>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-5">
              The operating system for creators. Manage your entire creator business from one intelligent dashboard.
            </p>
            <div className="flex gap-3">
              {[
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
              ].map((icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-500 hover:text-purple-400 hover:border-purple-500/20 transition-all duration-200">
                  {icon}
                </a>
              ))}
            </div>
          </div>
          {[
            { title: 'Product', links: ['Features', 'Integrations', 'Changelog', 'API'] },
            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
            { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'GDPR'] },
          ].map((col, i) => (
            <div key={i}>
              <h4 className="font-semibold text-white text-xs tracking-wider uppercase mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link, j) => (
                  <li key={j}><a href="#" className="text-gray-500 hover:text-gray-300 text-sm transition-colors duration-150">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/[0.04] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} Studio Pulse. All rights reserved.</p>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════ */
function Navbar() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const [hoveredNavItem, setHoveredNavItem] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  const navLinkClass = (itemName: string, extra = '') => {
    const isHovered = hoveredNavItem === itemName;
    const otherHovered = hoveredNavItem !== null && !isHovered;
    const color = isHovered ? 'text-white' : otherHovered ? 'text-gray-600' : 'text-gray-400';
    return `text-[13px] font-medium transition duration-200 ${color} ${extra}`;
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  // Lock body scroll on mobile when menu is active
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-2' : 'py-3'}`}
      style={{
        backgroundColor: scrolled ? 'rgba(10, 10, 18, 0.85)' : 'rgba(10, 10, 18, 0.3)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.04)' : 'none',
      }}
      id="main-navbar"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8 flex items-center justify-between w-full">
        <div className="flex items-center space-x-8 lg:space-x-10 flex-shrink-0 min-w-0">
          <a href="/" className="flex items-center gap-2 group flex-shrink-0" id="navbar-logo">
            <img src="/image.png" alt="Studio Pulse" className="w-8 h-8 object-contain flex-shrink-0 transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(130,0,219,0.5)]" />
            <span className="text-white font-bold text-lg tracking-tight flex-shrink-0">Studio<span className="text-purple-400">Pulse</span></span>
          </a>
          <div className="hidden lg:flex items-center space-x-7">
            <div className="relative group" onMouseEnter={() => setHoveredNavItem('features')} onMouseLeave={() => setHoveredNavItem(null)}>
              <a href="#features-section" className={navLinkClass('features', 'flex items-center gap-1')}>
                Features <ChevronDown className="w-3 h-3 group-hover:rotate-180 transition-transform duration-200" />
              </a>
              <div className="absolute left-0 mt-3 w-56 glass-card rounded-xl shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                {[
                  { icon: <BarChart3 className="w-4 h-4" />, label: 'Analytics', desc: 'Cross-platform metrics' },
                  { icon: <DollarSign className="w-4 h-4" />, label: 'Revenue', desc: 'Unified earnings' },
                  { icon: <Brain className="w-4 h-4" />, label: 'AI Assistant', desc: 'Smart insights' },
                ].map((item, i) => (
                  <a key={i} href="#" className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition duration-150">
                    <span className="text-purple-400 mt-0.5">{item.icon}</span>
                    <div>
                      <div className="text-sm text-gray-200 font-medium">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.desc}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
            <div className="relative group" onMouseEnter={() => setHoveredNavItem('resources')} onMouseLeave={() => setHoveredNavItem(null)}>
              <a href="#" className={navLinkClass('resources', 'flex items-center gap-1')}>
                Resources <ChevronDown className="w-3 h-3 group-hover:rotate-180 transition-transform duration-200" />
              </a>
              <div className="absolute left-0 mt-3 w-44 glass-card rounded-xl shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                {['Blog', 'Documentation', 'Support', 'Community'].map((item, i) => (
                  <a key={i} href="#" className="block px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-white/[0.03] transition duration-150">{item}</a>
                ))}
              </div>
            </div>
            <a href="#" className={navLinkClass('changelog')} onMouseEnter={() => setHoveredNavItem('changelog')} onMouseLeave={() => setHoveredNavItem(null)}>Changelog</a>
          </div>
        </div>
        <div className="flex items-center space-x-3 md:space-x-4">
          {isSignedIn ? (
            <button onClick={() => navigate('/dashboard')} className="bg-gradient-to-r from-[#8200DB] to-[#6d28d9] text-white font-semibold py-2 px-5 rounded-full text-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(130,0,219,0.3)]" id="nav-dashboard-btn">Dashboard</button>
          ) : (
            <>
              <button onClick={() => navigate('/sign-in')} className="hidden sm:block text-gray-400 hover:text-white text-[13px] font-medium transition-colors duration-200" id="nav-signin-btn">Sign In</button>
              <button onClick={() => navigate('/sign-up')} className="hidden sm:block bg-gradient-to-r from-[#8200DB] to-[#6d28d9] hover:from-[#7000c0] hover:to-[#5b21b6] text-white font-semibold py-2 px-5 rounded-full text-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(130,0,219,0.3)] active:scale-95" id="nav-signup-btn">Start Free Trial</button>
            </>
          )}
          {/* Cosmic Portal Radar Trigger */}
          <button 
            onClick={toggleMobileMenu} 
            className="lg:hidden relative w-9 h-9 rounded-full flex items-center justify-center border border-purple-500/20 bg-purple-500/5 text-white active:scale-95 transition-all duration-300 z-[110]"
            aria-label="Toggle Navigation Control Portal"
          >
            {isMobileMenuOpen ? (
              <X className="w-4 h-4 text-purple-400 rotate-90 transition-transform duration-300" />
            ) : (
              <div className="relative w-5 h-5 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full border border-dashed border-purple-400/40 animate-radar-sweep" />
                <Zap className="w-3 h-3 text-purple-400" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Command Portal Dropdown Panel (Option B: Expandable command deck) */}
      <div
        className={`lg:hidden fixed top-0 left-0 right-0 z-[100] bg-[#06060c] border-b border-white/[0.08] transition-all duration-500 ease-in-out px-6 pt-24 pb-8 overflow-y-auto max-h-[85vh] ${
          isMobileMenuOpen 
            ? 'translate-y-0 opacity-100 shadow-[0_25px_60px_rgba(0,0,0,0.95),0_15px_30px_rgba(130,0,219,0.1)]' 
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Telemetry Indicator Widget */}
        <div className="glass-card rounded-2xl p-4 glow-border-purple relative overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Pulse Node Telemetry</span>
            <span className="text-[9px] text-gray-500 font-mono">NODE_US_EAST_01</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-gray-500">Active Creators</div>
              <div className="text-lg font-bold text-white tracking-tight font-mono">12,482 <span className="text-xs text-green-400 font-normal">online</span></div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">API Latency</div>
              <div className="text-lg font-bold text-white tracking-tight font-mono">18ms <span className="text-xs text-purple-400 font-normal">opt</span></div>
            </div>
          </div>
        </div>

        {/* Grid of Navigation Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6 font-medium">
          {/* Card 1: Features */}
          <a
            href="#features-section"
            onClick={(e) => {
              e.preventDefault();
              setIsMobileMenuOpen(false);
              setTimeout(() => {
                const el = document.getElementById('features-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 300);
            }}
            className="glass-card p-4 rounded-xl flex flex-col justify-between h-24 hover:bg-white/[0.04] transition-all duration-200 border border-white/[0.06] hover:border-purple-500/30 group active:scale-[0.98]"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 group-hover:text-purple-300 transition-colors">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-200">Exploration Deck</div>
              <div className="text-[9px] text-gray-500 mt-0.5">Platform features</div>
            </div>
          </a>

          {/* Card 2: Resources */}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); }}
            className="glass-card p-4 rounded-xl flex flex-col justify-between h-24 hover:bg-white/[0.04] transition-all duration-200 border border-white/[0.06] hover:border-blue-500/30 group active:scale-[0.98]"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-colors">
              <Globe className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-200">Creator Academy</div>
              <div className="text-[9px] text-gray-500 mt-0.5">Guides & docs</div>
            </div>
          </a>

          {/* Card 3: Support */}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); }}
            className="glass-card p-4 rounded-xl flex flex-col justify-between h-24 hover:bg-white/[0.04] transition-all duration-200 border border-white/[0.06] hover:border-pink-500/30 group active:scale-[0.98]"
          >
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400 group-hover:bg-pink-500/20 group-hover:text-pink-300 transition-colors">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-200">System Support</div>
              <div className="text-[9px] text-gray-500 mt-0.5">Direct chat help</div>
            </div>
          </a>

          {/* Card 4: Changelog */}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); }}
            className="glass-card p-4 rounded-xl flex flex-col justify-between h-24 hover:bg-white/[0.04] transition-all duration-200 border border-white/[0.06] hover:border-amber-500/30 group active:scale-[0.98]"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 group-hover:text-amber-300 transition-colors">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-200">Changelog</div>
              <div className="text-[9px] text-gray-500 mt-0.5">Updates & releases</div>
            </div>
          </a>
        </div>

        {/* Portal Bottom Actions */}
        <div className="flex flex-col gap-2.5">
          {isSignedIn ? (
            <button
              onClick={() => { setIsMobileMenuOpen(false); navigate('/dashboard'); }}
              className="w-full bg-gradient-to-r from-[#8200DB] to-[#6d28d9] hover:from-[#7000c0] hover:to-[#5b21b6] text-white font-bold py-3 px-5 rounded-full text-xs text-center tracking-wider uppercase shadow-[0_8px_25px_rgba(130,0,219,0.25)] transition-all duration-300 active:scale-[0.98]"
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => { setIsMobileMenuOpen(false); navigate('/sign-in'); }}
                className="w-full bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] text-gray-200 font-semibold py-3 px-5 rounded-full text-xs text-center tracking-wider uppercase transition-all duration-300 active:scale-[0.98]"
              >
                Sign In
              </button>
              <button
                onClick={() => { setIsMobileMenuOpen(false); navigate('/sign-up'); }}
                className="w-full bg-gradient-to-r from-[#8200DB] to-[#6d28d9] hover:from-[#7000c0] hover:to-[#5b21b6] text-white font-bold py-3 px-5 rounded-full text-xs text-center tracking-wider uppercase shadow-[0_8px_25px_rgba(130,0,219,0.25)] transition-all duration-300 active:scale-[0.98]"
              >
                Start Free Trial
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ═══════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════ */
export const HeroSection = () => {
  return (
    <div className="relative w-full overflow-x-hidden bg-[#0a0a12]">
      <Navbar />

      {/* Hero */}
      <div className="relative min-h-screen w-full overflow-hidden">
        <CosmicNebulaBackground />
        <div className="relative z-10">
          <HeroContent />
        </div>
      </div>

      {/* Below-the-fold */}
      <div className="bg-[#0a0a12] relative z-10 w-full overflow-x-hidden">
        <SocialProofBar />
        <DashboardShowcase />
        <StatsSection />
        <HowItWorksSection />
        <FeaturesSection />
        <TestimonialsSection />
        <CTASection />
        <Footer />
      </div>
    </div>
  );
};
