/**
 * ClipPreviewModal — 9:16 Vertical Video Preview and 1-Click Shorts Publisher Modal.
 * Supports interactive YouTube/HTML5 video playback with exact timestamps (startTime -> endTime),
 * Smart Crop / Blurred Backdrop framing, dynamic captions, 1-Click Shorts Publishing, and Autopilot Queue Scheduling.
 */

import React, { useState } from "react";
import { X, Play, Pause, RotateCcw, Send, Calendar, Check, Volume2, VolumeX, Sparkles, ExternalLink, CheckCircle, Zap } from "lucide-react";
import type { ProcessedClip } from "@/hooks/useViralClips";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

interface ClipPreviewModalProps {
  clip: ProcessedClip | null;
  onClose: () => void;
  onPublish: (payload: {
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
}

export const ClipPreviewModal: React.FC<ClipPreviewModalProps> = ({
  clip,
  onClose,
  onPublish,
  isPublishing,
  onAddToAutopilot,
  isAddingToAutopilot,
}) => {
  const navigate = useNavigate();

  const [title, setTitle] = useState(clip?.title || "");
  const [description, setDescription] = useState(clip?.summary || "");
  const [tags, setTags] = useState<string[]>(clip?.tags || []);
  const [framing, setFraming] = useState<"smart_crop" | "blur_backdrop">("smart_crop");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [playerKey, setPlayerKey] = useState(0);
  const [publishedSuccess, setPublishedSuccess] = useState<boolean>(false);
  const [autopilotSuccess, setAutopilotSuccess] = useState<boolean>(false);
  const [publishedPostUrl, setPublishedPostUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (clip) {
      setTitle(clip.title || "");
      setDescription(clip.summary || "");
      setTags(clip.tags || []);
      setPublishedSuccess(false);
      setAutopilotSuccess(false);
      setPublishedPostUrl(null);
      setIsPlaying(true);
    }
  }, [clip]);

  if (!clip) return null;

  // Extract YouTube ID if present
  const youtubeVideoId = clip.videoId || (clip.previewUrl.includes("watch?v=") ? clip.previewUrl.split("watch?v=")[1]?.split("&")[0] : null);

  const handleDirectPublish = async () => {
    try {
      const res = await onPublish({
        clipId: clip.id,
        title,
        description,
        tags,
        thumbnailUrl: clip.thumbnailUrl,
        durationFormatted: clip.durationFormatted,
        platform: "youtube",
        startTime: clip.startTime,
        endTime: clip.endTime,
        videoId: clip.videoId,
        hookText: clip.hookText || clip.title,
      });
      if (res?.platformUrl) {
        setPublishedPostUrl(res.platformUrl);
      }
      setPublishedSuccess(true);
    } catch {
      // Handled by toast
    }
  };

  const handleAddToAutopilot = async () => {
    if (!onAddToAutopilot) {
      toast.error("Autopilot queue integration not available.");
      return;
    }
    try {
      await onAddToAutopilot({
        clipId: clip.id,
        title,
        description,
        tags,
        thumbnailUrl: clip.thumbnailUrl,
        duration: clip.duration,
        scheduledAt: scheduleDate ? new Date(scheduleDate).toISOString() : undefined,
        startTime: clip.startTime,
        endTime: clip.endTime,
        videoId: clip.videoId,
        hookText: clip.hookText || clip.title,
      });
      setAutopilotSuccess(true);
    } catch {
      // Handled by toast
    }
  };

  const handleSchedulePublish = async () => {
    if (!scheduleDate) {
      toast.error("Please pick a schedule date and time.");
      return;
    }
    try {
      const res = await onPublish({
        clipId: clip.id,
        title,
        description,
        tags,
        thumbnailUrl: clip.thumbnailUrl,
        durationFormatted: clip.durationFormatted,
        platform: "youtube",
        publishAt: new Date(scheduleDate).toISOString(),
        startTime: clip.startTime,
        endTime: clip.endTime,
        videoId: clip.videoId,
        hookText: clip.hookText || clip.title,
      });
      if (res?.platformUrl) {
        setPublishedPostUrl(res.platformUrl);
      }
      setPublishedSuccess(true);
    } catch {
      // Handled by toast
    }
  };

  const handleRestart = () => {
    setPlayerKey((prev) => prev + 1);
    setIsPlaying(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0b1a] border border-[#1e1e38] rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row">
        {/* Left: 9:16 Vertical Video Player */}
        <div className="w-full md:w-5/12 bg-[#05050e] p-6 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-[#1a1a35]">
          <div className="relative w-64 aspect-[9/16] rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10 flex items-center justify-center group">
            {/* Blurred Backdrop Layer */}
            {framing === "blur_backdrop" && (
              <img
                src={clip.thumbnailUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-125 blur-md opacity-40 pointer-events-none"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80";
                }}
              />
            )}

            {/* Video Player Render */}
            {isPlaying && youtubeVideoId ? (
              <div
                key={`yt-player-${playerKey}`}
                className={`w-full h-full relative overflow-hidden flex items-center justify-center ${
                  framing === "smart_crop" ? "scale-[1.78]" : "scale-100"
                } transition-transform duration-300`}
              >
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?start=${clip.startTime}&end=${clip.endTime}&autoplay=1&controls=1&modestbranding=1&loop=1&playsinline=1&rel=0`}
                  title={clip.title}
                  className="w-full h-full aspect-video object-cover"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : isPlaying && clip.previewUrl.startsWith("http") && !youtubeVideoId ? (
              <video
                key={`html5-player-${playerKey}`}
                src={`${clip.previewUrl}#t=${clip.startTime},${clip.endTime}`}
                autoPlay
                controls
                className="w-full h-full object-cover"
              />
            ) : (
              <div key="poster-player" className="relative w-full h-full flex items-center justify-center">
                <img
                  src={clip.thumbnailUrl}
                  alt=""
                  className={`w-full h-full object-cover ${framing === "blur_backdrop" ? "object-contain" : ""}`}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80";
                  }}
                />
                <button
                  onClick={() => setIsPlaying(true)}
                  className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-xl shadow-purple-900/50 hover:scale-110 transition-transform"
                >
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                </button>
              </div>
            )}

