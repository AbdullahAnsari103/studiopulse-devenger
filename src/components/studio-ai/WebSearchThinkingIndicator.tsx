/**
 * WebSearchThinkingIndicator — Futuristic morphing Web Search animation.
 * 1. Web Globe icon appears with cosmic cyan/purple aura.
 * 2. Globe lines deform/unfold with harmonic wave distortion.
 * 3. Fluidly expands and reveals glowing animated "Searching the live web for: [query]" with radar beam.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Sparkles, Search } from "lucide-react";

interface WebSearchThinkingIndicatorProps {
  query?: string;
}

export default function WebSearchThinkingIndicator({ query }: WebSearchThinkingIndicatorProps) {
  const [phase, setPhase] = useState<"globe" | "deform" | "expanded">("globe");

  useEffect(() => {
    // Phase 1 -> Phase 2: Globe deforms after 700ms
    const t1 = setTimeout(() => {
      setPhase("deform");
    }, 700);

    // Phase 2 -> Phase 3: Expands and reveals text after 1300ms
    const t2 = setTimeout(() => {
      setPhase("expanded");
    }, 1300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const displayQuery = query?.trim() || "real-time sources, articles & citations...";

  return (
    <div className="w-full flex items-center justify-start my-3 select-none" id="web-search-thinking-indicator">
      <AnimatePresence mode="wait">
        {phase !== "expanded" ? (
          /* ─── Phase 1 & 2: Holographic Web Globe Appears & Deforms ─── */
          <motion.div
            key="globe-morph"
            initial={{ scale: 0.4, opacity: 0, y: 10 }}
            animate={
              phase === "globe"
                ? {
                    scale: [0.4, 1.1, 1],
                    opacity: 1,
                    y: 0,
                    rotate: [0, -10, 0],
                  }
                : {
                    scale: [1, 1.25, 0.85, 1.15],
                    scaleX: [1, 1.4, 0.7, 1.3],
                    scaleY: [1, 0.7, 1.3, 0.8],
                    rotate: [0, 45, -30, 180],
                    opacity: [1, 0.9, 1, 0.8],
                    filter: [
                      "blur(0px) brightness(1)",
                      "blur(2px) brightness(1.6)",
                      "blur(1px) brightness(1.4)",
                      "blur(3px) brightness(2)",
                    ],
                  }
            }
            exit={{ opacity: 0, scale: 0.6, filter: "blur(6px)" }}
            transition={{
              duration: phase === "globe" ? 0.6 : 0.65,
              ease: "easeInOut",
            }}
            className="relative flex items-center justify-center p-3.5 rounded-2xl bg-[#09091d]/85 border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.35),inset_0_0_20px_rgba(168,85,247,0.2)] backdrop-blur-xl"
          >
            {/* Ambient glowing radial flare */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500/30 via-indigo-500/20 to-purple-600/30 blur-xl animate-pulse" />

            {/* Custom SVG Web Globe matching user's exact grid reference */}
            <svg
              className="w-8 h-8 text-cyan-400 relative z-10"
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <defs>
                <linearGradient id="globeSvgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
              </defs>

              {/* Outer circle */}
              <circle cx="50" cy="50" r="44" stroke="url(#globeSvgGrad)" strokeWidth="6.5" />
              {/* Equator & Meridian axes */}
              <line x1="6" y1="50" x2="94" y2="50" stroke="url(#globeSvgGrad)" strokeWidth="6" />
              <line x1="50" y1="6" x2="50" y2="94" stroke="url(#globeSvgGrad)" strokeWidth="6" />
              {/* Latitude Curves */}
              <path d="M 16,28 Q 50,42 84,28" stroke="url(#globeSvgGrad)" strokeWidth="5.5" fill="none" />
              <path d="M 16,72 Q 50,58 84,72" stroke="url(#globeSvgGrad)" strokeWidth="5.5" fill="none" />
              {/* Longitude Ellipse arcs */}
              <path d="M 50,6 C 26,24 26,76 50,94" stroke="url(#globeSvgGrad)" strokeWidth="5.5" fill="none" />
              <path d="M 50,6 C 74,24 74,76 50,94" stroke="url(#globeSvgGrad)" strokeWidth="5.5" fill="none" />
            </svg>

            {/* Scanning radar sweep ping */}
            <motion.div
              animate={{ scale: [1, 2], opacity: [0.8, 0] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
              className="absolute inset-1 rounded-xl border border-cyan-400/60 pointer-events-none"
            />
          </motion.div>
        ) : (
          /* ─── Phase 3: Fluidly Expanded Live Web Searching Capsule with Text ─── */
          <motion.div
            key="expanded-capsule"
            initial={{ opacity: 0, scaleX: 0.6, scaleY: 0.85, filter: "blur(6px)" }}
            animate={{ opacity: 1, scaleX: 1, scaleY: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#09091f]/95 via-[#0e0c2a]/90 to-[#070b1a]/95 border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.25),0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl max-w-full overflow-hidden"
          >
            {/* Luminous top border sheen */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

            {/* Mini Rotating Web Globe Icon */}
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 flex-shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Globe className="w-4.5 h-4.5 animate-spin-slow text-cyan-300" style={{ animationDuration: "6s" }} />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            </div>

            {/* Glowing Search Status & Query Text */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-1 min-w-0 text-left">
              <span className="text-[12.5px] font-semibold text-purple-200/90 flex items-center gap-1.5 whitespace-nowrap">
                <Search className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                Searching the live web for:
              </span>
              
              {/* Highlighted Query */}
              <span className="text-[12.5px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-purple-300 truncate max-w-[280px] sm:max-w-[420px] drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                "{displayQuery}"
              </span>
            </div>

            {/* 3 Animated Pulsing Radar Dots on Right */}
            <div className="flex items-center gap-1 flex-shrink-0 ml-1">
              {[0, 0.2, 0.4].map((delay, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.35, 1, 0.35],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1,
                    delay,
                    ease: "easeInOut",
                  }}
                  className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
                />
              ))}
            </div>

            {/* Animated Laser Sweep Flare traversing across capsule */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
              className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-cyan-400/15 to-transparent pointer-events-none skew-x-12"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
