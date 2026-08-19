/**
 * useAudienceAnalysis Hook
 * React Query hook to manage audience comments, sentiment analysis, AI insights,
 * reply generation, YouTube comment posting, and auto-reply settings.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import apiClient from "@/lib/apiClient";

export interface YouTubeComment {
  id: string;
  userId: string;
  videoId: string;
  commentId: string;
  authorName: string;
  authorProfileImage: string;
  textOriginal: string;
  textDisplay: string;
  likeCount: number;
  replyCount: number;
  publishedAt: string;
  isReply: boolean;
  parentId: string | null;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  ownerReplied?: boolean;
  ownerReplyText?: string;
  ownerReplyAt?: string;
  ownerReplyYoutubeId?: string;
}

export interface CommentStats {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  totalLikes: number;
  avgLikes: number;
  totalReplies: number;
  videoCount: number;
  replied: number;
  unreplied: number;
}

export interface AudienceAnalysis {
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
  emotionBreakdown?: {
    joy: number;
    curiosity: number;
    confusion: number;
    frustration: number;
    gratitude: number;
  };
  audiencePersonas?: {
    title: string;
    description: string;
    pct: number;
    tag: string;
  }[];
  keyPhrases?: {
    phrase: string;
    type: "positive" | "negative" | "request";
    count: number;
  }[];
  topThemes: { theme: string; count: number; sentiment: string }[];
  audienceDemands: { demand: string; frequency: number; urgency: "high" | "medium" | "low" }[];
  contentSuggestions: string[];
  topPositiveComments: { text: string; author: string; likes: number }[];
  topNegativeComments: { text: string; author: string; likes: number }[];
  engagementInsights: string[];
  overallMood: string;
  summary: string;
}

export interface VideoOption {
  videoId: string;
  title: string;
  thumbnail: string;
  views: number;
  likes: number;
  ytComments: number;
  dbComments: number;
}

export interface ReplySettings {
  creatorContext: string;
  autoReplyEnabled: boolean;
  replyToPositive: boolean;
  replyToNegative: boolean;
  replyToQuestions: boolean;
  replyToNeutral: boolean;
  maxRepliesPerRun: number;
}

export interface GeneratedReply {
  commentId: string;
  replyText: string;
  postedToYouTube: boolean;
  youtubeReplyId?: string;
  videoId?: string;
  videoTitle?: string;
  originalComment?: string;
  originalAuthor?: string;
  sentiment?: string;
}

export function useAudienceAnalysis(options: {
  videoId?: string;
  sentimentFilter?: string;
  sortBy?: "newest" | "likes" | "replies";
} = {}) {
  const { user } = useUser();
  const userId = user?.id || "";
  const queryClient = useQueryClient();

  const { videoId, sentimentFilter, sortBy = "newest" } = options;

  // Query: Videos list
  const videosQuery = useQuery({
    queryKey: ["audience-videos", userId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/audience/videos?userId=${userId}`);
      return res.data.videos as VideoOption[];
    },
    enabled: !!userId,
  });

  // Query: Stored comments & stats
  const commentsQuery = useQuery({
    queryKey: ["audience-comments", userId, videoId, sentimentFilter, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams({ userId, sortBy, limit: "100" });
      if (videoId) params.append("videoId", videoId);
      if (sentimentFilter && sentimentFilter !== "all") params.append("sentiment", sentimentFilter);

      const res = await apiClient.get(`/api/audience/comments?${params.toString()}`);
      return res.data as { comments: YouTubeComment[]; stats: CommentStats };
    },
    enabled: !!userId,
  });

  // Query: AI Analysis
  const analysisQuery = useQuery({
    queryKey: ["audience-analysis", userId, videoId],
    queryFn: async () => {
      const params = new URLSearchParams({ userId });
      if (videoId) params.append("videoId", videoId);

      const res = await apiClient.get(`/api/audience/analysis?${params.toString()}`);
      return res.data as { analysis: AudienceAnalysis; cached: boolean };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  // Query: Reply settings
  const replySettingsQuery = useQuery({
    queryKey: ["audience-reply-settings", userId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/audience/reply-settings?userId=${userId}`);
      return res.data.settings as ReplySettings;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });

  // Mutation: Sync comments from YouTube API
  const syncMutation = useMutation({
    mutationFn: async (targetVideoId?: string) => {
      const res = await apiClient.post("/api/audience/sync", {
        userId,
        videoId: targetVideoId || videoId,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audience-comments"] });
      queryClient.invalidateQueries({ queryKey: ["audience-analysis"] });
      queryClient.invalidateQueries({ queryKey: ["audience-videos"] });
    },
  });

  // Mutation: Re-analyze AI insights
  const reanalyzeMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({ userId, refresh: "true" });
      if (videoId) params.append("videoId", videoId);

      const res = await apiClient.get(`/api/audience/analysis?${params.toString()}`);
      return res.data as { analysis: AudienceAnalysis; cached: boolean };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["audience-analysis", userId, videoId], data);
    },
  });

  // Mutation: Generate AI reply for a comment
  const generateReplyMutation = useMutation({
    mutationFn: async (params: {
      commentDbId: string;
      parentCommentId: string;
      commentText: string;
      authorName: string;
      customInstruction?: string;
    }) => {
      const res = await apiClient.post("/api/audience/reply", {
        userId,
        ...params,
        postToYouTube: false,
      });
      return res.data as { reply: string; postedToYouTube: boolean };
    },
  });

  // Mutation: Post reply to YouTube
  const postReplyMutation = useMutation({
    mutationFn: async (params: {
      commentDbId: string;
      parentCommentId: string;
      commentText: string;
      authorName: string;
      customReplyText: string;
    }) => {
      const res = await apiClient.post("/api/audience/reply", {
        userId,
        ...params,
        postToYouTube: true,
      });
      return res.data as { reply: string; postedToYouTube: boolean; youtubeReplyId?: string; commentId: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audience-comments"] });
    },
  });

  // Mutation: Save reply settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<ReplySettings>) => {
      const res = await apiClient.put("/api/audience/reply-settings", {
        userId,
        ...settings,
      });
      return res.data.settings as ReplySettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["audience-reply-settings", userId], data);
    },
  });

  // Mutation: Run auto-reply
  const autoReplyMutation = useMutation({
    mutationFn: async (params: { videoId?: string; postToYouTube?: boolean }) => {
      const res = await apiClient.post("/api/audience/auto-reply", {
        userId,
        videoId: params.videoId || videoId,
        postToYouTube: params.postToYouTube || false,
      });
      return res.data as {
        success: boolean;
        repliesGenerated: number;
        repliesPosted: number;
        replies: GeneratedReply[];
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audience-comments"] });
    },
  });

  // Mutation: Delete a posted reply from YouTube
  const deleteReplyMutation = useMutation({
    mutationFn: async (params: { youtubeCommentId: string; commentDbId: string }) => {
      const res = await apiClient.delete("/api/audience/reply", {
        data: { userId, ...params },
      });
      return res.data as { success: boolean; deleted: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audience-comments"] });
    },
  });

  // Mutation: Edit a posted reply on YouTube
  const editReplyMutation = useMutation({
    mutationFn: async (params: { youtubeCommentId: string; commentDbId: string; newText: string }) => {
      const res = await apiClient.put("/api/audience/reply/edit", {
        userId,
        ...params,
      });
      return res.data as { success: boolean; updated: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audience-comments"] });
    },
  });

  return {
    videos: videosQuery.data || [],
    comments: commentsQuery.data?.comments || [],
    stats: commentsQuery.data?.stats || null,
    analysis: analysisQuery.data?.analysis || null,
    replySettings: replySettingsQuery.data || null,
    isLoading: commentsQuery.isLoading || analysisQuery.isLoading,
    isSyncing: syncMutation.isPending,
    isAnalyzing: reanalyzeMutation.isPending,
    isGeneratingReply: generateReplyMutation.isPending,
    isPostingReply: postReplyMutation.isPending,
    isSavingSettings: saveSettingsMutation.isPending,
    isAutoReplying: autoReplyMutation.isPending,
    isDeletingReply: deleteReplyMutation.isPending,
    isEditingReply: editReplyMutation.isPending,
    syncComments: syncMutation.mutateAsync,
    reanalyze: reanalyzeMutation.mutateAsync,
    generateReply: generateReplyMutation.mutateAsync,
    postReply: postReplyMutation.mutateAsync,
    saveReplySettings: saveSettingsMutation.mutateAsync,
    runAutoReply: autoReplyMutation.mutateAsync,
    deleteReply: deleteReplyMutation.mutateAsync,
    editReply: editReplyMutation.mutateAsync,
    refetch: () => {
      videosQuery.refetch();
      commentsQuery.refetch();
      analysisQuery.refetch();
    },
  };
}
