/**
 * useDashboard — React Query hook for the creator dashboard summary.
 * Fetches real YouTube analytics from the backend /api/dashboard/summary endpoint.
 */

import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import apiClient from "@/lib/apiClient";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DashboardVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
  watchTimeMinutes: number;
  ctr: number;
  impressions: number;
  revenue: number;
  publishedAt: string;
  duration: string;
  isShort: boolean;
}

export interface DashboardLatestVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  views: number;
  publishedAt: string;
  duration: string;
  isShort: boolean;
}

export interface DashboardStats {
  totalViews: number;
  totalSubscribers: number;
  totalVideos: number;
  totalRevenue: number;
  totalWatchTimeMinutes: number;
  watchTimeHours: number;
  engagementRate: number;
  avgCtr: number;
  totalImpressions: number;
  viewsTrend: number;
  subscribersTrend: number;
  watchTimeTrend: number;
  revenueTrend: number;
  engagementTrend: number;
}

export interface ViewsDataPoint {
  date: string;
  views: number | null;
  watchTime: number | null;
  subscribers: number | null;
  revenue: number | null;
  engagement: number | null;
  status: "FINAL" | "PROCESSING" | "UNAVAILABLE";
  source?: string;
  lastSyncedAt?: string;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number | null;
}

export interface AudienceOverview {
  returning: number;
  new: number;
  subscribers: number;
  returningCount: number;
  newCount: number;
  subscriberCount: number;
  topCountries: { country: string; code: string; pct: number }[];
  videoEngagementOverTime: {
    title: string;
    views: number;
    likes: number;
    comments: number;
    date: string;
  }[];
}

export interface PlatformBreakdown {
  platform: string;
  revenue: number;
  pct: number;
  color: string;
}

export interface DashboardNotification {
  type: string;
  icon: string;
  title: string;
  body: string;
  time: string;
  important?: boolean;
}

export interface RecentActivityItem {
  type: string;
  title: string;
  description: string;
  time: string;
  icon: string;
  meta?: string;
}

export interface DashboardSummary {
  hasYouTube: boolean;
  isEligible?: boolean;
  latestFinalizedAnalyticsDate?: string;
  connectedPlatforms: Record<string, {
    accountName: string;
    accountId: string;
    connectedAt: string;
    lastSync: string;
  }>;
  channel: {
    id: string;
    title: string;
    thumbnail: string;
    subscriberCount: number;
    viewCount: number;
    videoCount: number;
    updatedAt: string;
  } | null;
  stats: DashboardStats | null;
  topVideos: DashboardVideo[];
  latestVideos: DashboardLatestVideo[];
  viewsOverTime: ViewsDataPoint[];  // ALL rows — with status: 'FINAL' | 'PROCESSING'
  audienceOverview: AudienceOverview | null;
  revenueOverview: RevenueDataPoint[];
  platformBreakdown: PlatformBreakdown[];
  recentActivity: RecentActivityItem[];
  notifications: DashboardNotification[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDashboard() {
  const { user } = useUser();
  const userId = user?.id;

  const query = useQuery<DashboardSummary>({
    queryKey: ["dashboard", userId],
    queryFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      const res = await apiClient.get(`/api/dashboard/summary?userId=${userId}`);
      return res.data;
    },
    enabled: !!userId,
    staleTime: 5_000,         // 5 seconds
    refetchInterval: 15_000,  // Re-read DB / YouTube API every 15 seconds for real-time accuracy
    refetchOnWindowFocus: true,
  });

  /**
   * Force a fresh YouTube sync then re-fetch dashboard data.
   * Call this from a "Refresh" button or on mount.
   */
  const syncDashboard = async (): Promise<void> => {
    if (!userId) return;
    try {
      await apiClient.post(`/api/dashboard/sync`, { userId });
      await query.refetch();
    } catch (e) {
      console.warn("[useDashboard] sync failed:", e);
    }
  };

  return {
    ...query,
    syncDashboard,
  };
}
