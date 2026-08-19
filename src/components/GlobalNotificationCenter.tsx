import React, { useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useUser } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Calendar, CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface PopNotification {
  id: string;
  title: string;
  message: string;
  platform: "youtube" | "instagram" | "facebook" | "tiktok" | "all";
  triggerAt?: string;
  type?: "reminder" | "milestone" | "ai" | "system";
  isRead?: boolean;
}

// Play pleasant web audio chime alert
function playChimeAlert() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    // Audio context fallback
  }
}

export function GlobalNotificationCenter() {
  const { user } = useUser();
  const userId = user?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activePop, setActivePop] = useState<PopNotification | null>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // 1. Request Native Device Notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // 2. Fetch Calendar & Notification summary periodically
  const { data } = useQuery({
    queryKey: ["global-calendar-summary", userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await axios.get(`/api/calendar/summary?userId=${userId}`);
      return res.data;
    },
    enabled: Boolean(userId),
    refetchInterval: 12000, // Check every 12 seconds for real-time responsiveness
  });

  // 3. Mark Notification Read Mutation
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await axios.post("/api/calendar/notifications/mark-read", {
        userId,
        notificationId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-calendar-summary"] });
    },
  });

  // 4. Trigger In-App Pop-Out Banner + Native Device Notification
  const triggerPop = useCallback(
    (notif: PopNotification) => {
      if (notifiedIdsRef.current.has(notif.id)) return;
      notifiedIdsRef.current.add(notif.id);

      // Play audio chime inside app
      playChimeAlert();

      // Show floating pop-out inside app
      setActivePop(notif);

      // Trigger Native Device Notification (Outside the App)
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          const nativeNotif = new Notification(notif.title, {
            body: notif.message,
            icon: "/logo.png",
            tag: notif.id,
            requireInteraction: true,
          });
          nativeNotif.onclick = () => {
            window.focus();
            navigate("/calendar");
          };
        } catch (e) {
          console.error("Native notification failed:", e);
        }
      }
    },
    [navigate]
  );

  // 5. Watch for new unread notifications or upcoming events
  useEffect(() => {
    if (!data) return;

    // Check unread notifications list
    const unreadNotifs = data.notifications || [];
    const latestUnread = unreadNotifs.find((n: any) => !n.isRead);

    if (latestUnread && !notifiedIdsRef.current.has(latestUnread.id)) {
      triggerPop({
        id: latestUnread.id,
        title: latestUnread.title,
        message: latestUnread.message,
        platform: latestUnread.platform || "youtube",
        type: latestUnread.type || "reminder",
      });
      return;
    }

    // Check upcoming scheduled posts (trigger 15 mins before or at start time)
    const events = data.events || [];
    const now = new Date().getTime();

    for (const evt of events) {
      if (evt.status !== "scheduled") continue;
      const startTime = new Date(evt.startTime).getTime();
      const diffMins = (startTime - now) / 60000;

      // If scheduled post is within 15 minutes or just arrived
      if (diffMins >= -1 && diffMins <= 15) {
        const evtNotifId = `evt-alert-${evt.id}-${Math.floor(now / 300000)}`; // unique per 5 mins
        if (!notifiedIdsRef.current.has(evtNotifId)) {
          triggerPop({
            id: evtNotifId,
            title: `⏰ Post Alert: "${evt.title}"`,
            message:
              diffMins <= 0
                ? "Your post scheduled time has arrived! Ready to publish."
                : `Your content is scheduled to publish in ${Math.ceil(diffMins)} minutes.`,
            platform: evt.platform || "youtube",
            type: "reminder",
          });
          break;
        }
      }
    }
  }, [data, triggerPop]);

  // Handle dismiss or mark read
  const handleDismiss = () => {
    if (activePop && activePop.id && !activePop.id.startsWith("evt-alert-")) {
      markReadMutation.mutate(activePop.id);
    }
    setActivePop(null);
  };

  const handleActionView = () => {
    handleDismiss();
    navigate("/calendar");
  };

  return (
    <AnimatePresence>
      {activePop && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.9 }}
          className="fixed top-5 right-5 z-[9999] max-w-sm w-full select-text"
        >
          <div className="bg-[#0f0f24]/95 backdrop-blur-xl border border-[#8200DB] rounded-2xl p-4 shadow-[0_10px_35px_rgba(130,0,219,0.4)] relative overflow-hidden text-white space-y-3">
            {/* Top Glow Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8200DB] via-[#a855f7] to-amber-400" />

            <div className="flex items-start justify-between gap-3 pt-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#8200DB]/20 border border-[#8200DB]/40 text-[#a855f7] shrink-0 animate-pulse">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {activePop.platform} Alert
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Live
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-white mt-1 leading-snug">{activePop.title}</h4>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg bg-[#181832] text-gray-400 hover:text-white hover:bg-[#252550] transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed bg-[#14142e] p-2.5 rounded-xl border border-[#222248]">
              {activePop.message}
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleActionView}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#8200DB] to-[#a855f7] hover:from-[#7000bc] hover:to-[#9333ea] text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition"
              >
                <Calendar className="w-3.5 h-3.5" /> View Calendar <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDismiss}
                className="py-2 px-3 rounded-xl bg-[#181836] hover:bg-[#222248] text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" /> Dismiss
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
