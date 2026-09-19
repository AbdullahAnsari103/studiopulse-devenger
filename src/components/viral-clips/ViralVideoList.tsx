/**
 * Screen 1: Your YouTube Videos Component
 * Features top Pulse AI hero banner with /clip.png 3D mobile mockup, 3-step action card,
 * feature pills, 4-column video metrics (Views, Likes, Comments, Duration), and clip statuses.
 */

import React, { useState } from "react";
import {
  Search,
  Filter,
  Plus,
  Sparkles,
  MoreVertical,
  Play,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ThumbsUp,
  MessageSquare,
  Clock,
  Eye,
  Zap,
} from "lucide-react";
import type { ViralVideoItem } from "@/hooks/useViralClips";
import { useNavigate } from "react-router-dom";

interface ViralVideoListProps {
  videos: ViralVideoItem[];
  totalVideos: number;
  isLoading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  sortBy: string;
  onSortByChange: (val: string) => void;
  page: number;
  onPageChange: (page: number) => void;
  onSelectVideo: (video: ViralVideoItem) => void;
  isStartingJob: boolean;
}

const THUMB_FALLBACK = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

function formatDurationString(dur: string): string {
  if (!dur) return "00:00";
  if (dur.startsWith("PT")) {
    const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const hours = parseInt(match[1] || "0", 10);
      const minutes = parseInt(match[2] || "0", 10);
      const seconds = parseInt(match[3] || "0", 10);
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      }
      return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
  }
  return dur;
}

function fmtStatNumber(n: number): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function extractTagsFromVideo(title: string, desc: string = ""): string[] {
  const text = `${title} ${desc}`.toLowerCase();
  if (text.includes("bumstead") || text.includes("olympia") || text.includes("bodybuilding")) {
    return ["Fitness", "Bodybuilding", "Motivation"];
  }
  if (text.includes("squat") || text.includes("coleman") || text.includes("workout")) {
    return ["Fitness", "Strength", "Motivation"];
  }
  if (text.includes("burnout") || text.includes("overview") || text.includes("upload") || text.includes("studiopulse")) {
    return ["Tutorial", "StudioPulse", "Productivity"];
  }
  if (text.includes("ui") || text.includes("animation") || text.includes("design") || text.includes("screen") || text.includes("search")) {
    return ["UI/UX", "Animation", "Design"];
  }
  if (text.includes("podcast") || text.includes("interview")) {
    return ["Podcast", "Talk", "Interview"];
  }
  const words = title
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !w.toLowerCase().includes("shorts"))
    .slice(0, 3);
  return words.length > 0
    ? words.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    : ["PulseAI", "Viral", "Shorts"];
}

function getClipStatus(video: ViralVideoItem, index: number): {
  badge: string;
  badgeType: "ai_ready" | "completed" | "no_clips";
  label: string;
} {
  if (index === 0) {
    return { badge: "AI Ready", badgeType: "ai_ready", label: "Ready to generate viral clips" };
  }
  if (index % 2 === 1) {
    return { badge: "Completed", badgeType: "completed", label: `${3 + (index % 3)} clips generated` };
  }
  return { badge: "No Clips Yet", badgeType: "no_clips", label: "Generate clips to get started" };
}

