/**
 * useUpload — React hook for the Upload Center workflow.
 * Manages video uploads, metadata, publishing, and AI optimization.
 */
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import apiClient from "@/lib/apiClient";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UploadProgress {
  percentage: number;
  loaded: number;
  total: number;
  speed: number; // bytes per second
  eta: number; // seconds remaining
}

export interface UploadMetadata {
  uploadId: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  visibility: "public" | "private" | "unlisted";
  platforms: string[];
  categoryId: string;
  playlistId: string;
  license: string;
  notifySubscribers: boolean;
  madeForKids: boolean;
  allowComments: boolean;
  showStats: boolean;
  language: string;
  recordingDate: string;
  scheduledAt: string;
  ageRestricted: boolean;
  thumbnailPath: string;
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  thumbnail: string;
  itemCount: number;
}

export interface YouTubeCategory {
  id: string;
  name: string;
}

export interface AiOptimization {
  optimizedTitle: string;
  optimizedDescription: string;
  optimizedTags: string[];
  seoScore: number;
  estimatedCTR: string;
  improvements: string[];
  keywordAnalysis?: {
    primaryKeyword: string;
    secondaryKeywords: string[];
    searchVolume: string;
    competition: string;
  };
  contentTips?: string[];
  bestUploadTime?: string;
  titleAlternatives?: string[];
  videoContentSummary?: string;
  platformOptimizations?: {
    youtube?: {
      title: string;
      description: string;
      hashtags: string[];
    };
    instagram?: {
      caption: string;
      hashtags: string[];
    };
    tiktok?: {
      caption: string;
      hashtags: string[];
    };
    facebook?: {
      post: string;
      hashtags: string[];
    };
  } | null;
}

export interface PublishResult {
  success: boolean;
  uploadId: string;
  status: string;
  results: Record<string, {
    success: boolean;
    videoId?: string;
    url?: string;
    error?: string;
    architectureReady?: boolean;
  }>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useUpload() {
  const { user } = useUser();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    uploadId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  } | null>(null);

  // ─── Video Upload with Progress ─────────────────────────────────────────

  const uploadVideo = useCallback(async (file: File): Promise<string> => {
    if (!userId) throw new Error("Not authenticated");

    setIsUploading(true);
    setUploadProgress({ percentage: 0, loaded: 0, total: file.size, speed: 0, eta: 0 });

    const formData = new FormData();
    formData.append("video", file);
    formData.append("userId", userId);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let lastLoaded = 0;
      let lastTime = Date.now();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const now = Date.now();
          const elapsed = (now - lastTime) / 1000;
          const bytesPerSecond = elapsed > 0 ? (e.loaded - lastLoaded) / elapsed : 0;
          const remaining = bytesPerSecond > 0 ? (e.total - e.loaded) / bytesPerSecond : 0;

          setUploadProgress({
            percentage: Math.round((e.loaded / e.total) * 100),
            loaded: e.loaded,
            total: e.total,
            speed: bytesPerSecond,
            eta: remaining,
          });

          lastLoaded = e.loaded;
          lastTime = now;
        }
      });

      xhr.addEventListener("load", () => {
        setIsUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            setUploadedFile({
              uploadId: data.uploadId,
              fileName: data.fileName,
              fileSize: data.fileSize,
              mimeType: data.mimeType,
            });
            setUploadProgress({ percentage: 100, loaded: file.size, total: file.size, speed: 0, eta: 0 });
            resolve(data.uploadId);
          } catch {
            reject(new Error("Invalid server response"));
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.error || "Upload failed"));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener("error", () => {
        setIsUploading(false);
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener("abort", () => {
        setIsUploading(false);
        reject(new Error("Upload aborted"));
      });

      xhr.open("POST", `${API_BASE}/api/upload/video`);
      xhr.send(formData);
    });
  }, [userId]);

  // ─── Thumbnail Upload ───────────────────────────────────────────────────

  const uploadThumbnail = useCallback(async (file: File, uploadId?: string) => {
    if (!userId) throw new Error("Not authenticated");

    const formData = new FormData();
    formData.append("thumbnail", file);
    if (uploadId) formData.append("uploadId", uploadId);

    const res = await fetch(`${API_BASE}/api/upload/thumbnail`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Thumbnail upload failed");
    }

    return res.json();
  }, [userId]);

  // ─── Save Draft ─────────────────────────────────────────────────────────

  const saveDraft = useMutation({
    mutationFn: async (metadata: Partial<UploadMetadata>) => {
      if (!userId) throw new Error("Not authenticated");
      const res = await apiClient.post("/api/upload/draft", { ...metadata, userId });
      return res.data;
    },
  });

  // ─── Publish ────────────────────────────────────────────────────────────

  const publish = useMutation({
    mutationFn: async (metadata: Partial<UploadMetadata>): Promise<PublishResult> => {
      if (!userId) throw new Error("Not authenticated");
      // Use a much longer timeout for publishing — YouTube video uploads can take 5-10+ minutes
      const res = await apiClient.post("/api/upload/publish", { ...metadata, userId }, {
        timeout: 10 * 60 * 1000, // 10 minutes
      });
      return res.data;
    },
    onSuccess: () => {
      // Invalidate all relevant queries to reflect the new upload everywhere
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["platformStatus"] });
      queryClient.invalidateQueries({ queryKey: ["upload-history"] });
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });

  // ─── AI Optimization ───────────────────────────────────────────────────

  const aiOptimize = useMutation<
    AiOptimization,
    Error,
    {
      title: string;
      description?: string;
      tags?: string[];
      category?: string;
      uploadId?: string;
      videoFrames?: { base64: string; mimeType: string }[];
    }
  >({
    mutationFn: async ({ title, description, tags, category, uploadId, videoFrames }) => {
      const res = await apiClient.post("/api/upload/ai-optimize", {
        userId: user?.id,
        title,
        description,
        tags,
        category,
        uploadId,
        videoFrames,
      });
      return res.data;
    },
  });

  // ─── YouTube Categories ─────────────────────────────────────────────────

  const categoriesQuery = useQuery<{ categories: YouTubeCategory[] }>({
    queryKey: ["youtube-categories"],
    queryFn: async () => {
      const res = await apiClient.get("/api/upload/youtube/categories");
      return res.data;
    },
    staleTime: Infinity, // Categories never change
  });

  // ─── YouTube Playlists ──────────────────────────────────────────────────

  const playlistsQuery = useQuery<{ playlists: YouTubePlaylist[] }>({
    queryKey: ["youtube-playlists", userId],
    queryFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      const res = await apiClient.get(`/api/upload/youtube/playlists?userId=${userId}`);
      return res.data;
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  // ─── Reset ──────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setUploadProgress(null);
    setIsUploading(false);
    setUploadedFile(null);
  }, []);

  return {
    // Upload
    uploadVideo,
    uploadThumbnail,
    uploadProgress,
    isUploading,
    uploadedFile,

    // Actions
    saveDraft,
    publish,
    aiOptimize,
    reset,

    // Data
    categories: categoriesQuery.data?.categories || [],
    playlists: playlistsQuery.data?.playlists || [],
    categoriesLoading: categoriesQuery.isLoading,
    playlistsLoading: playlistsQuery.isLoading,
  };
}
