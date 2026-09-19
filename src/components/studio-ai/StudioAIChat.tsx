/**
 * StudioAIChat — Main chat area with messages and welcome state.
 * Uses the Studio Pulse logo (image.png) with a thinking animation
 * instead of the default Sparkles icon.
 */import { useRef, useEffect, useState, useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import { Globe } from "lucide-react";
import StudioAIMessage from "./StudioAIMessage";
import CosmicWebModeView from "./CosmicWebModeView";
import WebSearchThinkingIndicator from "./WebSearchThinkingIndicator";
import type { AIMessage, StreamingMessage } from "@/types/ai";
import { useSettings } from "@/context/SettingsContext";

interface StudioAIChatProps {
  messages: AIMessage[];
  streamingMessage: StreamingMessage | null;
  isLoading: boolean;
  isSending?: boolean;
  aiMode?: "normal" | "web";
  onSelectPrompt?: (prompt: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
}

/* Quick‑action suggestion cards with icons */
const SUGGESTIONS = [
  { icon: "📉", text: "Why did my views drop?", color: "from-red-500/10 to-red-900/10 border-red-500/15" },
  { icon: "📊", text: "Which videos should I promote?", color: "from-blue-500/10 to-blue-900/10 border-blue-500/15" },
  { icon: "📅", text: "Create a content plan", color: "from-purple-500/10 to-purple-900/10 border-purple-500/15" },
  { icon: "🎬", text: "Analyze my latest video", color: "from-emerald-500/10 to-emerald-900/10 border-emerald-500/15" },
  { icon: "⏰", text: "Best time to upload Shorts?", color: "from-amber-500/10 to-amber-900/10 border-amber-500/15" },
  { icon: "💰", text: "Revenue prediction for next month", color: "from-cyan-500/10 to-cyan-900/10 border-cyan-500/15" },
];

export default function StudioAIChat({
  messages,
  streamingMessage,
  isLoading,
  isSending,
  aiMode = "normal",
  onSelectPrompt,
  onEditMessage,
}: StudioAIChatProps) {
  const { user } = useUser();
  const { t } = useSettings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isChatFocused, setIsChatFocused] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage?.content]);

  const userName = user?.firstName || "Creator";
  const hasMessages = messages.length > 0 || streamingMessage;

  /* Floating stars for empty state */
  const floatingStars = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: 10 + Math.random() * 80,
        top: 10 + Math.random() * 80,
        size: 1 + Math.random() * 2,
        delay: i * 0.4,
        duration: 3 + Math.random() * 4,
      })),
    []
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/image.png"
            alt="Loading"
            className="w-16 h-16 object-contain animate-logo-think-fast"
          />
          <p className="text-gray-500 text-sm">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onMouseEnter={() => setIsChatFocused(true)}
      onMouseLeave={() => setIsChatFocused(false)}
      onClick={() => setIsChatFocused(true)}
      className="flex-1 overflow-y-auto custom-scrollbar transition-all duration-500"
      id="studio-ai-chat"
      style={{
        scrollBehavior: "smooth",
        willChange: "transform",
        transform: "translate3d(0, 0, 0)",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {!hasMessages ? (
        aiMode === "web" ? (
          /* ─── Web Mode Holographic Welcome View ─── */
          <div className="flex items-center justify-center min-h-full py-4 animate-fade-in">
            <CosmicWebModeView
              userName={userName}
              onSelectPrompt={(prompt) => onSelectPrompt?.(prompt)}
            />
          </div>
        ) : (
          /* ─── Standard Normal Welcome State ─── */
          <div className="flex flex-col items-center justify-center h-full px-4 pb-8 animate-fade-in">
            {/* Studio Pulse logo with thinking animation */}
            <div className="relative mb-8">
              {/* Orbit ring */}
              <div className="absolute inset-[-16px] rounded-full border border-purple-500/10 animate-orbit-ring" />
              <div className="absolute inset-[-32px] rounded-full border border-blue-500/[0.06] animate-orbit-ring" style={{ animationDirection: "reverse", animationDuration: "12s" }} />

              <div className="relative z-10">
                <img
                  src="/image.png"
                  alt="Studio AI"
                  className={`w-24 h-24 sm:w-28 sm:h-28 object-contain ${
                    isSending ? "animate-logo-think-fast" : "animate-logo-think"
                  }`}
                />
              </div>

              {/* Ambient glow beneath logo */}
              <div className="absolute inset-0 w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-purple-500/15 blur-3xl animate-pulse" />
            </div>

            {/* Greeting */}
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              {t("ai.welcomeHi")} {userName}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-center text-[15px] leading-relaxed max-w-md mb-10 font-medium">
              {t("ai.welcomeText")}
            </p>

            {/* Quick suggestion cards — 2‑column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => onSelectPrompt?.(s.text)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-br ${s.color} border backdrop-blur-sm text-left transition-all duration-200 hover:scale-[1.02] hover:brightness-125 group`}
                >
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-[13px] text-gray-300 group-hover:text-white transition-colors leading-snug">
                    {s.text}
                  </span>
                </button>
              ))}
            </div>

            {/* Floating decorative stars */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {floatingStars.map((s) => (
                <div
                  key={s.id}
                  className="absolute rounded-full bg-purple-400/30 animate-twinkle"
                  style={{
                    left: `${s.left}%`,
                    top: `${s.top}%`,
                    width: `${s.size}px`,
                    height: `${s.size}px`,
                    animationDelay: `${s.delay}s`,
                    animationDuration: `${s.duration}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )
      ) : (
        /* ─── Clean Streamlined Messages Stream (No Redundant Outer Card) ─── */
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <div className="space-y-4">
            {/* Message list */}
            {messages.map((msg) => (
              <div key={msg.id} className="scroll-optimized-item">
                <StudioAIMessage
                  message={msg}
                  userName={userName}
                  onEditMessage={onEditMessage}
                  isSending={isSending}
                />
              </div>
            ))}

            {/* Streaming message */}
            {streamingMessage && (
              <div className="scroll-optimized-item">
                <StudioAIMessage
                  message={{
                    id: streamingMessage.id,
                    conversation_id: "",
                    user_id: "",
                    role: "assistant",
                    content: streamingMessage.content,
                    created_at: new Date().toISOString(),
                    sources: streamingMessage.sources,
                    isWebSearch: aiMode === "web" || (streamingMessage.sources?.length || 0) > 0,
                  }}
                  isStreaming={streamingMessage.isStreaming}
                  isSearchingWeb={aiMode === "web" || streamingMessage.isSearchingWeb}
                  webSearchQuery={streamingMessage.webSearchQuery}
                  researchStage={streamingMessage.researchStage}
                  researchMessage={streamingMessage.researchMessage}
                  userName={userName}
                />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
