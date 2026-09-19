/**
 * UploadCenterPage — Content Publishing Center for StudioPulse.
 * High-performance, highly aesthetic, interactive, and responsive UI
 * matching StudioPulse's dark glassmorphic design system.
 */

import { useState, useRef, useCallback, useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, ChevronRight, ChevronDown, X, Plus, Cloud, File as FileIcon,
  Image, Settings, Eye, Globe, Lock, Unlock, Clock, Calendar,
  Sparkles, Check, AlertTriangle, Play, Users, Heart,
  MessageSquare, Bell, Shield, Languages, MoreHorizontal,
  CheckCircle, ArrowRight, LayoutDashboard, BarChart3,
  DollarSign, UsersRound, Bot, CalendarDays, Link2,
  Crown, Menu, Zap, Star, TrendingUp, Sliders, RefreshCw, Copy, CheckCheck, Hash,
  Lightbulb, Search, Target, Award, Tag, FileText, ClipboardCheck, Volume2, Music,
  Trash2, ListOrdered
} from "lucide-react";
import { useUpload, type VideoChapter, type AiOptimization } from "@/hooks/useUpload";
import { usePlatformStatus } from "@/hooks/usePlatforms";
import { extractVideoFrames } from "@/utils/extractVideoFrames";
import { useSettings } from "@/context/SettingsContext";
import Sidebar from "@/components/layout/Sidebar";
import { celebrate } from "@/lib/celebrate";
import { showActionToast } from "@/lib/actionToast";
import toast from "react-hot-toast";

// ─── Platform Icons ───────────────────────────────────────────────────────────

function YouTubeIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M43.2 13.4a5 5 0 0 0-3.5-3.5C36.4 9 24 9 24 9s-12.4 0-15.7.9A5 5 0 0 0 4.8 13.4 52 52 0 0 0 3.9 24a52 52 0 0 0 .9 10.6 5 5 0 0 0 3.5 3.5c3.3.9 15.7.9 15.7.9s12.4 0 15.7-.9a5 5 0 0 0 3.5-3.5A52 52 0 0 0 44.1 24a52 52 0 0 0-.9-10.6Z" fill="#FF0000" />
      <path d="M19.8 30.4 31.2 24l-11.4-6.4v12.8Z" fill="#fff" />
    </svg>
  );
}

function InstagramIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <radialGradient id="ig_upl_v3" cx="20%" cy="100%" r="120%">
          <stop offset="0%" stopColor="#fdf497" /><stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" /><stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#ig_upl_v3)" />
      <circle cx="24" cy="24" r="9" stroke="#fff" strokeWidth="3" fill="none" />
      <circle cx="35" cy="13" r="2.5" fill="#fff" />
    </svg>
  );
}

function TikTokIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#000" />
      <path d="M33.5 14.5a7.5 7.5 0 0 1-5-2 7.5 7.5 0 0 1-2-5h-4.5v21a4.5 4.5 0 1 1-3-4.24V19.5a9 9 0 1 0 7.5 8.87V20a12 12 0 0 0 7 2.25V17.5a7.5 7.5 0 0 1-2-3z" fill="#00F2EA" />
    </svg>
  );
}

function FacebookIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#1877F2" />
      <path d="M32 25l.8-5.2H27.8V16.7c0-1.4.7-2.8 2.9-2.8h2.3V9.4s-2.1-.4-4-.4c-4.1 0-6.8 2.5-6.8 7v4H17v5.2h5.2V39h6.4V25H32z" fill="#fff" />
    </svg>
  );
}

function TwitterXIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#000" />
      <path d="M27.1 22.2 35.3 13h-1.9l-7.1 8L20.3 13h-6.5l8.6 12.5L13.5 35h1.9l7.5-8.7 6 8.7h6.5L27.1 22.2zm-2.6 3.1-.9-1.3-7-10h3l5.7 8.2.9 1.3 7.3 10.5h-3l-6-8.7z" fill="#fff" />
    </svg>
  );
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1e6) return `${(bytesPerSec / 1e6).toFixed(1)} MB/s`;
  if (bytesPerSec >= 1e3) return `${(bytesPerSec / 1e3).toFixed(0)} KB/s`;
  return `${bytesPerSec.toFixed(0)} B/s`;
}

