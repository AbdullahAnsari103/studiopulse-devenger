/**
 * MyVideosPage — Central Video Management Hub for StudioPulse.
 * High-performance, highly aesthetic, interactive, and mobile-responsive UI
 * matching StudioPulse's dark glassmorphic design system.
 */

import { useState, useMemo, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Search, Filter, Bell, Plus, Play, Edit3, MoreVertical,
  ChevronLeft, ChevronRight, Eye, ThumbsUp, MessageSquare, Clock,
  TrendingUp, Calendar, Trash2, ExternalLink, Copy, Sparkles, Check,
  X, AlertTriangle, BarChart3, Settings, Shield, Globe, Lock, Unlock,
  Layers, RefreshCw, CheckCheck, ChevronDown, Sliders, Menu, Bot,
  Crown, ArrowUpDown, LayoutDashboard, Link2, Users, UsersRound, DollarSign, CalendarDays
} from "lucide-react";
import { useMyVideos } from "@/hooks/useMyVideos";
import { usePlatformStatus } from "@/hooks/usePlatforms";
import { useSettings } from "@/context/SettingsContext";
import { useConnectYouTube } from "@/hooks/usePlatforms";
import Sidebar from "@/components/layout/Sidebar";
import toast from "react-hot-toast";
import { AIDiagnosisPanel, type DiagnosisResult } from "@/components/videos/AIDiagnosisPanel";

const THUMB_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' fill='%23111128'%3E%3Crect width='320' height='180' rx='8'/%3E%3Cpath d='M140 70 L195 100 L140 130 Z' fill='%23383868'/%3E%3C/svg%3E";

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget;
  target.onerror = null;
  if (target.src !== THUMB_FALLBACK) {
    target.src = THUMB_FALLBACK;
  }
};

// ─── Platform SVG Icons ───────────────────────────────────────────────────────

function YouTubeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M43.2 13.4a5 5 0 0 0-3.5-3.5C36.4 9 24 9 24 9s-12.4 0-15.7.9A5 5 0 0 0 4.8 13.4 52 52 0 0 0 3.9 24a52 52 0 0 0 .9 10.6 5 5 0 0 0 3.5 3.5c3.3.9 15.7.9 15.7.9s12.4 0 15.7-.9a5 5 0 0 0 3.5-3.5A52 52 0 0 0 44.1 24a52 52 0 0 0-.9-10.6Z" fill="#FF0000" />
      <path d="M19.8 30.4 31.2 24l-11.4-6.4v12.8Z" fill="#fff" />
    </svg>
  );
}

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <radialGradient id="ig_myv_v5" cx="20%" cy="100%" r="120%">
          <stop offset="0%" stopColor="#fdf497" /><stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" /><stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#ig_myv_v5)" />
      <circle cx="24" cy="24" r="9" stroke="#fff" strokeWidth="3" fill="none" />
      <circle cx="35" cy="13" r="2.5" fill="#fff" />
    </svg>
  );
}

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#1877F2" />
      <path d="M32 25l.8-5.2H27.8V16.7c0-1.4.7-2.8 2.9-2.8h2.3V9.4s-2.1-.4-4-.4c-4.1 0-6.8 2.5-6.8 7v4H17v5.2h5.2V39h6.4V25H32z" fill="#fff" />
    </svg>
  );
}

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#000" />
      <path d="M33.5 14.5a7.5 7.5 0 0 1-5-2 7.5 7.5 0 0 1-2-5h-4.5v21a4.5 4.5 0 1 1-3-4.24V19.5a9 9 0 1 0 7.5 8.87V20a12 12 0 0 0 7 2.25V17.5a7.5 7.5 0 0 1-2-3z" fill="#00F2EA" />
    </svg>
  );
}

