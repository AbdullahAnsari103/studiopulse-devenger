/**
 * Actionable Toast Notifications
 * Rich interactive notifications with quick action triggers and milestone styling.
 */

import toast from "react-hot-toast";
import { celebrate } from "./celebrate";

interface ActionToastOptions {
  title: string;
  message?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  celebrateMilestone?: boolean;
  duration?: number;
}

export function showActionToast({
  title,
  message,
  icon = "✨",
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  celebrateMilestone = false,
  duration = 5000,
}: ActionToastOptions) {
  if (celebrateMilestone) {
    celebrate.burst({ count: 50 });
  }

  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? "animate-enter" : "animate-leave"
        } max-w-md w-full bg-[#0e0e28]/95 border border-purple-500/30 backdrop-blur-xl shadow-2xl shadow-purple-950/40 rounded-2xl pointer-events-auto flex flex-col p-4 gap-3 text-white transition-all`}
      >
        <div className="flex items-start gap-3">
          <span className="text-xl shrink-0 mt-0.5">{icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white tracking-tight">{title}</p>
            {message && <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{message}</p>}
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="text-gray-500 hover:text-white p-1 rounded-lg text-xs transition"
          >
            ✕
          </button>
        </div>

        {(actionLabel || secondaryLabel) && (
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/[0.04]">
            {secondaryLabel && (
              <button
                onClick={() => {
                  onSecondary?.();
                  toast.dismiss(t.id);
                }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 hover:text-white hover:bg-white/[0.05] transition"
              >
                {secondaryLabel}
              </button>
            )}
            {actionLabel && (
              <button
                onClick={() => {
                  onAction?.();
                  toast.dismiss(t.id);
                }}
                className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold bg-purple-600 hover:bg-purple-500 text-white transition shadow-sm active:scale-95"
              >
                {actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    ),
    { duration }
  );
}
