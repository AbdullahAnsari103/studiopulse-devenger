/**
 * useActivityTracker — Automatic page tracking and activity logging hook.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

import apiClient from "@/lib/apiClient";

export function useActivityTracker() {
  const { user } = useUser();
  const location = useLocation();

  useEffect(() => {
    if (!user?.id) return;

    const pageName = location.pathname.split("/")[1] || "dashboard";
    const details = `Visited page ${location.pathname}`;

    apiClient.post("/api/activity/log", {
      userId: user.id,
      action: "page_view",
      details,
      page: pageName,
    }).catch(() => {
      // Silently ignore activity log failures during backend restarts
    });
  }, [location.pathname, user?.id]);
}

export async function logUserActivity(userId: string, action: string, details?: string, page?: string) {
  try {
    await apiClient.post("/api/activity/log", {
      userId,
      action,
      details,
      page,
    });
  } catch (err) {
    console.warn("Failed to log activity:", err);
  }
}
