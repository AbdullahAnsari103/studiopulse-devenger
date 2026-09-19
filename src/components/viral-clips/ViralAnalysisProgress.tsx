/**
 * Screen 2: AI Analysis In Progress Component
 * "AI Kitchen" cooking-themed progress screen.
 * clipgen.png is used as BACKGROUND of the left panel with a radial
 * progress gauge + linear bar overlaid on top.
 * Right panel shows the AI Kitchen Checklist with clip image icons.
 * Enhanced with premium animations, glassmorphism effects, and polished micro-interactions.
 */

import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Check, Sparkles, ChevronUp, Flame, Zap } from "lucide-react";
import type { ClipJobState, PipelineStage } from "@/hooks/useViralClips";
import { motion, AnimatePresence } from "framer-motion";

interface ViralAnalysisProgressProps {
  job: ClipJobState;
  onBack: () => void;
}

/* ─── Kitchen-Themed Stage Definitions with clip image icons ─── */
const STAGES: Array<{
  id: PipelineStage;
  label: string;
  subtext: string;
  emoji: string;
  icon: string;
}> = [
  { id: "extracting_audio",   label: "Catching the Good Bits",    subtext: "Sniffing out the juiciest moments...",     emoji: "🍟", icon: "/clip7.png"  },
  { id: "transcribing",       label: "Whipping Up a Hook",        subtext: "Making the intro impossible to scroll...", emoji: "🍭", icon: "/clip8.png"  },
  { id: "analyzing_content",  label: "Cooking the Perfect Story", subtext: "Mixing, matching and making it click...",  emoji: "🎬", icon: "/clip14.png" },
  { id: "detecting_moments",  label: "Adding the Secret Sauce",   subtext: "Boosting engagement with some flavor...",  emoji: "🧪", icon: "/clip10.png" },
  { id: "self_reflection",    label: "Frying the Boring Parts",   subtext: "Getting rid of the yawn moments...",       emoji: "🍳", icon: "/clip11.png" },
  { id: "scoring_clips",      label: "Blending it All Together",  subtext: "Smooth transitions, chef's kiss!",        emoji: "🫡", icon: "/clip12.png" },
  { id: "preparing_previews", label: "Plating & Serving",         subtext: "Almost ready to blow minds!",             emoji: "🎉", icon: "/clip13.png" },
];

/* ─── AI Jokes with clip image icons ─── */
const AI_JOKES = [
  { text: "Why did the AI go broke? Because it used up all its data plan!",        emoji: "🤣", icon: "/clip1.png"  },
  { text: 'I told my video it was great. It said, "thanks for the validation!"',   emoji: "😂", icon: "/clip2.png"  },
  { text: "I don't need sleep, I need more uploads!",                              emoji: "💪", icon: "/clip3.png"  },
  { text: "Cut that part? Already deep fried and deleted!",                        emoji: "😂", icon: "/clip5.png"  },
  { text: "You bring the content, I'll bring the virality!",                       emoji: "🚀", icon: "/clip4.png"  },
  { text: "My cooking? 100% organic algorithms.",                                  emoji: "🌿", icon: "/clip1.png"  },
  { text: "I'm not a robot, I'm a chef with superpowers!",                         emoji: "🦸", icon: "/clip5.png"  },
  { text: "Every view counts. Especially the 1,000,000th one!",                    emoji: "🎯", icon: "/clip9.png"  },
];

function getStageIndex(stage: PipelineStage): number {
  switch (stage) {
    case "extracting_audio": return 0;
    case "transcribing": return 1;
    case "analyzing_content": return 2;
    case "detecting_moments": return 3;
    case "self_reflection": return 4;
    case "scoring_clips": return 5;
    case "preparing_previews": return 6;
    case "completed": return 7;
    default: return 0;
  }
}

