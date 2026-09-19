/**
 * useViralClips — React Hook for Pulse AI Viral Clips Studio.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import apiClient from "@/lib/apiClient";
import toast from "react-hot-toast";

export interface ViralVideoItem {
  id: string;
  videoId: string;
  platform: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string;
  isNew?: boolean;
}

export interface VideoContextProfile {
  detectedGenre:
    | "comedy_humor"
    | "roast_reaction"
    | "fitness_workout"
    | "tech_software"
    | "educational_explainer"
    | "music_performance"
    | "podcast_interview"
    | "vlog_storytelling"
    | "gaming_entertainment"
    | "general";
  genreLabel: string;
  coreTheme: string;
  keyTopics: string[];
  audienceIntent: string;
  genrePacing: string;
}

export interface ProcessedClip {
  id: string;
  jobId: string;
  videoId: string;
  startTime: number;
  endTime: number;
  duration: number;
  durationFormatted: string;
  timeRangeFormatted: string;
  title: string;
  hookText: string;
  summary: string;
  clipScore: number;
  category: "Top Pick" | "Shorts" | "Reels" | "Highlight";
  tags: string[];
  aspectRatio: "9:16";
  previewUrl: string;
  thumbnailUrl: string;
  status: "ready" | "rendering" | "failed" | "published" | "scheduled";
  reflectionNotes?: string;
  renderError?: string;
}

export interface ClipJobState {
  id: string;
  userId: string;
  videoId: string;
  videoTitle: string;
  videoDescription?: string;
  videoThumbnail: string;
  videoDuration: string;
  videoDurationSec: number;
  views: number;
  publishedAt: string;
  currentStage:
    | "extracting_audio"
    | "transcribing"
    | "analyzing_content"
    | "detecting_moments"
    | "self_reflection"
    | "scoring_clips"
    | "selecting_clips"
    | "preparing_previews"
    | "completed"
    | "failed";
  progressPercent: number;
  statusMessage: string;
  createdAt: number;
  updatedAt: number;
  estClipsFound: string;
  estProcessing: string;
  contextProfile?: VideoContextProfile;
  clips: ProcessedClip[];
  error?: string;
}

export function useViralClips() {
  const { user } = useUser();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // ─── Fetch YouTube Channel Videos ───
  const videosQuery = useQuery<{ videos: ViralVideoItem[]; total: number; page: number }>({
    queryKey: ["viralClipsVideos", userId, search, sortBy, page],
    queryFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      const res = await apiClient.get(
        `/api/viral-clips/videos?userId=${userId}&search=${encodeURIComponent(search)}&sortBy=${sortBy}&page=${page}&limit=8`
      );
      return res.data;
    },
    enabled: !!userId,
    staleTime: 10000,
  });

  // ─── Start Analysis Job Mutation ───
  const startJobMutation = useMutation({
    mutationFn: async (payload: ViralVideoItem | { video: ViralVideoItem; selectedGenre?: string; customInstructions?: string }) => {
      if (!userId) throw new Error("Not authenticated");
      const video = "video" in payload ? payload.video : payload;
      const selectedGenre = "selectedGenre" in payload ? payload.selectedGenre : undefined;
      const customInstructions = "customInstructions" in payload ? payload.customInstructions : undefined;

      const res = await apiClient.post("/api/viral-clips/jobs", {
        userId,
        videoId: video.videoId,
        videoTitle: video.title,
        videoDescription: video.description || "",
        videoThumbnail: video.thumbnail,
        videoDuration: video.duration,
        views: video.views,
        publishedAt: video.publishedAt,
        selectedGenre,
        customInstructions,
      });
      return res.data.job as ClipJobState;
    },
    onSuccess: (job) => {
      setActiveJobId(job.id);
      toast.success("Pulse AI multi-layer video analysis started!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to start AI clip analysis.");
    },
  });

  // ─── Poll Active Job Status ───
  const activeJobQuery = useQuery<{ job: ClipJobState }>({
    queryKey: ["viralClipJob", activeJobId],
    queryFn: async () => {
      if (!activeJobId) throw new Error("No active job");
      const res = await apiClient.get(`/api/viral-clips/jobs/${activeJobId}`);
      return res.data;
    },
    enabled: !!activeJobId,
    refetchInterval: (query) => {
      const stage = query.state.data?.job?.currentStage;
      if (stage === "completed" || stage === "failed") {
        return false;
      }
      return 1500; // Poll every 1.5s while active
    },
  });

  // ─── Publish Clip Mutation ───
  const publishClipMutation = useMutation({
    mutationFn: async (payload: {
      clipId: string;
      title: string;
      description: string;
      tags: string[];
      videoPathOrUrl?: string;
      thumbnailUrl?: string;
      durationFormatted?: string;
      platform?: "youtube" | "instagram" | "tiktok";
      publishAt?: string;
      startTime?: number;
      endTime?: number;
      videoId?: string;
      hookText?: string;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      const res = await apiClient.post("/api/viral-clips/publish", {
        userId,
        ...payload,
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      toast.success(variables.publishAt ? "Clip scheduled to YouTube Shorts!" : "Clip published to YouTube Shorts!");
      queryClient.invalidateQueries({ queryKey: ["myVideosList"] });
      queryClient.invalidateQueries({ queryKey: ["myVideosSummary"] });
      queryClient.invalidateQueries({ queryKey: ["viralClipsVideos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardOverview"] });
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
      queryClient.invalidateQueries({ queryKey: ["autopilotQueue"] });

      // Update in-memory job clip status
      if (activeJobId && variables.clipId) {
        queryClient.setQueryData(["viralClipJob", activeJobId], (old: any) => {
          if (!old?.job) return old;
          return {
            ...old,
            job: {
              ...old.job,
              clips: old.job.clips.map((c: ProcessedClip) =>
                c.id === variables.clipId ? { ...c, status: variables.publishAt ? "scheduled" : "published" } : c
              ),
            },
          };
        });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to publish clip.");
    },
  });

  // ─── Update Clip Mutation ───
  const updateClipMutation = useMutation({
    mutationFn: async ({ jobId, clipId, updates }: { jobId: string; clipId: string; updates: Partial<ProcessedClip> }) => {
      const res = await apiClient.patch(`/api/viral-clips/jobs/${jobId}/clips/${clipId}`, updates);
      return res.data.clip as ProcessedClip;
    },
    onSuccess: (updatedClip) => {
      queryClient.setQueryData(["viralClipJob", activeJobId], (old: any) => {
        if (!old?.job) return old;
        return {
          ...old,
          job: {
            ...old.job,
            clips: old.job.clips.map((c: ProcessedClip) => c.id === updatedClip.id ? updatedClip : c),
          },
        };
      });
      toast.success("Clip metadata updated!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update clip.");
    },
  });

  // ─── Add Custom Clip Mutation ───
  const addClipMutation = useMutation({
    mutationFn: async ({ jobId, newClip }: { jobId: string; newClip: Partial<ProcessedClip> }) => {
      const res = await apiClient.post(`/api/viral-clips/jobs/${jobId}/clips`, newClip);
      return res.data.clip as ProcessedClip;
    },
    onSuccess: (createdClip) => {
      queryClient.setQueryData(["viralClipJob", activeJobId], (old: any) => {
        if (!old?.job) return old;
        return {
          ...old,
          job: {
            ...old.job,
            clips: [createdClip, ...old.job.clips],
          },
        };
      });
      toast.success("Custom clip created!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create clip.");
    },
  });

  // ─── Delete Clip Mutation ───
  const deleteClipMutation = useMutation({
    mutationFn: async ({ jobId, clipId }: { jobId: string; clipId: string }) => {
      const res = await apiClient.delete(`/api/viral-clips/jobs/${jobId}/clips/${clipId}`);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData(["viralClipJob", activeJobId], (old: any) => {
        if (!old?.job) return old;
        return {
          ...old,
          job: {
            ...old.job,
            clips: old.job.clips.filter((c: ProcessedClip) => c.id !== variables.clipId),
          },
        };
      });
      toast.success("Clip removed from studio.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete clip.");
    },
  });

  // ─── Add to Autopilot Queue Mutation ───
  const addToAutopilotMutation = useMutation({
    mutationFn: async (payload: {
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
    }) => {
      if (!userId) throw new Error("Not authenticated");
      const res = await apiClient.post("/api/viral-clips/autopilot-queue", {
        userId,
        ...payload,
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      toast.success("Clip queued in Autopilot Schedule!");
      queryClient.invalidateQueries({ queryKey: ["autopilotQueue"] });
      queryClient.invalidateQueries({ queryKey: ["autopilotStats"] });
      queryClient.invalidateQueries({ queryKey: ["myVideosList"] });
      queryClient.invalidateQueries({ queryKey: ["myVideosSummary"] });
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });

      if (activeJobId && variables.clipId) {
        queryClient.setQueryData(["viralClipJob", activeJobId], (old: any) => {
          if (!old?.job) return old;
          return {
            ...old,
            job: {
              ...old.job,
              clips: old.job.clips.map((c: ProcessedClip) =>
                c.id === variables.clipId ? { ...c, status: "scheduled" } : c
              ),
            },
          };
        });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to add to autopilot queue.");
    },
  });

  return {
    search,
    setSearch,
    sortBy,
    setSortBy,
    page,
    setPage,
    videos: videosQuery.data?.videos || [],
    totalVideos: videosQuery.data?.total || 0,
    isLoadingVideos: videosQuery.isLoading,
    activeJobId,
    setActiveJobId,
    activeJob: activeJobQuery.data?.job,
    isJobPolling: activeJobQuery.isFetching,
    startJob: startJobMutation.mutateAsync,
    isStartingJob: startJobMutation.isPending,
    publishClip: publishClipMutation.mutateAsync,
    isPublishing: publishClipMutation.isPending,
    addToAutopilotQueue: addToAutopilotMutation.mutateAsync,
    isAddingToAutopilot: addToAutopilotMutation.isPending,
    updateClip: updateClipMutation.mutateAsync,
    isUpdatingClip: updateClipMutation.isPending,
    addClip: addClipMutation.mutateAsync,
    isAddingClip: addClipMutation.isPending,
    deleteClip: deleteClipMutation.mutateAsync,
    isDeletingClip: deleteClipMutation.isPending,
    refetchVideos: videosQuery.refetch,
  };
}
