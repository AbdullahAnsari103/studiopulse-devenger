/**
 * generateThumbnail — Selects the best frame from extracted video frames for thumbnail use.
 * Uses the middle frame (50% position) which typically has the highest visual quality.
 * Returns a data URL for display in the UI.
 */

import type { ExtractedFrame } from "./extractVideoFrames";

/**
 * Given an array of extracted frames, pick the best candidate for a thumbnail.
 * Strategy: prefer the middle frame (index 2 of 5 = 50% position) as it usually
 * captures the core content of the video rather than intros/outros.
 */
export function selectBestThumbnail(frames: ExtractedFrame[]): string | null {
  if (!frames || frames.length === 0) return null;

  // Middle frame (50% position) is index 2 in a 5-frame extraction
  const bestIndex = Math.floor(frames.length / 2);
  const best = frames[bestIndex];

  if (!best?.base64) return null;
  return `data:${best.mimeType};base64,${best.base64}`;
}

/**
 * Convert a File (image) to a base64 data URL for custom thumbnail preview.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
