/**
 * useAnalytics — React Query hook for the Creator Analytics Center
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import apiClient from "@/lib/apiClient";

export type DateRange = "7d" | "28d" | "90d" | "365d" | "all";

export interface ConnectedPlatform {
  platform: string;
  accountName: string;
  accountId: string;
  connectedAt: string;
  lastSync: string;
}

export interface AttachedVideoPoint {
  videoId: string;
  title: string;
  thumbnail: string;
  views: number;
  ctr: number;
  watchTimeMinutes: number;
  likes: number;
  comments: number;
  isShort: boolean;
  publishedAt?: string;
}

export interface TimeSeriesPoint {
  date: string;
  views: number | null;
  watchTimeHours: number | null;
  subscribers: number | null;
  revenue: number | null;
  engagementRate: number | null;
  ctr: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  status: "FINAL" | "PROCESSING" | "UNAVAILABLE";
  source?: string;
  lastSyncedAt?: string;
  videos?: AttachedVideoPoint[];
  topVideo?: AttachedVideoPoint | null;
}

export interface ContentMatrixItem {
  videoId: string;
  title: string;
  description?: string;
  thumbnail: string;
  views: number;
  ctr: number;
  retentionPct: number;
  engagementRate: number;
  likes: number;
  comments: number;
  shares: number;
  subscribersGained: number;
  watchTimeMinutes: number;
  impressions: number;
  revenue: number;
  publishedAt: string;
  duration: string;
  durationSeconds: number;
  isShort: boolean;
  category: string;
  quadrant: string;
}

export interface TrafficSourceItem {
  name: string;
  percentage: number;
  views: number;
  color: string;
}

export interface FormatComparison {
  shorts: {
    count: number;
    avgViews: number;
    avgCtr: number;
    avgRetention: number;
    avgEngagement: number;
    totalViews: number;
  };
  longForm: {
    count: number;
    avgViews: number;
    avgCtr: number;
    avgRetention: number;
    avgEngagement: number;
    totalViews: number;
  };
}

export interface YouTubeStats {
  totalViews: number;
  totalSubscribers: number;
  totalWatchHours: number;
  totalRevenue: number;
  avgCtr: number;
  engagementRate: number;
  totalImpressions: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalDislikes: number;
  channelAvgViews: number;
  channelAvgCtr: number;
  channelAvgRetention: number;
}

export interface YouTubeGrowth {
  views: number;
  watchTime: number;
  subscribers: number;
  revenue: number;
  engagement: number;
}

export interface Monetization {
  isEligible: boolean;
  subscriberCount: number;
  subscriberGoal: number;
  subscriberProgress: number;
  watchHours: number;
  watchHourGoal: number;
  watchHourProgress: number;
  totalRevenue: number;
  estimatedRPM: number;
}

export interface YouTubeData {
  latestFinalizedAnalyticsDate?: string;
  channel: {
    id: string;
    title: string;
    thumbnail: string;
    subscribers: number;
    totalViews: number;
    videoCount: number;
    updatedAt?: string;
  } | null;
  currentChannelStats?: {
    viewCount: number;
    subscriberCount: number;
    videoCount: number;
    updatedAt: string | null;
  };
  stats: YouTubeStats;
  growth: YouTubeGrowth;
  timeSeries: TimeSeriesPoint[];
  contentMatrix: ContentMatrixItem[];
  trafficSources: TrafficSourceItem[];
  formatComparison: FormatComparison;
  monetization: Monetization;
}

export interface AnalyticsData {
  connectedPlatforms: ConnectedPlatform[];
  range: DateRange;
  youtube: YouTubeData | null;
}

export function useAnalytics(range: DateRange = "28d") {
  const { user } = useUser();
  const userId = user?.id;

  const query = useQuery<AnalyticsData>({
    queryKey: ["analytics", userId, range],
    queryFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      const res = await apiClient.get(`/api/analytics/summary?userId=${userId}&range=${range}`);
      return res.data;
    },
    enabled: !!userId,
    staleTime: 5_000,         // 5 seconds
    refetchInterval: 15_000,  // Re-read DB / YouTube API every 15 seconds for real-time accuracy
    refetchOnWindowFocus: true,
  });

  const askAI = useMutation<
    { answer: string; timestamp: string },
    Error,
    { question?: string; selectedText?: string; pageContext?: string; keyword?: string; history?: { role: string; text: string }[] }
  >({
    mutationFn: async ({ question, selectedText, pageContext, keyword, history }) => {
      if (!userId) throw new Error("Not authenticated");
      const res = await apiClient.post("/api/analytics/ask-ai", {
        userId,
        question,
        selectedText,
        pageContext,
        keyword,
        history,
      });
      return res.data;
    },
  });

  const exportCSV = () => {
    const ts = query.data?.youtube?.timeSeries;
    if (!ts || ts.length === 0) return;
    const headers = ["Date", "Views", "Watch Time (Hours)", "Subscribers", "Revenue ($)", "CTR (%)", "Engagement (%)", "Impressions", "Likes", "Comments"];
    const rows = ts.map((p) => [p.date, p.views, p.watchTimeHours, p.subscribers, p.revenue, p.ctr, p.engagementRate, p.impressions, p.likes, p.comments]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Studio_Pulse_Analytics_${range}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return { ...query, askAI, exportCSV };
}
