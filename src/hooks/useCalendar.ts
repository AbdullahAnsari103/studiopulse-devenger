import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useUser } from "@clerk/clerk-react";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  eventType: "upload" | "reel" | "video" | "short" | "campaign" | "meeting" | "reminder" | "milestone" | "goal" | "holiday" | "suggestion" | "draft";
  platform: "youtube" | "instagram" | "facebook" | "tiktok" | "all";
  startTime: string;
  endTime?: string | null;
  status: "scheduled" | "published" | "draft" | "completed" | "cancelled";
  priority: "high" | "medium" | "low";
  color: string;
  reminderMinutes: number;
  repeatRule: "none" | "daily" | "weekly" | "monthly" | "yearly";
  videoId?: string | null;
  thumbnail?: string;
  campaignId?: string | null;
  tags: string[];
  notes?: string;
  isMilestone: boolean;
  milestoneBadge?: string;
}

export interface CalendarNotification {
  id: string;
  eventId?: string | null;
  title: string;
  message: string;
  platform: string;
  triggerAt: string;
  isRead: boolean;
  type: string;
  createdAt: string;
}

export interface CalendarCampaign {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  platforms: string[];
  status: "active" | "completed" | "draft";
  progress: number;
  budget: number;
  goal: string;
  notes: string;
}

export interface CalendarMilestone {
  id: string;
  title: string;
  metricType: string;
  targetValue: number;
  currentValue: number;
  achievedAt?: string | null;
  icon: string;
  status: "achieved" | "in_progress" | "upcoming";
  progressPct: number;
}

export interface AISuggestion {
  id: string;
  platform: string;
  title: string;
  time: string;
  recommendation: string;
  action: string;
  confidence: string;
}

export interface CalendarSummaryResponse {
  connectedPlatforms: Array<{ platform: string; accountName: string; isConnected: boolean }>;
  events: CalendarEvent[];
  notifications: CalendarNotification[];
  campaigns: CalendarCampaign[];
  milestones: CalendarMilestone[];
  aiSuggestions: AISuggestion[];
  stats: {
    totalSubscribers: number;
    totalViews: number;
    totalEvents: number;
    scheduledCount: number;
    unreadNotifications: number;
  };
}

const API_BASE = "http://localhost:3001/api/calendar";

export function useCalendar() {
  const { user } = useUser();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // 1. Fetch Calendar Summary Data
  const summaryQuery = useQuery<CalendarSummaryResponse>({
    queryKey: ["calendarSummary", userId],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/summary`, { params: { userId } });
      return res.data;
    },
    enabled: !!userId,
    staleTime: 10000,
    refetchInterval: 15000,
  });

  // 2. Request Browser Notification Permission & Background Reminder Engine
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Background Notification Scheduler
  useEffect(() => {
    if (!summaryQuery.data?.events) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      summaryQuery.data.events.forEach((evt) => {
        const evtTime = new Date(evt.startTime).getTime();
        const remTime = evtTime - (evt.reminderMinutes || 15) * 60 * 1000;

        // Trigger if within 30 seconds window and not yet completed
        if (Math.abs(now - remTime) < 15000 && evt.status === "scheduled") {
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification(`🔔 Scheduled Post Reminder: ${evt.title}`, {
              body: `Your ${evt.platform.toUpperCase()} content "${evt.title}" is scheduled to go live soon!`,
              icon: "/favicon.ico",
            });
          }
        }
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [summaryQuery.data?.events]);

  // 3. Create Event Mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: Partial<CalendarEvent>) => {
      const res = await axios.post(`${API_BASE}/events`, { userId, ...eventData });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarSummary", userId] });
    },
  });

  // 4. Update Event Mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...eventData }: Partial<CalendarEvent> & { id: string }) => {
      const res = await axios.put(`${API_BASE}/events/${id}`, eventData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarSummary", userId] });
    },
  });

  // 5. Drag & Drop Move Event Mutation
  const moveEventMutation = useMutation({
    mutationFn: async ({ id, startTime }: { id: string; startTime: string }) => {
      const res = await axios.post(`${API_BASE}/events/${id}/drag`, { startTime });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarSummary", userId] });
    },
  });

  // 6. Delete Event Mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.delete(`${API_BASE}/events/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarSummary", userId] });
    },
  });

  // 7. Mark Notification Read Mutation
  const markNotificationReadMutation = useMutation({
    mutationFn: async (notificationId?: string) => {
      const res = await axios.post(`${API_BASE}/notifications/mark-read`, { userId, notificationId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarSummary", userId] });
    },
  });

  // 8. AI Optimize Schedule Mutation
  const optimizeScheduleMutation = useMutation({
    mutationFn: async (prompt?: string) => {
      const res = await axios.post(`${API_BASE}/ai-optimize`, { userId, prompt });
      return res.data;
    },
  });

  return {
    data: summaryQuery.data,
    isLoading: summaryQuery.isLoading,
    isError: summaryQuery.isError,
    refetch: summaryQuery.refetch,

    createEvent: createEventMutation.mutateAsync,
    updateEvent: updateEventMutation.mutateAsync,
    moveEvent: moveEventMutation.mutateAsync,
    deleteEvent: deleteEventMutation.mutateAsync,
    markNotificationRead: markNotificationReadMutation.mutateAsync,
    optimizeScheduleWithAI: optimizeScheduleMutation.mutateAsync,

    isCreating: createEventMutation.isPending,
    isUpdating: updateEventMutation.isPending,
    isMoving: moveEventMutation.isPending,
    isDeleting: deleteEventMutation.isPending,
    isOptimizing: optimizeScheduleMutation.isPending,
  };
}
