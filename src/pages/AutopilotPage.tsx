/**
 * AutopilotPage — Premium Redesigned Automated Content Publishing Pipeline for StudioPulse.
 * Features:
 * - Card-style queue with auto-generated video thumbnails
 * - Custom thumbnail upload per video
 * - Rich published video detail panels (platform, timing, duration, URL)
 * - Permanent delete from All view
 * - Glassmorphic dark premium UI with micro-animations
 * - Full AI metadata edit panel
 * - Notifications & settings
 *
 * ⚠️ All existing logic, hooks, and handlers are preserved exactly as-is.
 */

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, X, Cloud, FileVideo, Sparkles, AlertTriangle, Play,
  Bell, Settings, Pause, Trash2, RefreshCw, Clock, EyeOff, Undo2,
  CheckCircle, XCircle, Loader2,
  Menu, Zap, Rocket, Eye, MessageSquare,
  Calendar, Edit3, Send, BellRing, Save, Hash, Film,
  Tag, Type, AlignLeft, Layers, ChevronDown, ChevronUp,
  ExternalLink, Timer, Globe, Info, ArrowRight,
  ImagePlus
} from "lucide-react";
import { useAutopilot, type QueueItem } from "@/hooks/useAutopilot";
import { extractVideoFrames, type ExtractedFrame } from "@/utils/extractVideoFrames";
import { selectBestThumbnail, fileToDataUrl } from "@/utils/generateThumbnail";
import { useSettings } from "@/context/SettingsContext";
import Sidebar from "@/components/layout/Sidebar";
import toast from "react-hot-toast";

// ─── Platform Icons ───────────────────────────────────────────────────────────

function YouTubeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M43.2 13.4a5 5 0 0 0-3.5-3.5C36.4 9 24 9 24 9s-12.4 0-15.7.9A5 5 0 0 0 4.8 13.4 52 52 0 0 0 3.9 24a52 52 0 0 0 .9 10.6 5 5 0 0 0 3.5 3.5c3.3.9 15.7.9 15.7.9s12.4 0 15.7-.9a5 5 0 0 0 3.5-3.5A52 52 0 0 0 44.1 24a52 52 0 0 0-.9-10.6Z" fill="#FF0000" />
      <path d="M19.8 30.4 31.2 24l-11.4-6.4v12.8Z" fill="#fff" />
    </svg>
  );
}

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs><radialGradient id="ig_ap2" cx="20%" cy="100%" r="120%"><stop offset="0%" stopColor="#fdf497" /><stop offset="45%" stopColor="#fd5949" /><stop offset="60%" stopColor="#d6249f" /><stop offset="90%" stopColor="#285AEB" /></radialGradient></defs>
      <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#ig_ap2)" />
      <circle cx="24" cy="24" r="9" stroke="#fff" strokeWidth="3" fill="none" />
      <circle cx="35" cy="13" r="2.5" fill="#fff" />
    </svg>
  );
}

function TikTokIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#000" />
      <path d="M33.5 14.5a7.5 7.5 0 0 1-5-2 7.5 7.5 0 0 1-2-5h-4.5v21a4.5 4.5 0 1 1-3-4.24V19.5a9 9 0 1 0 7.5 8.87V20a12 12 0 0 0 7 2.25V17.5a7.5 7.5 0 0 1-2-3z" fill="#00F2EA" />
    </svg>
  );
}

function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#1877F2" />
      <path d="M32 25l.8-5.2H27.8V16.7c0-1.4.7-2.8 2.9-2.8h2.3V9.4s-2.1-.4-4-.4c-4.1 0-6.8 2.5-6.8 7v4H17v5.2h5.2V39h6.4V25H32z" fill="#fff" />
    </svg>
  );
}

