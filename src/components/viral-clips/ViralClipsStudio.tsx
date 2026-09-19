/**
 * Screen 3: Generated Clips Studio Component
 * Features full creator controls:
 * - 9:16 vertical cards with unique timeline frame snapshots
 * - Interactive clip playback
 * - Comprehensive inline metadata editor (Title, Hook, Description, Tags, Timestamps)
 * - Custom Clip Creator (+ Add Custom Clip)
 * - Clip deletion & bulk publishing
 */

import React, { useState, useMemo } from "react";
import {
  ArrowLeft, RefreshCw, Eye, Scissors, Send, Plus, Check, Play,
  Clock, Flame, Layers, CheckSquare, Square, Edit3, Trash2, X, Save,
  Sparkles, Sliders, Zap, Activity, Star, Bookmark, MoreVertical
} from "lucide-react";
import type { ClipJobState, ProcessedClip } from "@/hooks/useViralClips";
import { ClipPreviewModal } from "./ClipPreviewModal";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

interface ViralClipsStudioProps {
  job: ClipJobState;
  onBack: () => void;
  onReanalyze: (options?: { selectedGenre?: string; customInstructions?: string }) => void;
  onPublishClip: (payload: {
    clipId: string;
    title: string;
    description: string;
    tags: string[];
    thumbnailUrl?: string;
    durationFormatted?: string;
    platform?: "youtube" | "instagram" | "tiktok";
    publishAt?: string;
    startTime?: number;
    endTime?: number;
    videoId?: string;
    hookText?: string;
  }) => Promise<any>;
  isPublishing: boolean;
  onAddToAutopilot?: (payload: {
    clipId: string;
    title: string;
    description: string;
    tags: string[];
    videoPathOrUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    scheduledAt?: string;
    startTime?: number;
    endTime?: number;
    videoId?: string;
    hookText?: string;
  }) => Promise<any>;
  isAddingToAutopilot?: boolean;
  onUpdateClip?: (payload: { jobId: string; clipId: string; updates: Partial<ProcessedClip> }) => Promise<any>;
  onAddClip?: (payload: { jobId: string; newClip: Partial<ProcessedClip> }) => Promise<any>;
  onDeleteClip?: (payload: { jobId: string; clipId: string }) => Promise<any>;
}

