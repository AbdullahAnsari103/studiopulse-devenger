/**
 * extractVideoFrames — Captures visual frame snapshots directly from a File or Blob in the browser.
 * Uses HTML5 <video> and <canvas> (no external binary required).
 *
 * Enhanced: Dynamic frame count based on video duration for richer AI visual analysis.
 * Short videos (< 1 min): 3 frames
 * Medium videos (1–5 min): 5 frames
 * Long videos (5–15 min): 8 frames
 * Very long videos (15+ min): 12 frames (capped to avoid memory issues)
 */

export interface ExtractedFrame {
  base64: string;
  mimeType: string;
  timeSeconds?: number;
  timestamp?: string;
}

/**
 * Calculate the optimal number of frames to extract based on video duration.
 * Ensures adequate coverage for AI analysis of videos of any length.
 */
export function getOptimalFrameCount(durationSeconds: number): number {
  if (durationSeconds <= 0) return 3; // fallback
  if (durationSeconds < 60) return 3; // < 1 min
  if (durationSeconds < 300) return 5; // 1–5 min
  if (durationSeconds < 900) return 8; // 5–15 min
  return 12; // 15+ min (capped)
}

/**
 * Generate strategic seek positions to cover the full video arc.
 * Avoids the very first/last frames (which are often black) and
 * distributes evenly across the video timeline.
 */
function getSeekPositions(duration: number, count: number): number[] {
  // Use 3%–97% range to avoid intro/outro black frames
  const start = 0.03;
  const end = 0.97;
  const positions: number[] = [];

  if (count === 1) {
    positions.push(0.5);
  } else {
    const step = (end - start) / (count - 1);
    for (let i = 0; i < count; i++) {
      positions.push(start + step * i);
    }
  }

  return positions.map(pct =>
    Math.max(0.3, Math.min(duration - 0.3, duration * pct))
  );
}

/**
 * Extract frames from a video file at strategic positions.
 *
 * @param file       Video File or Blob
 * @param frameCount Number of frames to extract. If 0 or omitted, auto-calculated from duration.
 * @param quality    JPEG quality (0–1)
 */
export async function extractVideoFrames(
  file: File | Blob,
  frameCount = 0,
  quality = 0.8
): Promise<ExtractedFrame[]> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";

      const frames: ExtractedFrame[] = [];

      video.onloadedmetadata = async () => {
        const duration = video.duration || 10;

        // Auto-calculate optimal frame count if not explicitly set
        const count = frameCount > 0 ? frameCount : getOptimalFrameCount(duration);

        console.log(
          `[extractVideoFrames] Duration: ${Math.round(duration)}s → Extracting ${count} frames`
        );

        const seekTimes = getSeekPositions(duration, count);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        for (const seekTime of seekTimes) {
          await new Promise<void>((resSeek) => {
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              try {
                // Resize for fast API upload (max width 640px)
                const scale = Math.min(1, 640 / (video.videoWidth || 640));
                canvas.width = (video.videoWidth || 640) * scale;
                canvas.height = (video.videoHeight || 360) * scale;

                if (ctx) {
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const dataUrl = canvas.toDataURL("image/jpeg", quality);
                  const base64 = dataUrl.split(",")[1];
                  if (base64) {
                    const sec = Math.round(seekTime);
                    const min = Math.floor(sec / 60);
                    const remSec = sec % 60;
                    const ts = `${min}:${remSec < 10 ? "0" : ""}${remSec}`;
                    frames.push({
                      base64,
                      mimeType: "image/jpeg",
                      timeSeconds: sec,
                      timestamp: ts,
                    });
                  }
                }
              } catch {
                // Frame capture failed (CORS or format issue)
              }
              resSeek();
            };

            video.addEventListener("seeked", onSeeked);
            video.currentTime = seekTime;
          });
        }

        (frames as any).duration = Math.round(duration);
        URL.revokeObjectURL(url);
        resolve(frames);
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve([]);
      };

      video.src = url;
    } catch {
      resolve([]);
    }
  });
}

/**
 * Get video duration in seconds directly using browser video element.
 */
export async function getVideoDuration(file: File | Blob): Promise<number> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const d = Math.round(video.duration || 0);
        URL.revokeObjectURL(url);
        resolve(d);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
      video.src = url;
    } catch {
      resolve(0);
    }
  });
}

