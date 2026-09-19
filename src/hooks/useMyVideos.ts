/**
 * useMyVideos — React Hook for managing videos, filtering, search, editing, deletion, and analytics.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import apiClient from "@/lib/apiClient";
import type { StandardVideoItem, VideoSummaryStats, VideoDetailedAnalytics } from "../../server/integrations/adapters/types";

export interface ExtendedVideoSummaryStats extends VideoSummaryStats {
  publishedCount?: number;
  scheduledCount?: number;
  draftsCount?: number;
  privateCount?: number;
  unlistedCount?: number;
  deletedCount?: number;
}

export interface VideoQueryState {
  platform: string;
  status: string;
  search: string;
  category: string;
  visibility: string;
  dateRange: string;
  sortBy: string;
  page: number;
  limit: number;
}

export function useMyVideos() {
  const { user } = useUser();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const [queryState, setQueryState] = useState<VideoQueryState>({
    platform: "youtube",
    status: "all",
    search: "",
    category: "all",
    visibility: "all",
    dateRange: "all",
    sortBy: "newest",
    page: 1,
    limit: 10,
  });

  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);

  // ─── Fetch Summary Stats ──────────────────────────────────────────────────

  const summaryQuery = useQuery<ExtendedVideoSummaryStats>({
    queryKey: ["myVideosSummary", userId, queryState.platform],
    queryFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      const res = await apiClient.get(`/api/videos/summary?userId=${userId}&platform=${queryState.platform}`);
      return res.data;
    },
    enabled: !!userId,
    staleTime: 10000,
  });

  // ─── Fetch Videos List ────────────────────────────────────────────────────

  const videosQuery = useQuery<{ videos: StandardVideoItem[]; total: number; page: number; limit: number }>({
    queryKey: ["myVideosList", userId, queryState],
    queryFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      const params = new URLSearchParams({
        userId,
        platform: queryState.platform,
        status: queryState.status,
        search: queryState.search,
        category: queryState.category,
        visibility: queryState.visibility,
        dateRange: queryState.dateRange,
        sortBy: queryState.sortBy,
        page: String(queryState.page),
        limit: String(queryState.limit),
      });

      const res = await apiClient.get(`/api/videos?${params.toString()}`);
      return res.data;
    },
    enabled: !!userId,
    staleTime: 5000,
  });

  // ─── Manual Sync Platform Data ────────────────────────────────────────────

  const syncPlatformMutation = useMutation({
    mutationFn: async (platform: string = "youtube") => {
      if (!userId) throw new Error("Not authenticated");
      const res = await apiClient.post("/api/platforms/sync", {
        userId,
        platform,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myVideosList"] });
      queryClient.invalidateQueries({ queryKey: ["myVideosSummary"] });
    },
  });

  // ─── Update Video Mutation ────────────────────────────────────────────────

  const updateVideoMutation = useMutation({
    mutationFn: async ({ videoId, payload }: { videoId: string; payload: any }) => {
      if (!userId) throw new Error("Not authenticated");
      const res = await apiClient.patch(`/api/videos/${videoId}`, {
        userId,
        platform: queryState.platform,
        ...payload,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myVideosList"] });
      queryClient.invalidateQueries({ queryKey: ["myVideosSummary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  // ─── Delete Video Mutation ────────────────────────────────────────────────

  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      if (!userId) throw new Error("Not authenticated");
      const res = await apiClient.delete(`/api/videos/${videoId}?userId=${userId}&platform=${queryState.platform}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myVideosList"] });
      queryClient.invalidateQueries({ queryKey: ["myVideosSummary"] });
      queryClient.invalidateQueries({ queryKey: ["viralClipsVideos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  // ─── Bulk Action Mutation ─────────────────────────────────────────────────

  const bulkMutation = useMutation({
    mutationFn: async ({ action, videoIds, payload }: { action: string; videoIds: string[]; payload?: any }) => {
      if (!userId) throw new Error("Not authenticated");
      const res = await apiClient.post("/api/videos/bulk", {
        userId,
        platform: queryState.platform,
        action,
        videoIds,
        payload,
      });
      return res.data;
    },
    onSuccess: () => {
      setSelectedVideoIds([]);
      queryClient.invalidateQueries({ queryKey: ["myVideosList"] });
      queryClient.invalidateQueries({ queryKey: ["myVideosSummary"] });
      queryClient.invalidateQueries({ queryKey: ["viralClipsVideos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  // ─── Fetch Video Analytics ────────────────────────────────────────────────

  const fetchVideoAnalytics = async (videoId: string): Promise<VideoDetailedAnalytics> => {
    if (!userId) throw new Error("Not authenticated");
    const res = await apiClient.get(`/api/videos/${videoId}/analytics?userId=${userId}&platform=${queryState.platform}`);
    return res.data;
  };

  // ─── AI Diagnose Video ────────────────────────────────────────────────────

  const aiDiagnoseVideo = async (videoId: string) => {
    if (!userId) throw new Error("Not authenticated");
    const res = await apiClient.post(`/api/videos/${videoId}/ai-diagnose`, {
      userId,
      platform: queryState.platform,
    });
    return res.data;
  };

  // ─── AI Apply Fixes ───────────────────────────────────────────────────────

  const aiApplyFixes = async (
    videoId: string,
    payload: { title?: string; description?: string; tags?: string[] }
  ) => {
    if (!userId) throw new Error("Not authenticated");
    const res = await apiClient.post(`/api/videos/${videoId}/ai-apply`, {
      userId,
      platform: queryState.platform,
      ...payload,
    });
    // Invalidate videos list & summary so the updated video shows immediately
    queryClient.invalidateQueries({ queryKey: ["myVideosList"] });
    queryClient.invalidateQueries({ queryKey: ["myVideosSummary"] });
    return res.data;
  };

  // ─── Checkbox Helpers ─────────────────────────────────────────────────────

  const toggleSelectVideo = (videoId: string) => {
    setSelectedVideoIds((prev) =>
      prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId]
    );
  };

  const toggleSelectAll = (allVideoIds: string[]) => {
    if (selectedVideoIds.length === allVideoIds.length) {
      setSelectedVideoIds([]);
    } else {
      setSelectedVideoIds(allVideoIds);
    }
  };

  return {
    queryState,
    setQueryState,
    summary: summaryQuery.data,
    summaryLoading: summaryQuery.isLoading,
    videos: videosQuery.data?.videos || [],
    totalVideos: videosQuery.data?.total || 0,
    page: videosQuery.data?.page || 1,
    limit: videosQuery.data?.limit || 10,
    isLoading: videosQuery.isLoading,
    isFetching: videosQuery.isFetching,
    refetch: videosQuery.refetch,
    syncPlatform: syncPlatformMutation,

    // Selection
    selectedVideoIds,
    toggleSelectVideo,
    toggleSelectAll,

    // Actions
    updateVideo: updateVideoMutation,
    deleteVideo: deleteVideoMutation,
    bulkAction: bulkMutation,

    // Analytics & AI
    fetchVideoAnalytics,
    aiDiagnoseVideo,
    aiApplyFixes,
  };
}