function formatETA(seconds: number): string {
  if (seconds <= 0) return "calculating...";
  if (seconds < 60) return `${Math.ceil(seconds)}s remaining`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m remaining`;
  return `${Math.floor(seconds / 3600)}h ${Math.ceil((seconds % 3600) / 60)}m remaining`;
}

// ─── Sidebar Navigation ──────────────────────────────────────────────────────

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Upload, label: "Upload Center", path: "/upload-center" },
  { icon: Play, label: "My Videos", path: "/my-videos" },
  { icon: Bot, label: "AI Assistant", path: "/studio-ai", badge: "NEW" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Play, label: "Content Studio", path: "/content-studio" },
  { icon: Link2, label: "Connected Platforms", path: "/connected" },
  { icon: Users, label: "Collaborations", path: "/collaborations" },
  { icon: CalendarDays, label: "Calendar", path: "/calendar" },
  { icon: DollarSign, label: "Monetization", path: "/monetization" },
  { icon: UsersRound, label: "Audience", path: "/audience" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

// ─── Advanced Settings Tabs ──────────────────────────────────────────────────

const SETTINGS_TABS = [
  { id: "general", icon: Settings, label: "General" },
  { id: "monetization", icon: DollarSign, label: "Monetization" },
  { id: "language", icon: Languages, label: "Language & Captions" },
  { id: "visibility", icon: Eye, label: "Visibility" },
  { id: "more", icon: MoreHorizontal, label: "More Options" },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function UploadCenterPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { t } = useSettings();
  const {
    uploadVideo, uploadThumbnail, uploadProgress, isUploading, uploadedFile,
    saveDraft, publish, aiOptimize, reset,
    categories, playlists,
  } = useUpload();
  const { data: platformData } = usePlatformStatus();
  const connectedPlatforms = platformData?.platforms || {};

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // ─── State ────────────────────────────────────────────────────────────

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [settingsTab, setSettingsTab] = useState("general");
  const [isDragging, setIsDragging] = useState(false);

  // Metadata state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private" | "unlisted">("private");
  const [categoryId, setCategoryId] = useState("27");
  const [playlistId, setPlaylistId] = useState("");
  const [language, setLanguage] = useState("en");
  const [license, setLicense] = useState("youtube");
  const [madeForKids, setMadeForKids] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [notifySubscribers, setNotifySubscribers] = useState(true);
  const [recordingDate, setRecordingDate] = useState("");
  const [recordingTime, setRecordingTime] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  // Platform selection
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["youtube"]);

  // Thumbnail Studio state
  const [thumbnailPath, setThumbnailPath] = useState("");
  const [thumbnailPreview, setThumbnailPreview] = useState("");

  // AI & Copy UI state
  const [aiSuggestions, setAiSuggestions] = useState<AiOptimization | null>(null);
  const [chapters, setChapters] = useState<VideoChapter[]>([]);
  const [isAddingChapter, setIsAddingChapter] = useState(false);
  const [newChapterTime, setNewChapterTime] = useState("");
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [copiedChapters, setCopiedChapters] = useState(false);
  const [isAiOptimizing, setIsAiOptimizing] = useState(false);
  const [extractedFrames, setExtractedFrames] = useState<{ base64: string; mimeType: string; timeSeconds?: number; timestamp?: string }[]>([]);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number>(0);
  const [activePlatformTab, setActivePlatformTab] = useState<"youtube" | "instagram" | "tiktok" | "facebook">("youtube");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Publishing
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<any>(null);

  // ─── Platform data ─────────────────────────────────────────────────────

  const PLATFORMS = useMemo(() => [
    {
      id: "youtube", name: "YouTube", icon: <YouTubeIcon size={24} />,
      color: "from-red-600/20 to-red-900/10 border-red-500/30",
      glowColor: "rgba(255, 0, 0, 0.2)",
      connected: !!connectedPlatforms.youtube,
      accountName: (connectedPlatforms.youtube as any)?.accountName || "",
    },
    {
      id: "instagram", name: "Instagram", icon: <InstagramIcon size={24} />,
      color: "from-pink-600/20 to-purple-900/10 border-pink-500/30",
      glowColor: "rgba(236, 72, 153, 0.2)",
      connected: !!connectedPlatforms.instagram,
      accountName: (connectedPlatforms.instagram as any)?.accountName || "",
    },
    {
      id: "tiktok", name: "TikTok", icon: <TikTokIcon size={24} />,
      color: "from-cyan-600/20 to-blue-900/10 border-cyan-500/30",
      glowColor: "rgba(6, 182, 212, 0.2)",
      connected: !!connectedPlatforms.tiktok,
      accountName: (connectedPlatforms.tiktok as any)?.accountName || "",
    },
    {
      id: "facebook", name: "Facebook", icon: <FacebookIcon size={24} />,
      color: "from-blue-600/20 to-indigo-900/10 border-blue-500/30",
      glowColor: "rgba(59, 130, 246, 0.2)",
      connected: !!connectedPlatforms.facebook,
      accountName: (connectedPlatforms.facebook as any)?.accountName || "",
    },
    {
      id: "twitter", name: "X (Twitter)", icon: <TwitterXIcon size={24} />,
      color: "from-gray-600/20 to-slate-900/10 border-gray-500/30",
      glowColor: "rgba(156, 163, 175, 0.2)",
      connected: !!connectedPlatforms.twitter,
      accountName: (connectedPlatforms.twitter as any)?.accountName || "",
    },
  ], [connectedPlatforms]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleFileSelect = useCallback(async (file: File) => {
    const validTypes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm"];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
      toast.error("Unsupported file format. Use MP4, MOV, AVI, MKV, or WEBM.");
      return;
    }
    try {
      // Extract video frames in browser memory for Studio AI Visual Analysis
      // Dynamic frame count: auto-calculated based on video duration
      // Short (<1min): 3, Medium (1-5min): 5, Long (5-15min): 8, Very long (15+min): 12
      extractVideoFrames(file).then(frames => {
        if (frames.length > 0) {
          setExtractedFrames(frames);
          const dur = Math.round((frames as any).duration || 0);
          if (dur > 0) setVideoDurationSeconds(dur);
          console.log(`[UploadCenter] Extracted ${frames.length} video frames for visual AI analysis (duration: ${dur}s)`);
        }
      }).catch(() => {});

      await uploadVideo(file);
      celebrate.sparkles();
      toast.success("Video uploaded successfully! 🎬");
      if (!title) {
        const name = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
        setTitle(name);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }, [uploadVideo, title]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleThumbnailUpload = useCallback(async (file: File) => {
    try {
      const result = await uploadThumbnail(file, uploadedFile?.uploadId);
      setThumbnailPath(result.thumbnailPath);
      setThumbnailPreview(URL.createObjectURL(file));
      toast.success("Thumbnail updated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thumbnail upload failed");
    }
  }, [uploadThumbnail, uploadedFile]);

  const handleAddTag = useCallback((value: string) => {
    const trimmed = value.trim().replace(/^#+/, "");
    if (trimmed && !tags.includes(trimmed) && tags.length < 30) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  }, [tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags(tags.filter(t => t !== tag));
  }, [tags]);

  const handleAutoGenerateHashtags = useCallback(() => {
    if (!title) {
      toast.error("Enter a title first to generate hashtags");
      return;
    }
    const words = title.split(/\s+/).filter(w => w.length > 3).map(w => w.replace(/[^a-zA-Z0-9]/g, ""));
    const generated = Array.from(new Set([...words, "StudioPulse", "Viral", "Trending"])).slice(0, 10);
    setTags(generated);
    toast.success("Generated 10 trending hashtags!");
  }, [title]);

  // ─── Auto-Chapter & Timestamp Handlers ─────────────────────────────────────

  const handleAddChapter = useCallback(() => {
    if (!newChapterTitle.trim()) {
      toast.error("Please enter a chapter title");
      return;
    }
    const time = newChapterTime.trim() || "0:00";
    if (!/^(\d{1,2}:)?\d{1,2}:\d{2}$/.test(time)) {
      toast.error("Format must be mm:ss (e.g. 1:24) or hh:mm:ss");
      return;
    }
    const parts = time.split(":").map(Number);
    const seconds = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
    const updated = [...chapters, { time, seconds, title: newChapterTitle.trim() }].sort((a, b) => a.seconds - b.seconds);
    setChapters(updated);
    setNewChapterTime("");
    setNewChapterTitle("");
    setIsAddingChapter(false);
    toast.success("Chapter milestone added! 📌");
  }, [chapters, newChapterTime, newChapterTitle]);

  const handleDeleteChapter = useCallback((index: number) => {
    if (index === 0) {
      toast.error("YouTube requires the first chapter to remain at 0:00");
      return;
    }
    setChapters(prev => prev.filter((_, i) => i !== index));
    toast.success("Chapter removed");
  }, []);

  const handleUpdateChapter = useCallback((index: number, newTitle: string) => {
    setChapters(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], title: newTitle };
      return copy;
    });
  }, []);

  const handleInsertChaptersIntoDescription = useCallback(() => {
    if (chapters.length === 0) {
      toast.error("No chapters generated yet. Run Studio AI Optimization first.");
      return;
    }
    const formattedChapters = chapters.map(c => `${c.time} ${c.title}`).join("\n");
    const marker = "⏱️ TIMESTAMPS / CHAPTERS:";
    setDescription(prev => {
      if (prev.includes(marker)) {
        const parts = prev.split(marker);
        return `${parts[0].trim()}\n\n${marker}\n${formattedChapters}`;
      }
      return prev.trim() ? `${prev.trim()}\n\n${marker}\n${formattedChapters}` : `${marker}\n${formattedChapters}`;
    });
    celebrate.sparkles();
    toast.success("YouTube chapter timestamps inserted into description! 🚀");
  }, [chapters]);

  const handleCopyChapters = useCallback(() => {
    if (chapters.length === 0) {
      toast.error("No chapters to copy");
      return;
    }
    const formattedChapters = chapters.map(c => `${c.time} ${c.title}`).join("\n");
    navigator.clipboard.writeText(formattedChapters);
    setCopiedChapters(true);
    setTimeout(() => setCopiedChapters(false), 2500);
    toast.success("YouTube-compatible chapters copied to clipboard! 📋");
  }, [chapters]);

  const togglePlatform = useCallback((platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId) ? prev.filter(p => p !== platformId) : [...prev, platformId]
    );
  }, []);

  const selectAllPlatforms = useCallback(() => {
    const connectedIds = PLATFORMS.filter(p => p.connected).map(p => p.id);
    if (selectedPlatforms.length === connectedIds.length) {
      setSelectedPlatforms([]);
    } else {
      setSelectedPlatforms(connectedIds);
    }
  }, [PLATFORMS, selectedPlatforms]);

  const handleSaveDraft = useCallback(async () => {
    if (!uploadedFile?.uploadId) {
      toast.error("Please upload a video first");
      return;
    }
    try {
      await saveDraft.mutateAsync({
        uploadId: uploadedFile.uploadId,
        title, description, tags, visibility,
        platforms: selectedPlatforms, categoryId, playlistId,
        license, notifySubscribers, madeForKids, allowComments,
        showStats, language, recordingDate, scheduledAt,
        category: categories.find(c => c.id === categoryId)?.name || "",
        ageRestricted: false, thumbnailPath,
      });
      toast.success("Draft saved to StudioPulse!");
    } catch {
      toast.error("Failed to save draft");
    }
  }, [uploadedFile, title, description, tags, visibility, selectedPlatforms, categoryId, playlistId, license, notifySubscribers, madeForKids, allowComments, showStats, language, recordingDate, scheduledAt, categories, thumbnailPath, saveDraft]);

  const handlePublish = useCallback(async () => {
    if (!uploadedFile?.uploadId) {
      toast.error("Please upload a video first");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }

    setIsPublishing(true);
    try {
      const result = await publish.mutateAsync({
        uploadId: uploadedFile.uploadId,
        title, description, tags, visibility,
        platforms: selectedPlatforms, categoryId, playlistId,
        license, notifySubscribers, madeForKids, allowComments,
        showStats, language, recordingDate, scheduledAt,
        thumbnailPath, ageRestricted: false,
        category: categories.find(c => c.id === categoryId)?.name || "",
      });

      setPublishResult(result);
      // Always move to Step 4 to show results (even partial failures)
      setActiveStep(4);

      if (result.success) {
        celebrate.burst({ count: 80 });
        showActionToast({
          title: "Video published successfully! 🎉",
          message: "Your video is live on YouTube. Ready to extract viral clips or manage your library?",
          icon: "🚀",
          actionLabel: "Generate Viral Clips",
          onAction: () => navigate("/viral-clips"),
          secondaryLabel: "My Videos",
          onSecondary: () => navigate("/my-videos"),
          celebrateMilestone: true,
        });
      } else {
        // Check if ANY platform succeeded
        const anySuccess = Object.values(result.results || {}).some((r: any) => r.success);
        if (anySuccess) {
          toast.success("Video published! Some platforms had issues — check results.");
        } else {
          toast.error("Publishing failed. Check results for details.");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publishing failed");
    } finally {
      setIsPublishing(false);
    }
  }, [uploadedFile, title, description, tags, visibility, selectedPlatforms, categoryId, playlistId, license, notifySubscribers, madeForKids, allowComments, showStats, language, recordingDate, scheduledAt, categories, thumbnailPath, publish]);

  // Stepper
  const steps = [
    { num: 1, label: t("upload.step1"), desc: t("upload.step1Desc") },
    { num: 2, label: t("upload.step2"), desc: t("upload.step2Desc") },
    { num: 3, label: t("upload.step3"), desc: t("upload.step3Desc") },
    { num: 4, label: t("upload.step4"), desc: t("upload.step4Desc") },
  ];

  return (
    <div className="h-screen flex bg-[#08080f] overflow-hidden text-slate-100 font-sans" id="upload-center">
      {/* ── Unified Sidebar ── */}
      <Sidebar activePage="/upload-center" />


      {/* ── Main Workspace ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#070712] relative">
        {/* Ambient Top Lighting Accent */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-blue-600/10 blur-[100px] pointer-events-none rounded-full" />

        {/* Top Header Navbar */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#14142a] bg-[#08080f]/80 backdrop-blur-md flex-shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-white/5 text-gray-300 lg:hidden border border-white/10">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-white font-extrabold text-lg sm:text-xl tracking-tight">{t("upload.title")}</h1>
                <span className="text-[10px] font-bold bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">v2.0</span>
              </div>
              <p className="text-gray-400 text-[11px] sm:text-[12px] hidden sm:block">{t("upload.subtitle")}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              className="xl:hidden flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/25 text-purple-300 px-3 py-1.5 rounded-xl text-[12px] font-medium"
            >
              <Sliders className="w-3.5 h-3.5" />
              Preview & AI
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-[#0d0d1c] border border-[#1e1e35] rounded-xl px-3 py-1.5 shadow-inner">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-gray-400 text-[11.5px]">Auto-Sync Active</span>
            </div>
          </div>
        </header>

        {/* Stepper Navigation */}
        <div className="flex items-center px-4 sm:px-6 py-3 bg-[#090915] border-b border-[#14142a] flex-shrink-0 overflow-x-auto custom-scrollbar z-10">
          <div className="flex items-center gap-2 sm:gap-4 min-w-full sm:min-w-0">
            {steps.map((step, i) => {
              const isActive = activeStep === step.num;
              const isCompleted = step.num < activeStep;
              return (
                <div key={step.num} className="flex items-center">
                  <button
                    onClick={() => setActiveStep(step.num)}
                    className={`group relative flex items-center gap-2.5 px-3.5 sm:px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all duration-300 ${
                      isActive
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40 border border-purple-400/40"
                        : isCompleted
                        ? "bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20"
                        : "text-gray-500 border border-transparent hover:text-gray-300 hover:bg-white/[0.02]"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10.5px] font-extrabold transition-transform duration-300 group-hover:scale-110 ${
                      isActive ? "bg-white text-purple-700" : isCompleted ? "bg-purple-500/30 text-purple-300" : "bg-[#16162a] text-gray-500"
                    }`}>
                      {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : step.num}
                    </span>
                    <div className="text-left">
                      <p className="leading-none">{step.label}</p>
                    </div>
                  </button>
                  {i < steps.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-gray-700 mx-1 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Workspace Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
          <div className="flex gap-6 max-w-[1600px] mx-auto min-h-full">
            {/* ── Left Step Content Panels ── */}
            <div className="flex-1 min-w-0 space-y-6">
              <AnimatePresence mode="wait">
                {/* STEP 1: Details */}
                {activeStep === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Top Row: Video Upload + Basic Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Upload Card */}
                      <div className="lg:col-span-5 bg-[#0d0d1e]/90 backdrop-blur-sm border border-[#1e1e38] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-bold text-[15px] flex items-center gap-2">
                              <Cloud className="w-4 h-4 text-purple-400" />
                              {t("upload.fileHeader")}
                            </h3>
                            <span className="text-[10px] text-gray-400 bg-[#16162a] px-2 py-0.5 rounded-full border border-white/5">{t("upload.chunkedUploader")}</span>
                          </div>

                          {!uploadedFile ? (
                            <div
                              className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[240px] ${
                                isDragging
                                  ? "border-purple-400 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.2)]"
                                  : "border-[#252545] hover:border-purple-500/50 hover:bg-purple-500/[0.03]"
                              }`}
                              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                              onDragLeave={() => setIsDragging(false)}
                              onDrop={handleDrop}
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600/20 to-blue-600/20 border border-purple-500/30 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                                <Cloud className="w-8 h-8 text-purple-400 animate-bounce" />
                              </div>
                              <p className="text-white text-[14px] font-semibold mb-1">{t("upload.dragDrop")}</p>
                              <p className="text-gray-400 text-[12px] mb-4">{t("upload.chunkedSupport")}</p>
                              <button type="button" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[13px] font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-purple-900/30 transition-all hover:scale-105">
                                {t("upload.browseFiles")}
                              </button>
                              <p className="text-gray-500 text-[10.5px] mt-4">{t("upload.formats")}</p>
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="video/*,.mp4,.mov,.avi,.mkv,.webm"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileSelect(file);
                                }}
                              />
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Progress bar */}
                              {isUploading && uploadProgress && (
                                <div className="bg-[#080818] border border-[#202040] rounded-2xl p-4 space-y-3">
                                  <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-purple-300 font-semibold flex items-center gap-2">
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading Video...
                                    </span>
                                    <span className="text-white font-bold">{uploadProgress.percentage}%</span>
                                  </div>
                                  <div className="h-2.5 bg-[#15152a] rounded-full overflow-hidden p-0.5 border border-white/5">
                                    <div
                                      className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                                      style={{ width: `${uploadProgress.percentage}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-[10.5px] text-gray-400">
                                    <span>{formatBytes(uploadProgress.loaded)} / {formatBytes(uploadProgress.total)}</span>
                                    <span>{formatSpeed(uploadProgress.speed)}</span>
                                    <span>{formatETA(uploadProgress.eta)}</span>
                                  </div>
                                </div>
                              )}

                              {!isUploading && (
                                <div className="bg-[#09091a] border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
                                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-[13px] font-semibold truncate">{uploadedFile.fileName}</p>
                                    <p className="text-gray-400 text-[11px]">{formatBytes(uploadedFile.fileSize)} · Upload Ready</p>
                                  </div>
                                  <button
                                    onClick={() => reset()}
                                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                                    title="Remove Video"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Quick Tips */}
                        <div className="mt-6 pt-4 border-t border-[#181830] text-[11.5px] text-gray-400 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span>{t("upload.tipHashtags")}</span>
                        </div>
                      </div>

                      {/* Basic Metadata Editor */}
                      <div className="lg:col-span-7 bg-[#0d0d1e]/90 backdrop-blur-sm border border-[#1e1e38] rounded-2xl p-5 shadow-xl space-y-4">
                        <h3 className="text-white font-bold text-[15px] flex items-center gap-2">
                          <FileIcon className="w-4 h-4 text-purple-400" />
                          {t("upload.basicInfo")}
                        </h3>

                        {/* Title */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-gray-300 text-[12.5px] font-medium">{t("upload.videoTitle")} <span className="text-red-400">*</span></label>
                            <span className={`text-[10.5px] font-medium ${title.length > 90 ? "text-amber-400" : "text-gray-500"}`}>
                              {title.length} / 100
                            </span>
                          </div>
                          <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                            placeholder="e.g. 10 AI Tools Every Creator Needs in 2024"
                            className="w-full bg-[#080816] border border-[#252545] rounded-xl px-4 py-2.5 text-white text-[13.5px] placeholder-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                          />
                        </div>

                        {/* Description */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-gray-300 text-[12.5px] font-medium">{t("upload.description")}</label>
                            <span className="text-gray-500 text-[10.5px]">{description.length} / 5000</span>
                          </div>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value.slice(0, 5000))}
                            placeholder="Provide a compelling overview of your video, social links, and key takeaways..."
                            rows={3}
                            className="w-full bg-[#080816] border border-[#252545] rounded-xl px-4 py-2.5 text-white text-[13px] placeholder-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all resize-none"
                          />
                          {chapters.length > 0 && (
                            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3.5 py-2 text-[11.5px] mt-2">
                              <span className="text-emerald-300 font-medium flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                {chapters.length} auto-chapters ready ({chapters[0]?.time} → {chapters[chapters.length - 1]?.time})
                              </span>
                              <button
                                type="button"
                                onClick={handleInsertChaptersIntoDescription}
                                className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 bg-emerald-500/15 hover:bg-emerald-500/25 px-2.5 py-1 rounded-lg border border-emerald-500/30 transition-all active:scale-95"
                              >
                                <Sparkles className="w-3 h-3" /> Insert into Description
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Tags & Auto-Hashtags */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-gray-300 text-[12.5px] font-medium flex items-center gap-1.5">
                              <Hash className="w-3.5 h-3.5 text-purple-400" />
                              {t("upload.tagsHashtags")}
                            </label>
                            <button
                              type="button"
                              onClick={handleAutoGenerateHashtags}
                              className="text-[11px] font-bold text-purple-400 hover:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" /> {t("upload.autoGenerate")}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 bg-[#080816] border border-[#252545] rounded-xl px-3 py-2 min-h-[42px] focus-within:border-purple-500">
                            {tags.map((tag) => (
                              <span key={tag} className="flex items-center gap-1 bg-purple-500/15 text-purple-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-purple-500/30">
                                #{tag}
                                <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-400 transition-colors ml-0.5"><X className="w-3 h-3" /></button>
                              </span>
                            ))}
                            <input
                              type="text"
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === ",") {
                                  e.preventDefault();
                                  handleAddTag(tagInput);
                                }
                              }}
                              onBlur={() => { if (tagInput.trim()) handleAddTag(tagInput); }}
                              placeholder={tags.length === 0 ? t("upload.typeHashtagPlaceholder") : ""}
                              className="flex-1 min-w-[120px] bg-transparent text-white text-[12.5px] outline-none placeholder-gray-600"
                            />
                          </div>
                        </div>

                        {/* Thumbnail & Playlist Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                          {/* Thumbnail Upload Studio */}
                          <div className="bg-[#080816] border border-[#202040] rounded-xl p-3">
                            <label className="text-gray-300 text-[11.5px] font-medium block mb-2">{t("upload.videoThumbnail")}</label>
                            <div className="flex items-center gap-3">
                              <div className="w-20 h-12 rounded-lg bg-[#14142a] border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0 relative group">
                                {thumbnailPreview ? (
                                  <img src={thumbnailPreview} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Image className="w-5 h-5 text-gray-500" />
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => thumbInputRef.current?.click()}
                                className="text-purple-300 text-[11.5px] font-semibold bg-purple-500/15 border border-purple-500/30 hover:bg-purple-500/25 px-3 py-1.5 rounded-lg transition-all"
                              >
                                {thumbnailPreview ? "Change Custom" : "Upload Custom"}
                              </button>
                              <input
                                ref={thumbInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleThumbnailUpload(file);
                                }}
                              />
                            </div>
                          </div>

                          {/* YouTube Playlist */}
                          <div className="bg-[#080816] border border-[#202040] rounded-xl p-3">
                            <label className="text-gray-300 text-[11.5px] font-medium block mb-2">Target Playlist (YouTube)</label>
                            <select
                              value={playlistId}
                              onChange={(e) => setPlaylistId(e.target.value)}
                              className="w-full bg-[#121226] border border-[#252545] rounded-lg px-3 py-1.5 text-white text-[12px] focus:border-purple-500 outline-none cursor-pointer"
                            >
                              <option value="">No Playlist</option>
                              {playlists.map((pl) => (
                                <option key={pl.id} value={pl.id}>{pl.title}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Advanced Options Accordion Panel */}
                    <div className="bg-[#0d0d1e]/90 backdrop-blur-sm border border-[#1e1e38] rounded-2xl p-5 shadow-xl">
                      <h3 className="text-white font-bold text-[15px] mb-4 flex items-center gap-2">
                        <Settings className="w-4 h-4 text-purple-400" />
                        Advanced Publishing Settings
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* Tab buttons */}
                        <div className="md:col-span-3 space-y-1.5">
                          {SETTINGS_TABS.map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => setSettingsTab(tab.id)}
                              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[12.5px] font-semibold transition-all ${
                                settingsTab === tab.id
                                  ? "bg-purple-600/25 text-purple-300 border border-purple-500/40 shadow-md"
                                  : "text-gray-400 hover:text-white hover:bg-white/[0.03] border border-transparent"
                              }`}
                            >
                              <tab.icon className="w-4 h-4" />
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Tab content area */}
                        <div className="md:col-span-9 bg-[#080816] border border-[#202040] rounded-xl p-4 sm:p-5">
                          {settingsTab === "general" && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                  <label className="text-gray-300 text-[12px] font-medium block mb-1.5">Category</label>
                                  <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="w-full bg-[#121226] border border-[#252545] rounded-xl px-3 py-2 text-white text-[12.5px] outline-none"
                                  >
                                    {categories.map((cat) => (
                                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-gray-300 text-[12px] font-medium block mb-1.5">Audience Setting</label>
                                  <select
                                    value={madeForKids ? "kids" : "everyone"}
                                    onChange={(e) => setMadeForKids(e.target.value === "kids")}
                                    className="w-full bg-[#121226] border border-[#252545] rounded-xl px-3 py-2 text-white text-[12.5px] outline-none"
                                  >
                                    <option value="everyone">Not Made for Kids</option>
                                    <option value="kids">Made for Kids</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-gray-300 text-[12px] font-medium block mb-1.5">Video Language</label>
                                  <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="w-full bg-[#121226] border border-[#252545] rounded-xl px-3 py-2 text-white text-[12.5px] outline-none"
                                  >
                                    <option value="en">English (US)</option>
                                    <option value="hi">Hindi</option>
                                    <option value="es">Spanish</option>
                                    <option value="fr">French</option>
                                    <option value="de">German</option>
                                  </select>
                                </div>
                              </div>

                              <div className="space-y-3 pt-2">
                                {[
                                  { label: "Allow Viewer Comments", state: allowComments, setter: setAllowComments },
                                  { label: "Show Likes & Stats to Viewers", state: showStats, setter: setShowStats },
                                  { label: "Send Notification to Subscribers", state: notifySubscribers, setter: setNotifySubscribers },
                                ].map((toggle) => (
                                  <div key={toggle.label} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                                    <span className="text-gray-300 text-[12.5px] font-medium">{toggle.label}</span>
                                    <button
                                      type="button"
                                      onClick={() => toggle.setter(!toggle.state)}
                                      className={`w-11 h-6 rounded-full p-1 transition-colors ${toggle.state ? "bg-purple-600" : "bg-[#252545]"}`}
                                    >
                                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${toggle.state ? "translate-x-5" : ""}`} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {settingsTab === "visibility" && (
                            <div className="space-y-3">
                              <label className="text-gray-300 text-[12px] font-medium block mb-2">Publishing Visibility</label>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                  { value: "public", label: "Public", icon: Globe },
                                  { value: "unlisted", label: "Unlisted", icon: Unlock },
                                  { value: "private", label: "Private", icon: Lock },
                                ].map((opt) => {
                                  const Icon = opt.icon;
                                  const isSelected = visibility === opt.value;
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => setVisibility(opt.value as any)}
                                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                                        isSelected
                                          ? "bg-purple-600/20 border-purple-500/50 text-white"
                                          : "bg-[#121226] border-[#252545] text-gray-400 hover:text-white"
                                      }`}
                                    >
                                      <Icon className="w-4 h-4 text-purple-400" />
                                      <span className="text-[13px] font-semibold">{opt.label}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="pt-3 border-t border-white/5">
                                <label className="text-gray-300 text-[12px] font-medium block mb-1.5">Schedule Publish (Optional)</label>
                                <input
                                  type="datetime-local"
                                  value={scheduledAt}
                                  onChange={(e) => setScheduledAt(e.target.value)}
                                  className="w-full bg-[#121226] border border-[#252545] rounded-xl px-3 py-2 text-white text-[12.5px] outline-none"
                                />
                              </div>
                            </div>
                          )}

                          {settingsTab === "monetization" && (
                            <div className="py-6 text-center text-gray-400 text-[12.5px]">
                              Monetization status automatically inherited from your connected channel settings.
                            </div>
                          )}

                          {settingsTab === "language" && (
                            <div className="py-6 text-center text-gray-400 text-[12.5px]">
                              Subtitles and closed captions will auto-generate upon video processing.
                            </div>
                          )}

                          {settingsTab === "more" && (
                            <div className="space-y-3">
                              <label className="text-gray-300 text-[12px] font-medium block">License Model</label>
                              <select
                                value={license}
                                onChange={(e) => setLicense(e.target.value)}
                                className="w-full bg-[#121226] border border-[#252545] rounded-xl px-3 py-2 text-white text-[12.5px] outline-none"
                              >
                                <option value="youtube">Standard YouTube License</option>
                                <option value="creativeCommon">Creative Commons (Attribution)</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Step 1 Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        onClick={handleSaveDraft}
                        className="px-5 py-2.5 text-[13px] font-semibold text-gray-300 border border-[#252545] rounded-xl hover:bg-white/5 transition-all"
                      >
                        Save Draft
                      </button>
                      <button
                        onClick={() => setActiveStep(2)}
                        disabled={!uploadedFile}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[13px] rounded-xl shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50"
                      >
                        Next: AI Optimize <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Optimize */}
                {activeStep === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* AI Optimizer Header Card */}
                    <div className="bg-[#0d0d1e]/90 backdrop-blur-sm border border-[#1e1e38] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                      {/* Ambient glow */}
                      <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-600/10 blur-[80px] rounded-full pointer-events-none" />
                      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-600/10 blur-[60px] rounded-full pointer-events-none" />

                      <div className="relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600/30 to-cyan-600/20 border border-purple-500/40 flex items-center justify-center shadow-lg shadow-purple-900/20">
                              <Sparkles className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                              <h3 className="text-white font-extrabold text-[17px] tracking-tight">Studio AI Content Optimizer</h3>
                              <p className="text-gray-400 text-[12px]">Powered by Studio AI · Visual & Audio Analysis · SEO · CTR Strategy</p>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              if (!title.trim()) { toast.error("Enter a title first"); return; }
                              setIsAiOptimizing(true);
                              try {
                                const result = await aiOptimize.mutateAsync({
                                  title,
                                  description,
                                  tags,
                                  category: categories.find(c => c.id === categoryId)?.name || "",
                                  uploadId: uploadedFile?.uploadId || undefined,
                                  videoFrames: extractedFrames.length > 0 ? extractedFrames : undefined,
                                  videoDuration: videoDurationSeconds || undefined,
                                });
                                setAiSuggestions(result);
                                if (result.chapters && result.chapters.length > 0) {
                                  setChapters(result.chapters);
                                }
                                celebrate.sparkles();
                                toast.success("AI optimization complete! 🎯");
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "AI optimization failed — retrying with backup models...");
                              } finally {
                                setIsAiOptimizing(false);
                              }
                            }}
                            disabled={isAiOptimizing || aiOptimize.isPending || !title.trim()}
                            className={`flex items-center gap-2 text-white font-bold px-5 sm:px-6 py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 flex-shrink-0 ${
                              isAiOptimizing || aiOptimize.isPending
                                ? "bg-purple-700/60 cursor-wait"
                                : "bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:shadow-purple-900/40 hover:scale-[1.03] active:scale-[0.98]"
                            }`}
                          >
                            {isAiOptimizing || aiOptimize.isPending ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span className="hidden sm:inline">Analyzing with AI...</span>
                                <span className="sm:hidden">Analyzing...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                <span className="hidden sm:inline">Run Studio AI Optimization</span>
                                <span className="sm:hidden">Run AI</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Analyzing metadata preview */}
                        <div className="bg-[#080816] border border-[#1a1a30] rounded-xl p-3 sm:p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-gray-500 text-[10.5px] font-bold uppercase tracking-wider">Current Metadata Being Analyzed</span>
                          </div>
                          <p className="text-white text-[13px] font-semibold truncate">{title || "No title entered"}</p>
                          <p className="text-gray-500 text-[11px] mt-1 truncate">{description || "No description"} · {tags.length} tags · {categories.find(c => c.id === categoryId)?.name || "General"}</p>

                          {/* Frame extraction status */}
                          <div className="mt-3 pt-3 border-t border-[#1a1a30]">
                            <div className="flex items-center gap-2 mb-2">
                              <Eye className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="text-cyan-400 text-[10.5px] font-bold uppercase tracking-wider">
                                {extractedFrames.length > 0
                                  ? `🎬 ${extractedFrames.length} frames captured for AI visual analysis`
                                  : "⏳ No frames captured yet — upload a video first"}
                              </span>
                            </div>
                            {extractedFrames.length > 0 && (
                              <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                                {extractedFrames.map((frame, i) => (
                                  <img
                                    key={i}
                                    src={`data:${frame.mimeType};base64,${frame.base64}`}
                                    alt={`Frame ${i + 1}`}
                                    className="w-16 h-10 rounded-lg object-cover border border-cyan-500/30 shadow-md flex-shrink-0"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Results */}
                    {(aiSuggestions || aiOptimize.data) ? (() => {
                      const data = aiSuggestions || aiOptimize.data!;
                      const seoScore = data.seoScore || 0;
                      const seoColor = seoScore >= 80 ? "text-emerald-400" : seoScore >= 60 ? "text-amber-400" : "text-red-400";
                      const seoBg = seoScore >= 80 ? "from-emerald-500/20 to-emerald-900/10 border-emerald-500/30" : seoScore >= 60 ? "from-amber-500/20 to-amber-900/10 border-amber-500/30" : "from-red-500/20 to-red-900/10 border-red-500/30";
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                          className="space-y-5"
                        >
                          {/* ═══════ What Studio AI Sees — Video Analysis Card ═══════ */}
                          {data.videoContentSummary && (
                            <div className="bg-[#0d0d1e]/90 backdrop-blur-sm border border-cyan-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                              <div className="absolute -top-16 -left-16 w-48 h-48 bg-cyan-600/10 blur-[70px] rounded-full pointer-events-none" />
                              <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-600/30 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center">
                                    <Eye className="w-4 h-4 text-cyan-400" />
                                  </div>
                                  <div>
                                    <h4 className="text-cyan-300 font-extrabold text-[13px] uppercase tracking-wider">What Studio AI Sees</h4>
                                    <p className="text-gray-500 text-[10px]">Visual frame-by-frame analysis of your video</p>
                                  </div>
                                  <span className="ml-auto text-[9px] font-extrabold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                                    {extractedFrames.length} FRAMES ANALYZED
                                  </span>
                                </div>
                                {/* Frame thumbnails strip */}
                                {extractedFrames.length > 0 && (
                                  <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                                    {extractedFrames.map((frame, i) => (
                                      <img
                                        key={i}
                                        src={`data:${frame.mimeType};base64,${frame.base64}`}
                                        alt={`Analyzed frame ${i + 1}`}
                                        className="w-20 h-12 rounded-lg object-cover border border-cyan-500/30 shadow-lg flex-shrink-0 hover:scale-110 transition-transform"
                                      />
                                    ))}
                                  </div>
                                )}
                                <div className="bg-[#080816] border border-[#1a1a30] rounded-xl p-4">
                                  <p className="text-gray-200 text-[13px] leading-relaxed">{data.videoContentSummary}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ═══════ What Studio AI Hears — Audio Intelligence Card ═══════ */}
                          {data.audioIntelligence?.hasAudio && (
                            <div className="bg-[#0d0d1e]/90 backdrop-blur-sm border border-violet-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                              <div className="absolute -top-16 -right-16 w-48 h-48 bg-violet-600/10 blur-[70px] rounded-full pointer-events-none" />
                              <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600/30 to-fuchsia-600/20 border border-violet-500/40 flex items-center justify-center">
                                    <Volume2 className="w-4 h-4 text-violet-400" />
                                  </div>
                                  <div>
                                    <h4 className="text-violet-300 font-extrabold text-[13px] uppercase tracking-wider">What Studio AI Hears</h4>
                                    <p className="text-gray-500 text-[10px]">Gemini 2.0 Flash / 2.5 Flash Multimodal Audio Intelligence</p>
                                  </div>
                                  <div className="ml-auto flex items-center gap-1.5">
                                    {data.audioIntelligence.detectedLanguage && (
                                      <span className="text-[9px] font-extrabold bg-fuchsia-500/20 text-fuchsia-300 px-2 py-0.5 rounded-full border border-fuchsia-500/30 uppercase">
                                        {data.audioIntelligence.detectedLanguage}
                                      </span>
                                    )}
                                    <span className="text-[9px] font-extrabold bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/30 uppercase">
                                      {data.audioIntelligence.isMusic === false || data.audioIntelligence.contentType === "speech" || data.audioIntelligence.hasSpeech
                                        ? "🎙️ SPEECH / VOICEOVER"
                                        : data.audioIntelligence.contentType === "music_with_vocals"
                                        ? "🎵 MUSIC + VOCALS"
                                        : data.audioIntelligence.contentType === "music_instrumental"
                                        ? "🎶 INSTRUMENTAL TRACK"
                                        : data.audioIntelligence.contentType === "mixed"
                                        ? "🎧 SPEECH + MUSIC"
                                        : "🔊 AUDIO ANALYZED"}
                                    </span>
                                  </div>
                                </div>

                                {/* Genre / Topic & Mood badges */}
                                {(data.audioIntelligence.genre || data.audioIntelligence.mood) && (
                                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    {data.audioIntelligence.genre && (
                                      <span className="text-[10px] font-bold bg-pink-500/15 text-pink-300 px-2.5 py-1 rounded-lg border border-pink-500/25">
                                        {data.audioIntelligence.isMusic === false || data.audioIntelligence.contentType === "speech"
                                          ? `📌 Topic: ${data.audioIntelligence.genre}`
                                          : `🎸 Genre: ${data.audioIntelligence.genre}`}
                                      </span>
                                    )}
                                    {data.audioIntelligence.mood && (
                                      <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-300 px-2.5 py-1 rounded-lg border border-indigo-500/25">
                                        ✨ Tone: {data.audioIntelligence.mood}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Audio waveform visual indicator */}
                                <div className="flex items-center gap-1 mb-3 px-1">
                                  {Array.from({ length: 32 }).map((_, i) => (
                                    <div
                                      key={i}
                                      className="bg-gradient-to-t from-violet-500/60 to-fuchsia-400/80 rounded-full w-1.5 flex-shrink-0"
                                      style={{ height: `${6 + Math.sin(i * 0.7) * 8 + Math.random() * 6}px`, opacity: 0.5 + Math.random() * 0.5 }}
                                    />
                                  ))}
                                  <span className="text-[10px] text-violet-400/70 ml-2 flex-shrink-0">{data.audioIntelligence.durationAnalyzed}s analyzed</span>
                                </div>

                                {/* Transcript/Lyrics or Composition Style */}
                                {(data.audioIntelligence.transcript || data.audioIntelligence.musicDescription) && (
                                  <div className="bg-[#080816] border border-[#1a1a30] rounded-xl p-4">
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <Music className="w-3.5 h-3.5 text-violet-400" />
                                      <span className="text-violet-300 text-[10.5px] font-extrabold uppercase tracking-wider">
                                        {data.audioIntelligence.isMusic === false || data.audioIntelligence.contentType === "speech" || data.audioIntelligence.hasSpeech
                                          ? "Spoken Voiceover & Narration Transcript"
                                          : data.audioIntelligence.hasVocals && data.audioIntelligence.transcript
                                          ? "Detected Song Lyrics (Full Song)"
                                          : "Composition & Sound Design"}
                                      </span>
                                    </div>
                                    <p className="text-gray-200 text-[12.5px] leading-relaxed italic whitespace-pre-line max-h-72 overflow-y-auto pr-2 font-normal">
                                      {data.audioIntelligence.transcript || `"${data.audioIntelligence.musicDescription}"`}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* ═══════ Auto-Chapter & Timestamp Generation Card (YouTube SEO) ═══════ */}
{(chapters.length > 0 || (data.chapters && data.chapters.length > 0)) && (() => {
                            const activeChapters = chapters.length > 0 ? chapters : (data.chapters || []);
                            return (
                              <div className="bg-[#0d0d1e]/90 backdrop-blur-sm border border-emerald-500/35 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                                {/* Ambient Glow */}
                                <div className="absolute -top-16 -right-16 w-56 h-56 bg-emerald-600/10 blur-[80px] rounded-full pointer-events-none" />
                                <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-cyan-600/10 blur-[80px] rounded-full pointer-events-none" />

                                <div className="relative z-10 space-y-4">
                                  {/* Card Header */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600/30 to-cyan-600/20 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-900/20">
                                        <Clock className="w-5 h-5 text-emerald-400" />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h4 className="text-white font-extrabold text-[15px] tracking-tight">Auto-Chapters & Timestamps</h4>
                                          <span className="text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-wider">
                                            #1 YouTube SEO Factor
                                          </span>
                                          <span className="text-[9px] font-extrabold bg-cyan-500/15 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30 flex items-center gap-1">
                                            <Check className="w-2.5 h-2.5" /> Grounded in Voice & Frames
                                          </span>
                                        </div>
                                        <p className="text-gray-400 text-[11px]">
                                          Topic shifts detected from spoken transcript & video milestones · YouTube indexed
                                        </p>
                                      </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                      <button
                                        type="button"
                                        onClick={handleCopyChapters}
                                        className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-3 py-1.5 rounded-xl text-[11.5px] font-medium border border-white/10 transition-all active:scale-95"
                                      >
                                        {copiedChapters ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedChapters ? "Copied!" : "Copy Timestamps"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setIsAddingChapter(!isAddingChapter)}
                                        className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-xl text-[11.5px] font-medium border border-emerald-500/25 transition-all active:scale-95"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Chapter
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleInsertChaptersIntoDescription}
                                        className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-[12px] shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-95"
                                      >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        Insert into Description
                                      </button>
                                    </div>
                                  </div>

                                  {/* Visual Timeline Bar */}
                                  <div className="bg-[#080816] border border-[#1a1a30] rounded-xl p-3.5 space-y-2">
                                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
                                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                                        <ListOrdered className="w-3.5 h-3.5" /> Interactive Video Timeline ({activeChapters.length} Chapters)
                                      </span>
                                      <span>0:00 → {activeChapters[activeChapters.length - 1]?.time || "End"}</span>
                                    </div>

                                    {/* Bar */}
                                    <div className="h-3 w-full bg-[#121226] rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-white/5">
                                      {activeChapters.map((ch, idx) => {
                                        const nextSec = idx < activeChapters.length - 1
                                          ? activeChapters[idx + 1].seconds
                                          : Math.max(ch.seconds + 45, activeChapters[activeChapters.length - 1].seconds + 30);
                                        const duration = Math.max(10, nextSec - ch.seconds);
                                        const totalDuration = activeChapters[activeChapters.length - 1].seconds + 45 || 180;
                                        const widthPct = Math.max(6, Math.min(100, (duration / totalDuration) * 100));

                                        const colors = [
                                          "bg-emerald-500",
                                          "bg-cyan-500",
                                          "bg-blue-500",
                                          "bg-purple-500",
                                          "bg-amber-500",
                                          "bg-rose-500",
                                        ];
                                        const color = colors[idx % colors.length];

                                        return (
                                          <div
                                            key={idx}
                                            className={`h-full rounded-sm transition-all hover:opacity-100 opacity-85 cursor-pointer ${color}`}
                                            style={{ width: `${widthPct}%` }}
                                            title={`${ch.time} — ${ch.title}`}
                                          />
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Inline Add Chapter Form */}
                                  {isAddingChapter && (
                                    <div className="bg-[#080816] border border-emerald-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-2 animate-fadeIn">
                                      <input
                                        type="text"
                                        value={newChapterTime}
                                        onChange={(e) => setNewChapterTime(e.target.value)}
                                        placeholder="e.g. 2:15"
                                        className="w-full sm:w-28 bg-[#121226] border border-[#252545] rounded-lg px-3 py-1.5 text-white text-[12px] font-mono focus:border-emerald-500 outline-none"
                                      />
                                      <input
                                        type="text"
                                        value={newChapterTitle}
                                        onChange={(e) => setNewChapterTitle(e.target.value)}
                                        placeholder="Chapter title (e.g. Real-World Applications)"
                                        className="w-full sm:flex-1 bg-[#121226] border border-[#252545] rounded-lg px-3 py-1.5 text-white text-[12px] focus:border-emerald-500 outline-none"
                                      />
                                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                        <button
                                          type="button"
                                          onClick={handleAddChapter}
                                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-all"
                                        >
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setIsAddingChapter(false)}
                                          className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg text-[11.5px] transition-all"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Chapters Table / List */}
                                  <div className="bg-[#080816] border border-[#1a1a30] rounded-xl divide-y divide-[#141428] overflow-hidden">
                                    {activeChapters.map((ch, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-3 px-4 py-2.5 group hover:bg-white/[0.02] transition-colors"
                                      >
                                        {/* Timestamp Badge */}
                                        <span className="flex-shrink-0 font-mono text-[12px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                                          {ch.time}
                                        </span>

                                        {/* Editable Title */}
                                        <input
                                          type="text"
                                          value={ch.title}
                                          onChange={(e) => handleUpdateChapter(idx, e.target.value)}
                                          className="flex-1 min-w-0 bg-transparent text-gray-200 text-[13px] font-medium hover:text-white focus:text-white focus:bg-[#121226] border border-transparent hover:border-[#252545] focus:border-emerald-500/50 rounded-lg px-2.5 py-1 outline-none transition-all"
                                        />

                                        {/* Actions */}
                                        <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              navigator.clipboard.writeText(`${ch.time} ${ch.title}`);
                                              toast.success(`Copied: ${ch.time} ${ch.title}`);
                                            }}
                                            className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                                            title="Copy chapter line"
                                          >
                                            <Copy className="w-3.5 h-3.5" />
                                          </button>
                                          {idx > 0 && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteChapter(idx)}
                                              className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                              title="Remove chapter"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* SEO Tip footer */}
                                  <div className="flex items-center gap-2 text-[11px] text-gray-400 bg-[#090918] border border-white/5 rounded-xl px-3.5 py-2">
                                    <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                    <span>
                                      <strong className="text-gray-200">YouTube SEO Standard:</strong> The first chapter must start at 0:00, with at least 3 timestamps. YouTube will index these sections directly into Google search results!
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* ═══════ Platform Optimizations Tabs ═══════ */}
                          {data.platformOptimizations && (
                            <div className="bg-[#0d0d1e]/90 backdrop-blur-sm border border-[#1e1e38] rounded-2xl p-5 shadow-xl relative overflow-hidden">
                              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-600/8 blur-[60px] rounded-full pointer-events-none" />
                              <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                  <Globe className="w-4 h-4 text-purple-400" />
                                  <h4 className="text-white font-bold text-[13px]">Platform-Optimized Content</h4>
                                  <span className="text-gray-500 text-[10px] font-medium">AI-generated for each platform</span>
                                </div>

                                {/* Platform tabs */}
                                <div className="flex gap-1 mb-4 bg-[#080816] border border-[#1a1a30] rounded-xl p-1">
                                  {([
                                    { id: "youtube" as const, label: "YouTube", color: "text-red-400 border-red-500/50 bg-red-500/10" },
                                    { id: "instagram" as const, label: "Instagram", color: "text-pink-400 border-pink-500/50 bg-pink-500/10" },
                                    { id: "tiktok" as const, label: "TikTok", color: "text-cyan-400 border-cyan-500/50 bg-cyan-500/10" },
                                    { id: "facebook" as const, label: "Facebook", color: "text-blue-400 border-blue-500/50 bg-blue-500/10" },
                                  ] as const).map(tab => (
                                    <button
                                      key={tab.id}
                                      onClick={() => setActivePlatformTab(tab.id)}
                                      className={`flex-1 text-[11px] font-bold py-2 px-3 rounded-lg transition-all ${
                                        activePlatformTab === tab.id
                                          ? `${tab.color} border shadow-md`
                                          : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                                      }`}
                                    >
                                      {tab.label}
                                    </button>
                                  ))}
                                </div>

                                {/* Platform content */}
                                <AnimatePresence mode="wait">
                                  <motion.div
                                    key={activePlatformTab}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.15 }}
                                    className="space-y-3"
                                  >
                                    {/* YouTube Tab */}
                                    {activePlatformTab === "youtube" && data.platformOptimizations.youtube && (
                                      <>
                                        <div className="bg-[#080816] border border-[#1a1a30] rounded-xl p-4">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider">YouTube Title</span>
                                            <button
                                              onClick={() => { navigator.clipboard.writeText(data.platformOptimizations!.youtube!.title); toast.success("YouTube title copied!"); }}
                                              className="text-gray-500 hover:text-white text-[10px] flex items-center gap-1 transition-colors"
                                            ><Copy className="w-3 h-3" /> Copy</button>
                                          </div>
                                          <p className="text-white text-[14px] font-bold leading-snug">{data.platformOptimizations.youtube.title}</p>
                                        </div>
                                        <div className="bg-[#080816] border border-[#1a1a30] rounded-xl p-4">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider">YouTube Description</span>
                                            <button
                                              onClick={() => { navigator.clipboard.writeText(data.platformOptimizations!.youtube!.description); toast.success("Description copied!"); }}
                                              className="text-gray-500 hover:text-white text-[10px] flex items-center gap-1 transition-colors"
                                            ><Copy className="w-3 h-3" /> Copy</button>
                                          </div>
                                          <p className="text-gray-300 text-[12px] leading-relaxed whitespace-pre-wrap max-h-[150px] overflow-y-auto custom-scrollbar">{data.platformOptimizations.youtube.description}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {data.platformOptimizations.youtube.hashtags?.map((h, i) => (
                                            <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-red-500/10 text-red-300 border border-red-500/20">#{h}</span>
                                          ))}
                                        </div>
                                      </>
                                    )}

                                    {/* Instagram Tab */}
                                    {activePlatformTab === "instagram" && data.platformOptimizations.instagram && (
                                      <>
                                        <div className="bg-[#080816] border border-[#1a1a30] rounded-xl p-4">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-pink-400 text-[10px] font-bold uppercase tracking-wider">Instagram Caption</span>
                                            <button
                                              onClick={() => {
                                                const full = `${data.platformOptimizations!.instagram!.caption}\n\n${data.platformOptimizations!.instagram!.hashtags?.map(h => `#${h}`).join(" ") || ""}`;
                                                navigator.clipboard.writeText(full); toast.success("Instagram caption + hashtags copied!");
                                              }}
                                              className="text-gray-500 hover:text-white text-[10px] flex items-center gap-1 transition-colors"
                                            ><Copy className="w-3 h-3" /> Copy All</button>
                                          </div>
                                          <p className="text-gray-300 text-[12px] leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto custom-scrollbar">{data.platformOptimizations.instagram.caption}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {data.platformOptimizations.instagram.hashtags?.map((h, i) => (
                                            <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-300 border border-pink-500/20">#{h}</span>
                                          ))}
                                        </div>
                                      </>
                                    )}

                                    {/* TikTok Tab */}
                                    {activePlatformTab === "tiktok" && data.platformOptimizations.tiktok && (
                                      <>
                                        <div className="bg-[#080816] border border-[#1a1a30] rounded-xl p-4">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-wider">TikTok Caption</span>
                                            <button
                                              onClick={() => {
                                                const full = `${data.platformOptimizations!.tiktok!.caption} ${data.platformOptimizations!.tiktok!.hashtags?.map(h => `#${h}`).join(" ") || ""}`;
                                                navigator.clipboard.writeText(full); toast.success("TikTok caption copied!");
                                              }}
                                              className="text-gray-500 hover:text-white text-[10px] flex items-center gap-1 transition-colors"
                                            ><Copy className="w-3 h-3" /> Copy All</button>
                                          </div>
                                          <p className="text-gray-300 text-[13px] font-semibold leading-snug">{data.platformOptimizations.tiktok.caption}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {data.platformOptimizations.tiktok.hashtags?.map((h, i) => (
                                            <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">#{h}</span>
                                          ))}
                                        </div>
                                      </>
                                    )}

                                    {/* Facebook Tab */}
                                    {activePlatformTab === "facebook" && data.platformOptimizations.facebook && (
                                      <>
                                        <div className="bg-[#080816] border border-[#1a1a30] rounded-xl p-4">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">Facebook Post</span>
                                            <button
                                              onClick={() => {
                                                const full = `${data.platformOptimizations!.facebook!.post}\n\n${data.platformOptimizations!.facebook!.hashtags?.map(h => `#${h}`).join(" ") || ""}`;
                                                navigator.clipboard.writeText(full); toast.success("Facebook post copied!");
                                              }}
                                              className="text-gray-500 hover:text-white text-[10px] flex items-center gap-1 transition-colors"
                                            ><Copy className="w-3 h-3" /> Copy All</button>
                                          </div>
                                          <p className="text-gray-300 text-[12px] leading-relaxed whitespace-pre-wrap">{data.platformOptimizations.facebook.post}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {data.platformOptimizations.facebook.hashtags?.map((h, i) => (
                                            <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20">#{h}</span>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </motion.div>
                                </AnimatePresence>
                              </div>
                            </div>
                          )}

                          {/* Optimized Title Card */}
                          <div className="bg-[#0d0d1e]/90 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-[60px] rounded-full pointer-events-none" />
                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Award className="w-4 h-4 text-purple-400" />
                                  <span className="text-purple-400 text-[11px] font-extrabold uppercase tracking-wider">AI High-CTR Title</span>
                                </div>
                                <span className="text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">RECOMMENDED</span>
                              </div>
                              <p className="text-white text-[16px] sm:text-[18px] font-bold leading-snug mb-4">{data.optimizedTitle}</p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => { setTitle(data.optimizedTitle!); toast.success("Applied AI title!"); }}
                                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-[12px] font-bold transition-all hover:scale-[1.03] active:scale-[0.97] shadow-lg shadow-purple-900/30"
                                >
                                  <Check className="w-3.5 h-3.5" /> Apply Title
                                </button>
                                <button
                                  onClick={() => { navigator.clipboard.writeText(data.optimizedTitle!); toast.success("Title copied!"); }}
                                  className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-2 rounded-xl text-[12px] font-medium border border-white/10 transition-all"
                                >
                                  <Copy className="w-3.5 h-3.5" /> Copy
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Title Alternatives */}
                          {data.titleAlternatives && data.titleAlternatives.length > 0 && (
                            <div className="bg-[#0d0d1e]/90 backdrop-blur-sm border border-[#1e1e38] rounded-2xl p-5 shadow-xl">
                              <h4 className="text-white font-bold text-[13px] flex items-center gap-2 mb-3">
                                <Lightbulb className="w-4 h-4 text-amber-400" />
                                Alternative Title Ideas
                              </h4>
                              <div className="space-y-2">
                                {data.titleAlternatives.map((alt, i) => (
                                  <div key={i} className="flex items-center justify-between bg-[#080816] border border-[#1a1a30] rounded-xl px-4 py-3 group hover:border-purple-500/30 transition-all">
                                    <p className="text-gray-200 text-[13px] font-medium flex-1 mr-3">{alt}</p>
                                    <button
                                      onClick={() => { setTitle(alt); toast.success("Alternative title applied!"); }}
                                      className="flex-shrink-0 text-purple-400 hover:text-purple-300 text-[11px] font-bold bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                      Use This
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Metrics Row: SEO + CTR + Best Time */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* SEO Score */}
                            <div className={`bg-gradient-to-br ${seoBg} rounded-2xl p-5 border shadow-xl relative overflow-hidden`}>
                              <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-white/5 rounded-full blur-lg" />
                              <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                  <Target className="w-4 h-4 text-gray-400" />
                                  <p className="text-gray-300 text-[11px] font-bold uppercase tracking-wider">SEO Score</p>
                                </div>
                                <p className={`${seoColor} text-[36px] font-extrabold leading-none`}>
                                  {seoScore}<span className="text-[16px] text-gray-500 font-bold"> /100</span>
                                </p>
                                <div className="mt-3 h-2 bg-black/30 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${seoScore}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={`h-full rounded-full ${seoScore >= 80 ? "bg-emerald-400" : seoScore >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Estimated CTR */}
                            <div className="bg-gradient-to-br from-cyan-500/15 to-blue-900/10 border border-cyan-500/25 rounded-2xl p-5 shadow-xl">
                              <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-4 h-4 text-cyan-400" />
                                <p className="text-gray-300 text-[11px] font-bold uppercase tracking-wider">Est. CTR</p>
                              </div>
                              <p className="text-cyan-400 text-[36px] font-extrabold leading-none">{data.estimatedCTR}</p>
                              <p className="text-gray-500 text-[10.5px] mt-2">Predicted click-through rate</p>
                            </div>

                            {/* Best Upload Time */}
                            <div className="bg-gradient-to-br from-amber-500/15 to-orange-900/10 border border-amber-500/25 rounded-2xl p-5 shadow-xl">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-amber-400" />
                                <p className="text-gray-300 text-[11px] font-bold uppercase tracking-wider">Best Upload Time</p>
                              </div>
                              <p className="text-amber-300 text-[15px] font-bold leading-snug">{data.bestUploadTime || "Tuesday 3:00 PM EST"}</p>
                              <p className="text-gray-500 text-[10.5px] mt-1">Peak audience activity window</p>
                            </div>
                          </div>

                          {/* Keyword Analysis */}
                          {data.keywordAnalysis && (
                            <div className="bg-[#0d0d1e]/90 backdrop-blur-sm border border-[#1e1e38] rounded-2xl p-5 shadow-xl">
                              <h4 className="text-white font-bold text-[13px] flex items-center gap-2 mb-4">
                                <Search className="w-4 h-4 text-purple-400" />
                                Keyword Analysis
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="bg-[#080816] border border-[#1a1a30] rounded-xl p-3">
                                  <p className="text-gray-500 text-[10px] font-bold uppercase mb-1">Primary Keyword</p>
                                  <p className="text-purple-300 text-[13px] font-bold">{data.keywordAnalysis.primaryKeyword}</p>
                                </div>
                                <div className="bg-[#080816] border border-[#1a1a30] rounded-xl p-3">
                                  <p className="text-gray-500 text-[10px] font-bold uppercase mb-1">Search Volume</p>
                                  <p className="text-white text-[13px] font-bold">{data.keywordAnalysis.searchVolume}</p>
                                </div>
                                <div className="bg-[#080816] border border-[#1a1a30] rounded-xl p-3">
                                  <p className="text-gray-500 text-[10px] font-bold uppercase mb-1">Competition</p>
                                  <p className={`text-[13px] font-bold ${data.keywordAnalysis.competition === "Low" ? "text-emerald-400" : data.keywordAnalysis.competition === "High" ? "text-red-400" : "text-amber-400"}`}>
                                    {data.keywordAnalysis.competition}
                                  </p>
                                </div>
                                <div className="bg-[#080816] border border-[#1a1a30] rounded-xl p-3">
                                  <p className="text-gray-500 text-[10px] font-bold uppercase mb-1">Related Keywords</p>
                                  <p className="text-gray-300 text-[11px] leading-relaxed">{(data.keywordAnalysis.secondaryKeywords || []).slice(0, 3).join(" · ") || "—"}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Content Tips + Improvements 2-column */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* Content Tips */}
                            {data.contentTips && data.contentTips.length > 0 && (
                              <div className="bg-[#0d0d1e]/90 backdrop-blur-sm border border-[#1e1e38] rounded-2xl p-5 shadow-xl">
                                <h4 className="text-white font-bold text-[13px] flex items-center gap-2 mb-3">
                                  <Lightbulb className="w-4 h-4 text-amber-400" />
                                  Content Strategy Tips
                                </h4>
                                <div className="space-y-2">
                                  {data.contentTips.map((tip, i) => (
                                    <div key={i} className="flex items-start gap-2.5 bg-[#080816] border border-[#1a1a30] rounded-xl px-3.5 py-2.5">
                                      <Zap className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                                      <p className="text-gray-300 text-[12px] leading-relaxed">{tip}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Improvements Made */}
                            {data.improvements && data.improvements.length > 0 && (
                              <div className="bg-[#0d0d1e]/90 backdrop-blur-sm border border-[#1e1e38] rounded-2xl p-5 shadow-xl">
                                <h4 className="text-white font-bold text-[13px] flex items-center gap-2 mb-3">
                                  <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                                  Optimizations Applied
                                </h4>
                                <div className="space-y-2">
                                  {data.improvements.map((imp, i) => (
                                    <div key={i} className="flex items-start gap-2.5 bg-[#080816] border border-[#1a1a30] rounded-xl px-3.5 py-2.5">
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                      <p className="text-gray-300 text-[12px] leading-relaxed">{imp}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Optimized Description Preview */}
                          {data.optimizedDescription && (
                            <div className="bg-[#0d0d1e]/90 backdrop-blur-sm border border-[#1e1e38] rounded-2xl p-5 shadow-xl">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-white font-bold text-[13px] flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-purple-400" />
                                  Optimized Description
                                </h4>
                                <button
                                  onClick={() => { setDescription(data.optimizedDescription!); toast.success("Description applied!"); }}
                                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-[11px] font-bold bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 transition-all"
                                >
                                  <Check className="w-3 h-3" /> Apply
                                </button>
                              </div>
                              <div className="bg-[#080816] border border-[#1a1a30] rounded-xl p-4 max-h-[200px] overflow-y-auto custom-scrollbar">
                                <p className="text-gray-300 text-[12px] leading-relaxed whitespace-pre-wrap">{data.optimizedDescription}</p>
                              </div>
                            </div>
                          )}

                          {/* Optimized Tags */}
                          {data.optimizedTags && data.optimizedTags.length > 0 && (
                            <div className="bg-[#0d0d1e]/90 backdrop-blur-sm border border-[#1e1e38] rounded-2xl p-5 shadow-xl">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-white font-bold text-[13px] flex items-center gap-2">
                                  <Tag className="w-4 h-4 text-purple-400" />
                                  AI-Recommended Tags
                                  <span className="text-gray-500 text-[10.5px] font-medium">({data.optimizedTags.length})</span>
                                </h4>
                                <button
                                  onClick={() => { setTags(data.optimizedTags!); toast.success(`Applied ${data.optimizedTags!.length} AI tags!`); }}
                                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-[11px] font-bold bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 transition-all"
                                >
                                  <Check className="w-3 h-3" /> Apply All Tags
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {data.optimizedTags.map((tag, i) => (
                                  <span key={i} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-colors cursor-default">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })() : (
                      /* Empty state — no AI results yet */
                      <div className="bg-[#0d0d1e]/90 backdrop-blur-sm border border-dashed border-[#252545] rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 to-transparent pointer-events-none" />
                        <div className="relative z-10">
                          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                            <Bot className="w-8 h-8 text-purple-400/50" />
                          </div>
                          <p className="text-gray-400 text-[14px] font-semibold mb-1">No AI Analysis Yet</p>
                          <p className="text-gray-500 text-[12px] max-w-sm mx-auto">
                            Click <strong className="text-purple-400">"Run Studio AI Optimization"</strong> above to generate SEO-optimized titles, keyword analysis, and content strategy recommendations.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Step 2 Footer Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <button onClick={() => setActiveStep(1)} className="px-5 py-2.5 text-[13px] text-gray-300 border border-[#252545] rounded-xl hover:bg-white/5 transition-all">Back</button>
                      <button onClick={() => setActiveStep(3)} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[13px] rounded-xl shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.03]">Next: Target Platforms <ArrowRight className="w-4 h-4" /></button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Platforms */}
                {activeStep === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-[#0d0d1e]/90 backdrop-blur-sm border border-[#1e1e38] rounded-2xl p-6 shadow-xl space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-bold text-[16px]">Select Target Platforms</h3>
                        <p className="text-gray-400 text-[12px]">Publish directly via official platform APIs</p>
                      </div>
                      <button onClick={selectAllPlatforms} className="text-purple-400 text-[12px] font-bold hover:underline">Select All Connected</button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {PLATFORMS.map((platform) => {
                        const isSelected = selectedPlatforms.includes(platform.id);
                        return (
                          <div
                            key={platform.id}
                            onClick={() => platform.connected && togglePlatform(platform.id)}
                            className={`p-4 rounded-2xl border transition-all duration-300 relative cursor-pointer ${
                              isSelected
                                ? `bg-gradient-to-br ${platform.color} border-purple-500/50 shadow-lg`
                                : platform.connected
                                ? "bg-[#080816] border-[#202040] hover:border-purple-500/30"
                                : "bg-[#080816]/50 border-[#14142a] opacity-50 cursor-not-allowed"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {platform.icon}
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-[13.5px] font-bold">{platform.name}</p>
                                <p className="text-gray-400 text-[11px] truncate">
                                  {platform.connected ? platform.accountName || "Connected Account" : "Not Connected"}
                                </p>
                              </div>
                              {isSelected ? (
                                <div className="w-5 h-5 rounded-md bg-purple-600 flex items-center justify-center text-white"><Check className="w-3.5 h-3.5 stroke-[3]" /></div>
                              ) : platform.connected ? (
                                <div className="w-5 h-5 rounded-md border border-[#252545]" />
                              ) : (
                                <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded-full">Connect</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <button onClick={() => setActiveStep(2)} className="px-5 py-2.5 text-[13px] text-gray-300 border border-[#252545] rounded-xl">Back</button>
                      <button
                        onClick={handlePublish}
                        disabled={isPublishing || !uploadedFile || !title.trim() || selectedPlatforms.length === 0}
                        className="flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-[13.5px] rounded-xl shadow-xl shadow-purple-900/40 transition-all hover:scale-105 disabled:opacity-50"
                      >
                        {isPublishing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RocketIcon size={16} />}
                        Publish Video Now
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: Confirm / Results */}
                {activeStep === 4 && publishResult && (
                  <motion.div
                    key="step-4"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#0d0d1e]/90 backdrop-blur-sm border border-[#1e1e38] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                      <CheckCircle className="w-10 h-10 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-white font-extrabold text-2xl">Published & Processing! 🎉</h2>
                      <p className="text-gray-400 text-[13px] mt-1">Your video payload was dispatched to your connected channels</p>
                    </div>

                    {/* Published Video Preview */}
                    <div className="max-w-md mx-auto bg-[#080816] border border-[#202040] rounded-xl overflow-hidden">
                      <div className="aspect-video bg-[#0a0a1a] flex items-center justify-center relative">
                        {thumbnailPreview ? (
                          <img src={thumbnailPreview} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Play className="w-12 h-12 text-purple-400/40" />
                        )}
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {visibility === "public" ? "🔓 Public" : visibility === "unlisted" ? "🔗 Unlisted" : "🔒 Private"}
                        </div>
                      </div>
                      <div className="p-3 text-left">
                        <p className="text-white text-[13px] font-bold truncate">{title || "Untitled Video"}</p>
                        <p className="text-gray-500 text-[11px] mt-0.5 truncate">{description || "No description"}</p>
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {tags.slice(0, 5).map((tag, i) => (
                              <span key={i} className="text-[9px] text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded-full">#{tag}</span>
                            ))}
                            {tags.length > 5 && <span className="text-[9px] text-gray-500">+{tags.length - 5} more</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 max-w-xl mx-auto text-left">
                      {Object.entries(publishResult.results).map(([platform, result]: [string, any]) => (
                        <div key={platform}>
                          <div className={`p-4 rounded-xl border flex items-center justify-between ${
                            result.success ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"
                          }`}>
                            <div className="flex items-center gap-3">
                              {PLATFORMS.find(p => p.id === platform)?.icon}
                              <div>
                                <p className="text-white text-[13px] font-bold capitalize">{platform}</p>
                                {result.success && result.url && (
                                  <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-purple-400 text-[11.5px] hover:underline flex items-center gap-1">
                                    View Published Video ↗
                                  </a>
                                )}
                                {!result.success && result.error && (
                                  <p className="text-red-400 text-[11px] mt-0.5">{result.error}</p>
                                )}
                              </div>
                            </div>
                            {result.url && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(result.url);
                                  setCopiedUrl(result.url);
                                  toast.success("URL copied!");
                                }}
                                className="p-2 text-gray-300 hover:text-white bg-white/5 rounded-lg text-[12px] flex items-center gap-1"
                              >
                                {copiedUrl === result.url ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                          {/* Thumbnail status warning */}
                          {result.success && result.thumbnailStatus && result.thumbnailStatus !== "set" && result.thumbnailStatus !== "not_provided" && (
                            <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                              ⚠ {result.thumbnailStatus === "channel_not_verified"
                                ? "Custom thumbnail couldn't be set — your YouTube channel needs phone verification. Visit youtube.com/verify, then set thumbnail manually in YouTube Studio."
                                : "Custom thumbnail couldn't be applied. You can set it manually in YouTube Studio."
                              }
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-center gap-4 pt-4">
                      <button onClick={() => navigate("/dashboard")} className="px-6 py-2.5 text-[13px] font-bold text-gray-300 border border-[#252545] rounded-xl hover:bg-white/5">
                        Back to Dashboard
                      </button>
                      <button onClick={() => navigate("/my-videos")} className="px-6 py-2.5 text-[13px] font-bold text-gray-300 border border-[#252545] rounded-xl hover:bg-white/5">
                        My Videos
                      </button>
                      <button
                        onClick={() => { reset(); setActiveStep(1); setTitle(""); setDescription(""); setTags([]); setPublishResult(null); setThumbnailPath(""); setThumbnailPreview(""); }}
                        className="px-6 py-2.5 bg-purple-600 text-white font-bold text-[13px] rounded-xl"
                      >
                        Upload Another Video
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Right Panel: Preview & AI Sidebar (Desktop & Mobile Drawer) ── */}
            <div className="w-[300px] flex-shrink-0 space-y-5 hidden xl:block">
              {/* Target Channels */}
              <div className="bg-[#0d0d1e]/90 border border-[#1e1e38] rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-bold text-[13px]">Target Channels</h4>
                  <button onClick={selectAllPlatforms} className="text-purple-400 text-[11px] font-bold hover:underline">Select All</button>
                </div>
                <div className="space-y-2">
                  {PLATFORMS.map((platform) => (
                    <div
                      key={platform.id}
                      onClick={() => platform.connected && togglePlatform(platform.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all ${
                        selectedPlatforms.includes(platform.id) ? "bg-purple-600/20 border border-purple-500/40" : "hover:bg-white/[0.03]"
                      } ${!platform.connected ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                        selectedPlatforms.includes(platform.id) ? "bg-purple-600 border-purple-500" : "border-[#252545]"
                      }`}>
                        {selectedPlatforms.includes(platform.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      {platform.icon}
                      <span className="text-white text-[12px] font-semibold flex-1">{platform.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Video Preview */}
              <div className="bg-[#0d0d1e]/90 border border-[#1e1e38] rounded-2xl p-4 shadow-xl">
                <h4 className="text-white font-bold text-[13px] mb-3">Live Video Card Preview</h4>
                <div className="aspect-video bg-[#080816] rounded-xl overflow-hidden border border-[#202040] flex items-center justify-center relative">
                  {thumbnailPreview ? (
                    <img src={thumbnailPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Play className="w-8 h-8 text-purple-400/50" />
                  )}
                </div>
                <p className="text-white text-[12px] font-bold mt-2 truncate">{title || "Untitled Video"}</p>
                <p className="text-gray-500 text-[10.5px] mt-0.5 truncate">{description || "No description provided..."}</p>
              </div>

              {/* AI Recommendations Widget */}
              <div className="bg-[#0d0d1e]/90 border border-[#1e1e38] rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-bold text-[13px] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    AI Best Time
                  </h4>
                  <span className="text-[9px] font-extrabold bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-500/30">AI Live</span>
                </div>
                <div className="bg-[#080816] border border-[#202040] rounded-xl p-3">
                  <p className="text-white text-[13px] font-bold">Today at 7:00 PM</p>
                  <p className="text-gray-400 text-[10.5px] mt-0.5">Peak subscriber activity window</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function RocketIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.71.79-1.81.2-2.71L4.5 16.5z" />
      <path d="M15 6s-4 1-7 4l-4 4c-.9.9-.9 2.5 0 3.4l2 2c.9.9 2.5.9 3.4 0l4-4c3-3 4-7 4-7z" />
      <path d="M9 15l-1.5 1.5" />
      <path d="M15 9l-1.5 1.5" />
      <path d="M21.5 2.5c-.8-.8-2-.8-2.8 0l-5 5c-.8.8-.8 2 0 2.8l5 5c.8.8 2 .8 2.8 0l5-5c.8-.8.8-2 0-2.8l-5-5z" />
    </svg>
  );
}
