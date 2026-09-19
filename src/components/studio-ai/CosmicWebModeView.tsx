import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Video, TrendingUp, Music, Target, Zap, Sparkles } from "lucide-react";

interface CosmicWebModeViewProps {
  userName: string;
  onSelectPrompt: (prompt: string) => void;
}

interface RotatingSuggestion {
  icon: typeof Globe;
  iconColor: string;
  text: string;
  prompt: string;
}

/* ── Dynamic Rotating Feature Sentences with Crisp Vector Icons ── */
const ROTATING_SUGGESTIONS: RotatingSuggestion[] = [
  {
    icon: Globe,
    iconColor: "text-cyan-400",
    text: "Search live web for 2026 creator gear & specs",
    prompt: "Search the web and compare the best mirrorless cameras for YouTube in 2026 with prices and specs.",
  },
  {
    icon: Video,
    iconColor: "text-purple-400",
    text: "Generate viral video titles & retention hooks",
    prompt: "Give me 5 viral video concepts tailored to my channel niche with high-retention intro hooks.",
  },
  {
    icon: TrendingUp,
    iconColor: "text-emerald-400",
    text: "Analyze audience retention & growth drops",
    prompt: "Analyze my channel performance and tell me which metrics need attention.",
  },
  {
    icon: Music,
    iconColor: "text-pink-400",
    text: "Discover songs & music matching your vibe",
    prompt: "Search the web for trending indie songs matching my channel vibe and style.",
  },
  {
    icon: Target,
    iconColor: "text-amber-400",
    text: "Optimize video titles & click-through rates (CTR)",
    prompt: "Give me 10 high-converting title variations for my next video upload.",
  },
  {
    icon: Zap,
    iconColor: "text-yellow-400",
    text: "Turn raw ideas into complete upload scripts",
    prompt: "Help me write high-converting SEO metadata, tags, and description for my new video.",
  },
  {
    icon: Sparkles,
    iconColor: "text-cyan-300",
    text: "Brainstorm high-converting content angles",
    prompt: "Suggest 3 fresh content angles and thumbnail concepts that my audience would love to watch.",
  },
];

export default function CosmicWebModeView({ userName, onSelectPrompt }: CosmicWebModeViewProps) {
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [isThinking, setIsThinking] = useState(false);

  // Alternating cycle: Sentence for 3.5s -> Thinking dots for 2s -> Next sentence
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!isThinking) {
      timeout = setTimeout(() => {
        setIsThinking(true);
      }, 3500);
    } else {
      timeout = setTimeout(() => {
        setCurrentPromptIndex((prev) => (prev + 1) % ROTATING_SUGGESTIONS.length);
        setIsThinking(false);
      }, 2000);
    }
    return () => clearTimeout(timeout);
  }, [isThinking]);

  const activeSuggestion = ROTATING_SUGGESTIONS[currentPromptIndex];
  const Icon = activeSuggestion.icon;

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[380px] sm:min-h-[420px] px-3 sm:px-4 py-4 sm:py-6 select-none my-auto">
      
      {/* ─── Center Assistant Area (Borderless & Clean Floating Presentation) ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center justify-center text-center z-10 my-auto"
      >
        {/* Top Star Sparkle Badge with Breathing Glow */}
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: "easeInOut",
          }}
          className="p-2 sm:p-2.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 mb-2 sm:mb-3 shadow-[0_0_25px_rgba(168,85,247,0.5)]"
        >
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-spin-slow" style={{ animationDuration: "12s" }} />
        </motion.div>

        {/* Greeting: Vibrant Cosmic Text Gradient */}
        <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-cyan-200 text-[22px] sm:text-[26px] lg:text-[28px] font-bold tracking-tight mb-1 drop-shadow-[0_2px_14px_rgba(168,85,247,0.4)]">
          Hello, {userName}
        </h2>
        
        {/* Subtitle */}
        <p className="text-gray-300 text-[13px] sm:text-[14.5px] leading-relaxed max-w-[280px] sm:max-w-none mb-3">
          How can I assist you today?
        </p>

        {/* ─── Alternating Thinking Dots (2s) & Smooth Animated Sentences ─── */}
        <div className="w-full h-9 flex items-center justify-center relative overflow-hidden px-2">
          <AnimatePresence mode="wait">
            {isThinking ? (
              /* Thinking Dots Animation (2 seconds) */
              <motion.div
                key="thinking-dots"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="flex items-center justify-center gap-2 h-7"
              >
                {[
                  { color: "#c084fc", delay: 0 },
                  { color: "#818cf8", delay: 0.15 },
                  { color: "#38bdf8", delay: 0.3 },
                  { color: "#a855f7", delay: 0.45 },
                  { color: "#38bdf8", delay: 0.6 },
                ].map((dot, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.35, 1, 0.35],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.1,
                      delay: dot.delay,
                      ease: "easeInOut",
                    }}
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: dot.color,
                      boxShadow: `0 0 10px ${dot.color}`,
                    }}
                  />
                ))}
              </motion.div>
            ) : (
              /* Smooth Animated Floating Feature Sentence with Sleek Vector Icon */
              <motion.button
                key={`sentence-${currentPromptIndex}`}
                initial={{ opacity: 0, y: 8, filter: "blur(3px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                onClick={() => onSelectPrompt(activeSuggestion.prompt)}
                className="group flex items-center justify-center gap-2 px-3 py-1 cursor-pointer transition-all max-w-full"
                title="Click to ask this"
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${activeSuggestion.iconColor} drop-shadow-[0_0_8px_currentColor] transition-transform group-hover:scale-110`} />
                <span className="text-[12.5px] sm:text-[13.5px] font-medium text-purple-100/90 group-hover:text-cyan-200 transition-colors text-center truncate">
                  {activeSuggestion.text}
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

      </motion.div>

    </div>
  );
}
