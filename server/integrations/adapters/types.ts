/**
 * Universal Platform Adapter Interface.
 * Standardized contract that YouTube, Instagram, Facebook, TikTok, and future platforms implement.
 */

export interface VideoFilterOptions {
  status?: string;        // "all" | "published" | "scheduled" | "drafts" | "private" | "unlisted" | "deleted" | "shorts" | "live"
  search?: string;        // Search term for title, description, tags, videoId
  category?: string;      // Category filter
  visibility?: string;    // "public" | "private" | "unlisted" | "scheduled"
  dateRange?: string;     // "7d" | "30d" | "90d" | "all"
  sortBy?: string;        // "newest" | "oldest" | "views" | "likes" | "comments" | "duration" | "engagement"
  page?: number;
  limit?: number;
}

export interface VideoMetadataPayload {
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  categoryId?: string;
  visibility?: "public" | "private" | "unlisted";
  privacyStatus?: "public" | "private" | "unlisted";
  language?: string;
  playlistId?: string;
  madeForKids?: boolean;
  notifySubscribers?: boolean;
  scheduledAt?: string;
}

export interface StandardVideoItem {
  id: string;
  videoId: string;
  platform: string;
  title: string;
  description: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
  duration: string;
  uploadedAt: string;
  publishedAt: string;
  visibility: "public" | "private" | "unlisted" | "scheduled";
  status: "published" | "scheduled" | "draft" | "private" | "unlisted" | "deleted";
  category: string;
  tags: string[];
  language: string;
  isShort: boolean;
  isLive: boolean;
  monetizationStatus: string;
  url: string;
  channelId: string;
}

export interface VideoSummaryStats {
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgViewDuration: string;
  viewsTrend: number;
  likesTrend: number;
  commentsTrend: number;
  videosTrend: number;
  avgDurationTrend: number;
}

export interface VideoDetailedAnalytics {
  videoId: string;
  title: string;
  views: number;
  watchTimeMinutes: number;
  averageViewDuration: number;
  ctr: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  subscribersGained: number;
  revenue: number;
  trafficSources: { source: string; percentage: number }[];
  audienceRetention: { timestamp: string; retentionPercentage: number }[];
  deviceTypes: { device: string; percentage: number }[];
  countries: { country: string; percentage: number }[];
  realtimeViews24h: { hour: string; views: number }[];
}

export interface PlatformAdapter {
  platform: string;
  isConfigured(): boolean;
  getSummaryStats(userId: string): Promise<VideoSummaryStats>;
  getVideos(userId: string, options: VideoFilterOptions): Promise<{ videos: StandardVideoItem[]; total: number; page: number; limit: number }>;
  getVideoDetails(userId: string, videoId: string): Promise<StandardVideoItem | null>;
  updateVideo(userId: string, videoId: string, payload: VideoMetadataPayload): Promise<{ success: boolean; video: StandardVideoItem }>;
  deleteVideo(userId: string, videoId: string): Promise<{ success: boolean; videoId: string }>;
  changeVisibility(userId: string, videoId: string, visibility: "public" | "private" | "unlisted"): Promise<{ success: boolean }>;
  getVideoAnalytics(userId: string, videoId: string): Promise<VideoDetailedAnalytics>;
}
