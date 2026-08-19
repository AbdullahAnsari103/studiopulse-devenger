/**
 * useAutopilot — React hook for the Autopilot Queue feature.
 * Manages bulk uploads, queue CRUD, AI metadata generation, settings, and notifications.
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import apiClient from "@/lib/apiClient";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QueueItem {
  id: string;
  userId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  thumbnailPath: string | null;
  customThumbnailPath?: string | null;
  title: string | null;
  description: string | null;
  tags: string[];
  categoryId: string;
  platform: string;
  platforms: string[];
  scheduledAt: string | null;
  scheduleMode: string;
  visibility: string;
  queueOrder: number;
  batchId: string;
  status: string;
  platformVideoId: string | null;
  platformUrl: string | null;
  publishError: string | null;
  aiMetadata: Record<string, unknown> | null;
  aiContentSummary: string | null;
  userContext: string | null;
  videoDurationSeconds: number;
  aspectRatio: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface QueueStats {
  total: number;
  pending: number;
  aiProcessing: number;
  scheduled: number;
  publishing: number;
  published: number;
  failed: number;
  cancelled: number;
  nextPublishAt: string | null;
  isPaused: boolean;
}

export interface AutopilotSettings {
  defaultPlatform: string;
  defaultVisibility: string;
  maxPerDay: number;
  preferredTime: string;
  timezone: string;
  autoClassify: boolean;
  autoMetadata: boolean;
  notifyOnPublish: boolean;
  pauseQueue: boolean;
}

export interface AutopilotNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export interface BulkUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface BehaviorProfile {
  userId: string;
  videoTypeHistory: Record<string, number>;
  platformPreferences: Record<string, number>;
  avgUploadHour: number;
  preferredVisibility: string;
  totalUploads: number;
  totalPublishes: number;
  lastUploadAt: string | null;
  lastPublishAt: string | null;
  suggestedPlatforms: string[];
  suggestedVideoType: string | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAutopilot() {
  const { user } = useUser();
  const userId = user?.id || "";
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<BulkUploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // ─── Queue Items ───
  const queueQuery = useQuery({
    queryKey: ["autopilot-queue", userId],
    queryFn: async () => {
      const res = await apiClient.get(`${API_BASE}/api/autopilot/queue?userId=${userId}`);
      return res.data.items as QueueItem[];
    },
    enabled: !!userId,
    refetchInterval: 2500, // Poll every 2.5s for fast status updates
  });

  // ─── Queue Stats ───
  const statsQuery = useQuery({
    queryKey: ["autopilot-stats", userId],
    queryFn: async () => {
      const res = await apiClient.get(`${API_BASE}/api/autopilot/stats?userId=${userId}`);
      return res.data as QueueStats;
    },
    enabled: !!userId,
    refetchInterval: 2500,
  });

  // ─── Settings ───
  const settingsQuery = useQuery({
    queryKey: ["autopilot-settings", userId],
    queryFn: async () => {
      const res = await apiClient.get(`${API_BASE}/api/autopilot/settings?userId=${userId}`);
      return res.data as AutopilotSettings;
    },
    enabled: !!userId,
  });

  // ─── Notifications ───
  const notificationsQuery = useQuery({
    queryKey: ["autopilot-notifications", userId],
    queryFn: async () => {
      const res = await apiClient.get(`${API_BASE}/api/autopilot/notifications?userId=${userId}&limit=50`);
      return res.data.notifications as AutopilotNotification[];
    },
    enabled: !!userId,
    refetchInterval: 5000, // Poll every 5s for real-time notifications
  });

  // ─── Behavior Profile ───
  const behaviorProfileQuery = useQuery({
    queryKey: ["autopilot-behavior-profile", userId],
    queryFn: async () => {
      const res = await apiClient.get(`${API_BASE}/api/autopilot/behavior-profile?userId=${userId}`);
      return res.data as BehaviorProfile;
    },
    enabled: !!userId,
    staleTime: 30000, // Re-fetch at most every 30s
  });

  // ─── Bulk Upload ───
  const bulkUpload = useCallback(async (
    files: File[],
    contexts: string[],
    globalContext: string = "",
    platform: string = "youtube",
    videoFramesMap?: Record<number, { base64: string; mimeType: string }[]>,
    platforms?: string[],
    videoType?: string,
    customThumbnails?: Record<number, string>
  ): Promise<{ batchId: string; videoCount: number }> => {
    if (!userId) throw new Error("Not authenticated");

    setIsUploading(true);
    setUploadProgress({ loaded: 0, total: 0, percentage: 0 });

    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("platform", platform);
    formData.append("globalContext", globalContext);
    formData.append("contexts", JSON.stringify(contexts));
    if (platforms && platforms.length > 0) {
      formData.append("platforms", JSON.stringify(platforms));
    }
    if (videoType) {
      formData.append("videoType", videoType);
    }
    if (videoFramesMap && Object.keys(videoFramesMap).length > 0) {
      formData.append("videoFramesMap", JSON.stringify(videoFramesMap));
    }
    if (customThumbnails && Object.keys(customThumbnails).length > 0) {
      formData.append("customThumbnails", JSON.stringify(customThumbnails));
    }

    for (const file of files) {
      formData.append("videos", file);
    }

    try {
      const res = await apiClient.post(`${API_BASE}/api/autopilot/bulk-upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 15 * 60 * 1000,
        onUploadProgress: (e) => {
          const total = e.total || 0;
          const loaded = e.loaded || 0;
          setUploadProgress({
            loaded,
            total,
            percentage: total > 0 ? Math.round((loaded / total) * 100) : 0,
          });
        },
      });

      queryClient.invalidateQueries({ queryKey: ["autopilot-queue"] });
      queryClient.invalidateQueries({ queryKey: ["autopilot-stats"] });
      queryClient.invalidateQueries({ queryKey: ["autopilot-notifications"] });

      return { batchId: res.data.batchId, videoCount: res.data.videoCount };
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, [userId, queryClient]);

  // ─── Generate AI Metadata ───
  const generateMetadataMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await apiClient.post(`${API_BASE}/api/autopilot/generate-metadata`, { userId, batchId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-queue"] });
      queryClient.invalidateQueries({ queryKey: ["autopilot-stats"] });
      queryClient.invalidateQueries({ queryKey: ["autopilot-notifications"] });
    },
  });

  // ─── Update Queue Item ───
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: Partial<QueueItem> & { customThumbnail?: string } }) => {
      const res = await apiClient.put(`${API_BASE}/api/autopilot/queue/${itemId}`, { userId, ...data });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-queue"] });
    },
  });

  // ─── Upload Custom Thumbnail for Queue Item ───
  const uploadThumbnailMutation = useMutation({
    mutationFn: async ({ itemId, customThumbnail }: { itemId: string; customThumbnail: string }) => {
      const res = await apiClient.post(`${API_BASE}/api/autopilot/queue/${itemId}/thumbnail`, {
        userId,
        customThumbnail,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-queue"] });
    },
  });

  // ─── Delete Queue Item (Permanent Hard Delete) ───
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiClient.delete(`${API_BASE}/api/autopilot/queue/${itemId}?userId=${userId}&permanent=true`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-queue"] });
      queryClient.invalidateQueries({ queryKey: ["autopilot-stats"] });
    },
  });

  // ─── Clear Queue By Status ───
  const clearQueueMutation = useMutation({
    mutationFn: async (statuses: string[]) => {
      const res = await apiClient.post(`${API_BASE}/api/autopilot/queue/clear`, { userId, statuses });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-queue"] });
      queryClient.invalidateQueries({ queryKey: ["autopilot-stats"] });
    },
  });

  // ─── Cancel Queue Item ───
  const cancelItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiClient.delete(`${API_BASE}/api/autopilot/queue/${itemId}?userId=${userId}&permanent=false`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-queue"] });
      queryClient.invalidateQueries({ queryKey: ["autopilot-stats"] });
    },
  });

  // ─── Publish Now ───
  const publishNowMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiClient.post(`${API_BASE}/api/autopilot/publish-now/${itemId}`, { userId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-queue"] });
      queryClient.invalidateQueries({ queryKey: ["autopilot-stats"] });
      queryClient.invalidateQueries({ queryKey: ["autopilot-notifications"] });
    },
  });

  // ─── Pause / Resume ───
  const pauseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`${API_BASE}/api/autopilot/pause`, { userId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-settings"] });
      queryClient.invalidateQueries({ queryKey: ["autopilot-stats"] });
      queryClient.invalidateQueries({ queryKey: ["autopilot-notifications"] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`${API_BASE}/api/autopilot/resume`, { userId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-settings"] });
      queryClient.invalidateQueries({ queryKey: ["autopilot-stats"] });
      queryClient.invalidateQueries({ queryKey: ["autopilot-notifications"] });
    },
  });

  // ─── Update Settings ───
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<AutopilotSettings>) => {
      const res = await apiClient.put(`${API_BASE}/api/autopilot/settings`, { userId, ...settings });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-settings"] });
    },
  });

  // ─── Mark Notifications Read ───
  const markReadMutation = useMutation({
    mutationFn: async (notificationIds?: string[]) => {
      const res = await apiClient.post(`${API_BASE}/api/autopilot/notifications/read`, { userId, notificationIds });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-notifications"] });
    },
  });

  // ─── Reschedule Batch ───
  const rescheduleMutation = useMutation({
    mutationFn: async (params: {
      batchId: string;
      scheduleMode?: string;
      maxPerDay?: number;
      preferredTime?: string;
      timezone?: string;
      startDate?: string;
    }) => {
      const res = await apiClient.post(`${API_BASE}/api/autopilot/reschedule`, { userId, ...params });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-queue"] });
      queryClient.invalidateQueries({ queryKey: ["autopilot-stats"] });
    },
  });

  return {
    // Data
    queue: queueQuery.data || [],
    stats: statsQuery.data || null,
    settings: settingsQuery.data || null,
    notifications: notificationsQuery.data || [],
    behaviorProfile: behaviorProfileQuery.data || null,
    unreadCount: (notificationsQuery.data || []).filter(n => !n.isRead).length,

    // Loading states
    isLoading: queueQuery.isLoading,
    isStatsLoading: statsQuery.isLoading,
    isUploading,
    uploadProgress,

    // Actions
    bulkUpload,
    generateMetadata: generateMetadataMutation.mutateAsync,
    isGeneratingMetadata: generateMetadataMutation.isPending,
    updateItem: updateItemMutation.mutateAsync,
    uploadThumbnail: uploadThumbnailMutation.mutateAsync,
    cancelItem: cancelItemMutation.mutateAsync,
    deleteItem: deleteItemMutation.mutateAsync,
    clearQueue: clearQueueMutation.mutateAsync,
    publishNow: publishNowMutation.mutateAsync,
    pause: pauseMutation.mutateAsync,
    resume: resumeMutation.mutateAsync,
    updateSettings: updateSettingsMutation.mutateAsync,
    markNotificationsRead: markReadMutation.mutateAsync,
    reschedule: rescheduleMutation.mutateAsync,

    // Refresh
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-queue"] });
      queryClient.invalidateQueries({ queryKey: ["autopilot-stats"] });
      queryClient.invalidateQueries({ queryKey: ["autopilot-notifications"] });
    },
  };
}
