/**
 * StudioAIMessage — Individual chat message component.
 * Matches the cosmic dark UI design exactly.
 */

import { useState, type ReactNode } from "react";
import { Copy, ThumbsUp, ThumbsDown, Share2 } from "lucide-react";
import type { AIMessage } from "@/types/ai";

interface StudioAIMessageProps {
  message: AIMessage;
  isStreaming?: boolean;
  userName?: string;
}

export default function StudioAIMessage({ message, isStreaming }: StudioAIMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<"up" | "down" | null>(null);

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

  if (isUser) {
    return (
      <div className="flex justify-end mb-6 animate-fade-in" id={`msg-${message.id}`}>
        <div className="max-w-[75%] lg:max-w-[60%]">
          <div className="bg-[#1a1a2e]/80 border border-[#2a2a3e] rounded-2xl rounded-br-md px-5 py-3.5">
            <p className="text-[#e2e2e8] text-[14.5px] leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
          <div className="flex items-center justify-end gap-1.5 mt-1.5 pr-1">
            <span className="text-[11px] text-gray-500">{time}</span>
            <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 16 16" fill="none">
              <path d="M2 8.5L6 12.5L14 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex gap-3 mb-6 animate-fade-in" id={`msg-${message.id}`}>
      {/* AI Avatar */}
      <div className="flex-shrink-0 mt-1">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1a0a2e] to-[#0d0520] flex items-center justify-center shadow-lg shadow-purple-900/30 border border-purple-500/15 overflow-hidden">
          <img src="/image.png" alt="AI" className="w-5 h-5 object-contain" />
        </div>
      </div>

      {/* Message content */}
      <div className="flex-1 max-w-[85%] lg:max-w-[75%]">
        <div className="text-[#e8e8f0] text-[14.5px] leading-[1.75] whitespace-pre-wrap">
          <MessageContent content={message.content} isStreaming={isStreaming} />
        </div>

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
function MessageContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  if (!content && isStreaming) {
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
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Code: `text`
    const codeMatch = remaining.match(/`(.+?)`/);

    let firstMatch: { type: string; match: RegExpMatchArray; index: number } | null = null;

    if (boldMatch?.index !== undefined) {
      firstMatch = { type: "bold", match: boldMatch, index: boldMatch.index };
    }
    if (codeMatch?.index !== undefined && (!firstMatch || codeMatch.index < firstMatch.index)) {
      firstMatch = { type: "code", match: codeMatch, index: codeMatch.index };
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
 * Premium cosmic thinking animation.
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