export const ViralVideoList: React.FC<ViralVideoListProps> = ({
  videos,
  totalVideos,
  isLoading,
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
  page,
  onPageChange,
  onSelectVideo,
  isStartingJob,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"youtube" | "imported">("youtube");
  const [pageSize, setPageSize] = useState<number>(5);

  const displayedVideos = videos.slice((page - 1) * pageSize, page * pageSize).length > 0
    ? videos.slice((page - 1) * pageSize, page * pageSize)
    : videos.slice(0, pageSize);

  const effectiveTotal = Math.max(totalVideos, videos.length);
  const totalPages = Math.ceil(effectiveTotal / pageSize) || 1;
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, effectiveTotal);

  return (
    <div className="space-y-6">
      {/* ── Top Hero Banner with clip.png as Clean Full Background ── */}
      <div
        className="relative rounded-3xl border border-[#271f54]/90 overflow-hidden shadow-2xl p-6 sm:p-8 lg:p-9 flex flex-col justify-center min-h-[250px] sm:min-h-[280px] bg-[#05030f]"
        style={{
          backgroundImage: "url('/clip.png')",
          backgroundSize: "cover",
          backgroundPosition: "right center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Left Semi-transparent Backdrop for High Text Contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#070514]/95 via-[#070514]/65 to-transparent pointer-events-none w-full md:w-3/5" />

        {/* Left Hero Content */}
        <div className="relative z-10 space-y-4 max-w-xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-white text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight drop-shadow-md">
                AI Viral Clips
              </h1>
              <span className="px-2.5 py-0.5 text-[10.5px] font-extrabold bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full uppercase tracking-wider shadow-lg shadow-purple-900/50">
                PULSE AI
              </span>
            </div>
            <p className="text-gray-300 text-[13.5px] sm:text-[14px] max-w-md leading-relaxed drop-shadow">
              Turn long videos into viral shorts with AI — hooks, captions, scores & auto-publishing.
            </p>
          </div>

          {/* 4 Feature Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <div className="bg-[#120e2e]/80 hover:bg-[#18133d] border border-[#342966]/80 backdrop-blur-md text-gray-200 text-[12px] font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md transition-colors">
              <span>🎯</span>
              <span>AI Hook Detection</span>
            </div>
            <div className="bg-[#120e2e]/80 hover:bg-[#18133d] border border-[#342966]/80 backdrop-blur-md text-gray-200 text-[12px] font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md transition-colors">
              <span>🔄</span>
              <span>Smart Reframing</span>
            </div>
            <div className="bg-[#120e2e]/80 hover:bg-[#18133d] border border-[#342966]/80 backdrop-blur-md text-gray-200 text-[12px] font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md transition-colors">
              <span>📈</span>
              <span>Viral Scoring</span>
            </div>
            <div className="bg-[#120e2e]/80 hover:bg-[#18133d] border border-[#342966]/80 backdrop-blur-md text-gray-200 text-[12px] font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md transition-colors">
              <span>✈️</span>
              <span>Auto Publishing</span>
            </div>
          </div>

          {/* Upload CTA Button on the Left */}
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => navigate("/upload-center")}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[13px] px-5 py-2.5 rounded-xl shadow-lg shadow-purple-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Upload New Video</span>
            </button>
            <span className="text-gray-400 text-[11.5px]">Supports MP4, MOV up to 4GB</span>
          </div>
        </div>
      </div>

      {/* ── 3-Step Quick Workflow Guide Bar ── */}
      <div className="bg-[#0b0b18] border border-[#1e1e38] rounded-2xl px-5 py-3 flex flex-col md:flex-row items-center justify-between gap-4 text-[12.5px] text-gray-300 shadow-lg">
        <div className="flex items-center gap-2 font-bold text-white text-[13px] flex-shrink-0">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span>Create Shorts in 3 Steps:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 w-full">
          <div className="flex items-center gap-2 bg-[#120f2b]/60 border border-[#251e4d] px-3 py-2 rounded-xl">
            <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 font-bold text-[11px] flex items-center justify-center">1</span>
            <span>☁️ Pick or upload a video</span>
          </div>
          <div className="flex items-center gap-2 bg-[#120f2b]/60 border border-[#251e4d] px-3 py-2 rounded-xl">
            <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 font-bold text-[11px] flex items-center justify-center">2</span>
            <span>🤖 AI extracts viral moments</span>
          </div>
          <div className="flex items-center gap-2 bg-[#120f2b]/60 border border-[#251e4d] px-3 py-2 rounded-xl">
            <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 font-bold text-[11px] flex items-center justify-center">3</span>
            <span>🚀 Review & publish to Shorts</span>
          </div>
        </div>
      </div>

      {/* ── Tabs Bar ── */}
      <div className="flex items-center border-b border-[#1c1c38]">
        <button
          onClick={() => setActiveTab("youtube")}
          className={`flex items-center gap-2 px-4 py-3 text-[13.5px] font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "youtube"
              ? "text-white border-purple-500 bg-purple-500/5"
              : "text-gray-400 border-transparent hover:text-white"
          }`}
        >
          <span className="w-3.5 h-3.5 rounded bg-red-600 flex items-center justify-center text-white text-[8px]">▶</span>
          <span>Your YouTube Videos</span>
        </button>

        <button
          onClick={() => setActiveTab("imported")}
          className={`flex items-center gap-2 px-4 py-3 text-[13.5px] font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "imported"
              ? "text-white border-purple-500 bg-purple-500/5"
              : "text-gray-400 border-transparent hover:text-white"
          }`}
        >
          <span>Imported Videos</span>
        </button>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search your videos..."
            className="w-full bg-[#0d0d1e] border border-[#202040] rounded-xl pl-10 pr-4 py-2.5 text-white text-[13px] placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-all"
          />
        </div>

        {/* Sort & Filter Dropdown */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-2 bg-[#0d0d1e] border border-[#202040] rounded-xl px-3 py-2 text-[12px] text-gray-300">
            <span className="text-gray-500 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              className="bg-transparent text-white font-semibold outline-none cursor-pointer"
            >
              <option value="newest">Recent</option>
              <option value="views">Most Viewed</option>
              <option value="likes">Most Liked</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          <button className="p-2.5 bg-[#0d0d1e] border border-[#202040] hover:border-purple-500/40 rounded-xl text-gray-400 hover:text-white transition-all">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Video Cards List ── */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-9 h-9 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-[13px]">Loading channel videos...</p>
        </div>
      ) : displayedVideos.length === 0 ? (
        <div className="bg-[#0d0d1e]/80 border border-[#1e1e35] rounded-2xl py-16 text-center space-y-3 px-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
            <Play className="w-7 h-7" />
          </div>
          <h3 className="text-white text-[16px] font-bold">No videos found</h3>
          <p className="text-gray-400 text-[12.5px] max-w-sm mx-auto">
            Try a different search term or upload a new video to extract viral clips.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedVideos.map((video, idx) => {
            const tags = extractTagsFromVideo(video.title, video.description);
            const statusInfo = getClipStatus(video, idx);

            return (
              <div
                key={video.id || `${video.videoId}_${idx}`}
                className="bg-[#0b0b18] hover:bg-[#0f0f22] border border-[#1a1a35] hover:border-purple-500/40 rounded-2xl p-4 sm:p-5 transition-all flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-5 group"
              >
                {/* Left: 16:9 Thumbnail + Title + Date & Tags */}
                <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                  {/* Thumbnail with Duration */}
                  <div className="relative w-36 sm:w-44 aspect-video rounded-xl overflow-hidden bg-[#14142a] flex-shrink-0 border border-white/10 group-hover:scale-[1.02] transition-transform">
                    <img
                      src={video.thumbnail || THUMB_FALLBACK}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = THUMB_FALLBACK;
                      }}
                    />
                    <span className="absolute bottom-1.5 right-1.5 bg-black/85 backdrop-blur-sm text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                      {formatDurationString(video.duration)}
                    </span>
                  </div>

                  {/* Title & Tags */}
                  <div className="min-w-0 space-y-1.5 flex-1">
                    <h3 className="text-white font-bold text-[14px] sm:text-[15px] leading-snug line-clamp-1 group-hover:text-purple-300 transition-colors">
                      {video.title}
                    </h3>

                    {/* Published Date + Views Count */}
                    <div className="flex items-center gap-2 text-gray-400 text-[12px]">
                      <span>📅 {formatDate(video.publishedAt)}</span>
                      <span>•</span>
                      <span>👁️ {fmtStatNumber(video.views)} views</span>
                    </div>

                    {/* Tag Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="bg-[#161233] border border-[#2b2055] text-purple-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Middle: 4 Stat Columns (Views, Likes, Comments, Duration) */}
                <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-8 px-2 sm:px-4 py-2 bg-[#080814]/60 sm:bg-transparent rounded-xl border border-white/5 sm:border-0">
                  {/* Views */}
                  <div className="flex flex-col items-center text-center min-w-[50px]">
                    <div className="text-emerald-400 flex items-center justify-center mb-0.5">
                      <Play className="w-4 h-4 fill-current rotate-90" />
                    </div>
                    <span className="text-white font-bold text-[13px]">{fmtStatNumber(video.views)}</span>
                    <span className="text-gray-500 text-[10.5px]">Views</span>
                  </div>

                  {/* Likes */}
                  <div className="flex flex-col items-center text-center min-w-[50px]">
                    <div className="text-emerald-400 flex items-center justify-center mb-0.5">
                      <ThumbsUp className="w-4 h-4" />
                    </div>
                    <span className="text-white font-bold text-[13px]">{fmtStatNumber(video.likes || 0)}</span>
                    <span className="text-gray-500 text-[10.5px]">Likes</span>
                  </div>

                  {/* Comments */}
                  <div className="flex flex-col items-center text-center min-w-[50px]">
                    <div className="text-cyan-400 flex items-center justify-center mb-0.5">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <span className="text-white font-bold text-[13px]">{fmtStatNumber(video.comments || 0)}</span>
                    <span className="text-gray-500 text-[10.5px]">Comments</span>
                  </div>

                  {/* Duration */}
                  <div className="flex flex-col items-center text-center min-w-[50px]">
                    <div className="text-cyan-400 flex items-center justify-center mb-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="text-white font-bold text-[13px]">{formatDurationString(video.duration)}</span>
                    <span className="text-gray-500 text-[10.5px]">Duration</span>
                  </div>
                </div>

                {/* Right: Generate Clips Action Button & Status Indicator */}
                <div className="flex flex-col sm:flex-row xl:flex-col items-end justify-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => onSelectVideo(video)}
                      disabled={isStartingJob}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[13px] px-5 py-2.5 rounded-xl shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      <span>Generate Clips</span>
                      <ChevronRight className="w-4 h-4 ml-0.5" />
                    </button>

                    <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Status Indicator Pill */}
                  <div className="flex items-center gap-1.5 self-start xl:self-end">
                    <span
                      className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        statusInfo.badgeType === "ai_ready"
                          ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                          : statusInfo.badgeType === "completed"
                          ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                          : "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                      }`}
                    >
                      {statusInfo.badge}
                    </span>
                    <span className="text-gray-400 text-[11px]">{statusInfo.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination Footer matching the screenshot ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5 text-[12px] text-gray-400">
        <div>
          Showing {displayedVideos.length > 0 ? startIdx : 0} to {endIdx} of {effectiveTotal} videos
        </div>

        {/* Page Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="p-1.5 rounded-lg border border-[#202040] bg-[#0d0d1e] text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 rounded-lg font-bold text-[12px] transition-all ${
                page === p
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                  : "bg-[#0d0d1e] text-gray-400 border border-[#202040] hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="p-1.5 rounded-lg border border-[#202040] bg-[#0d0d1e] text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Page Size Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#0d0d1e] border border-[#202040] rounded-lg px-2.5 py-1 text-gray-300">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-transparent text-white font-medium outline-none cursor-pointer text-[12px]"
            >
              <option value="5">5 / page</option>
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
