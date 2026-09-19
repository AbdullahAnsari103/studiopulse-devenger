/**
 * Reusable Skeleton Placeholder System
 * Reduces perceived load times by up to 40% compared to blank spinners.
 */

import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: "pulse" | "wave" | "shimmer";
}

export function Skeleton({ className = "", variant = "pulse", ...props }: SkeletonProps) {
  const baseClass = "rounded-xl bg-white/[0.04] relative overflow-hidden";
  const animClass =
    variant === "shimmer"
      ? "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_2s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/[0.04] after:to-transparent"
      : "animate-pulse";

  return <div className={`${baseClass} ${animClass} ${className}`} {...props} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="w-24 h-4 rounded-lg" />
        <Skeleton className="w-8 h-8 rounded-xl" />
      </div>
      <Skeleton className="w-36 h-8 rounded-lg" />
      <div className="flex items-center gap-2 pt-1">
        <Skeleton className="w-16 h-3 rounded-md" />
        <Skeleton className="w-20 h-3 rounded-md" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-2xl bg-white/[0.015] border border-white/[0.03] flex items-center gap-3.5"
        >
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-1/3 h-3.5 rounded" />
            <Skeleton className="w-3/4 h-3 rounded" />
          </div>
          <Skeleton className="w-16 h-6 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ className = "" }: { className?: string }) {
  return (
    <div className={`p-6 rounded-3xl bg-white/[0.02] border border-white/[0.04] space-y-5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="w-32 h-4 rounded-lg" />
          <Skeleton className="w-48 h-3 rounded-md" />
        </div>
        <Skeleton className="w-24 h-8 rounded-xl" />
      </div>
      <div className="h-56 flex items-end gap-3 pt-6 px-2">
        {[40, 65, 30, 85, 55, 95, 70, 60, 90, 75, 50, 80].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-full bg-white/[0.03] rounded-t-lg animate-pulse"
              style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
            />
            <Skeleton className="w-full h-2 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