            {/* Burned-in Dynamic Captions Preview Overlay */}
            <div className="absolute bottom-12 inset-x-3 text-center pointer-events-none z-10">
              <span className="bg-black/85 backdrop-blur-sm text-yellow-300 text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-lg shadow-xl border border-yellow-300/30 inline-block">
                {clip.hookText || clip.title}
              </span>
            </div>

            {/* Top Score Badge */}
            <div className="absolute top-3 right-3 bg-purple-600 text-white text-[11px] font-black w-8 h-8 rounded-full flex items-center justify-center shadow-lg border border-purple-400 z-10">
              {clip.clipScore}
            </div>

            {/* Bottom Duration & Time Range Badge */}
            <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-sm text-white text-[10px] font-mono px-2 py-0.5 rounded z-10">
              {clip.durationFormatted} ({clip.timeRangeFormatted})
            </div>

            {/* Player Control Overlay */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
              <button
                onClick={handleRestart}
                className="p-1.5 rounded-lg bg-black/60 hover:bg-purple-600 text-white text-xs backdrop-blur-sm transition-colors"
                title="Restart Clip"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded-lg bg-black/60 hover:bg-purple-600 text-white text-xs backdrop-blur-sm transition-colors"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>
            </div>
          </div>

          {/* Framing Toggle */}
          <div className="flex items-center gap-1.5 mt-4 bg-[#101026] border border-[#202040] rounded-xl p-1 text-[11px]">
            <button
              onClick={() => setFraming("smart_crop")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                framing === "smart_crop" ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              Smart Crop 9:16
            </button>
            <button
              onClick={() => setFraming("blur_backdrop")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                framing === "blur_backdrop" ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              Blurred Fill
            </button>
          </div>
        </div>

        {/* Right: Metadata Editor, Publishing & Autopilot Actions */}
        <div className="w-full md:w-7/12 p-6 flex flex-col justify-between overflow-y-auto space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="bg-purple-600/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                  {clip.category}
                </span>
                <span className="text-gray-400 text-[12px] font-semibold">
                  Clip Score: <strong className="text-emerald-400 font-mono">{clip.clipScore}/100</strong>
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadata Fields */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-gray-400 text-[11.5px] font-bold uppercase">Shorts Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#121226] border border-[#202040] rounded-xl px-3.5 py-2.5 text-white text-[13px] font-bold focus:border-purple-500 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 text-[11.5px] font-bold uppercase">Opening Hook / Spoken Line</label>
                <input
                  type="text"
                  value={clip.hookText}
                  readOnly
                  className="w-full bg-[#0a0a18] border border-white/5 rounded-xl px-3.5 py-2 text-yellow-300 text-[12px] font-medium opacity-90 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 text-[11.5px] font-bold uppercase">Description & Takeaway</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#121226] border border-[#202040] rounded-xl px-3.5 py-2 text-gray-200 text-[12px] focus:border-purple-500 outline-none resize-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 text-[11.5px] font-bold uppercase">Hashtags</label>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {tags.map((tag, i) => (
                    <span
                      key={i}
                      className="bg-purple-950/40 border border-purple-500/30 text-purple-300 text-[11px] font-medium px-2 py-0.5 rounded-lg"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Area */}
          <div className="border-t border-white/10 pt-4 space-y-3">
            {publishedSuccess || autopilotSuccess ? (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle className="w-5 h-5" />
                  <span>
                    {autopilotSuccess ? "Queued to Autopilot Schedule!" : "Successfully Published to YouTube Shorts!"}
                  </span>
                </div>
                <p className="text-gray-300 text-[11.5px] leading-relaxed">
                  {autopilotSuccess
                    ? "Your vertical 9:16 Short is placed into your Autopilot queue and will automatically publish at optimal peak hours."
                    : "Your vertical 9:16 Short has been uploaded & registered into your YouTube channel catalog!"}
                </p>

                {publishedPostUrl && (
                  <div className="p-2.5 bg-black/40 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                    <span className="text-xs text-gray-300 truncate max-w-[280px]">
                      {publishedPostUrl}
                    </span>
                    <a
                      href={publishedPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs font-bold px-2 py-1 bg-emerald-500/10 rounded-lg transition-colors"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {publishedPostUrl && (
                    <a
                      href={publishedPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-[12px] py-2 rounded-xl shadow-lg transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Watch Short ↗</span>
                    </a>
                  )}

                  <button
                    onClick={() => {
                      onClose();
                      navigate("/autopilot");
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[12px] py-2 rounded-xl shadow-lg transition-all"
                  >
                    <Zap className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Autopilot Queue</span>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      navigate("/my-videos");
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#14142a] hover:bg-[#1a1a36] text-emerald-300 border border-emerald-500/30 font-bold text-[12px] py-2 rounded-xl transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>My Videos</span>
                  </button>

                  <button onClick={onClose} className="px-3 py-2 text-gray-400 hover:text-white text-[12px]">
                    Done
                  </button>
                </div>
              </div>
            ) : isScheduleOpen ? (
              <div className="bg-[#121228] p-3 rounded-xl border border-purple-500/30 space-y-2">
                <label className="text-purple-300 text-[11px] font-bold">Pick Specific Date & Time:</label>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full bg-[#080816] border border-[#252545] rounded-lg px-3 py-1.5 text-white text-[12px] outline-none"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => setIsScheduleOpen(false)}
                    className="px-3 py-1 text-gray-400 text-[11.5px] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSchedulePublish}
                    disabled={isPublishing}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[11.5px] font-bold rounded-lg"
                  >
                    Confirm Schedule
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Autopilot 1-Click Button */}
                <button
                  onClick={handleAddToAutopilot}
                  disabled={isAddingToAutopilot || isPublishing}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500/20 via-purple-600/30 to-indigo-600/30 hover:from-amber-500/30 hover:to-indigo-600/50 border border-purple-500/40 text-purple-200 hover:text-white font-extrabold text-[13px] py-2.5 rounded-xl shadow-lg transition-all"
                >
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span>{isAddingToAutopilot ? "Adding to Queue..." : "Add to Autopilot Schedule ⚡"}</span>
                </button>

                {/* Direct Publish & Specific Schedule Buttons */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setIsScheduleOpen(true)}
                    disabled={isPublishing || isAddingToAutopilot}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#121226] hover:bg-[#181832] border border-[#252545] text-gray-200 font-bold text-[12px] py-2.5 rounded-xl transition-all"
                  >
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    <span>Set Custom Time</span>
                  </button>

                  <button
                    onClick={handleDirectPublish}
                    disabled={isPublishing || isAddingToAutopilot}
                    className="flex-[2] flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[12.5px] py-2.5 rounded-xl shadow-xl shadow-purple-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isPublishing ? "Publishing..." : "Direct 1-Click Publish 🚀"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
