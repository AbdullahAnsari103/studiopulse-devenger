import type { PlatformAdapter } from "./types";
import { YouTubeAdapter } from "./youtube";
import { InstagramAdapter } from "./instagram";
import { FacebookAdapter } from "./facebook";
import { TikTokAdapter } from "./tiktok";

const adapters: Record<string, PlatformAdapter> = {
  youtube: new YouTubeAdapter(),
  instagram: new InstagramAdapter(),
  facebook: new FacebookAdapter(),
  tiktok: new TikTokAdapter(),
};

/**
 * Get the platform adapter instance for a target platform (youtube, instagram, facebook, tiktok).
 */
export function getPlatformAdapter(platform: string = "youtube"): PlatformAdapter {
  const normalized = platform.toLowerCase();
  const adapter = adapters[normalized];
  if (!adapter) {
    throw new Error(`Unsupported platform adapter: ${platform}`);
  }
  return adapter;
}

export * from "./types";
export * from "./youtube";
export * from "./instagram";
export * from "./facebook";
export * from "./tiktok";