// ─── Format Helpers ───────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// ─── Sidebar Navigation Items ────────────────────────────────────────────────

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Upload, label: "Upload Center", path: "/upload-center" },
  { icon: Play, label: "My Videos", path: "/my-videos" },
  { icon: Bot, label: "AI Studio", path: "/studio-ai", badge: "NEW" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Play, label: "Content Library", path: "/content-studio" },
  { icon: CalendarDays, label: "Calendar", path: "/calendar" },
  { icon: DollarSign, label: "Monetization", path: "/monetization" },
  { icon: Users, label: "Competitors", path: "/competitors" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export default function MyVideosPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { t } = useSettings();
  const { data: platformData } = usePlatformStatus();
  const connectedPlatforms = platformData?.platforms || {};

  const {
    queryState, setQueryState,
    summary, videos, totalVideos, page, limit,
    isLoading, isFetching, refetch, syncPlatform,
    selectedVideoIds, toggleSelectVideo, toggleSelectAll,
    updateVideo, deleteVideo, bulkAction,
    fetchVideoAnalytics, aiDiagnoseVideo, aiApplyFixes,
  } = useMyVideos();

  // ─── Initial Sync on Mount ───
  useEffect(() => {
    if (connectedPlatforms.youtube) {
      syncPlatform.mutate("youtube");
    }
  }, [connectedPlatforms.youtube]);

  // ─── State Modals & Drawers ─────────────────────────────────────────────────

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [analyticsVideo, setAnalyticsVideo] = useState<any>(null);
  const [aiDiagnosis, setAiDiagnosis] = useState<DiagnosisResult | null>(null);
  const [diagnosisVideo, setDiagnosisVideo] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editVisibility, setEditVisibility] = useState<"public" | "private" | "unlisted">("public");
  const [editCategory, setEditCategory] = useState("Education");
  const [editLanguage, setEditLanguage] = useState("en");

  // Dynamic Status Tabs computed from database summary stats
  const statusTabs = useMemo(() => [
    { id: "all", label: t("videos.filterAll"), count: summary?.totalVideos ?? totalVideos },
    { id: "published", label: t("videos.filterPublished"), count: summary?.publishedCount ?? 0 },
    { id: "scheduled", label: t("videos.filterScheduled"), count: summary?.scheduledCount ?? 0 },
    { id: "drafts", label: t("videos.filterDrafts"), count: summary?.draftsCount ?? 0 },
    { id: "private", label: t("videos.filterPrivate"), count: summary?.privateCount ?? 0 },
    { id: "unlisted", label: t("videos.filterUnlisted"), count: summary?.unlistedCount ?? 0 },
    { id: "deleted", label: t("videos.filterDeleted"), count: summary?.deletedCount ?? 0 },
  ], [summary, totalVideos, t]);

  // Platforms Configuration
  const platforms = [
    { id: "youtube", label: "YouTube", icon: <YouTubeIcon size={18} /> },
    { id: "instagram", label: "Instagram", icon: <InstagramIcon size={18} /> },
    { id: "facebook", label: "Facebook", icon: <FacebookIcon size={18} /> },
    { id: "tiktok", label: "TikTok", icon: <TikTokIcon size={18} /> },
  ];

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const connectYouTube = useConnectYouTube();

  const handleSyncChannel = async () => {
    toast.promise(syncPlatform.mutateAsync(queryState.platform), {
      loading: "Syncing channel data with YouTube...",
      success: "Channel sync complete!",
      error: "Channel sync failed.",
    });
  };

  const handleOpenEdit = (v: any) => {
    setEditingVideo(v);
    setEditTitle(v.title);
    setEditDescription(v.description || "");
    setEditTags(v.tags || []);
    setEditVisibility(v.visibility || "public");
    setEditCategory(v.category || "Education");
    setEditLanguage(v.language || "en");
  };

  const handleSaveEdit = async () => {
    if (!editingVideo) return;
    try {
      await updateVideo.mutateAsync({
        videoId: editingVideo.videoId,
        payload: {
          title: editTitle,
          description: editDescription,
          tags: editTags,
          visibility: editVisibility,
          category: editCategory,
          language: editLanguage,
        },
      });
      toast.success("Video metadata updated successfully!");
      setEditingVideo(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update video";
      toast.error(msg);
    }
  };

  const handleChangeVisibilityQuick = async (v: any, newVis: "public" | "private" | "unlisted") => {
    try {
      await updateVideo.mutateAsync({
        videoId: v.videoId,
        payload: { visibility: newVis, privacyStatus: newVis },
      });
      toast.success(`Video visibility changed to ${newVis}!`);
    } catch {
      toast.error("Failed to change visibility");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingVideoId) return;
    try {
      await deleteVideo.mutateAsync(deletingVideoId);
      toast.success("Video permanently deleted from YouTube channel!");
      setDeletingVideoId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("permission") || msg.includes("scope") || msg.includes("reconnect")) {
        toast((t) => (
          <div className="space-y-2">
            <p className="font-bold text-amber-400">YouTube Permission Required</p>
            <p className="text-[12px] text-gray-300">Your connected YouTube token needs full video deletion permission.</p>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                connectYouTube.mutate();
              }}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-[12px] py-1.5 px-3 rounded-lg transition-all"
            >
              Reconnect YouTube (Grant Delete Access)
            </button>
          </div>
        ), { duration: 10000 });
      } else {
        toast.error(msg || "Failed to delete video");
      }
      setDeletingVideoId(null);
    }
  };

  const handleOpenAnalytics = async (v: any) => {
    try {
      const data = await fetchVideoAnalytics(v.videoId);
      setAnalyticsVideo(data);
    } catch {
      toast.error("Failed to load analytics");
    }
  };

  const handleAiDiagnose = async (v: any) => {
    setDiagnosisVideo(v);
    setAiDiagnosis(null);
    setIsAiLoading(true);
    try {
      const diag = await aiDiagnoseVideo(v.videoId);
      setAiDiagnosis(diag as DiagnosisResult);
    } catch {
      toast.error("AI diagnosis failed. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCloseDiagnosis = () => {
    setAiDiagnosis(null);
    setDiagnosisVideo(null);
    setIsAiLoading(false);
  };

  const handleApplyAiFixes = async (payload: { title?: string; description?: string; tags?: string[] }) => {
    if (!diagnosisVideo) throw new Error("No video selected");
    await aiApplyFixes(diagnosisVideo.videoId, payload);
  };

  const allSelected = useMemo(() => {
    return videos.length > 0 && selectedVideoIds.length === videos.length;
  }, [videos, selectedVideoIds]);

  return (
    <div className="h-screen flex bg-[#08080f] overflow-hidden text-slate-100 font-sans" id="my-videos-page">
      {/* Ambient Background Accents */}
      <div className="absolute top-0 left-1/3 w-[450px] h-[450px] bg-purple-600/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-indigo-600/10 blur-[120px] pointer-events-none rounded-full" />

      {/* ── Unified Sidebar ── */}
      <Sidebar activePage="/my-videos" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── Main Workspace ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#070712] relative">
        {/* Top Navbar Header */}
        <header className="flex items-center justify-between px-3.5 sm:px-6 py-3.5 border-b border-[#14142a] bg-[#08080f]/90 backdrop-blur-md flex-shrink-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-white/5 text-gray-300 lg:hidden border border-white/10 flex-shrink-0">
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-white font-extrabold text-base sm:text-xl tracking-tight truncate">
                {t("videos.title")}
              </h1>
              <p className="text-gray-400 text-[11px] hidden sm:block truncate">{t("videos.subtitle")}</p>
            </div>
          </div>

          {/* Header Action Buttons (Responsive Icon Grid) */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            {/* Reconnect YouTube Permissions Button */}
            <button
              onClick={() => connectYouTube.mutate()}
              className="p-2 sm:p-2.5 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-300 hover:text-white rounded-xl transition-all flex items-center gap-1.5 text-[12px] font-semibold"
              title="Click to reconnect YouTube with full Delete & Edit permissions"
            >
              <Shield className="w-4 h-4 text-red-400" />
              <span className="hidden md:inline">{t("videos.reconnectYoutube")}</span>
            </button>

            {/* Sync Channel Button */}
            <button
              onClick={handleSyncChannel}
              disabled={syncPlatform.isPending}
              className="p-2 sm:p-2.5 bg-[#0d0d1e] border border-[#202040] hover:border-purple-500/40 rounded-xl text-gray-300 hover:text-white transition-all flex items-center gap-1.5 text-[12px] font-semibold"
              title="Sync latest videos from YouTube API"
            >
              <RefreshCw className={`w-4 h-4 ${syncPlatform.isPending ? "animate-spin text-purple-400" : ""}`} />
              <span className="hidden md:inline">{t("videos.syncChannel")}</span>
            </button>

            {/* Mobile Search Toggle Button */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden p-2 bg-[#0d0d1e] border border-[#202040] text-gray-400 hover:text-white rounded-xl"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Desktop Instant Search Bar */}
            <div className="relative hidden md:block w-52 lg:w-72">
              <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={queryState.search}
                onChange={(e) => setQueryState({ ...queryState, search: e.target.value, page: 1 })}
                placeholder={t("videos.searchPlaceholder")}
                className="w-full bg-[#0d0d1e] border border-[#202040] rounded-xl pl-9 pr-8 py-2 text-white text-[12.5px] placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-all"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9.5px] text-gray-500 font-mono bg-[#16162e] px-1 py-0.5 rounded border border-white/5">⌘K</span>
            </div>

            {/* New Upload Button */}
            <button
              onClick={() => navigate("/upload-center")}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[12.5px] font-bold px-3 sm:px-4 py-2 rounded-xl shadow-lg shadow-purple-900/30 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t("videos.newUpload")}</span>
            </button>
          </div>
        </header>

        {/* Mobile Search Overlay Input */}
        {mobileSearchOpen && (
          <div className="p-3 bg-[#0d0d1e] border-b border-[#202040] md:hidden">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={queryState.search}
                onChange={(e) => setQueryState({ ...queryState, search: e.target.value, page: 1 })}
                placeholder={t("videos.searchPlaceholder")}
                className="w-full bg-[#080816] border border-[#252545] rounded-xl pl-10 pr-4 py-2 text-white text-[13px] outline-none"
              />
            </div>
          </div>
        )}

        {/* Scrollable Main Body Workspace */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-6 space-y-4 sm:space-y-6">
          {/* ── Platform Selector Horizontal Bar ── */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
            {platforms.map((p) => {
              const isActive = queryState.platform === p.id;
              const isConnected = !!connectedPlatforms[p.id] || p.id === "youtube";
              return (
                <button
                  key={p.id}
                  onClick={() => setQueryState({ ...queryState, platform: p.id, page: 1 })}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] font-bold transition-all whitespace-nowrap border flex-shrink-0 ${
                    isActive
                      ? "bg-purple-600/20 text-white border-purple-500/50 shadow-md shadow-purple-900/20"
                      : "bg-[#0d0d1e] text-gray-400 border-[#1e1e35] hover:text-white hover:bg-white/[0.03]"
                  }`}
                >
                  {p.icon}
                  <span>{p.label}</span>
                  {!isConnected && <span className="text-[9px] font-extrabold bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded-md border border-purple-500/20">Connect</span>}
                </button>
              );
            })}
          </div>

          {/* ── Top 5 Summary Metric Cards (Compact 2-Column Grid on Mobile) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
            {[
              { label: t("videos.totalVideos"), value: summary?.totalVideos !== undefined ? fmt(summary.totalVideos) : "—", trend: "+12%", icon: Layers, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
              { label: t("videos.totalViews"), value: summary?.totalViews !== undefined ? fmt(summary.totalViews) : "—", trend: "+18.6%", icon: Eye, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
              { label: t("videos.totalLikes"), value: summary?.totalLikes !== undefined ? fmt(summary.totalLikes) : "—", trend: "+11.3%", icon: ThumbsUp, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
              { label: t("videos.totalComments"), value: summary?.totalComments !== undefined ? fmt(summary.totalComments) : "—", trend: "+8.7%", icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
              { label: t("videos.avgViewTime"), value: summary?.avgViewDuration || "7:32", trend: "+9.4%", icon: Clock, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20", colSpanMobile: true },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  className={`bg-[#0d0d1e]/90 backdrop-blur-sm border border-[#1e1e35] rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-lg hover:border-purple-500/40 transition-all ${
                    card.colSpanMobile ? "col-span-2 sm:col-span-1" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${card.bg} flex items-center justify-center ${card.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-emerald-400 text-[10.5px] sm:text-[11px] font-bold flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> {card.trend}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10.5px] sm:text-[11.5px] font-medium truncate">{card.label}</p>
                    <p className="text-white text-[18px] sm:text-[22px] font-extrabold tracking-tight mt-0.5">{card.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Status Tabs & Sort Bar ── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0d0d1e]/90 backdrop-blur-sm border border-[#1e1e35] rounded-2xl p-2.5 sm:p-3 shadow-lg">
            {/* Dynamic Status Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
              {statusTabs.map((tab) => {
                const isActive = queryState.status === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setQueryState({ ...queryState, status: tab.id, page: 1 })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                        : "text-gray-400 hover:text-white hover:bg-white/[0.03]"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? "bg-white/20 text-white" : "bg-[#181830] text-purple-300 border border-purple-500/20"
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sort Controls */}
            <div className="flex items-center justify-end">
              <div className="flex items-center gap-1.5 bg-[#121226] border border-[#252545] rounded-xl px-2.5 py-1 text-[11.5px]">
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={queryState.sortBy}
                  onChange={(e) => setQueryState({ ...queryState, sortBy: e.target.value })}
                  className="bg-transparent text-white text-[11.5px] font-semibold outline-none cursor-pointer"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="views">Most Viewed</option>
                  <option value="likes">Most Liked</option>
                  <option value="comments">Most Comments</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bulk Selection Bar */}
          {selectedVideoIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between bg-purple-950/40 border border-purple-500/30 rounded-2xl px-4 py-2.5 shadow-xl"
            >
              <span className="text-purple-200 text-[12.5px] font-bold">
                {selectedVideoIds.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => bulkAction.mutate({ action: "updateVisibility", videoIds: selectedVideoIds, payload: { visibility: "private" } })}
                  className="px-2.5 py-1 bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-xl text-[11.5px] font-semibold"
                >
                  Make Private
                </button>
                <button
                  onClick={() => bulkAction.mutate({ action: "delete", videoIds: selectedVideoIds })}
                  className="px-2.5 py-1 bg-red-600/30 text-red-300 border border-red-500/40 rounded-xl text-[11.5px] font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Bulk Delete
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Main Data View (Desktop Table / Mobile Premium Cards) ── */}
          <div className="bg-[#0d0d1e]/90 backdrop-blur-sm border border-[#1e1e35] rounded-2xl overflow-hidden shadow-2xl">
            {isLoading ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-gray-400 text-[13px]">Loading channel videos...</p>
              </div>
            ) : videos.length === 0 ? (
              <div className="py-16 text-center space-y-4 px-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
                  <Play className="w-7 h-7" />
                </div>
                <h3 className="text-white text-[15px] font-bold">No videos found in this tab</h3>
                <p className="text-gray-400 text-[12px] max-w-xs mx-auto">
                  Sync channel data or upload a new video to populate.
                </p>
                <button
                  onClick={handleSyncChannel}
                  disabled={syncPlatform.isPending}
                  className="px-4 py-2 bg-purple-600 text-white font-bold text-[12.5px] rounded-xl shadow-lg inline-flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${syncPlatform.isPending ? "animate-spin" : ""}`} /> Sync Channel
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#1c1c38] bg-[#090918] text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                        <th className="py-3.5 px-4 w-10">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => toggleSelectAll(videos.map(v => v.videoId))}
                            className="rounded border-[#252545] bg-[#121226] text-purple-600 focus:ring-0 cursor-pointer"
                          />
                        </th>
                        <th className="py-3.5 px-4">Video</th>
                        <th className="py-3.5 px-4">Visibility</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Views</th>
                        <th className="py-3.5 px-4">Likes</th>
                        <th className="py-3.5 px-4">Comments</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#181832] text-[13px]">
                      {videos.map((video) => {
                        const isSelected = selectedVideoIds.includes(video.videoId);
                        const isPrivate = video.visibility === "private";
                        const isUnlisted = video.visibility === "unlisted";
                        const isScheduled = video.visibility === "scheduled" || video.status === "scheduled";
                        const isDeleted = video.status === "deleted";

                        return (
                          <tr
                            key={video.id}
                            className={`hover:bg-white/[0.02] transition-colors group ${isSelected ? "bg-purple-600/10" : ""}`}
                          >
                            <td className="py-4 px-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectVideo(video.videoId)}
                                className="rounded border-[#252545] bg-[#121226] text-purple-600 focus:ring-0 cursor-pointer"
                              />
                            </td>
                            <td className="py-4 px-4 min-w-[280px]">
                              <div className="flex items-center gap-3">
                                <div className="relative w-24 h-14 rounded-xl overflow-hidden bg-[#14142a] border border-white/10 flex-shrink-0 group/thumb">
                                  <img src={video.thumbnail} alt="" onError={handleImageError} className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300" />
                                  <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9.5px] font-mono px-1 rounded">
                                    {video.duration}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white font-bold text-[13px] leading-snug line-clamp-1 group-hover:text-purple-300 transition-colors">
                                    {video.title}
                                  </p>
                                  <span className="text-[10px] text-gray-400 bg-[#16162e] px-2 py-0.5 rounded-full border border-white/5 mt-1 inline-block">
                                    {video.category}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <button
                                onClick={() => handleChangeVisibilityQuick(video, isPrivate ? "public" : "private")}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer hover:scale-105 ${
                                  isDeleted ? "bg-red-500/10 text-red-400 border-red-500/25" :
                                  isUnlisted ? "bg-amber-500/10 text-amber-400 border-amber-500/25" :
                                  isScheduled ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/25" :
                                  isPrivate ? "bg-purple-500/10 text-purple-400 border-purple-500/25" :
                                  "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                }`}
                              >
                                {isDeleted ? <Trash2 className="w-3 h-3" /> : isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                                <span className="capitalize">{isDeleted ? "Deleted" : video.visibility}</span>
                              </button>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <p className="text-white text-[12.5px] font-semibold">{formatDate(video.publishedAt)}</p>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap font-bold text-white">{fmt(video.views)}</td>
                            <td className="py-4 px-4 whitespace-nowrap font-semibold text-gray-300">{fmt(video.likes)}</td>
                            <td className="py-4 px-4 whitespace-nowrap font-semibold text-gray-300">{fmt(video.comments)}</td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className={`text-[11.5px] font-bold px-2.5 py-0.5 rounded-full border ${
                                isDeleted ? "text-red-400 bg-red-500/10 border-red-500/20" :
                                isPrivate ? "text-purple-400 bg-purple-500/10 border-purple-500/20" :
                                "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                              }`}>
                                {isDeleted ? "Deleted" : isPrivate ? "Private" : "Published"}
                              </span>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1">
                                <a href={video.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-white rounded-lg"><Play className="w-4 h-4" /></a>
                                <button onClick={() => handleOpenEdit(video)} className="p-1.5 text-gray-400 hover:text-white rounded-lg"><Edit3 className="w-4 h-4" /></button>
                                <button onClick={() => handleOpenAnalytics(video)} className="p-1.5 text-gray-400 hover:text-purple-400 rounded-lg"><BarChart3 className="w-4 h-4" /></button>
                                <button onClick={() => handleAiDiagnose(video)} className="p-1.5 text-gray-400 hover:text-amber-400 rounded-lg"><Sparkles className="w-4 h-4" /></button>
                                <button onClick={() => setDeletingVideoId(video.videoId)} className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Cards (Pixel-Perfect Mobile Redesign) */}
                <div className="lg:hidden divide-y divide-[#181832]">
                  {videos.map((video) => {
                    const isPrivate = video.visibility === "private";
                    const isUnlisted = video.visibility === "unlisted";
                    const isDeleted = video.status === "deleted";

                    return (
                      <div key={video.id} className="p-3.5 space-y-3 bg-[#0a0a1a]/70">
                        {/* Top: Thumbnail & Title */}
                        <div className="flex items-start gap-3">
                          <div className="relative w-28 h-16 rounded-xl overflow-hidden bg-[#14142a] flex-shrink-0 border border-white/10">
                            <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-mono px-1 rounded">
                              {video.duration}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-[13px] line-clamp-2 leading-snug">{video.title}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[10px] text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/30">
                                {video.category}
                              </span>
                              <button
                                onClick={() => handleChangeVisibilityQuick(video, isPrivate ? "public" : "private")}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                                  isDeleted ? "text-red-400 bg-red-500/10 border-red-500/20" :
                                  isPrivate ? "text-purple-300 bg-purple-500/10 border-purple-500/20" :
                                  "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                }`}
                              >
                                {isDeleted ? "Deleted" : video.visibility}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Row: Metrics & Quick Action Buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <div className="flex items-center gap-3 text-gray-300 text-[11.5px] font-medium">
                            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-cyan-400" /> {fmt(video.views)}</span>
                            <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5 text-amber-400" /> {fmt(video.likes)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleOpenEdit(video)} className="p-1.5 bg-[#14142a] border border-[#252545] rounded-xl text-gray-300" title="Edit">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleOpenAnalytics(video)} className="p-1.5 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-300" title="Analytics">
                              <BarChart3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleAiDiagnose(video)} className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300" title="AI Diagnosis">
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeletingVideoId(video.videoId)} className="p-1.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Pagination Bar */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#090918] border-t border-[#1a1a38] text-[12px] text-gray-400">
                  <span>Page {page} of {Math.ceil(totalVideos / limit) || 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={page <= 1}
                      onClick={() => setQueryState({ ...queryState, page: page - 1 })}
                      className="p-1.5 rounded-lg border border-[#252545] hover:bg-white/5 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2.5 py-1 bg-purple-600 text-white font-bold rounded-lg">{page}</span>
                    <button
                      disabled={page * limit >= totalVideos}
                      onClick={() => setQueryState({ ...queryState, page: page + 1 })}
                      className="p-1.5 rounded-lg border border-[#252545] hover:bg-white/5 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* ── EDIT VIDEO DRAWER ── */}
      <AnimatePresence>
        {editingVideo && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingVideo(null)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25 }} className="relative w-full max-w-lg bg-[#0d0d1e] border-l border-[#202040] h-full overflow-y-auto custom-scrollbar p-6 space-y-6 z-10">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-white font-bold text-[16px] flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-purple-400" /> Edit Video Details
                </h3>
                <button onClick={() => setEditingVideo(null)} className="p-1 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-300 text-[12px] font-medium block mb-1">Title</label>
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full bg-[#080816] border border-[#252545] rounded-xl px-3 py-2 text-white text-[13px]" />
                </div>
                <div>
                  <label className="text-gray-300 text-[12px] font-medium block mb-1">Description</label>
                  <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} className="w-full bg-[#080816] border border-[#252545] rounded-xl px-3 py-2 text-white text-[13px] resize-none" />
                </div>
                <div>
                  <label className="text-gray-300 text-[12px] font-medium block mb-1">Category</label>
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full bg-[#080816] border border-[#252545] rounded-xl px-3 py-2 text-white text-[13px]">
                    <option value="Education">Education</option>
                    <option value="Science & Technology">Science & Technology</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Gaming">Gaming</option>
                    <option value="People & Blogs">People & Blogs</option>
                    <option value="Howto & Style">Howto & Style</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-300 text-[12px] font-medium block mb-1">Visibility</label>
                  <select value={editVisibility} onChange={(e) => setEditVisibility(e.target.value as any)} className="w-full bg-[#080816] border border-[#252545] rounded-xl px-3 py-2 text-white text-[13px]">
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button onClick={() => setEditingVideo(null)} className="px-4 py-2 text-gray-400 border border-[#252545] rounded-xl text-[13px]">Cancel</button>
                <button onClick={handleSaveEdit} disabled={updateVideo.isPending} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-[13px] flex items-center gap-2">
                  {updateVideo.isPending && <RefreshCw className="w-4 h-4 animate-spin" />} Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {deletingVideoId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeletingVideoId(null)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative bg-[#0d0d1e] border border-red-500/30 rounded-2xl p-6 max-w-md w-full text-center space-y-4 z-10 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-white font-bold text-[16px]">Delete Video Permanently?</h3>
              <p className="text-gray-400 text-[12.5px]">This action cannot be undone. The video will be permanently removed from your YouTube channel.</p>
              <div className="flex justify-center gap-3 pt-2">
                <button onClick={() => setDeletingVideoId(null)} className="px-4 py-2 text-gray-300 border border-[#252545] rounded-xl text-[12.5px]">Cancel</button>
                <button onClick={handleDeleteConfirm} disabled={deleteVideo.isPending} className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-[12.5px] flex items-center gap-2">
                  {deleteVideo.isPending && <RefreshCw className="w-4 h-4 animate-spin" />} Delete Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── VIDEO ANALYTICS MODAL ── */}
      <AnimatePresence>
        {analyticsVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setAnalyticsVideo(null)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative bg-[#0d0d1e] border border-purple-500/30 rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto custom-scrollbar space-y-5 z-10 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-white font-bold text-[16px] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" /> {analyticsVideo.title}
                </h3>
                <button onClick={() => setAnalyticsVideo(null)} className="p-1 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#080816] p-3 rounded-xl border border-[#202040]">
                  <p className="text-gray-400 text-[10.5px]">Views</p>
                  <p className="text-white text-[16px] font-bold">{fmt(analyticsVideo.views)}</p>
                </div>
                <div className="bg-[#080816] p-3 rounded-xl border border-[#202040]">
                  <p className="text-gray-400 text-[10.5px]">CTR</p>
                  <p className="text-emerald-400 text-[16px] font-bold">{analyticsVideo.ctr}%</p>
                </div>
                <div className="bg-[#080816] p-3 rounded-xl border border-[#202040]">
                  <p className="text-gray-400 text-[10.5px]">Likes</p>
                  <p className="text-amber-400 text-[16px] font-bold">{fmt(analyticsVideo.likes)}</p>
                </div>
                <div className="bg-[#080816] p-3 rounded-xl border border-[#202040]">
                  <p className="text-gray-400 text-[10.5px]">Revenue</p>
                  <p className="text-cyan-400 text-[16px] font-bold">${analyticsVideo.revenue}</p>
                </div>
              </div>

              <div className="bg-[#080816] p-4 rounded-xl border border-[#202040]">
                <p className="text-gray-300 text-[12px] font-bold mb-2">Traffic Sources</p>
                <div className="space-y-2">
                  {analyticsVideo.trafficSources.map((ts: any) => (
                    <div key={ts.source} className="flex items-center justify-between text-[11.5px]">
                      <span className="text-gray-400">{ts.source}</span>
                      <span className="text-white font-bold">{ts.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── AI DIAGNOSIS PANEL ── */}
      <AnimatePresence>
        {(diagnosisVideo || isAiLoading) && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={handleCloseDiagnosis}
            />
            <AIDiagnosisPanel
              videoId={diagnosisVideo?.videoId || ""}
              videoTitle={diagnosisVideo?.title || ""}
              diagnosis={aiDiagnosis}
              isLoading={isAiLoading}
              onClose={handleCloseDiagnosis}
              onRefresh={() => diagnosisVideo && handleAiDiagnose(diagnosisVideo)}
              onApplyFixes={handleApplyAiFixes}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