function formatDurationPT(dur: string): string {
  if (!dur) return "00:00";
  if (dur.startsWith("PT")) {
    const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const h = parseInt(match[1] || "0", 10);
      const m = parseInt(match[2] || "0", 10);
      const s = parseInt(match[3] || "0", 10);
      if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
      return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
  }
  return dur;
}

export const ViralAnalysisProgress: React.FC<ViralAnalysisProgressProps> = ({ job, onBack }) => {
  const currentIdx = getStageIndex(job.currentStage);
  const progress = Math.min(100, Math.max(5, job.progressPercent));

  // Semicircle arc gauge math (240° arc, open at bottom)
  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  const arcAngle = 240; // degrees of visible arc
  const arcLength = (arcAngle / 360) * circumference;
  const gapLength = circumference - arcLength;
  const strokeDashoffset = arcLength * (1 - progress / 100);

  // Rotating joke index
  const [jokeIdx, setJokeIdx] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setJokeIdx((prev) => (prev + 1) % AI_JOKES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const displayedJokes = useMemo(() => {
    const jokes: typeof AI_JOKES = [];
    for (let i = 0; i < 5; i++) {
      jokes.push(AI_JOKES[(jokeIdx + i) % AI_JOKES.length]);
    }
    return jokes;
  }, [jokeIdx]);

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* ── Top: Video Info Bar ── */}
      <div className="bg-[#0b0b18]/90 backdrop-blur-md border border-[#1a1a35] rounded-2xl p-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="relative w-14 sm:w-16 aspect-video rounded-lg overflow-hidden bg-[#14142a] flex-shrink-0 border border-white/10 shadow-md">
            <img src={job.videoThumbnail} alt="" className="w-full h-full object-cover" />
            <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[8px] font-mono px-1 rounded">
              {formatDurationPT(job.videoDuration)}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="text-white font-bold text-[13px] sm:text-[14px] truncate">{job.videoTitle}</h2>
            <p className="text-gray-400 text-[11px]">
              {formatDurationPT(job.videoDuration)} • {job.views.toLocaleString()} views
            </p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="hidden sm:flex flex-shrink-0 items-center gap-1.5 text-gray-400 hover:text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-purple-500/30 transition-all duration-200"
        >
          <ChevronUp className="w-3 h-3 rotate-[-90deg]" />
          <span>Collapse</span>
        </button>
      </div>

      {/* ── Main Analysis Card ── */}
      <div className="bg-[#0a0a1a] border border-[#1c1c38] rounded-3xl shadow-2xl shadow-purple-950/10 overflow-hidden">
        {/* Header Row */}
        <div className="flex items-center justify-between px-5 sm:px-7 pt-5 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-white text-lg sm:text-xl font-extrabold flex items-center gap-2">
              <span>🧑‍🍳</span>
              <span>Pulse AI Multi-Layer Analysis</span>
              <Sparkles className="w-4 h-4 text-yellow-400 animate-[spin_3s_linear_infinite]" />
            </h3>
            <p className="text-gray-400 text-[12.5px]">
              Our AI is cooking up something viral 🧑‍🍳 and seasoning your video to perfection! 😋
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full text-emerald-400 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>PULSE AI ENGINE</span>
            </div>
            <span className="text-pink-400 text-[11px] font-bold flex items-center gap-1">
              Running at 200% <Flame className="w-3.5 h-3.5 text-orange-400" />
            </span>
          </div>
        </div>

        {/* ── Main Content Grid: Image+Gauge Left + Checklist Right ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">

          {/* ─── LEFT: clipgen.png (Chef on left, Gauge on empty dark right) ─── */}
          <div className="lg:col-span-7 relative overflow-hidden bg-[#070612] min-h-[480px] lg:min-h-[510px] flex flex-col justify-between">
            {/* clipgen.png as background — widescreen layout */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "url('/clipgen.png')",
                backgroundSize: "cover",
                backgroundPosition: "left center",
                backgroundRepeat: "no-repeat",
              }}
            />

            {/* Subtle right-side dark gradient overlay for high contrast text readability */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(to right, transparent 30%, rgba(7,6,18,0.35) 52%, rgba(7,6,18,0.85) 75%, rgba(7,6,18,0.95) 100%)",
              }}
            />

            {/* Subtle ambient glows */}
            <div className="absolute top-10 right-16 w-52 h-52 bg-purple-600/15 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-44 h-44 bg-pink-600/10 blur-3xl rounded-full pointer-events-none" />

            {/* Bottom gradient overlay for progress bar readability */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(to top, rgba(7,6,18,0.9) 0%, rgba(7,6,18,0.4) 15%, transparent 35%)",
              }}
            />

            {/* Content overlay: Semicircle Gauge + Status + Progress on the right side */}
            <div className="relative z-10 flex flex-col items-center sm:items-end justify-between h-full p-6 sm:pr-8 sm:pl-4 sm:py-7 space-y-4">
              
              {/* Top-Right: Semicircle Arc Gauge */}
              <div className="flex flex-col items-center space-y-2 mt-1 sm:mt-2 w-full sm:w-auto sm:min-w-[270px]">
                <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
                  {/* Soft glow behind gauge */}
                  <div className="absolute inset-[-12px] rounded-full bg-purple-600/10 blur-2xl pointer-events-none" />
                  
                  <svg className="w-full h-full drop-shadow-[0_0_24px_rgba(168,85,247,0.4)]" viewBox="0 0 200 200">
                    <defs>
                      <linearGradient id="gauge-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="40%" stopColor="#c084fc" />
                        <stop offset="70%" stopColor="#f43f5e" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>

                    {/* Background Track Arc (240° open at bottom) */}
                    <circle
                      cx="100"
                      cy="100"
                      r={radius}
                      stroke="#1e1838"
                      strokeWidth="7.5"
                      strokeLinecap="round"
                      strokeDasharray={`${arcLength} ${gapLength}`}
                      strokeDashoffset="0"
                      fill="transparent"
                      style={{
                        transformOrigin: "center",
                        transform: "rotate(150deg)",
                      }}
                    />

                    {/* Active Progress Arc */}
                    <motion.circle
                      cx="100"
                      cy="100"
                      r={radius}
                      stroke="url(#gauge-gradient)"
                      strokeWidth="7.5"
                      strokeLinecap="round"
                      strokeDasharray={`${arcLength} ${gapLength}`}
                      fill="transparent"
                      style={{
                        transformOrigin: "center",
                        transform: "rotate(150deg)",
                      }}
                      initial={{ strokeDashoffset: arcLength }}
                      animate={{ strokeDashoffset }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </svg>

                  {/* Center of Semicircle Gauge */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pt-1.5">
                    <motion.span
                      key={progress}
                      initial={{ scale: 1.1, opacity: 0.7 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="text-white text-3xl sm:text-4xl font-black tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
                    >
                      {progress}%
                    </motion.span>
                    <span className="text-pink-400 text-[10.5px] sm:text-[11.5px] font-extrabold uppercase tracking-widest drop-shadow-[0_0_8px_rgba(244,63,94,0.6)] mt-0.5">
                      COOKING...
                    </span>

                    {/* Enlarged Boiling Pot Animation */}
                    <div className="relative mt-1">
                      <div className="absolute inset-0 bg-purple-500/35 blur-md rounded-full pointer-events-none" />
                      <motion.img
                        src="/clip14.png"
                        alt="Boiling cauldron pot"
                        className="w-12 h-12 sm:w-14 sm:h-14 object-contain relative z-10 drop-shadow-[0_0_16px_rgba(168,85,247,0.9)] mix-blend-screen"
                        animate={{
                          y: [0, -3.5, 0],
                          scale: [1, 1.07, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Subtext directly below gauge */}
                <p className="text-gray-200 text-xs sm:text-[12.5px] font-semibold text-center leading-snug max-w-[240px] drop-shadow-md">
                  Finding the juiciest parts of your video... <span className="text-sm">😋</span>
                </p>
              </div>

              {/* Bottom: Sleek Linear Progress Bar Pill Container */}
              <div className="w-full sm:max-w-[270px] bg-[#100e26]/90 border border-purple-500/25 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-xl shadow-purple-950/40 space-y-2 mb-1">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[#1a1638] rounded-full h-2.5 overflow-hidden border border-white/5 shadow-inner">
                    <motion.div
                      className="h-full rounded-full relative overflow-hidden"
                      style={{
                        background: "linear-gradient(90deg, #7c3aed, #a855f7, #ec4899)",
                      }}
                      initial={{ width: "0%" }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                      {/* Shimmer effect */}
                      <div
                        className="absolute inset-0 opacity-40"
                        style={{
                          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
                          animation: "shimmer 2s infinite",
                        }}
                      />
                    </motion.div>
                  </div>
                  <span className="text-white text-xs font-bold font-mono tabular-nums">{progress}%</span>
                </div>

                <p className="text-gray-400 text-[10.5px] font-medium flex items-center justify-center gap-1">
                  <span>⏱</span> ~1–2 mins left until it's ready to serve!
                </p>
              </div>

            </div>
          </div>

          {/* ─── RIGHT: AI Kitchen Checklist with clip image icons ─── */}
          <div className="lg:col-span-5 px-5 sm:px-6 py-5 space-y-3 border-t lg:border-t-0 lg:border-l border-white/5 bg-[#090918]/60">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-white font-extrabold text-[14px] flex items-center gap-2">
                AI Kitchen Checklist <span>🧑‍🍳</span>
              </h4>
              <span className="text-gray-400 text-[11px]">
                Here's what we're cookin' right now! 😄
              </span>
            </div>

            <div className="space-y-2">
              {STAGES.map((stage, idx) => {
                const isCompleted = idx < currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <motion.div
                    key={stage.id}
                    initial={isCurrent ? { scale: 0.98, opacity: 0 } : false}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-300 ${
                      isCurrent
                        ? "bg-gradient-to-r from-purple-950/60 to-purple-900/30 border border-purple-500/40 shadow-lg shadow-purple-950/40"
                        : isCompleted
                        ? "bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]"
                        : "border border-transparent opacity-40"
                    }`}
                  >
                    {/* Clip image icon */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      isCurrent ? "bg-purple-500/15 shadow-sm shadow-purple-500/20" : isCompleted ? "bg-white/5" : ""
                    }`}>
                      <motion.img
                        src={stage.icon}
                        alt=""
                        className={`w-6 h-6 object-contain select-none ${
                          isCurrent ? "drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" : "drop-shadow-[0_0_4px_rgba(168,85,247,0.2)]"
                        }`}
                        draggable={false}
                        animate={isCurrent ? { rotate: [0, -5, 5, 0] } : {}}
                        transition={isCurrent ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
                      />
                    </div>

                    {/* Label + Subtext */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-bold ${
                        isCurrent ? "text-white" : isCompleted ? "text-gray-200" : "text-gray-500"
                      }`}>
                        {stage.label}
                        {isCurrent && <span className="ml-1 text-purple-400">🎬</span>}
                      </p>
                      <p className={`text-[11px] truncate ${isCurrent ? "text-gray-300" : "text-gray-400"}`}>
                        {isCurrent ? (job.statusMessage || stage.subtext) : stage.subtext}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                          Done! <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      ) : isCurrent ? (
                        <span className="flex items-center gap-1.5 text-purple-300 text-[10.5px] font-bold bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-md animate-pulse">
                          IN PROGRESS
                        </span>
                      ) : (
                        <span className="text-gray-500 text-[11px] flex items-center gap-1">
                          Coming up <Sparkles className="w-3 h-3 text-gray-600" />
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Kitchen Status Footer Bar ── */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-3 border-t border-white/5 bg-[#08081a]">
          <div className="flex items-center gap-3 text-[11.5px] text-gray-400">
            <span className="bg-purple-500/10 border border-purple-500/25 text-purple-300 font-bold text-[10.5px] px-2 py-0.5 rounded-md">
              AI KITCHEN STATUS
            </span>
            <span className="flex items-center gap-1">
              Chefin' up viral potential 🧑‍🍳
              <span className="flex gap-0.5 ml-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: "0.2s" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: "0.4s" }} />
              </span>
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1 bg-[#12122a] border border-white/5 px-2.5 py-0.5 rounded-lg">
              Spice Level <Flame className="w-3 h-3 text-red-400" />
            </span>
            <span className="flex items-center gap-1 bg-[#12122a] border border-white/5 px-2.5 py-0.5 rounded-lg">
              Juiciness 🧃
            </span>
            <span className="flex items-center gap-1 bg-[#12122a] border border-white/5 px-2.5 py-0.5 rounded-lg">
              Flavor Score ⭐
            </span>
          </div>
        </div>
      </div>

      {/* ── AI Jokes Carousel with clip image icons ── */}
      <div className="space-y-2.5">
        <h4 className="text-white text-[14px] font-extrabold flex items-center gap-2">
          Meanwhile, enjoy some AI jokes <span>😂</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <AnimatePresence mode="popLayout">
            {displayedJokes.map((joke, i) => (
              <motion.div
                key={`${jokeIdx}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="bg-[#0b0b18] border border-[#1e1e38] rounded-xl p-3 text-center space-y-2 hover:border-purple-500/30 hover:bg-purple-950/10 transition-all duration-200 group cursor-default"
              >
                <div className="flex justify-center">
                  <img
                    src={joke.icon}
                    alt=""
                    className="w-8 h-8 object-contain select-none drop-shadow-[0_0_6px_rgba(168,85,247,0.3)] group-hover:scale-110 transition-transform duration-200"
                    draggable={false}
                  />
                </div>
                <p className="text-gray-300 text-[11px] leading-snug font-medium">{joke.text}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Bottom Tips Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#0b0b18] border border-[#1e1e38] rounded-xl px-4 py-3 flex items-center gap-3 hover:border-amber-500/20 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-white text-[12px] font-bold flex items-center gap-1">
              AI is working its magic <Sparkles className="w-3 h-3 text-purple-400" />
            </p>
            <p className="text-gray-400 text-[10.5px]">Sit back, relax, and maybe grab a coffee ☕</p>
          </div>
        </div>
        <div className="bg-[#0b0b18] border border-[#1e1e38] rounded-xl px-4 py-3 flex items-center gap-3 hover:border-purple-500/20 transition-colors">
          <img src="/clip9.png" alt="" className="w-7 h-7 object-contain select-none flex-shrink-0 drop-shadow-[0_0_6px_rgba(168,85,247,0.3)]" draggable={false} />
          <div>
            <span className="bg-purple-500/20 text-purple-300 text-[10px] font-extrabold px-2 py-0.5 rounded-md inline-block mb-0.5">TIP</span>
            <p className="text-gray-300 text-[11px]">
              The more you upload, the better I get at finding viral gold for you! 😉
            </p>
          </div>
        </div>
        <div className="bg-[#0b0b18] border border-[#1e1e38] rounded-xl px-4 py-3 flex items-center gap-3 hover:border-pink-500/20 transition-colors">
          <div className="space-y-0.5 flex-1">
            <p className="text-yellow-400 text-[11px] font-bold">Fun Fact:</p>
            <p className="text-gray-300 text-[10.5px]">I've already analyzed 1,247 videos today! You're in good hands 👍</p>
          </div>
          <motion.img
            src="/clip6.png"
            alt="Fuel 100%"
            className="w-11 h-14 flex-shrink-0 object-contain drop-shadow-[0_0_14px_rgba(236,72,153,0.5)]"
            draggable={false}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Inline shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};
