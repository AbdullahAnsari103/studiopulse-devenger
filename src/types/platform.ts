// ─── Frontend Platform Types ───

export type SupportedPlatform = "youtube" | "instagram" | "tiktok" | "facebook" | "twitter";

export interface PlatformConnectionInfo {
  id: string;
  accountId: string;
  accountName: string;
  accountEmail?: string;
  profileImage?: string;
  connectedAt: string;
  lastSync: string;
  isConnected: boolean;
}

export interface PlatformStatusResponse {
  platforms: Partial<Record<SupportedPlatform, PlatformConnectionInfo>>;
}

export interface PlatformConfig {
  id: SupportedPlatform;
  name: string;
  icon: string; // SVG path or emoji
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  features: string[];
  isConfigured: boolean; // Whether API credentials are present on backend
}
