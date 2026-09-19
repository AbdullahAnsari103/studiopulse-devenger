/**
 * Global Command Palette (Ctrl+K / Cmd+K)
 * Universal search, quick navigation, and instant action launcher.
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, LayoutDashboard, BarChart3, Play, Sparkles, Upload,
  Scissors, Rocket, UsersRound, CalendarDays, Bot, Settings,
  Command, ArrowRight, CornerDownLeft, X, RefreshCw, Eye,
  HelpCircle, Zap, Film, MessageCircle
} from "lucide-react";
import { celebrate } from "@/lib/celebrate";
import toast from "react-hot-toast";

interface PaletteItem {
  id: string;
  category: "Navigation" | "Quick Action" | "AI Feature";
  label: string;
  description?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  shortcut?: string;
  onSelect: () => void;
  keywords?: string[];
}

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // ─── Global Keyboard Listener ────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle palette on Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setShowShortcutsHelp(false);
        return;
      }

      // Help overlay on '?' (when not typing in an input/textarea)
      if (
        e.key === "?" &&
        !open &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setOpen(true);
        setShowShortcutsHelp(true);
        return;
      }

      // Close on Escape
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // ─── Actions & Navigation Registry ──────────────────────────────────────────
  const items: PaletteItem[] = useMemo(
    () => [
      // Navigation
      {
        id: "nav-dashboard",
        category: "Navigation",
        label: "Dashboard",
        description: "Overview of views, revenue, audience & metrics",
        icon: LayoutDashboard,
        shortcut: "Ctrl+1",
        keywords: ["home", "analytics", "overview", "stats"],
        onSelect: () => navigate("/dashboard"),
      },
      {
        id: "nav-analytics",
        category: "Navigation",
        label: "Analytics Radar",
        description: "Deep dive into performance & growth metrics",
        icon: BarChart3,
        shortcut: "Ctrl+2",
        keywords: ["charts", "growth", "views", "subscribers"],
        onSelect: () => navigate("/analytics"),
      },
      {
        id: "nav-upload",
        category: "Navigation",
        label: "Upload Center",
        description: "Upload videos, generate AI metadata & SEO tags",
        icon: Upload,
        shortcut: "Ctrl+U",
        keywords: ["upload", "new video", "publish", "seo", "tags"],
        onSelect: () => navigate("/upload-center"),
      },
      {
        id: "nav-clips",
        category: "Navigation",
        label: "AI Viral Clips",
        description: "Auto-extract viral shorts from long-form videos",
        icon: Sparkles,
        keywords: ["clips", "shorts", "reels", "tiktok", "viral"],
        onSelect: () => navigate("/viral-clips"),
      },
      {
        id: "nav-editor",
        category: "Navigation",
        label: "Video Editor",
        description: "Timeline video editor with captions & audio intelligence",
        icon: Scissors,
        keywords: ["edit", "cut", "timeline", "captions", "transcribe"],
        onSelect: () => navigate("/editor/new"),
      },
      {
        id: "nav-autopilot",
        category: "Navigation",
        label: "Autopilot Queue",
        description: "Automated schedule, recurring uploads & pipeline",
        icon: Rocket,
        keywords: ["schedule", "queue", "automatic", "cron", "autopilot"],
        onSelect: () => navigate("/autopilot"),
      },
      {
        id: "nav-audience",
        category: "Navigation",
        label: "Audience Sentiment & Smart Reply",
        description: "Emotion radar, YouTube comment sync & voice cloning",
        icon: UsersRound,
        keywords: ["audience", "comments", "replies", "tone", "sentiment", "voice"],
        onSelect: () => navigate("/audience"),
      },
      {
        id: "nav-ai",
        category: "Navigation",
        label: "Studio AI Assistant",
        description: "Brainstorm video ideas, scripts, and research",
        icon: Bot,
        shortcut: "Ctrl+S",
        keywords: ["ai", "chat", "ideas", "scripts", "assistant", "research"],
        onSelect: () => navigate("/studio-ai"),
      },
      {
        id: "nav-calendar",
        category: "Navigation",
        label: "Content Calendar",
        description: "View planned uploads and scheduling schedule",
        icon: CalendarDays,
        keywords: ["calendar", "schedule", "planner", "dates"],
        onSelect: () => navigate("/calendar"),
      },
      {
        id: "nav-videos",
        category: "Navigation",
        label: "My Videos Library",
        description: "Browse all uploaded and synced videos",
        icon: Play,
        keywords: ["videos", "library", "manage", "content"],
        onSelect: () => navigate("/my-videos"),
      },
      {
        id: "nav-settings",
        category: "Navigation",
        label: "Settings",
        description: "Account, YouTube tokens, preferences and theme",
        icon: Settings,
        keywords: ["settings", "account", "profile", "keys", "tokens"],
        onSelect: () => navigate("/settings"),
      },

      // Quick Actions
      {
        id: "act-sync",
        category: "Quick Action",
        label: "Sync Channel Comments & Metrics",
        description: "Pulls latest YouTube comments and analytics",
        icon: RefreshCw,
        keywords: ["sync", "refresh", "fetch", "comments"],
        onSelect: () => {
          navigate("/audience");
          toast.success("Navigated to Audience. Click Sync to pull comments.");
        },
      },
      {
        id: "act-test-voice",
        category: "AI Feature",
        label: "Test Voice Clone Simulator",
        description: "Compare generic AI reply vs your cloned creator voice",
        icon: Sparkles,
        keywords: ["tone", "voice", "clone", "test", "simulator", "smart reply"],
        onSelect: () => {
          navigate("/audience");
          celebrate.sparkles();
          toast("Voice Clone Simulator available in Auto-Reply tab!", { icon: "🎙️" });
        },
      },
      {
        id: "act-new-editor",
        category: "Quick Action",
        label: "Create New Video Project",
        description: "Opens timeline video editor canvas",
        icon: Film,
        keywords: ["project", "editor", "new", "cut"],
        onSelect: () => {
          navigate("/editor/new");
        },
      },
      {
        id: "act-chat-ai",
        category: "AI Feature",
        label: "Ask Studio AI a Question",
        description: "Start a new conversation with Studio AI",
        icon: MessageCircle,
        keywords: ["ask", "prompt", "chat", "generate"],
        onSelect: () => {
          navigate("/studio-ai");
        },
      },
    ],
    [navigate]
  );

  // ─── Filtered Items ──────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.keywords?.some((k) => k.toLowerCase().includes(q))
    );
  }, [items, query]);

  // Adjust selectedIndex when list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // ─── Arrow & Enter Navigation ────────────────────────────────────────────────
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = filteredItems[selectedIndex];
      if (current) {
        current.onSelect();
        setOpen(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4 bg-black/75 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            className="w-full max-w-xl bg-[#0d0d26]/95 border border-purple-500/25 rounded-3xl shadow-2xl shadow-purple-950/60 overflow-hidden flex flex-col"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] bg-white/[0.01]">
              <Search size={18} className="text-purple-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search pages, tools, or type an action..."
                className="w-full bg-transparent text-[14px] text-white placeholder-gray-500 outline-none"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <kbd className="px-2 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-[10px] font-mono text-gray-400">
                  ESC
                </kbd>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/[0.05] text-gray-500 hover:text-white transition"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Quick shortcuts helper banner */}
            {showShortcutsHelp && (
              <div className="p-4 bg-purple-500/[0.08] border-b border-purple-500/20 text-[12px] text-purple-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle size={15} className="text-purple-400" />
                  <span>
                    <strong>Keyboard Shortcuts:</strong> Use <kbd className="px-1.5 py-0.5 rounded bg-black/40">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-black/40">↓</kbd> to navigate, <kbd className="px-1.5 py-0.5 rounded bg-black/40">Enter</kbd> to select.
                  </span>
                </div>
                <button
                  onClick={() => setShowShortcutsHelp(false)}
                  className="text-[10px] text-purple-300 hover:text-white underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Items List */}
            <div ref={listRef} className="max-h-[360px] overflow-y-auto p-2 space-y-1">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-[13px] text-gray-400 font-medium">No commands found for "{query}"</p>
                  <p className="text-[11px] text-gray-600">Try searching for "upload", "clips", "tone", or "dashboard"</p>
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        item.onSelect();
                        setOpen(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full text-left px-3.5 py-3 rounded-2xl transition-all flex items-center gap-3.5 group ${
                        isSelected
                          ? "bg-purple-600/20 text-white border border-purple-500/30 shadow-lg shadow-purple-950/20"
                          : "text-gray-400 hover:bg-white/[0.02] border border-transparent"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                          isSelected
                            ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                            : "bg-white/[0.04] text-gray-400 group-hover:text-white"
                        }`}
                      >
                        <Icon size={16} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-[13px] font-semibold truncate ${isSelected ? "text-white" : "text-gray-300"}`}>
                            {item.label}
                          </p>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-gray-500 font-mono">
                            {item.category}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-gray-500 truncate mt-0.5 leading-normal">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {item.shortcut && (
                        <kbd className="hidden sm:block px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-gray-500">
                          {item.shortcut}
                        </kbd>
                      )}

                      {isSelected && (
                        <CornerDownLeft size={14} className="text-purple-400 shrink-0 hidden sm:block animate-pulse" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer info */}
            <div className="px-5 py-2.5 bg-black/40 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-gray-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Command size={11} /> <strong>Ctrl+K</strong> to open anywhere
                </span>
                <span className="hidden sm:inline text-gray-700">·</span>
                <span className="hidden sm:inline">Press <strong>?</strong> for shortcuts</span>
              </div>
              <span className="text-purple-400/80 font-mono text-[10px]">StudioPulse Command</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
