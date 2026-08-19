import type { PlatformAdapter, VideoFilterOptions, StandardVideoItem, VideoSummaryStats, VideoDetailedAnalytics, VideoMetadataPayload } from "./types";

export class FacebookAdapter implements PlatformAdapter {
  platform = "facebook";

  isConfigured(): boolean {
    return !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
  }

  async getSummaryStats(_userId: string): Promise<VideoSummaryStats> {
    return {
      totalVideos: 0, totalViews: 0, totalLikes: 0, totalComments: 0,
      avgViewDuration: "0:00", viewsTrend: 0, likesTrend: 0, commentsTrend: 0,
      videosTrend: 0, avgDurationTrend: 0,
    };
  }

  async getVideos(_userId: string, options: VideoFilterOptions) {
    return { videos: [], total: 0, page: options.page || 1, limit: options.limit || 10 };
  }

  async getVideoDetails(_userId: string, _videoId: string): Promise<StandardVideoItem | null> {
    return null;
  }

  async updateVideo(_userId: string, _videoId: string, _payload: VideoMetadataPayload) {
    throw new Error("Facebook Graph API credentials not configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.");
  }

  async deleteVideo(_userId: string, _videoId: string) {
    throw new Error("Facebook Graph API credentials not configured.");
  }

  async changeVisibility(_userId: string, _videoId: string, _visibility: any) {
    throw new Error("Facebook Graph API credentials not configured.");
  }

  async getVideoAnalytics(_userId: string, _videoId: string): Promise<VideoDetailedAnalytics> {
    throw new Error("Facebook Graph API credentials not configured.");
  }
}