// ─── Status System ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; glow: string; icon: React.ReactNode }> = {
  pending:       { label: "Pending",     color: "text-slate-400",   bg: "bg-slate-500/10",   border: "border-slate-500/20",  glow: "", icon: <Clock size={11} /> },
  ai_processing: { label: "AI Analyzing", color: "text-sky-400",    bg: "bg-sky-500/10",     border: "border-sky-500/20",    glow: "shadow-sky-500/20", icon: <Loader2 size={11} className="animate-spin" /> },
  scheduled:     { label: "Scheduled",   color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",  glow: "shadow-amber-500/10", icon: <Calendar size={11} /> },
  publishing:    { label: "Publishing",  color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20", glow: "shadow-violet-500/20", icon: <Loader2 size={11} className="animate-spin" /> },
  published:     { label: "Published",   color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", glow: "shadow-emerald-500/10", icon: <CheckCircle size={11} /> },
  failed:        { label: "Failed",      color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/20",   glow: "shadow-rose-500/10", icon: <XCircle size={11} /> },
  cancelled:     { label: "Cancelled",   color: "text-gray-500",    bg: "bg-gray-600/10",    border: "border-gray-600/20",   glow: "", icon: <X size={11} /> },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase ${config.color} ${config.bg} border ${config.border} ${config.glow ? `shadow-sm ${config.glow}` : ""}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// SQLite datetime('now') returns UTC strings like "2026-08-08 14:00:00" without
// a timezone suffix. JavaScript's new Date() treats these as LOCAL time, causing
// a 5:30h offset on IST machines. Appending 'Z' tells JS it's UTC.
function parseUTCDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  // If it already has timezone info (Z, +, or T...+), leave it alone
  if (/[Z+]/.test(dateStr.slice(-6)) || dateStr.includes("T")) {
    return new Date(dateStr);
  }
  // Bare SQLite timestamp — treat as UTC
  return new Date(dateStr.replace(" ", "T") + "Z");
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - parseUTCDate(dateStr).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatScheduledDate(dateStr: string | null): string {
  if (!dateStr) return "Not scheduled";
  const date = parseUTCDate(dateStr);
  const diffMs = date.getTime() - Date.now();
  if (diffMs < 0) return "Overdue";
  if (diffMs < 3600000) return `In ${Math.round(diffMs / 60000)} min`;
  if (diffMs < 86400000) return `In ${Math.round(diffMs / 3600000)}h`;
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

function formatExactDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return parseUTCDate(dateStr).toLocaleString("en-IN", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", second: "2-digit",
    hour12: true, timeZone: "Asia/Kolkata",
  });
}

function computePublishDuration(scheduledAt: string | null, publishedAt: string | null): string {
  if (!scheduledAt || !publishedAt) return "—";
  const diffMs = parseUTCDate(publishedAt).getTime() - parseUTCDate(scheduledAt).getTime();
  if (diffMs < 0) return "Instant";
  if (diffMs < 60000) return `${Math.round(diffMs / 1000)}s`;
  if (diffMs < 3600000) return `${Math.round(diffMs / 60000)} min`;
  return `${Math.round(diffMs / 3600000)}h ${Math.round((diffMs % 3600000) / 60000)}m`;
}

const PlatformIcon = ({ platform, size = 16 }: { platform: string; size?: number }) => {
  switch (platform) {
    case "youtube": return <YouTubeIcon size={size} />;
    case "instagram": return <InstagramIcon size={size} />;
    case "tiktok": return <TikTokIcon size={size} />;
    case "facebook": return <FacebookIcon size={size} />;
    default: return <Layers size={size} className="text-gray-400" />;
  }
};

// ─── Thumbnail Placeholder ────────────────────────────────────────────────────

function ThumbnailPlaceholder({ fileName, className = "" }: { fileName: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-purple-900/40 to-indigo-900/30 ${className}`}>
      <div className="text-center">
        <FileVideo size={24} className="text-purple-400/60 mx-auto mb-1" />
        <p className="text-[8px] text-gray-500 truncate max-w-[80px] px-1">{fileName}</p>
      </div>
    </div>
  );
}

// ─── Video Type Options ───────────────────────────────────────────────────────

const VIDEO_TYPES = [
  { value: "music_video", label: "🎵 Music Video", categoryId: "10" },
  { value: "tutorial", label: "📚 Tutorial / How-To", categoryId: "27" },
  { value: "vlog", label: "📹 Vlog / Daily Life", categoryId: "22" },
  { value: "gaming", label: "🎮 Gaming", categoryId: "20" },
  { value: "entertainment", label: "🎭 Entertainment", categoryId: "24" },
  { value: "education", label: "🎓 Education", categoryId: "27" },
  { value: "sports", label: "⚽ Sports", categoryId: "17" },
  { value: "news", label: "📰 News & Politics", categoryId: "25" },
  { value: "tech", label: "💻 Science & Tech", categoryId: "28" },
  { value: "comedy", label: "😂 Comedy", categoryId: "23" },
  { value: "film", label: "🎬 Film & Animation", categoryId: "1" },
  { value: "travel", label: "✈️ Travel & Events", categoryId: "19" },
  { value: "pets", label: "🐾 Pets & Animals", categoryId: "15" },
  { value: "autos", label: "🚗 Autos & Vehicles", categoryId: "2" },
  { value: "podcast", label: "🎙️ Podcast / Talk Show", categoryId: "22" },
  { value: "short", label: "⚡ Short / Reel", categoryId: "22" },
  { value: "other", label: "📦 Other", categoryId: "22" },
];

function detectVideoType(categoryId: string): string {
  const match = VIDEO_TYPES.find(t => t.categoryId === categoryId);
  return match?.value || "other";
}

// ─── Edit Panel Component ─────────────────────────────────────────────────────

function EditPanel({ item, onSave, onClose }: {
  item: QueueItem;
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(item.title || "");
  const [description, setDescription] = useState(item.description || "");
  const [tags, setTags] = useState<string[]>(item.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [visibility, setVisibility] = useState(item.visibility || "public");
  const [scheduledAt, setScheduledAt] = useState(item.scheduledAt || "");
  const [videoType, setVideoType] = useState(() => detectVideoType(item.categoryId || "22"));
  const [editPlatforms, setEditPlatforms] = useState<string[]>(
    item.platforms && item.platforms.length > 0 ? item.platforms : [item.platform || "youtube"]
  );
  const [customThumbnail, setCustomThumbnail] = useState<string | null>(null);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<"main" | "platforms">("main");

  const aiMeta = item.aiMetadata as Record<string, unknown> | null;
  const platformOpts = (aiMeta?.platformOptimizations || {}) as Record<string, Record<string, unknown>>;
  const selectedType = VIDEO_TYPES.find(t => t.value === videoType);

  const handleThumbSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setCustomThumbnail(dataUrl);
      toast.success("Custom thumbnail attached!");
    } catch {
      toast.error("Failed to load thumbnail image");
    }
  };

  const handleAddTag = () => {
    const newTag = tagInput.trim().replace(/^#/, "");
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const catId = VIDEO_TYPES.find(t => t.value === videoType)?.categoryId || "22";
      await onSave({
        title,
        description,
        tags,
        visibility,
        scheduledAt,
        categoryId: catId,
        platforms: editPlatforms,
        ...(customThumbnail ? { customThumbnail } : {}),
      });
      toast.success("Changes saved!");
    } catch {
      toast.error("Save failed");
    }
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-gradient-to-b from-[#12122a] to-[#0a0a18] border border-white/[0.08] shadow-2xl shadow-purple-900/20 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0 bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600/30 to-pink-600/20 flex items-center justify-center border border-purple-500/20">
              <Edit3 size={15} className="text-purple-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Edit Video Metadata</h2>
              <p className="text-[10px] text-gray-500">{item.fileName} • {formatFileSize(item.fileSize)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {item.aiContentSummary && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[9px] text-purple-400 font-medium">
                <Sparkles size={9} /> AI Generated
              </span>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition">
              <X size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 px-6 py-2 border-b border-white/[0.05] shrink-0">
          <button
            onClick={() => setActiveSection("main")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeSection === "main" ? "bg-purple-500/15 text-purple-300 border border-purple-500/20" : "text-gray-500 hover:text-gray-300 border border-transparent"}`}
          >
            <Type size={12} className="inline mr-1" />Main Metadata
          </button>
          <button
            onClick={() => setActiveSection("platforms")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeSection === "platforms" ? "bg-purple-500/15 text-purple-300 border border-purple-500/20" : "text-gray-500 hover:text-gray-300 border border-transparent"}`}
          >
            <Layers size={12} className="inline mr-1" />Platform Optimizations
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* AI Content Summary */}
          {item.aiContentSummary && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-500/[0.06] to-pink-500/[0.03] border border-purple-500/15">
              <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Sparkles size={10} /> AI Analysis Summary
              </p>
              <p className="text-xs text-gray-300 leading-relaxed">{item.aiContentSummary}</p>
            </div>
          )}

          {activeSection === "main" && (
            <>
              {/* Custom Thumbnail */}
              <div>
                <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <ImagePlus size={11} /> Thumbnail
                </label>
                <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="w-28 sm:w-36 h-20 rounded-lg overflow-hidden bg-black/40 relative shrink-0 border border-white/10 group/editthumb">
                    {customThumbnail ? (
                      <img src={customThumbnail} alt="Custom Thumbnail" className="w-full h-full object-cover" />
                    ) : item.thumbnailPath ? (
                      <img src={`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/autopilot/frames/${item.thumbnailPath}`} alt={item.fileName} className="w-full h-full object-cover" />
                    ) : (
                      <ThumbnailPlaceholder fileName={item.fileName} className="w-full h-full" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/editthumb:opacity-100 transition flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => thumbInputRef.current?.click()}
                        className="px-2 py-1 rounded bg-purple-600/90 text-[10px] text-white font-semibold shadow-md"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-white">
                      {customThumbnail ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle size={12} /> Custom Thumbnail Attached
                        </span>
                      ) : item.customThumbnailPath || (item.thumbnailPath && item.thumbnailPath.includes("custom")) ? (
                        <span className="text-emerald-400 font-semibold">Active Custom Thumbnail</span>
                      ) : (
                        "Auto-Generated Best Frame"
                      )}
                    </p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Attach a custom image (JPG/PNG). It will be auto-compressed for YouTube.</p>
                    <button
                      type="button"
                      onClick={() => thumbInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-medium text-purple-300 transition"
                    >
                      <ImagePlus size={12} /> {customThumbnail ? "Replace Image" : "Upload Custom Thumbnail"}
                    </button>
                    <input ref={thumbInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleThumbSelect} className="hidden" />
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Type size={11} /> Title
                </label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-purple-500/40 focus:bg-white/[0.06] transition placeholder-gray-600"
                  placeholder="Enter video title..."
                  maxLength={100}
                />
                <p className="text-[9px] text-gray-600 mt-1 text-right">{title.length}/100 characters</p>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <AlignLeft size={11} /> Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500/40 focus:bg-white/[0.06] transition resize-none placeholder-gray-600 leading-relaxed"
                  placeholder="Enter video description..."
                  rows={6}
                  maxLength={5000}
                />
                <p className="text-[9px] text-gray-600 mt-1 text-right">{description.length}/5000 characters</p>
              </div>

              {/* Tags */}
              <div>
                <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Tag size={11} /> Tags ({tags.length}/25)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-gray-300">
                      <Hash size={9} className="text-gray-500" />{tag}
                      <button onClick={() => handleRemoveTag(tag)} className="ml-0.5 hover:text-red-400 transition">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-purple-500/40 placeholder-gray-600"
                    placeholder="Add tag (press Enter)..."
                  />
                  <button onClick={handleAddTag} className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs text-gray-400 transition">
                    Add
                  </button>
                </div>
              </div>

              {/* Target Platforms */}
              <div>
                <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Globe size={11} /> Target Platforms
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "youtube",   label: "YouTube",   color: "from-red-500/20 border-red-500/30 text-red-300" },
                    { id: "instagram", label: "Instagram", color: "from-pink-500/20 border-pink-500/30 text-pink-300" },
                    { id: "facebook",  label: "Facebook",  color: "from-blue-500/20 border-blue-500/30 text-blue-300" },
                    { id: "tiktok",    label: "TikTok",    color: "from-slate-400/20 border-slate-400/30 text-slate-300" },
                  ].map(p => {
                    const active = editPlatforms.includes(p.id);
                    return (
                      <button key={p.id}
                        onClick={() => setEditPlatforms(prev =>
                          prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                        )}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          active
                            ? `bg-gradient-to-r ${p.color} shadow-sm`
                            : "bg-white/[0.02] border-white/[0.06] text-gray-500 hover:bg-white/[0.04]"
                        }`}
                      >
                        <PlatformIcon platform={p.id} size={12} />
                        {p.label}
                        {active && <CheckCircle size={10} className="ml-0.5 opacity-80" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Video Type */}
              <div>
                <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Film size={11} /> Video Type
                  {selectedType && <span className="text-purple-400/70 normal-case tracking-normal font-normal">— AI detected</span>}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {VIDEO_TYPES.map(vt => (
                    <button
                      key={vt.value}
                      onClick={() => setVideoType(vt.value)}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-medium text-left transition-all border ${
                        videoType === vt.value
                          ? "bg-purple-500/15 text-purple-200 border-purple-500/30 shadow-sm shadow-purple-500/10"
                          : "bg-white/[0.02] text-gray-500 border-white/[0.05] hover:bg-white/[0.04] hover:text-gray-300"
                      }`}
                    >
                      {vt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visibility + Schedule */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5 block">Visibility</label>
                  <select
                    value={visibility}
                    onChange={e => setVisibility(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500/40"
                  >
                    <option value="public">🌐 Public</option>
                    <option value="unlisted">🔗 Unlisted</option>
                    <option value="private">🔒 Private</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5 block">Schedule</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt ? new Date(scheduledAt).toISOString().slice(0, 16) : ""}
                    onChange={e => setScheduledAt(new Date(e.target.value).toISOString())}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500/40"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5 block">Category</label>
                  <div className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-gray-300">
                    {selectedType?.label || "Other"}
                  </div>
                </div>
              </div>

              {/* SEO Score */}
              {aiMeta && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-500/[0.06] to-emerald-600/[0.02] border border-emerald-500/15">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">SEO Score</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-0.5">{(aiMeta.seoScore as number) || "—"}<span className="text-sm text-gray-500">/100</span></p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-500/[0.06] to-blue-600/[0.02] border border-blue-500/15">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Est. CTR</p>
                    <p className="text-2xl font-bold text-blue-400 mt-0.5">{(aiMeta.estimatedCTR as string) || "—"}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {activeSection === "platforms" && (
            <div className="space-y-4">
              {platformOpts.youtube && (
                <PlatformCard name="YouTube" icon={<YouTubeIcon size={18} />} color="from-red-500/10 to-red-600/5" borderColor="border-red-500/15" data={platformOpts.youtube} />
              )}
              {platformOpts.instagram && (
                <PlatformCard name="Instagram" icon={<InstagramIcon size={18} />} color="from-pink-500/10 to-purple-600/5" borderColor="border-pink-500/15" data={platformOpts.instagram} />
              )}
              {platformOpts.tiktok && (
                <PlatformCard name="TikTok" icon={<TikTokIcon size={18} />} color="from-cyan-500/10 to-cyan-600/5" borderColor="border-cyan-500/15" data={platformOpts.tiktok} />
              )}
              {platformOpts.facebook && (
                <PlatformCard name="Facebook" icon={<FacebookIcon size={18} />} color="from-blue-500/10 to-blue-600/5" borderColor="border-blue-500/15" data={platformOpts.facebook} />
              )}
              {!platformOpts.youtube && !platformOpts.instagram && !platformOpts.tiktok && !platformOpts.facebook && (
                <div className="py-12 text-center text-gray-500 text-sm">
                  <Layers size={24} className="mx-auto mb-2 text-gray-600" />
                  Platform optimizations will appear after AI processing completes.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06] shrink-0 bg-white/[0.01]">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-sm text-gray-400 transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-sm font-semibold text-white transition shadow-lg shadow-purple-500/20"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Platform Card ────────────────────────────────────────────────────────────

function PlatformCard({ name, icon, color, borderColor, data }: {
  name: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  data: Record<string, unknown>;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={`rounded-xl bg-gradient-to-br ${color} border ${borderColor} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-white">{name}</span>
        </div>
        {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {data.title && (
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Title</p>
              <p className="text-xs text-gray-200">{data.title as string}</p>
            </div>
          )}
          {data.description && (
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Description</p>
              <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed line-clamp-4">{data.description as string}</p>
            </div>
          )}
          {data.caption && (
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Caption</p>
              <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed">{data.caption as string}</p>
            </div>
          )}
          {data.post && (
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Post</p>
              <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed">{data.post as string}</p>
            </div>
          )}
          {Array.isArray(data.hashtags) && (data.hashtags as string[]).length > 0 && (
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Hashtags</p>
              <div className="flex flex-wrap gap-1">
                {(data.hashtags as string[]).map((h: string, i: number) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] text-gray-400">#{h}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Published Detail Panel ───────────────────────────────────────────────────

function PublishedDetailPanel({ item }: { item: QueueItem }) {
  const publishDuration = computePublishDuration(item.scheduledAt, item.publishedAt);

  return (
    <div className="space-y-3">
      {/* Publishing Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/[0.06] to-emerald-600/[0.02] border border-emerald-500/15">
          <div className="flex items-center gap-1.5 mb-1">
            <Globe size={10} className="text-emerald-400" />
            <p className="text-[9px] text-gray-500 uppercase tracking-wider">Platform</p>
          </div>
          <div className="flex items-center gap-1.5">
            <PlatformIcon platform={item.platform} size={14} />
            <span className="text-xs font-semibold text-emerald-300 capitalize">{item.platform}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/[0.06] to-blue-600/[0.02] border border-blue-500/15">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar size={10} className="text-blue-400" />
            <p className="text-[9px] text-gray-500 uppercase tracking-wider">Published At</p>
          </div>
          <p className="text-[11px] font-medium text-blue-300">{formatExactDate(item.publishedAt)}</p>
        </div>

        <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/[0.06] to-violet-600/[0.02] border border-violet-500/15">
          <div className="flex items-center gap-1.5 mb-1">
            <Timer size={10} className="text-violet-400" />
            <p className="text-[9px] text-gray-500 uppercase tracking-wider">Publish Time</p>
          </div>
          <p className="text-xs font-semibold text-violet-300">{publishDuration}</p>
        </div>

        <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/[0.06] to-amber-600/[0.02] border border-amber-500/15">
          <div className="flex items-center gap-1.5 mb-1">
            <Info size={10} className="text-amber-400" />
            <p className="text-[9px] text-gray-500 uppercase tracking-wider">Video ID</p>
          </div>
          <p className="text-[11px] font-mono text-amber-300 truncate">{item.platformVideoId || "—"}</p>
        </div>
      </div>

      {/* YouTube Link */}
      {item.platformUrl && (
        <a
          href={item.platformUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500/[0.06] to-red-600/[0.03] border border-red-500/15 hover:border-red-500/30 transition group"
        >
          <ExternalLink size={13} className="text-red-400 group-hover:text-red-300" />
          <span className="text-xs text-red-300 group-hover:text-red-200 font-medium truncate">{item.platformUrl}</span>
          <ArrowRight size={11} className="text-red-400/60 ml-auto group-hover:translate-x-0.5 transition-transform" />
        </a>
      )}

      {/* AI Summary & Tags */}
      {item.aiContentSummary && (
        <div className="p-3 rounded-xl bg-purple-500/[0.04] border border-purple-500/10">
          <p className="text-[9px] text-purple-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1"><Sparkles size={9} />AI Content Analysis</p>
          <p className="text-xs text-gray-300 leading-relaxed">{item.aiContentSummary}</p>
        </div>
      )}

      {item.tags && item.tags.length > 0 && (
        <div>
          <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Tags ({item.tags.length})</p>
          <div className="flex flex-wrap gap-1">
            {item.tags.map((tag, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[10px] text-gray-400">#{tag}</span>
            ))}
          </div>
        </div>
      )}

      {/* File Info */}
      <div className="flex flex-wrap gap-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><FileVideo size={10} />{item.fileName}</span>
        <span>{formatFileSize(item.fileSize)}</span>
        {item.videoDurationSeconds > 0 && <span>{formatDuration(item.videoDurationSeconds)}</span>}
        {item.aspectRatio && <span>{item.aspectRatio}</span>}
      </div>
    </div>
  );
}

// ─── Queue Item Expanded Details (Non-Published) ──────────────────────────────

function ExpandedItemDetails({ item, onEdit }: { item: QueueItem; onEdit: () => void }) {
  return (
    <div className="space-y-3">
      {item.aiContentSummary && (
        <div className="p-3 rounded-xl bg-purple-500/[0.04] border border-purple-500/10">
          <p className="text-[9px] text-purple-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1"><Sparkles size={9} />AI Content Analysis</p>
          <p className="text-xs text-gray-300 leading-relaxed">{item.aiContentSummary}</p>
        </div>
      )}

      {item.title && item.title !== item.fileName && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">AI Title</p>
            <p className="text-xs text-gray-200 font-medium">{item.title}</p>
          </div>
          {item.tags.length > 0 && (
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">AI Tags ({item.tags.length})</p>
              <div className="flex flex-wrap gap-1">
                {item.tags.slice(0, 12).map((tag, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[9px] text-gray-400">#{tag}</span>
                ))}
                {item.tags.length > 12 && <span className="text-[9px] text-gray-600">+{item.tags.length - 12} more</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {item.description && (
        <div>
          <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">AI Description</p>
          <p className="text-[11px] text-gray-400 leading-relaxed whitespace-pre-line line-clamp-4">{item.description}</p>
        </div>
      )}

      {item.userContext && (
        <div className="p-2.5 rounded-lg bg-blue-500/[0.04] border border-blue-500/10">
          <p className="text-[9px] text-blue-400 font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1"><MessageSquare size={9} />User Context</p>
          <p className="text-xs text-gray-300">{item.userContext}</p>
        </div>
      )}

      {item.publishError && (
        <div className="p-2.5 rounded-lg bg-red-500/[0.04] border border-red-500/10">
          <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertTriangle size={10} />{item.publishError}</p>
        </div>
      )}

      <button onClick={onEdit} className="w-full py-2.5 rounded-xl bg-purple-500/[0.06] hover:bg-purple-500/[0.12] border border-purple-500/15 text-xs font-medium text-purple-300 transition flex items-center justify-center gap-1.5">
        <Edit3 size={12} /> Edit Full Metadata & Platform Optimizations
      </button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AutopilotPage() {
  const { user } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    queue, stats, settings, notifications, unreadCount, behaviorProfile,
    isLoading, isUploading, uploadProgress, isGeneratingMetadata,
    bulkUpload, generateMetadata, updateItem, cancelItem, deleteItem, clearQueue,
    publishNow, pause, resume, updateSettings, markNotificationsRead, refresh
  } = useAutopilot();

  const [activeTab, setActiveTab] = useState<"queue" | "upload" | "notifications" | "settings">("queue");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileContexts, setFileContexts] = useState<string[]>([]);
  const [globalContext, setGlobalContext] = useState("");
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [editingItem, setEditingItem] = useState<QueueItem | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);

  // Multi-platform selection — default from behavior profile (updated once loaded)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["youtube"]);
  const [selectedVideoType, setSelectedVideoType] = useState<string>("other");

  // Sync platform defaults from behavior profile once loaded
  useEffect(() => {
    if (behaviorProfile) {
      if (behaviorProfile.suggestedPlatforms.length > 0) {
        setSelectedPlatforms([behaviorProfile.suggestedPlatforms[0]]);
      }
      if (behaviorProfile.suggestedVideoType) {
        setSelectedVideoType(behaviorProfile.suggestedVideoType);
      }
    }
  }, [behaviorProfile]);

  // Thumbnail state: auto-generated thumbnails per file and custom thumbnail overrides
  const [fileThumbnails, setFileThumbnails] = useState<Record<number, string>>({});
  const [customThumbnails, setCustomThumbnails] = useState<Record<number, string>>({});

  // Hidden-from-All: items the user has dismissed from the "All" view only.
  // Persisted in localStorage so it survives page reloads.
  const [hiddenFromAll, setHiddenFromAll] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("autopilot_hidden_from_all");
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
    } catch { return new Set(); }
  });

  // Persist hiddenFromAll to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("autopilot_hidden_from_all", JSON.stringify([...hiddenFromAll]));
    } catch { /* best-effort */ }
  }, [hiddenFromAll]);

  const hideFromAll = useCallback((itemId: string) => {
    setHiddenFromAll(prev => new Set(prev).add(itemId));
    toast.success("Hidden from All view");
  }, []);

  const unhideAll = useCallback(() => {
    setHiddenFromAll(new Set());
    toast.success("All hidden videos restored");
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const filteredQueue = useMemo(() => {
    if (statusFilter === "all") {
      // "All" view: exclude items the user has soft-hidden
      return queue.filter(item => !hiddenFromAll.has(item.id));
    }
    // Status-specific views always show everything for that status
    return queue.filter(item => item.status === statusFilter);
  }, [queue, statusFilter, hiddenFromAll]);

  // ─── Auto-extract thumbnails when files are added ───
  useEffect(() => {
    selectedFiles.forEach((file, idx) => {
      if (!fileThumbnails[idx] && !customThumbnails[idx]) {
        extractVideoFrames(file).then(frames => {
          const best = selectBestThumbnail(frames);
          if (best) {
            setFileThumbnails(prev => ({ ...prev, [idx]: best }));
          }
        }).catch(() => {/* best-effort */});
      }
    });
  }, [selectedFiles]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Drag & Drop ───
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type.startsWith("video/") || f.name.match(/\.(mp4|mov|avi|mkv|webm)$/i)
    );
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
      setFileContexts(prev => [...prev, ...files.map(() => "")]);
      setActiveTab("upload");
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
      setFileContexts(prev => [...prev, ...files.map(() => "")]);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFileContexts(prev => prev.filter((_, i) => i !== index));
    setFileThumbnails(prev => {
      const next = { ...prev };
      delete next[index];
      // Re-index remaining
      const reindexed: Record<number, string> = {};
      Object.entries(next).forEach(([k, v]) => {
        const ki = parseInt(k);
        reindexed[ki > index ? ki - 1 : ki] = v;
      });
      return reindexed;
    });
    setCustomThumbnails(prev => {
      const next = { ...prev };
      delete next[index];
      const reindexed: Record<number, string> = {};
      Object.entries(next).forEach(([k, v]) => {
        const ki = parseInt(k);
        reindexed[ki > index ? ki - 1 : ki] = v;
      });
      return reindexed;
    });
  }, []);

  const handleCustomThumbnail = useCallback(async (index: number, file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      setCustomThumbnails(prev => ({ ...prev, [index]: dataUrl }));
      toast.success("Custom thumbnail set!");
    } catch {
      toast.error("Failed to load thumbnail image");
    }
  }, []);

  // ─── Upload & Process ───
  const handleBulkUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    try {
      setIsExtractingFrames(true);
      toast.loading("Extracting visual frames per video for AI analysis...", { id: "frame-extract" });

      const videoFramesMap: Record<number, { base64: string; mimeType: string }[]> = {};
      for (let i = 0; i < selectedFiles.length; i++) {
        try {
          const frames = await extractVideoFrames(selectedFiles[i]);
          if (frames.length > 0) {
            videoFramesMap[i] = frames;
          }
        } catch {
          /* continue best-effort */
        }
      }

      toast.success("Frames extracted! Starting video upload...", { id: "frame-extract" });
      setIsExtractingFrames(false);

      const result = await bulkUpload(
        selectedFiles,
        fileContexts,
        globalContext,
        selectedPlatforms[0] || "youtube",
        videoFramesMap,
        selectedPlatforms,
        selectedVideoType,
        customThumbnails
      );
      toast.success(`${result.videoCount} video(s) uploaded to queue!`);

      await generateMetadata(result.batchId);
      toast.success("AI is analyzing frames and generating metadata...");

      setSelectedFiles([]);
      setFileContexts([]);
      setGlobalContext("");
      setFileThumbnails({});
      setCustomThumbnails({});
      setActiveTab("queue");
    } catch (err) {
      setIsExtractingFrames(false);
      toast.error(err instanceof Error ? err.message : "Upload failed", { id: "frame-extract" });
    }
  }, [selectedFiles, fileContexts, globalContext, selectedPlatforms, selectedVideoType, customThumbnails, bulkUpload, generateMetadata]);

  const handlePublishNow = useCallback(async (itemId: string) => {
    try {
      await publishNow(itemId);
      toast.success("🚀 Triggered immediate upload & publish!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    }
  }, [publishNow]);

  const handlePublishAllPending = useCallback(async () => {
    const readyItems = queue.filter(item => ["pending", "scheduled"].includes(item.status));
    if (readyItems.length === 0) {
      toast.error("No pending or scheduled videos to publish");
      return;
    }
    toast.loading(`Starting immediate publish for ${readyItems.length} video(s)...`, { id: "bulk-publish" });
    let count = 0;
    for (const item of readyItems) {
      try {
        await publishNow(item.id);
        count++;
      } catch { /* continue */ }
    }
    toast.success(`Triggered immediate publishing for ${count} video(s)!`, { id: "bulk-publish" });
  }, [queue, publishNow]);

  const handleDelete = useCallback(async (itemId: string) => {
    try {
      await deleteItem(itemId);
      toast.success("Video permanently removed from queue");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }, [deleteItem]);

  const handleClearFailedOrCancelled = useCallback(async () => {
    try {
      const res = await clearQueue(["failed", "cancelled"]);
      toast.success(`Cleared ${res.clearedCount || 0} item(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Clear failed");
    }
  }, [clearQueue]);

  const handleEditSave = useCallback(async (data: Record<string, unknown>) => {
    if (!editingItem) return;
    await updateItem({ itemId: editingItem.id, data: data as any });
    setEditingItem(null);
  }, [updateItem, editingItem]);

  const handlePauseResume = useCallback(async () => {
    try {
      if (stats?.isPaused) { await resume(); toast.success("Queue resumed!"); }
      else { await pause(); toast.success("Queue paused"); }
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  }, [stats, pause, resume]);

  return (
    <div className="flex h-screen bg-[#07070f] text-white overflow-hidden">
      {/* Ambient Glow Effects */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/[0.04] blur-[150px] pointer-events-none rounded-full" />
      <div className="fixed bottom-0 right-1/3 w-[400px] h-[400px] bg-indigo-600/[0.04] blur-[130px] pointer-events-none rounded-full" />

      <Sidebar activePage="/autopilot" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-y-auto relative">
        {/* ════════ HEADER ════════ */}
        <div className="sticky top-0 z-30 backdrop-blur-2xl bg-[#07070f]/85 border-b border-white/[0.04]">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-white/5 rounded-lg transition">
                <Menu size={20} />
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Rocket size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Autopilot Queue</h1>
                <p className="text-[10px] text-gray-500 -mt-0.5">AI-powered bulk upload → auto-publish pipeline</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(stats?.pending || 0) + (stats?.scheduled || 0) > 0 && (
                <button
                  onClick={handlePublishAllPending}
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 hover:from-emerald-600/30 hover:to-emerald-500/20 text-emerald-400 border border-emerald-500/25 transition shadow-lg shadow-emerald-500/10"
                  title="Publish all pending/scheduled videos immediately"
                >
                  <Send size={12} /> Instant Publish All ({(stats?.pending || 0) + (stats?.scheduled || 0)})
                </button>
              )}
              <button onClick={() => setShowNotifPanel(!showNotifPanel)} className="relative p-2 hover:bg-white/5 rounded-lg transition">
                <Bell size={17} className="text-gray-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[9px] flex items-center justify-center font-bold animate-pulse">{unreadCount > 9 ? "9+" : unreadCount}</span>
                )}
              </button>
              <button onClick={handlePauseResume}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${stats?.isPaused ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"}`}
              >
                {stats?.isPaused ? <><Play size={12} />Resume</> : <><Pause size={12} />Pause</>}
              </button>
              <button onClick={refresh} className="p-2 hover:bg-white/5 rounded-lg transition">
                <RefreshCw size={15} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-4 sm:px-6 pb-2.5">
            {([
              { key: "queue" as const, label: "Queue", icon: Zap, count: stats?.total },
              { key: "upload" as const, label: "Bulk Upload", icon: Upload, count: selectedFiles.length || undefined },
              { key: "notifications" as const, label: "Activity", icon: BellRing, count: unreadCount || undefined },
              { key: "settings" as const, label: "Settings", icon: Settings },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === tab.key
                  ? "bg-gradient-to-r from-purple-500/15 to-pink-500/10 text-purple-300 border border-purple-500/20 shadow-sm shadow-purple-500/10"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] border border-transparent"}`}
              >
                <tab.icon size={13} />{tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-0.5 px-1.5 rounded-full bg-white/10 text-[9px] font-bold">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notification Dropdown */}
        <AnimatePresence>
          {showNotifPanel && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="fixed right-4 top-20 z-50 w-[380px] max-h-[480px] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0d0d1a]/98 backdrop-blur-2xl shadow-2xl shadow-black/40"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] sticky top-0 bg-[#0d0d1a]">
                <span className="text-sm font-semibold">Notifications</span>
                <button onClick={() => { markNotificationsRead(); setShowNotifPanel(false); }} className="text-[10px] text-purple-400 hover:text-purple-300 transition">Mark all read</button>
              </div>
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No notifications yet</div>
              ) : (
                notifications.slice(0, 25).map(n => (
                  <div key={n.id} className={`px-4 py-3 border-b border-white/[0.03] transition ${!n.isRead ? "bg-purple-500/[0.03]" : ""}`}>
                    <p className="text-[13px] font-medium text-white">{n.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 whitespace-pre-line leading-relaxed line-clamp-3">{n.message}</p>
                    <span className="text-[9px] text-gray-600 mt-1 block">{timeAgo(n.createdAt)}</span>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Panel Modal */}
        <AnimatePresence>
          {editingItem && (
            <EditPanel item={editingItem} onSave={handleEditSave} onClose={() => setEditingItem(null)} />
          )}
        </AnimatePresence>

        <div className="p-4 sm:p-6 space-y-5">
          {/* ════════ STATS DASHBOARD ════════ */}
          {stats && (
            <div className="space-y-4">
              {/* ── Workflow Steps ── */}
              <div className="hidden sm:grid grid-cols-5 gap-2">
                {[
                  { step: 1, label: "Upload", desc: "Add videos", count: stats.pending, color: "from-slate-500", iconColor: "text-slate-300", icon: <Upload size={16} /> },
                  { step: 2, label: "AI Analysis", desc: "Generating metadata", count: stats.aiProcessing, color: "from-sky-500", iconColor: "text-sky-300", icon: <Sparkles size={16} /> },
                  { step: 3, label: "Schedule", desc: "Queued for publish", count: stats.scheduled, color: "from-amber-500", iconColor: "text-amber-300", icon: <Calendar size={16} /> },
                  { step: 4, label: "Publish", desc: "Uploading to platform", count: stats.publishing, color: "from-violet-500", iconColor: "text-violet-300", icon: <Send size={16} /> },
                  { step: 5, label: "Published", desc: "Live on platform", count: stats.published, color: "from-emerald-500", iconColor: "text-emerald-300", icon: <CheckCircle size={16} /> },
                ].map((s, i) => {
                  const isActive = s.count > 0;
                  return (
                    <div key={s.label} className="relative">
                      {/* Connector line */}
                      {i < 4 && (
                        <div className="absolute top-[22px] -right-2 w-4 h-[2px] bg-gradient-to-r from-white/[0.06] to-transparent z-10" />
                      )}
                      <motion.div
                        whileHover={{ y: -2 }}
                        className={`relative rounded-2xl p-3.5 border transition-all cursor-default overflow-hidden ${
                          isActive
                            ? `bg-gradient-to-br ${s.color}/[0.12] to-transparent border-white/[0.10] shadow-lg`
                            : "bg-white/[0.015] border-white/[0.04]"
                        }`}
                      >
                        {/* Step number */}
                        <div className={`absolute top-2 right-2.5 text-[9px] font-black uppercase tracking-widest ${isActive ? "text-white/20" : "text-white/[0.04]"}`}>
                          0{s.step}
                        </div>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${isActive ? `bg-gradient-to-br ${s.color}/30 to-white/5` : "bg-white/[0.03]"}`}>
                          <span className={isActive ? s.iconColor : "text-gray-600"}>{s.icon}</span>
                        </div>
                        <p className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? "text-white" : "text-gray-600"}`}>{s.label}</p>
                        <p className={`text-[9px] mt-0.5 ${isActive ? "text-gray-400" : "text-gray-700"}`}>{s.desc}</p>
                        {isActive && (
                          <div className={`mt-2 text-2xl font-black ${s.iconColor}`}>{s.count}</div>
                        )}
                      </motion.div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile: compact row */}
              <div className="sm:hidden grid grid-cols-5 gap-1">
                {[
                  { label: "Upload", count: stats.pending, color: "text-slate-400" },
                  { label: "AI", count: stats.aiProcessing, color: "text-sky-400" },
                  { label: "Sched", count: stats.scheduled, color: "text-amber-400" },
                  { label: "Pub", count: stats.publishing, color: "text-violet-400" },
                  { label: "Done", count: stats.published, color: "text-emerald-400" },
                ].map(s => (
                  <div key={s.label} className={`text-center py-2 rounded-xl ${s.count > 0 ? "bg-white/[0.04]" : "bg-white/[0.01]"}`}>
                    <p className={`text-lg font-black ${s.count > 0 ? s.color : "text-gray-700"}`}>{s.count}</p>
                    <p className="text-[8px] text-gray-500 uppercase tracking-widest">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Total + Failed summary */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <Layers size={12} className="text-purple-400/60" />
                  <span className="text-[11px] text-gray-400">Total: <strong className="text-purple-300">{stats.total}</strong></span>
                </div>
                {stats.failed > 0 && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/[0.06] border border-rose-500/15">
                    <XCircle size={12} className="text-rose-400/60" />
                    <span className="text-[11px] text-gray-400">Failed: <strong className="text-rose-300">{stats.failed}</strong></span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Next Publish Banner */}
          {stats?.nextPublishAt && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/[0.06] to-orange-500/[0.02] border border-amber-500/15">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Clock size={14} className="text-amber-400" />
              </div>
              <span className="text-xs text-amber-300/90">Next auto-publish: <strong>{formatScheduledDate(stats.nextPublishAt)}</strong></span>
              {stats.isPaused && <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-bold uppercase">Paused</span>}
            </div>
          )}

          {/* ════════ QUEUE TAB — Card-Style ════════ */}
          {activeTab === "queue" && (
            <div className="space-y-4">
              {/* Filters & Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {["all", "pending", "ai_processing", "scheduled", "publishing", "published", "failed"].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all ${statusFilter === s
                        ? "bg-gradient-to-r from-purple-500/15 to-pink-500/10 text-purple-300 border border-purple-500/25 shadow-sm shadow-purple-500/10"
                        : "bg-white/[0.02] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] border border-transparent"}`}
                    >
                      {s === "all" ? "All" : STATUS_CONFIG[s]?.label || s}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {/* Show hidden count + restore button when in All view */}
                  {statusFilter === "all" && hiddenFromAll.size > 0 && (
                    <button
                      onClick={unhideAll}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-medium transition"
                    >
                      <Undo2 size={11} /> Show {hiddenFromAll.size} Hidden
                    </button>
                  )}

                  {(stats?.failed || 0) + (stats?.cancelled || 0) > 0 && (
                    <button
                      onClick={handleClearFailedOrCancelled}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition"
                    >
                      <Trash2 size={12} /> Clear Failed & Cancelled ({(stats?.failed || 0) + (stats?.cancelled || 0)})
                    </button>
                  )}
                </div>
              </div>

              {/* Empty State */}
              {filteredQueue.length === 0 && !isLoading && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/15 to-pink-500/10 flex items-center justify-center mb-5 shadow-lg shadow-purple-500/10 border border-purple-500/10">
                    <Rocket size={32} className="text-purple-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-300">No Videos in Queue</h3>
                  <p className="text-sm text-gray-500 mt-1.5 max-w-sm leading-relaxed">Upload videos and let AI generate optimized titles, descriptions, tags, and auto-publish them on schedule.</p>
                  <button onClick={() => setActiveTab("upload")} className="mt-5 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-semibold transition shadow-lg shadow-purple-500/20">
                    <Upload size={14} /> Bulk Upload Videos
                  </button>
                </motion.div>
              )}

              {/* Queue Cards Grid */}
              <div className="grid gap-3">
                <AnimatePresence>
                  {filteredQueue.map((item, idx) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }}
                      transition={{ delay: idx * 0.02 }}
                      className="group rounded-2xl bg-gradient-to-r from-[#0e0e20]/90 to-[#0c0c1a]/90 border border-white/[0.05] hover:border-white/[0.10] transition-all duration-300 overflow-hidden hover:shadow-lg hover:shadow-purple-900/10"
                    >
                      {/* Main Row with Thumbnail */}
                      <div className="flex items-stretch">
                        {/* Thumbnail */}
                        <div className="w-[120px] sm:w-[160px] shrink-0 relative bg-black/20 overflow-hidden">
                          {item.thumbnailPath ? (
                            <img src={`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/autopilot/frames/${item.thumbnailPath}`} alt={item.fileName} className="w-full h-full object-cover" />
                          ) : (
                            <ThumbnailPlaceholder fileName={item.fileName} className="w-full h-full min-h-[90px]" />
                          )}
                          {/* Platform Badges Overlay */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1">
                            {(item.platforms && item.platforms.length > 0 ? item.platforms : [item.platform]).map(p => (
                              <div key={p} className="w-6 h-6 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                <PlatformIcon platform={p} size={13} />
                              </div>
                            ))}
                          </div>
                          {/* Custom Thumbnail Badge */}
                          {(item.customThumbnailPath || (item.thumbnailPath && item.thumbnailPath.includes("custom"))) && (
                            <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-emerald-500/80 backdrop-blur-sm text-[8px] font-bold text-white uppercase tracking-wider">
                              Custom
                            </div>
                          )}
                          {/* Duration Overlay */}
                          {item.videoDurationSeconds > 0 && (
                            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-medium text-white">
                              {formatDuration(item.videoDurationSeconds)}
                            </div>
                          )}
                          {/* Queue Number */}
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-[9px] font-bold text-gray-300">
                            {idx + 1}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
                          {/* Top Row: Title + Status */}
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <p className="text-sm font-semibold text-white truncate leading-snug">{item.title || item.fileName}</p>
                              <StatusBadge status={item.status} />
                            </div>

                            {/* Description Preview */}
                            {item.description && (
                              <p className="text-[11px] text-gray-500 line-clamp-1 mb-1.5 leading-relaxed">{item.description}</p>
                            )}

                            {/* Meta Info */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] text-gray-600">{formatFileSize(item.fileSize)}</span>
                              {item.aspectRatio && <span className="text-[10px] text-gray-600">• {item.aspectRatio}</span>}
                              {item.userContext && (
                                <span className="flex items-center gap-0.5 text-[10px] text-blue-400/70"><MessageSquare size={8} />context</span>
                              )}
                              {item.aiContentSummary && (
                                <span className="flex items-center gap-0.5 text-[10px] text-purple-400/70"><Sparkles size={8} />AI optimized</span>
                              )}
                              {/* Tags Preview */}
                              {item.tags && item.tags.length > 0 && (
                                <span className="flex items-center gap-0.5 text-[10px] text-gray-600"><Hash size={8} />{item.tags.length} tags</span>
                              )}
                            </div>
                          </div>

                          {/* Bottom Row: Schedule + Actions */}
                          <div className="flex items-center justify-between mt-2.5 gap-2">
                            {/* Schedule Info */}
                            <div className="text-[11px] text-gray-500">
                              {item.status === "published" ? (
                                <span className="text-emerald-400/80 flex items-center gap-1"><CheckCircle size={10} />Published {item.publishedAt ? timeAgo(item.publishedAt) : ""}</span>
                              ) : item.scheduledAt ? (
                                <span className="text-amber-400/80 flex items-center gap-1"><Clock size={10} />{formatScheduledDate(item.scheduledAt)}</span>
                              ) : (
                                <span className="text-gray-600">Unscheduled</span>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              {["pending", "scheduled", "failed"].includes(item.status) && (
                                <button
                                  onClick={() => handlePublishNow(item.id)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold transition"
                                  title="Instant Publish"
                                >
                                  <Send size={10} /> Publish
                                </button>
                              )}
                              {["pending", "scheduled", "ai_processing", "failed"].includes(item.status) && (
                                <button onClick={() => setEditingItem(item)} className="p-1.5 hover:bg-purple-500/15 rounded-lg transition" title="Edit metadata">
                                  <Edit3 size={13} className="text-purple-400" />
                                </button>
                              )}
                              <button onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)} className="p-1.5 hover:bg-white/5 rounded-lg transition" title="Details">
                                {expandedItem === item.id ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
                              </button>
                              {item.status === "published" && item.platformUrl && (
                                <a href={item.platformUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-white/5 rounded-lg transition" title="View on YouTube">
                                  <ExternalLink size={13} className="text-blue-400" />
                                </a>
                              )}
                              {statusFilter === "all" ? (
                                <button onClick={() => hideFromAll(item.id)} className="p-1.5 hover:bg-indigo-500/15 rounded-lg transition text-gray-500 hover:text-indigo-400" title="Hide from All view">
                                  <EyeOff size={13} />
                                </button>
                              ) : (
                                <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-rose-500/15 rounded-lg transition text-rose-400/60 hover:text-rose-400" title="Delete permanently">
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {expandedItem === item.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-4 pb-4 pt-2 border-t border-white/[0.04]">
                              {item.status === "published" ? (
                                <PublishedDetailPanel item={item} />
                              ) : (
                                <ExpandedItemDetails item={item} onEdit={() => setEditingItem(item)} />
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* ════════ UPLOAD TAB ════════ */}
          {activeTab === "upload" && (
            <div className="space-y-5">
              {/* Drop Zone */}
              <motion.div onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-white/[0.06] hover:border-purple-500/30 bg-gradient-to-br from-purple-900/[0.05] to-pink-900/[0.02] p-10 sm:p-14 text-center transition-all duration-300 group relative overflow-hidden"
              >
                <input ref={fileInputRef} type="file" accept="video/*" multiple onChange={handleFileSelect} className="hidden" />
                {/* Animated gradient border */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-pink-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/15 to-pink-500/10 border border-purple-500/15 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:border-purple-500/30 transition-all duration-300 shadow-lg shadow-purple-500/10">
                    <Cloud size={28} className="text-purple-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-300">Drop videos here or click to browse</h3>
                  <p className="text-sm text-gray-500 mt-1.5">Up to 50 videos • MP4, MOV, AVI, MKV, WebM • Max 8GB each</p>
                </div>
              </motion.div>

              {/* Global Context */}
              <div className="rounded-xl bg-gradient-to-r from-[#0e0e20]/80 to-[#0c0c1a]/80 border border-white/[0.05] p-4">
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <MessageSquare size={11} /> Global Context <span className="text-gray-600 normal-case tracking-normal">(applies to all videos)</span>
                </label>
                <textarea value={globalContext} onChange={e => setGlobalContext(e.target.value)}
                  placeholder="Describe your channel niche, target audience, content style, or specific instructions for AI... (e.g., 'Tech tutorials for beginners, keep titles under 60 chars, use professional tone')"
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/30 resize-none h-20 transition"
                />
              </div>

              {/* Platform + Video Type Selection */}
              <div className="rounded-xl bg-gradient-to-r from-[#0e0e20]/80 to-[#0c0c1a]/80 border border-white/[0.05] p-4 space-y-4">
                {/* Platform Targets */}
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest flex items-center gap-1.5 mb-2.5">
                    <Globe size={11} /> Target Platforms
                    {behaviorProfile && behaviorProfile.suggestedPlatforms.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/20">✦ AI Suggested</span>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "youtube",   label: "YouTube",   icon: <YouTubeIcon />,   color: "from-red-500/20 to-red-600/10 border-red-500/30 text-red-300" },
                      { id: "instagram", label: "Instagram", icon: <InstagramIcon />, color: "from-pink-500/20 to-purple-600/10 border-pink-500/30 text-pink-300" },
                      { id: "facebook",  label: "Facebook",  icon: <FacebookIcon />,  color: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-300" },
                      { id: "tiktok",    label: "TikTok",    icon: <TikTokIcon />,    color: "from-slate-400/20 to-slate-500/10 border-slate-400/30 text-slate-300" },
                    ].map(p => {
                      const active = selectedPlatforms.includes(p.id);
                      return (
                        <button key={p.id}
                          onClick={() => setSelectedPlatforms(prev =>
                            prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                          )}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            active
                              ? `bg-gradient-to-r ${p.color} shadow-sm`
                              : "bg-white/[0.02] border-white/[0.06] text-gray-500 hover:bg-white/[0.04]"
                          }`}
                        >
                          <span className="w-4 h-4">{p.icon}</span>
                          {p.label}
                          {active && <CheckCircle size={11} className="ml-0.5 opacity-80" />}
                        </button>
                      );
                    })}
                  </div>
                  {selectedPlatforms.length === 0 && (
                    <p className="text-[10px] text-amber-400/70 mt-1.5">⚠ Select at least one platform</p>
                  )}
                </div>
                {/* Video Type */}
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest flex items-center gap-1.5 mb-2.5">
                    <Film size={11} /> Video Type
                    {behaviorProfile?.suggestedVideoType && (
                      <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] bg-sky-500/20 text-sky-300 border border-sky-500/20">
                        ✦ Based on {behaviorProfile.totalUploads} past uploads
                      </span>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {VIDEO_TYPES.map(vt => (
                      <button key={vt.value} onClick={() => setSelectedVideoType(vt.value)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                          selectedVideoType === vt.value
                            ? "bg-purple-500/15 text-purple-200 border-purple-500/30"
                            : "bg-white/[0.02] text-gray-500 border-white/[0.05] hover:bg-white/[0.04] hover:text-gray-300"
                        }`}
                      >{vt.label}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Selected Files with Thumbnails */}
              {selectedFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-300">{selectedFiles.length} Video{selectedFiles.length > 1 ? "s" : ""} Selected</h3>
                    <span className="text-[10px] text-gray-500">Total: {formatFileSize(selectedFiles.reduce((s, f) => s + f.size, 0))}</span>
                  </div>

                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                    {selectedFiles.map((file, idx) => {
                      const thumbnail = customThumbnails[idx] || fileThumbnails[idx];
                      const isCustom = !!customThumbnails[idx];

                      return (
                        <motion.div key={`${file.name}-${idx}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="rounded-2xl bg-gradient-to-r from-[#0e0e20]/90 to-[#0c0c1a]/90 border border-white/[0.05] overflow-hidden"
                        >
                          <div className="flex items-stretch">
                            {/* Thumbnail Column */}
                            <div className="w-[130px] sm:w-[170px] shrink-0 relative bg-black/30 overflow-hidden group/thumb">
                              {thumbnail ? (
                                <img src={thumbnail} alt={file.name} className="w-full h-full object-cover min-h-[100px]" />
                              ) : (
                                <div className="w-full h-full min-h-[100px] flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-indigo-900/20">
                                  <Loader2 size={18} className="text-purple-400/50 animate-spin" />
                                </div>
                              )}
                              {/* Thumbnail Badge */}
                              {thumbnail && (
                                <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${isCustom ? "bg-emerald-500/80 text-white" : "bg-purple-500/80 text-white"}`}>
                                  {isCustom ? "Custom" : "Best Frame"}
                                </div>
                              )}
                              {/* Custom Thumbnail Upload Overlay */}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center">
                                <button
                                  onClick={(e) => { e.stopPropagation(); thumbnailInputRefs.current[idx]?.click(); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-[10px] font-semibold text-white transition"
                                >
                                  <ImagePlus size={12} /> Upload Thumbnail
                                </button>
                                <input
                                  ref={el => { thumbnailInputRefs.current[idx] = el; }}
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  className="hidden"
                                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCustomThumbnail(idx, f); }}
                                />
                              </div>
                            </div>

                            {/* Info Column */}
                            <div className="flex-1 p-3.5 flex flex-col justify-between min-w-0">
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <p className="text-sm font-semibold truncate text-white">{file.name}</p>
                                  <button onClick={() => removeFile(idx)} className="p-1 hover:bg-rose-500/15 rounded-lg transition shrink-0">
                                    <X size={14} className="text-rose-400/70" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                  <span>{formatFileSize(file.size)}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[9px] text-gray-400 uppercase">{file.type.split("/")[1] || "video"}</span>
                                </div>
                              </div>
                              {/* Per-video context */}
                              <input type="text" value={fileContexts[idx] || ""}
                                onChange={e => { const c = [...fileContexts]; c[idx] = e.target.value; setFileContexts(c); }}
                                placeholder={`What is this video about? (e.g., "React hooks tutorial")`}
                                className="w-full mt-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-purple-500/25 transition"
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Upload Button */}
                  <motion.button onClick={handleBulkUpload} disabled={isUploading || isGeneratingMetadata || isExtractingFrames}
                    whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.995 }}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:via-pink-500 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-purple-500/20"
                  >
                    {isExtractingFrames ? (<><Loader2 size={15} className="animate-spin" />Extracting Frames...</>) :
                     isUploading ? (<><Loader2 size={15} className="animate-spin" />Uploading... {uploadProgress ? `${uploadProgress.percentage}%` : ""}</>) :
                     isGeneratingMetadata ? (<><Sparkles size={15} className="animate-pulse" />AI Analyzing Videos...</>) :
                     (<><Rocket size={15} />Upload & Start AI Analysis ({selectedFiles.length} video{selectedFiles.length > 1 ? "s" : ""})</>)}
                  </motion.button>

                  {uploadProgress && (
                    <div className="w-full h-2 bg-white/[0.03] rounded-full overflow-hidden">
                      <motion.div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${uploadProgress.percentage}%` }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ════════ NOTIFICATIONS TAB ════════ */}
          {activeTab === "notifications" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-300">Activity Log</h3>
                {unreadCount > 0 && (
                  <button onClick={() => markNotificationsRead()} className="text-xs text-purple-400 hover:text-purple-300 transition">
                    Mark all read ({unreadCount})
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 flex items-center justify-center mx-auto mb-3 border border-purple-500/10">
                    <Bell size={22} className="text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-500">No notifications yet.</p>
                </div>
              ) : (
                notifications.map((n, idx) => (
                  <motion.div key={n.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.015 }}
                    className={`rounded-xl border p-4 transition-all ${!n.isRead
                      ? "bg-gradient-to-r from-purple-500/[0.04] to-pink-500/[0.02] border-purple-500/10"
                      : "bg-[#0e0e20]/40 border-white/[0.04]"}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-[13px] font-medium">{n.title}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 whitespace-pre-line leading-relaxed">{n.message}</p>
                      </div>
                      <span className="text-[9px] text-gray-600 shrink-0 ml-3">{timeAgo(n.createdAt)}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* ════════ SETTINGS TAB ════════ */}
          {activeTab === "settings" && settings && (
            <div className="max-w-2xl space-y-5">
              <div className="rounded-2xl bg-gradient-to-r from-[#0e0e20]/80 to-[#0c0c1a]/80 border border-white/[0.05] p-5 space-y-5">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2"><Settings size={14} className="text-gray-400" />Autopilot Configuration</h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 block font-medium">Videos per Day</label>
                    <select value={settings.maxPerDay} onChange={e => updateSettings({ maxPerDay: parseInt(e.target.value) })}
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500/30">
                      <option value="1">1 video/day (recommended)</option>
                      <option value="2">2 videos/day</option>
                      <option value="3">3 videos/day</option>
                      <option value="5">5 videos/day</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 block font-medium">Publish Time</label>
                    <input type="time" value={settings.preferredTime} onChange={e => updateSettings({ preferredTime: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500/30" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 block font-medium">Visibility</label>
                    <select value={settings.defaultVisibility} onChange={e => updateSettings({ defaultVisibility: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500/30">
                      <option value="public">🌐 Public</option>
                      <option value="unlisted">🔗 Unlisted</option>
                      <option value="private">🔒 Private</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 block font-medium">Timezone</label>
                    <select value={settings.timezone} onChange={e => updateSettings({ timezone: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500/30">
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern (US)</option>
                      <option value="America/Los_Angeles">Pacific (US)</option>
                      <option value="Europe/London">London</option>
                      <option value="Asia/Kolkata">India (IST)</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-white/[0.04]">
                  {[
                    { key: "autoMetadata" as const, label: "AI Auto-Generate Metadata", desc: "AI generates title, description, and tags for each video" },
                    { key: "autoClassify" as const, label: "Auto-Classify Platform", desc: "AI detects aspect ratio and assigns the best platform" },
                    { key: "notifyOnPublish" as const, label: "Push Notifications", desc: "Get notified when videos are published or fail" },
                  ].map(t => (
                    <div key={t.key} className="flex items-center justify-between py-3 px-1">
                      <div><p className="text-sm text-gray-300">{t.label}</p><p className="text-[10px] text-gray-500">{t.desc}</p></div>
                      <button onClick={() => updateSettings({ [t.key]: !settings[t.key] })}
                        className={`w-11 h-[24px] rounded-full transition-colors relative shrink-0 ${settings[t.key] ? "bg-purple-600" : "bg-white/[0.06]"}`}>
                        <div className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${settings[t.key] ? "translate-x-[23px]" : "translate-x-[3px]"}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit Metadata Modal */}
      <AnimatePresence>
        {editingItem && (
          <EditPanel
            item={editingItem}
            onSave={async (data) => {
              try {
                await updateItem({ itemId: editingItem.id, data });
                setEditingItem(null);
                toast.success("Video updated successfully!");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to update video");
              }
            }}
            onClose={() => setEditingItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