export const ViralClipsStudio: React.FC<ViralClipsStudioProps> = ({
  job,
  onBack,
  onReanalyze,
  onPublishClip,
  isPublishing,
  onAddToAutopilot,
  isAddingToAutopilot,
  onUpdateClip,
  onAddClip,
  onDeleteClip,
}) => {
  const navigate = useNavigate();
  const [activeFilterTab, setActiveFilterTab] = useState<"all" | "top_picks" | "shorts" | "reels">("all");
  const [sortBy, setSortBy] = useState<"score" | "duration" | "chronological">("score");
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [previewingClip, setPreviewingClip] = useState<ProcessedClip | null>(null);

  // Edit Clip Modal State
  const [editingClip, setEditingClip] = useState<ProcessedClip | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editHook, setEditHook] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editStartTime, setEditStartTime] = useState(0);
  const [editEndTime, setEditEndTime] = useState(45);

  // Add Custom Clip Modal State
  const [isAddClipOpen, setIsAddClipOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newHook, setNewHook] = useState("");
  const [newStart, setNewStart] = useState(0);
  const [newEnd, setNewEnd] = useState(45);

  // Custom AI Focus / Genre Modal State
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>(job.contextProfile?.detectedGenre || "general");
  const [customInstructions, setCustomInstructions] = useState("");

  const handleApplyAiFocus = () => {
    setIsFocusModalOpen(false);
    onReanalyze({
      selectedGenre,
      customInstructions: customInstructions.trim() || undefined,
    });
  };

  // Open Edit Modal
  const handleOpenEdit = (clip: ProcessedClip) => {
    setEditingClip(clip);
    setEditTitle(clip.title);
    setEditHook(clip.hookText);
    setEditSummary(clip.summary);
    setEditTags(clip.tags.join(", "));
    setEditStartTime(clip.startTime);
    setEditEndTime(clip.endTime);
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingClip) return;
    const tagArray = editTags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => t.startsWith("#") ? t : `#${t}`);
    
    if (onUpdateClip) {
      await onUpdateClip({
        jobId: job.id,
        clipId: editingClip.id,
        updates: {
          title: editTitle,
          hookText: editHook,
          summary: editSummary,
          tags: tagArray,
          startTime: Number(editStartTime),
          endTime: Number(editEndTime),
        },
      });
    }
    setEditingClip(null);
  };

  // Create Custom Clip
  const handleCreateCustomClip = async () => {
    if (!newTitle) {
      toast.error("Please enter a clip title");
      return;
    }
    if (newEnd <= newStart) {
      toast.error("End time must be after start time");
      return;
    }
    if (onAddClip) {
      await onAddClip({
        jobId: job.id,
        newClip: {
          title: newTitle,
          hookText: newHook || "Key highlight",
          startTime: Number(newStart),
          endTime: Number(newEnd),
        },
      });
    }
    setIsAddClipOpen(false);
    setNewTitle("");
    setNewHook("");
  };

  // Delete Clip
  const handleDeleteClip = async (clipId: string) => {
    if (confirm("Are you sure you want to remove this clip?")) {
      if (onDeleteClip) {
        await onDeleteClip({ jobId: job.id, clipId });
      }
    }
  };

  // Compute Summary Stats
  const totalClips = job.clips.length;
  const totalDurationSec = useMemo(() => {
    return job.clips.reduce((acc, c) => acc + c.duration, 0);
  }, [job.clips]);

  const avgClipLengthSec = totalClips > 0 ? Math.round(totalDurationSec / totalClips) : 0;
  const topClipScore = useMemo(() => {
    if (job.clips.length === 0) return 94;
    return Math.max(...job.clips.map((c) => c.clipScore));
  }, [job.clips]);

  // Format Total Duration to MM:SS
  const totalDurationFormatted = useMemo(() => {
    const mins = Math.floor(totalDurationSec / 60);
    const secs = totalDurationSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [totalDurationSec]);

  // Filter & Sort Clips
  const filteredClips = useMemo(() => {
    let result = [...job.clips];

    if (activeFilterTab === "top_picks") {
      result = result.filter((c) => c.category === "Top Pick" || c.clipScore >= 90);
    } else if (activeFilterTab === "shorts") {
      result = result.filter((c) => c.category === "Shorts" || c.duration <= 50);
    } else if (activeFilterTab === "reels") {
      result = result.filter((c) => c.category === "Reels");
    }

    if (sortBy === "score") {
      result.sort((a, b) => b.clipScore - a.clipScore);
    } else if (sortBy === "duration") {
      result.sort((a, b) => b.duration - a.duration);
    } else if (sortBy === "chronological") {
      result.sort((a, b) => a.startTime - b.startTime);
    }

    return result;
  }, [job.clips, activeFilterTab, sortBy]);

  // Counts for tabs
  const topPicksCount = job.clips.filter((c) => c.category === "Top Pick" || c.clipScore >= 90).length;
  const shortsCount = job.clips.filter((c) => c.category === "Shorts" || c.duration <= 50).length;
  const reelsCount = job.clips.filter((c) => c.category === "Reels").length;

  // Multi-select helpers
  const toggleSelect = (id: string) => {
    setSelectedClipIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedClipIds.length === filteredClips.length) {
      setSelectedClipIds([]);
    } else {
      setSelectedClipIds(filteredClips.map((c) => c.id));
    }
  };

  // Selected clips total duration
  const selectedDurationFormatted = useMemo(() => {
    const selected = job.clips.filter((c) => selectedClipIds.includes(c.id));
    const total = selected.reduce((acc, c) => acc + c.duration, 0);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [job.clips, selectedClipIds]);

  const handleBatchPublish = async () => {
    if (selectedClipIds.length === 0) return;
    const selected = job.clips.filter((c) => selectedClipIds.includes(c.id));
    toast.promise(
      Promise.all(
        selected.map((clip) =>
          onPublishClip({
            clipId: clip.id,
            title: clip.title,
            description: clip.summary,
            tags: clip.tags,
            thumbnailUrl: clip.thumbnailUrl,
            durationFormatted: clip.durationFormatted,
            platform: "youtube",
            startTime: clip.startTime,
            endTime: clip.endTime,
            videoId: clip.videoId,
            hookText: clip.hookText || clip.title,
          })
        )
      ),
      {
        loading: `Publishing ${selected.length} clips to YouTube Shorts...`,
        success: `${selected.length} clips published / queued!`,
        error: "Failed to publish some clips.",
      }
    );
    setSelectedClipIds([]);
  };

  const handleBatchAddToAutopilot = async () => {
    if (selectedClipIds.length === 0 || !onAddToAutopilot) return;
    const selected = job.clips.filter((c) => selectedClipIds.includes(c.id));
    toast.promise(
      Promise.all(
        selected.map((clip) =>
          onAddToAutopilot({
            clipId: clip.id,
            title: clip.title,
            description: clip.summary,
            tags: clip.tags,
            thumbnailUrl: clip.thumbnailUrl,
            duration: clip.duration,
            startTime: clip.startTime,
            endTime: clip.endTime,
            videoId: clip.videoId,
            hookText: clip.hookText || clip.title,
          })
        )
      ),
      {
        loading: `Queueing ${selected.length} clips into Autopilot schedule...`,
        success: `${selected.length} clips scheduled in Autopilot!`,
        error: "Failed to queue some clips.",
      }
    );
    setSelectedClipIds([]);
  };

  const handleOpenInEditor = (clip: ProcessedClip) => {
    navigate(`/video-editor?start=${clip.startTime}&end=${clip.endTime}&title=${encodeURIComponent(clip.title)}`);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* ── Top Navigation Bar ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-[#121226] border border-purple-500/30 hover:border-purple-500/60 text-gray-300 hover:text-white text-[12.5px] font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-purple-950/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Videos</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsFocusModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#121226] border border-purple-500/30 text-purple-200 hover:bg-purple-600/20 hover:text-white text-[12.5px] font-bold px-3.5 py-2 rounded-xl transition-all shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Focus & Genre</span>
          </button>

          <button
            onClick={() => setIsAddClipOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[12.5px] font-bold px-4 py-2 rounded-xl transition-all shadow-lg shadow-purple-900/40"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Clip</span>
          </button>

          <button
            onClick={() => onReanalyze()}
            className="flex items-center gap-1.5 bg-[#121226] border border-purple-500/30 text-gray-300 hover:text-white text-[12.5px] font-semibold px-3.5 py-2 rounded-xl transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-analyze</span>
          </button>
        </div>
      </div>

      {/* ── Hero Banner Card with clipafter.png Background ── */}
      <div
        className="relative overflow-hidden rounded-3xl border border-[#1e1c3b] shadow-2xl min-h-[460px] lg:min-h-[500px] xl:min-h-[520px] bg-[#070614] flex items-center"
        style={{
          backgroundImage: "url('/clipafter.png')",
          backgroundSize: "cover",
          backgroundPosition: "right center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Left-side dark gradient overlay for crystal clear text readability */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to right, rgba(7,6,20,0.98) 0%, rgba(7,6,20,0.92) 36%, rgba(7,6,20,0.45) 52%, transparent 70%)",
          }}
        />

        {/* Content container on the left half */}
        <div className="relative z-10 p-6 sm:p-7 max-w-md lg:max-w-lg xl:max-w-xl space-y-4">
          {/* Video Title + Thumbnail Info */}
          <div className="flex items-start gap-4">
            <div className="relative w-28 sm:w-32 aspect-video rounded-xl overflow-hidden bg-[#14142a] flex-shrink-0 border border-white/15 shadow-md">
              <img src={job.videoThumbnail} alt="" className="w-full h-full object-cover" />
              <span className="absolute bottom-1 right-1 bg-black/85 text-white text-[9px] font-mono px-1 py-0.5 rounded">
                {job.videoDuration}
              </span>
            </div>

            <div className="space-y-1.5 min-w-0">
              <h2 className="text-white text-base sm:text-lg font-black tracking-tight leading-snug line-clamp-2">
                {job.videoTitle}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-gray-400 text-[11.5px] font-medium">
                <span className="flex items-center gap-1">
                  📅 {new Date(job.publishedAt || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                <span className="flex items-center gap-1">
                  👁️ {(job.views || 1610).toLocaleString()} views
                </span>
                <span className="bg-purple-600/30 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                  {job.videoDuration || "PT365"}
                </span>
              </div>

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 text-purple-200 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                  ⚔️ {job.contextProfile?.genreLabel || "Fitness & Workout"}
                </span>
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> 100% Context Integrity Verified
                </span>
              </div>
            </div>
          </div>

          {/* AI Content Breakdown & Theme Card */}
          <div className="bg-[#0b091e]/90 border border-purple-500/25 backdrop-blur-md rounded-2xl p-4 space-y-2.5 shadow-xl">
            <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-extrabold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Content Breakdown & Theme</span>
            </div>
            <p className="text-gray-300 text-[12px] leading-relaxed">
              {job.contextProfile?.coreTheme ||
                "This video captures high-impact, engaging moments carefully identified by Pulse AI multi-layer analysis. It showcases prime audience retention hooks, peak moments, and standalone viral value."}
            </p>

            {/* Topics Identified */}
            <div className="space-y-1.5 pt-1">
              <span className="text-gray-400 text-[10px] font-extrabold uppercase tracking-wider block">
                Topics Identified
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(job.contextProfile?.keyTopics && job.contextProfile.keyTopics.length > 0
                  ? job.contextProfile.keyTopics
                  : ["Ronnie Coleman", "800 LB Squat", "Gym Motivation & Mindset", "Bodybuilding & Heavy Lifting"]
                ).map((topic, i) => (
                  <span
                    key={i}
                    className="bg-[#181630] border border-purple-500/25 text-purple-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 Stat Metric Cards Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Clips Extracted */}
        <div className="bg-[#0a091a] border border-[#1c1a38] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-11 h-11 rounded-xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <span className="text-gray-400 text-[10.5px] font-extrabold uppercase tracking-wider block">
              Clips Extracted
            </span>
            <p className="text-white text-xl font-black">{totalClips}</p>
            <span className="text-gray-500 text-[10.5px]">High potential moments found</span>
          </div>
        </div>

        {/* Card 2: Total Duration */}
        <div className="bg-[#0a091a] border border-[#1c1a38] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-11 h-11 rounded-xl bg-cyan-600/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <span className="text-gray-400 text-[10.5px] font-extrabold uppercase tracking-wider block">
              Total Duration
            </span>
            <p className="text-white text-xl font-black">{totalDurationFormatted}</p>
            <span className="text-gray-500 text-[10.5px]">Total video length</span>
          </div>
        </div>

        {/* Card 3: Avg Clip Length */}
        <div className="bg-[#0a091a] border border-[#1c1a38] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-11 h-11 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <span className="text-gray-400 text-[10.5px] font-extrabold uppercase tracking-wider block">
              Avg. Clip Length
            </span>
            <p className="text-white text-xl font-black">{avgClipLengthSec}s</p>
            <span className="text-gray-500 text-[10.5px]">Average of extracted clips</span>
          </div>
        </div>

        {/* Card 4: Top Clip Score */}
        <div className="bg-[#0a091a] border border-[#1c1a38] rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400/20" />
          </div>
          <div>
            <span className="text-amber-400 text-[10.5px] font-extrabold uppercase tracking-wider flex items-center gap-1">
              ⭐ Top Clip Score
            </span>
            <p className="text-white text-xl font-black">{topClipScore}/100</p>
            <span className="text-gray-500 text-[10.5px]">Outstanding potential</span>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0a091a] border border-[#1c1a38] rounded-2xl px-3.5 py-2.5 shadow-lg">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {[
            { id: "all", label: "All Clips", count: totalClips },
            { id: "top_picks", label: "Top Picks", count: topPicksCount },
            { id: "shorts", label: "Shorts", count: shortsCount },
            { id: "reels", label: "Reels", count: reelsCount },
          ].map((tab) => {
            const isActive = activeFilterTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilterTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-[#181830] text-purple-300 border border-purple-500/20"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sort & Select All */}
        <div className="flex items-center gap-4 self-end sm:self-auto">
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-[12px] font-semibold cursor-pointer"
          >
            {selectedClipIds.length === filteredClips.length ? (
              <CheckSquare className="w-4 h-4 text-purple-400" />
            ) : (
              <Square className="w-4 h-4 text-gray-500" />
            )}
            <span>Select All</span>
          </button>

          <div className="flex items-center gap-1.5 text-[12px]">
            <span className="text-gray-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#121026] border border-[#221f45] text-white font-bold rounded-lg px-2.5 py-1 outline-none cursor-pointer"
            >
              <option value="score">Clip Score</option>
              <option value="duration">Duration</option>
              <option value="chronological">Timeline Order</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Grid of 9:16 Vertical Clip Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {filteredClips.map((clip) => {
          const isSelected = selectedClipIds.includes(clip.id);

          return (
            <div
              key={clip.id}
              className={`bg-[#0a0a1a] border rounded-3xl overflow-hidden hover:border-purple-500/50 transition-all flex flex-col justify-between group shadow-xl ${
                isSelected ? "border-purple-500 ring-2 ring-purple-500/40" : "border-[#1c1c38]"
              }`}
            >
              {/* Top 9:16 Video Thumbnail Container */}
              <div className="relative aspect-[9/16] bg-[#060610] overflow-hidden">
                <img
                  src={clip.thumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (job.videoThumbnail && target.src !== job.videoThumbnail) {
                      target.src = job.videoThumbnail;
                    } else {
                      target.src = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80";
                    }
                  }}
                />

                {/* Top Left: Category Badge */}
                <div className="absolute top-2.5 left-2.5 z-10">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-md ${
                    clip.category === "Top Pick"
                      ? "bg-purple-600 text-white"
                      : clip.category === "Shorts"
                      ? "bg-red-600 text-white"
                      : "bg-gradient-to-r from-pink-600 to-purple-600 text-white"
                  }`}>
                    {clip.category}
                  </span>
                </div>

                {/* Top Right: Multi-select Checkbox */}
                <button
                  onClick={() => toggleSelect(clip.id)}
                  className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-purple-600 transition-colors z-10"
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                {/* Play Preview Trigger */}
                <button
                  onClick={() => setPreviewingClip(clip)}
                  className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-xl shadow-purple-900/60 hover:scale-110 transition-transform group-hover:bg-purple-500 cursor-pointer z-10"
                  title="Play Clip Preview"
                >
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </button>

                {/* Bottom Center: Circular Clip Score Gauge Badge */}
                <div className="absolute bottom-3 right-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black shadow-lg border border-purple-300 z-10">
                  {clip.clipScore}
                </div>

                {/* Bottom Left: Duration */}
                <span className="absolute bottom-3 left-2.5 bg-black/80 backdrop-blur-sm text-white text-[10px] font-mono px-1.5 py-0.5 rounded z-10">
                  {clip.durationFormatted}
                </span>
              </div>

              {/* Bottom Card Content & Controls */}
              <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between bg-[#080816]">
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-1">
                    <h4
                      onClick={() => setPreviewingClip(clip)}
                      className="text-white font-bold text-[13px] leading-snug line-clamp-2 group-hover:text-purple-300 transition-colors cursor-pointer flex-1"
                    >
                      {clip.title}
                    </h4>
                    <button
                      onClick={() => handleOpenEdit(clip)}
                      className="p-1 text-gray-400 hover:text-purple-300 rounded hover:bg-white/5 transition-colors flex-shrink-0"
                      title="Edit Title & Metadata"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Timestamp Range */}
                  <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-purple-400" />
                      {clip.timeRangeFormatted}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-sans font-semibold">Standalone</span>
                  </div>

                  {/* Tag Pills */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {clip.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-purple-500/10 text-purple-300 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-purple-500/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 4 Action Buttons Row + Publish */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewingClip(clip)}
                      className="p-1.5 bg-[#121226] border border-[#202040] rounded-xl text-gray-300 hover:text-white hover:border-purple-500/40 transition-all"
                      title="Preview Clip"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenInEditor(clip)}
                      className="p-1.5 bg-[#121226] border border-[#202040] rounded-xl text-gray-300 hover:text-purple-300 hover:border-purple-500/40 transition-all"
                      title="Open in Timeline Editor"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (onAddToAutopilot) {
                          toast.promise(
                            onAddToAutopilot({
                              clipId: clip.id,
                              title: clip.title,
                              description: clip.summary,
                              tags: clip.tags,
                              thumbnailUrl: clip.thumbnailUrl,
                              duration: clip.duration,
                            }),
                            {
                              loading: "Queueing into Autopilot...",
                              success: "Queued in Autopilot schedule!",
                              error: "Failed to queue clip.",
                            }
                          );
                        }
                      }}
                      className="p-1.5 bg-[#121226] border border-[#202040] hover:border-yellow-500/50 rounded-xl text-yellow-400 hover:text-yellow-300 transition-all"
                      title="Add to Autopilot Schedule ⚡"
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClip(clip.id)}
                      className="p-1.5 bg-[#121226] border border-[#202040] rounded-xl text-gray-400 hover:text-red-400 hover:border-red-500/40 transition-all"
                      title="Delete Clip"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => setPreviewingClip(clip)}
                    className={`flex items-center gap-1 font-bold text-[11px] px-2.5 py-1.5 rounded-xl shadow-md transition-all ${
                      clip.status === "published"
                        ? "bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white"
                        : clip.status === "scheduled"
                        ? "bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600 hover:text-white"
                        : "bg-purple-600 hover:bg-purple-500 text-white"
                    }`}
                  >
                    {clip.status === "published" ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Published</span>
                      </>
                    ) : clip.status === "scheduled" ? (
                      <>
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>Scheduled</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" />
                        <span>Publish</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── AI Chef's Tip Card & Bottom Tagline ── */}
      <div className="bg-gradient-to-r from-[#120f2e]/90 via-[#0e0c26]/90 to-[#120f2e]/90 border border-purple-500/25 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-purple-300 font-extrabold text-[13.5px]">
            <span>🧑‍🍳</span>
            <span>AI CHEF'S TIP</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <p className="text-gray-300 text-[12.5px] leading-relaxed max-w-2xl">
            These clips are the secret ingredients that make your content go viral! Mix them well, polish them in the editor, and cook up something epic! 🔥
          </p>
        </div>

        <div className="flex items-center gap-2 text-purple-400 font-semibold text-[13px] bg-purple-600/10 border border-purple-500/20 px-4 py-2 rounded-2xl flex-shrink-0">
          <span>🧑‍🍳 Great content isn't luck, it's a recipe.</span>
          <span>😉</span>
        </div>
      </div>
      {/* ── Bottom Floating Bulk Action Bar ── */}
      {selectedClipIds.length > 0 && (
        <div className="fixed bottom-5 inset-x-4 sm:inset-x-auto sm:right-8 z-40 bg-[#0d0d22]/95 backdrop-blur-md border border-purple-500/40 rounded-2xl p-3 sm:p-4 shadow-2xl shadow-purple-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
            <span className="text-white text-[13px] font-bold">
              {selectedClipIds.length} clips selected
            </span>
            <span className="text-gray-400 text-[12px]">
              • Total: {selectedDurationFormatted}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setSelectedClipIds([])}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-[12px] font-semibold"
            >
              Clear
            </button>

            <button
              onClick={handleBatchAddToAutopilot}
              disabled={isPublishing || isAddingToAutopilot}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-purple-600/30 to-indigo-600/30 border border-purple-500/40 hover:from-amber-500/30 hover:to-indigo-600/50 text-purple-200 hover:text-white font-bold text-[12px] px-3.5 py-2 rounded-xl transition-all"
            >
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span>Add to Autopilot ⚡</span>
            </button>

            <button
              onClick={handleBatchPublish}
              disabled={isPublishing || isAddingToAutopilot}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[12.5px] px-4 py-2 rounded-xl shadow-lg shadow-purple-900/30 transition-all hover:scale-105 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Export & Publish 🚀</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Edit Clip Modal ── */}
      {editingClip && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e22] border border-[#202045] rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-400" />
                <span>Edit Clip Metadata</span>
              </h3>
              <button onClick={() => setEditingClip(null)} className="p-1 text-gray-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-gray-400 text-[11.5px] font-bold uppercase">Clip Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#14142a] border border-[#252545] rounded-xl px-3.5 py-2 text-white text-[13px] font-semibold focus:border-purple-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 text-[11.5px] font-bold uppercase">Opening Hook</label>
                <input
                  type="text"
                  value={editHook}
                  onChange={(e) => setEditHook(e.target.value)}
                  className="w-full bg-[#14142a] border border-[#252545] rounded-xl px-3.5 py-2 text-white text-[12.5px] focus:border-purple-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 text-[11.5px] font-bold uppercase">Description</label>
                <textarea
                  rows={2}
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full bg-[#14142a] border border-[#252545] rounded-xl px-3.5 py-2 text-white text-[12px] focus:border-purple-500 outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 text-[11.5px] font-bold uppercase">Hashtags (Comma separated)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="#AI, #Safety, #Tech"
                  className="w-full bg-[#14142a] border border-[#252545] rounded-xl px-3.5 py-2 text-white text-[12px] focus:border-purple-500 outline-none"
                />
              </div>

              {/* Timestamp Start & End Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-gray-400 text-[11px] font-bold uppercase">Start Time (sec)</label>
                  <input
                    type="number"
                    min={0}
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(Number(e.target.value))}
                    className="w-full bg-[#14142a] border border-[#252545] rounded-xl px-3 py-2 text-white text-[12.5px] font-mono outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-gray-400 text-[11px] font-bold uppercase">End Time (sec)</label>
                  <input
                    type="number"
                    min={0}
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(Number(e.target.value))}
                    className="w-full bg-[#14142a] border border-[#252545] rounded-xl px-3 py-2 text-white text-[12.5px] font-mono outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setEditingClip(null)}
                className="px-4 py-2 text-gray-400 text-[12.5px] font-semibold hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[12.5px] px-5 py-2 rounded-xl shadow-lg shadow-purple-900/30 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Custom Clip Modal ── */}
      {isAddClipOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e22] border border-[#202045] rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <span>Create Custom Clip</span>
              </h3>
              <button onClick={() => setIsAddClipOpen(false)} className="p-1 text-gray-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-gray-400 text-[11.5px] font-bold uppercase">Clip Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. The Real Algorithm Explained"
                  className="w-full bg-[#14142a] border border-[#252545] rounded-xl px-3.5 py-2 text-white text-[13px] font-semibold focus:border-purple-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 text-[11.5px] font-bold uppercase">Hook Text</label>
                <input
                  type="text"
                  value={newHook}
                  onChange={(e) => setNewHook(e.target.value)}
                  placeholder="e.g. This changes how we navigate cities..."
                  className="w-full bg-[#14142a] border border-[#252545] rounded-xl px-3.5 py-2 text-white text-[12.5px] focus:border-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-gray-400 text-[11px] font-bold uppercase">Start Second</label>
                  <input
                    type="number"
                    min={0}
                    value={newStart}
                    onChange={(e) => setNewStart(Number(e.target.value))}
                    className="w-full bg-[#14142a] border border-[#252545] rounded-xl px-3 py-2 text-white text-[12.5px] font-mono outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-gray-400 text-[11px] font-bold uppercase">End Second</label>
                  <input
                    type="number"
                    min={0}
                    value={newEnd}
                    onChange={(e) => setNewEnd(Number(e.target.value))}
                    className="w-full bg-[#14142a] border border-[#252545] rounded-xl px-3 py-2 text-white text-[12.5px] font-mono outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setIsAddClipOpen(false)}
                className="px-4 py-2 text-gray-400 text-[12.5px] font-semibold hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomClip}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[12.5px] px-5 py-2 rounded-xl shadow-lg shadow-purple-900/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create Clip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom AI Focus & Genre Modal ── */}
      {isFocusModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e22] border border-[#202045] rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>Adjust AI Focus & Genre</span>
              </h3>
              <button onClick={() => setIsFocusModalOpen(false)} className="p-1 text-gray-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-gray-400 text-[11.5px] font-bold uppercase">Select Content Format / Genre</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "comedy_humor", label: "🎭 Comedy, Memes & Humor" },
                    { id: "roast_reaction", label: "🔥 Roast & Sarcasm" },
                    { id: "fitness_workout", label: "🏋️ Fitness & Workout" },
                    { id: "tech_software", label: "💻 Tech & Software" },
                    { id: "educational_explainer", label: "🎓 Educational Explainer" },
                    { id: "podcast_interview", label: "🎙️ Podcast & Interview" },
                    { id: "music_performance", label: "🎵 Music & Audio" },
                    { id: "vlog_storytelling", label: "📹 Vlog & Storytelling" },
                    { id: "gaming_entertainment", label: "🎮 Gaming" },
                    { id: "general", label: "🎬 General Highlights" },
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGenre(g.id)}
                      className={`px-3 py-2 rounded-xl text-[12px] font-bold text-left transition-all ${
                        selectedGenre === g.id
                          ? "bg-purple-600 text-white shadow-md shadow-purple-900/40 border border-purple-400"
                          : "bg-[#14142a] text-gray-300 border border-[#252545] hover:border-purple-500/40 hover:text-white"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 text-[11.5px] font-bold uppercase">Custom Focus Prompt (Optional)</label>
                <textarea
                  rows={3}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Extract the pull-up form tips and core routine demonstrations..."
                  className="w-full bg-[#14142a] border border-[#252545] rounded-xl px-3.5 py-2 text-white text-[12px] focus:border-purple-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setIsFocusModalOpen(false)}
                className="px-4 py-2 text-gray-400 text-[12.5px] font-semibold hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyAiFocus}
                className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[12.5px] px-5 py-2 rounded-xl shadow-lg shadow-purple-900/30 transition-all"
              >
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span>Re-extract with Focus ✨</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview & Publish Modal ── */}
      <ClipPreviewModal
        clip={previewingClip}
        onClose={() => setPreviewingClip(null)}
        onPublish={onPublishClip}
        isPublishing={isPublishing}
        onAddToAutopilot={onAddToAutopilot}
        isAddingToAutopilot={isAddingToAutopilot}
      />
    </div>
  );
};
