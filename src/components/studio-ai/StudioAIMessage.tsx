import { useState, useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, ThumbsUp, ThumbsDown, Share2, Globe, ExternalLink, Pencil, Check, X } from "lucide-react";
import type { AIMessage } from "@/types/ai";

interface StudioAIMessageProps {
  message: AIMessage;
  isStreaming?: boolean;
  isSearchingWeb?: boolean;
  webSearchQuery?: string;
  researchStage?: string;
  researchMessage?: string;
  userName?: string;
  onEditMessage?: (messageId: string, newContent: string) => void;
  isSending?: boolean;
}

export default function StudioAIMessage({
  message,
  isStreaming,
  isSearchingWeb,
  webSearchQuery,
  researchStage,
  researchMessage,
  onEditMessage,
  isSending,
}: StudioAIMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<"up" | "down" | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.style.height = "auto";
      editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleSaveEdit = () => {
    if (!editContent.trim() || isSending) return;
    setIsEditing(false);
    if (editContent.trim() !== message.content.trim()) {
      onEditMessage?.(message.id, editContent.trim());
    }
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  if (isUser) {
    return (
      <div className="group flex justify-end mb-6 animate-fade-in" id={`msg-${message.id}`}>
        <div className="max-w-[85%] lg:max-w-[70%] w-full flex flex-col items-end">
          <AnimatePresence mode="wait">
            {isEditing ? (
              /* ─── Inline Editable Textarea (ChatGPT Style) ─── */
              <motion.div
                key="edit-box"
                initial={{ opacity: 0, scale: 0.98, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -4 }}
                transition={{ duration: 0.2 }}
                className="w-full bg-[#0c0c20]/95 border border-purple-500/50 rounded-2xl p-3.5 shadow-2xl backdrop-blur-2xl"
              >
                <textarea
                  ref={editTextareaRef}
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={handleEditKeyDown}
                  className="w-full bg-transparent text-[#f1f1f8] text-[14.5px] leading-relaxed outline-none resize-none min-h-[60px] max-h-[220px] custom-scrollbar"
                  disabled={isSending}
                />

                {/* Edit Controls */}
                <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-white/10">
                  <button
                    onClick={handleCancelEdit}
                    type="button"
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editContent.trim() || isSending}
                    type="button"
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium text-white transition-all duration-200 flex items-center gap-1.5 ${
                      editContent.trim() && !isSending
                        ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 shadow-md shadow-purple-900/30 hover:scale-105"
                        : "bg-white/10 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save & Submit
                  </button>
                </div>
              </motion.div>
            ) : (
              /* ─── Standard User Message Bubble with Hover Edit ─── */
              <motion.div
                key="view-bubble"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative max-w-full"
              >
                <div className="bg-gradient-to-r from-purple-900/45 via-indigo-950/55 to-[#120828]/80 border border-purple-500/35 rounded-2xl rounded-br-md px-5 py-3.5 shadow-lg backdrop-blur-xl transition-all">
                  <p className="text-[#f1f1f8] text-[14.5px] leading-relaxed whitespace-pre-wrap font-normal">
                    {message.content}
                  </p>
                </div>

                {/* Footer: Time + Hover Action Bar (Edit & Copy) */}
                <div className="flex items-center justify-end gap-2 mt-1.5 pr-1">
                  {/* Hover Edit & Copy Buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Edit message"
                      type="button"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleCopy}
                      className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Copy message"
                      type="button"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="text-[11px] text-gray-500">{time}</span>
                  <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8.5L6 12.5L14 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex gap-3 mb-6 animate-fade-in" id={`msg-${message.id}`}>
      {/* AI Avatar */}
      <div className="flex-shrink-0 mt-1">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1a0a2e] to-[#0d0520] flex items-center justify-center shadow-lg shadow-purple-900/40 border border-purple-500/30 overflow-hidden ring-1 ring-purple-500/20">
          <img src="/image.png" alt="AI" className="w-5 h-5 object-contain" />
        </div>
      </div>

      {/* Message content */}
      <div className="flex-1 max-w-[90%] lg:max-w-[80%]">
        <div className="bg-[#0c0c20]/60 border border-[#272744]/70 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-xl text-[#e8e8f0] text-[14.5px] leading-[1.75] whitespace-pre-wrap">
          <MessageContent
            content={message.content}
            isStreaming={isStreaming}
            isSearchingWeb={isSearchingWeb}
            webSearchQuery={webSearchQuery}
            researchStage={researchStage}
            researchMessage={researchMessage}
          />
        </div>

        {/* Live Web Sources & Citations */}
        {message.sources && message.sources.length > 0 && !isStreaming && (
          <div className="mt-4 pt-3 border-t border-purple-500/15 animate-fade-in">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300 mb-2.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" style={{ animationDuration: "16s" }} />
              <span>Live Sources & Citations ({message.sources.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {message.sources.map((src, idx) => (
                <a
                  key={idx}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2.5 p-2.5 rounded-xl bg-[#0d0d1e]/80 hover:bg-[#15152d] border border-purple-500/20 hover:border-cyan-400/50 transition-all text-left shadow-sm"
                >
                  <div className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-300 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10.5px] font-bold group-hover:bg-cyan-500/20 group-hover:text-cyan-300 transition-colors">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium text-cyan-400 truncate">
                        {src.domain || "Web Source"}
                      </span>
                      <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-cyan-300 flex-shrink-0 transition-colors" />
                    </div>
                    <p className="text-[12px] text-gray-200 font-medium truncate group-hover:text-white transition-colors">
                      {src.title}
                    </p>
                    {src.snippet && (
                      <p className="text-[10.5px] text-gray-400 line-clamp-1 mt-0.5">
                        {src.snippet}
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons (only show when not streaming) */}
        {!isStreaming && (
          <div className="flex items-center gap-1 mt-3">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
              title="Copy"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLiked(liked === "up" ? null : "up")}
              className={`p-1.5 rounded-lg transition-all ${liked === "up" ? "text-purple-400 bg-purple-400/10" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
              title="Helpful"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLiked(liked === "down" ? null : "down")}
              className={`p-1.5 rounded-lg transition-all ${liked === "down" ? "text-red-400 bg-red-400/10" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
              title="Not helpful"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
              title="Share"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            {copied && (
              <span className="text-[11px] text-purple-400 ml-1 animate-fade-in">Copied!</span>
            )}
            <span className="text-[11px] text-gray-600 ml-auto">{time}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Renders message content with basic markdown-like formatting.
 */
function MessageContent({
  content,
  isStreaming,
  isSearchingWeb,
  webSearchQuery,
  researchStage,
  researchMessage,
}: {
  content: string;
  isStreaming?: boolean;
  isSearchingWeb?: boolean;
  webSearchQuery?: string;
  researchStage?: string;
  researchMessage?: string;
}) {
  if (!content && isStreaming) {
    if (isSearchingWeb) {
      return (
        <WebSearchingIndicator
          stage={researchStage}
          message={researchMessage}
          query={webSearchQuery}
        />
      );
    }
    return <TypingIndicator />;
  }

  // Parse and render content with formatting
  const lines = content.split("\n");
  const elements: ReactNode[] = [];
  let inRecommendation = false;
  let recommendationLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect recommendation blocks
    if (line.includes("💡") && line.toLowerCase().includes("recommendation")) {
      inRecommendation = true;
      recommendationLines = [line];
      continue;
    }

    if (inRecommendation) {
      if (line.trim() === "" && i < lines.length - 1 && !lines[i + 1].startsWith(" ") && !lines[i + 1].startsWith("•") && !lines[i + 1].startsWith("-")) {
        // End of recommendation block
        elements.push(
          <RecommendationBlock key={`rec-${i}`} lines={recommendationLines} />
        );
        inRecommendation = false;
        recommendationLines = [];
        continue;
      }
      recommendationLines.push(line);
      continue;
    }

    // Bold text: **text**
    const formattedLine = formatLine(line);

    if (line.trim() === "") {
      elements.push(<br key={`br-${i}`} />);
    } else if (line.startsWith("### ")) {
      elements.push(
        <h4 key={`h4-${i}`} className="text-white font-semibold text-[15px] mt-3 mb-1">
          {formatLine(line.slice(4))}
        </h4>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-white font-bold text-[16px] mt-4 mb-1.5">
          {formatLine(line.slice(3))}
        </h3>
      );
    } else if (line.match(/^[•\-\*]\s/)) {
      elements.push(
        <div key={`bullet-${i}`} className="flex gap-2 ml-1 my-0.5">
          <span className="text-purple-400 mt-0.5 flex-shrink-0">•</span>
          <span>{formatLine(line.replace(/^[•\-\*]\s/, ""))}</span>
        </div>
      );
    } else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\./)?.[1];
      elements.push(
        <div key={`num-${i}`} className="flex gap-2 ml-1 my-0.5">
          <span className="text-purple-400 font-semibold flex-shrink-0">{num}.</span>
          <span>{formatLine(line.replace(/^\d+\.\s/, ""))}</span>
        </div>
      );
    } else {
      elements.push(<p key={`p-${i}`} className="my-0.5">{formattedLine}</p>);
    }
  }

  // Flush any remaining recommendation
  if (inRecommendation && recommendationLines.length > 0) {
    elements.push(
      <RecommendationBlock key="rec-final" lines={recommendationLines} />
    );
  }

  return (
    <>
      {elements}
      {isStreaming && <span className="inline-block w-0.5 h-4 bg-purple-400 animate-pulse ml-0.5 -mb-0.5" />}
    </>
  );
}

/**
 * Format inline markdown: **bold**, *italic*, `code`
 */
function formatLine(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Markdown link: [text](url)
    const linkMatch = remaining.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Code: `text`
    const codeMatch = remaining.match(/`(.+?)`/);
    // Bare URL: https://...
    const urlMatch = remaining.match(/(?<!\()(https?:\/\/[^\s<>)\]]+)/);

    // Find earliest match
    type MatchInfo = { type: string; match: RegExpMatchArray; index: number };
    let firstMatch: MatchInfo | null = null;

    const candidates: MatchInfo[] = [];
    if (linkMatch?.index !== undefined) candidates.push({ type: "link", match: linkMatch, index: linkMatch.index });
    if (boldMatch?.index !== undefined) candidates.push({ type: "bold", match: boldMatch, index: boldMatch.index });
    if (codeMatch?.index !== undefined) candidates.push({ type: "code", match: codeMatch, index: codeMatch.index });
    if (urlMatch?.index !== undefined) candidates.push({ type: "url", match: urlMatch, index: urlMatch.index });

    // Sort by earliest position
    candidates.sort((a, b) => a.index - b.index);
    firstMatch = candidates[0] || null;

    // If a bare URL is inside a markdown link, skip the bare URL
    if (firstMatch?.type === "url" && linkMatch?.index !== undefined && linkMatch.index <= firstMatch.index) {
      firstMatch = candidates.find(c => c.type === "link") || firstMatch;
    }

    if (!firstMatch) {
      parts.push(remaining);
      break;
    }

    // Add text before match
    if (firstMatch.index > 0) {
      parts.push(remaining.slice(0, firstMatch.index));
    }

    if (firstMatch.type === "bold") {
      parts.push(
        <strong key={`b-${key++}`} className="text-white font-semibold">
          {firstMatch.match[1]}
        </strong>
      );
    } else if (firstMatch.type === "code") {
      parts.push(
        <code key={`c-${key++}`} className="bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded text-[13px] font-mono">
          {firstMatch.match[1]}
        </code>
      );
    } else if (firstMatch.type === "link") {
      parts.push(
        <a
          key={`link-${key++}`}
          href={firstMatch.match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors"
        >
          {firstMatch.match[1]}
        </a>
      );
    } else if (firstMatch.type === "url") {
      // Shorten display text for long URLs
      const url = firstMatch.match[0];
      let displayUrl = url;
      try {
        const parsed = new URL(url);
        displayUrl = parsed.hostname + (parsed.pathname.length > 30 ? parsed.pathname.slice(0, 30) + "…" : parsed.pathname);
      } catch { /* use full url */ }
      parts.push(
        <a
          key={`url-${key++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors break-all"
        >
          {displayUrl}
        </a>
      );
    }

    remaining = remaining.slice(firstMatch.index + firstMatch.match[0].length);
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}

/**
 * Purple-accented recommendation card.
 */
function RecommendationBlock({ lines }: { lines: string[] }) {
  return (
    <div className="my-3 bg-purple-500/5 border border-purple-500/20 rounded-xl px-4 py-3">
      {lines.map((line, i) => {
        if (i === 0) {
          return (
            <div key={i} className="flex items-center gap-2 mb-1.5">
              <span className="text-purple-400">💡</span>
              <span className="text-purple-300 font-semibold text-[14px]">Recommendation</span>
            </div>
          );
        }
        return (
          <p key={i} className="text-[#c8c8d4] text-[14px] leading-relaxed">
            {formatLine(line)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * WebSearchingIndicator — Authentic Multi-Stage Research Animation:
 * 1. Web logo appears & deforms with fluid wave distortion.
 * 2. Real-time research stage text appears and moves in a smooth waveform.
 */
function WebSearchingIndicator({
  stage: currentStage,
  message: currentMessage,
  query,
}: {
  stage?: string;
  message?: string;
  query?: string;
}) {
  const [animStage, setAnimStage] = useState<"logo" | "deform" | "text-wave">("logo");

  useEffect(() => {
    const t1 = setTimeout(() => setAnimStage("deform"), 600);
    const t2 = setTimeout(() => setAnimStage("text-wave"), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Map real backend research stage to human-readable text
  const stageLabels: Record<string, string> = {
    searching_web: "Searching the web…",
    finding_sources: "Finding relevant sources…",
    opening_sources: "Opening sources…",
    verifying_claims: "Verifying claims…",
    checking_dates: "Checking dates…",
    cross_checking: "Cross-checking information…",
    preparing_answer: "Preparing answer…",
  };

  const displayText = currentMessage || (currentStage ? stageLabels[currentStage] : undefined) || "Searching the web…";
  const textLetters = displayText.split("");

  return (
    <div className="flex items-center gap-3 py-1.5 select-none animate-fade-in" id="web-searching-indicator">
      <AnimatePresence mode="wait">
        {animStage !== "text-wave" ? (
          /* ─── Stage 1 (Logo Appears) & Stage 2 (Lines Deform) ─── */
          <motion.div
            key="globe-deform"
            initial={{ scale: 0.35, opacity: 0 }}
            animate={
              animStage === "logo"
                ? {
                    scale: [0.35, 1.15, 1],
                    opacity: 1,
                    rotate: [0, -8, 0],
                  }
                : {
                    scale: [1, 1.35, 0.75, 1.2],
                    scaleX: [1, 1.6, 0.65, 1.4],
                    scaleY: [1, 0.6, 1.45, 0.7],
                    rotate: [0, 55, -40, 180],
                    opacity: [1, 0.85, 1, 0.95],
                    filter: [
                      "blur(0px) brightness(1)",
                      "blur(2px) brightness(1.8)",
                      "blur(1px) brightness(1.4)",
                      "blur(3px) brightness(2)",
                    ],
                  }
            }
            exit={{ opacity: 0, scale: 0.5, filter: "blur(6px)" }}
            transition={{
              duration: animStage === "logo" ? 0.55 : 0.6,
              ease: "easeInOut",
            }}
            className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/40 shadow-[0_0_20px_rgba(56,189,248,0.4)] flex-shrink-0"
          >
            {/* Custom SVG Web Globe matching user's exact grid reference */}
            <svg
              className="w-5 h-5 text-cyan-300"
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <defs>
                <linearGradient id="webGlobeGlowInline" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="44" stroke="url(#webGlobeGlowInline)" strokeWidth="7" />
              <line x1="6" y1="50" x2="94" y2="50" stroke="url(#webGlobeGlowInline)" strokeWidth="6" />
              <line x1="50" y1="6" x2="50" y2="94" stroke="url(#webGlobeGlowInline)" strokeWidth="6" />
              <path d="M 16,28 Q 50,42 84,28" stroke="url(#webGlobeGlowInline)" strokeWidth="6" fill="none" />
              <path d="M 16,72 Q 50,58 84,72" stroke="url(#webGlobeGlowInline)" strokeWidth="6" fill="none" />
              <path d="M 50,6 C 26,24 26,76 50,94" stroke="url(#webGlobeGlowInline)" strokeWidth="6" fill="none" />
              <path d="M 50,6 C 74,24 74,76 50,94" stroke="url(#webGlobeGlowInline)" strokeWidth="6" fill="none" />
            </svg>
          </motion.div>
        ) : (
          /* ─── Stage 3: Liquid Glass Capsule + Continuous Waveform Text (Authentic Research Progress) ─── */
          <motion.div
            key="text-wave"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-center gap-3.5"
          >
            {/* Apple Intelligence Liquid Glass Capsule on the left */}
            <div
              className="relative flex items-center w-[50px] h-[22px] rounded-full border border-cyan-400/45 shadow-[0_0_12px_rgba(56,189,248,0.35),inset_0_0_6px_rgba(255,255,255,0.25)] backdrop-blur-md overflow-hidden flex-shrink-0"
              style={{ background: "rgba(255, 255, 255, 0.05)" }}
            >
              <div className="absolute top-0 inset-x-1.5 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
              <motion.div
                animate={{
                  x: [2, 19, 4, 17, 2],
                  scaleX: [1, 1.45, 0.85, 1.35, 1],
                  scaleY: [1, 0.75, 1.2, 0.85, 1],
                  borderRadius: [
                    "50%",
                    "40% 60% 70% 30% / 40% 50% 60% 50%",
                    "60% 40% 30% 70% / 50% 60% 40% 50%",
                    "50%",
                  ],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.2,
                  ease: "easeInOut",
                }}
                className="w-3.5 h-3.5 rounded-full"
                style={{
                  background: "radial-gradient(circle at 35% 35%, #ffffff, #a5f3fc 45%, #38bdf8 85%)",
                  boxShadow: "0 0 10px rgba(56, 189, 248, 0.9), inset 0 0 3px #ffffff",
                }}
              />
            </div>

            {/* Continuous Fluid Waveform Text Matching Real Research Stage */}
            <div className="flex items-center text-[13.5px] font-medium tracking-wide">
              {textLetters.map((letter, i) => (
                <motion.span
                  key={`${displayText}-${i}`}
                  animate={{
                    y: [0, -3.5, 0],
                    opacity: [0.7, 1, 0.7],
                    color: ["#e2e8f0", "#38bdf8", "#c084fc", "#e2e8f0"],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    delay: i * 0.06,
                    ease: "easeInOut",
                  }}
                  className="inline-block"
                >
                  {letter === " " ? "\u00A0" : letter}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Standard Studio AI thinking animation (Normal Mode only).
 */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 py-2 animate-pulse">
      <div className="relative w-6 h-6 flex-shrink-0">
        {/* Glowing blur backing */}
        <div className="absolute inset-0.5 rounded-full bg-purple-500/20 blur-[3px]" />
        {/* Pulsing center core */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 animate-ping opacity-60" style={{ animationDuration: "1.6s" }} />
        <div className="absolute inset-1.5 rounded-full bg-gradient-to-r from-purple-400 to-indigo-400" />
        {/* Spinning outer rings */}
        <div className="absolute inset-0 rounded-full border border-t-purple-400 border-r-indigo-400 border-b-transparent border-l-transparent animate-spin" style={{ animationDuration: "0.8s" }} />
      </div>
      <span className="text-[13px] font-medium tracking-wide bg-gradient-to-r from-purple-300 via-indigo-200 to-purple-300 bg-clip-text text-transparent">
        Studio AI is thinking...
      </span>
    </div>
  );
}
