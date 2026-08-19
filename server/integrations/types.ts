// ─── Standard Platform Integration Contract ──────────────────────────────────
// Universal contract that all social platform integration services (YouTube, Meta,
// TikTok, LinkedIn, Twitter, etc.) implement for standardized authentication.

export interface PlatformIntegration {
  /** Returns true if required API credentials exist in environment. */
  isConfigured(): boolean;

  /** Generates the OAuth authorization URL with signed state parameter. */
  getConnectUrl(userId: string): string;

  /** Orchestrates OAuth code exchange, account discovery, and token persistence. */
  handleCallback(code: string, state: string): Promise<StandardPlatformConnectionResult>;
}

export interface StandardPlatformConnectionResult {
  provider: string;
  accountId: string;
  accountName: string;
  profileImage?: string;
  connected: boolean;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
}

// ─── Platform Provider Interface ───
// Every social platform integration implements this contract.
// Adding a new platform only requires implementing this interface
// and registering a provider instance.

export interface PlatformProvider {
  /** Initiate the OAuth flow — returns the authorization URL to redirect the user to. */
  getAuthUrl(userId: string): string;

  /** Handle the OAuth callback — exchange code for tokens, store in database. */
  handleCallback(code: string, userId: string): Promise<PlatformConnectionResult>;

  /** Disconnect the platform — revoke tokens and remove from database. */
  disconnect(userId: string): Promise<void>;

  /** Sync latest analytics and content from the platform API. */
  sync(userId: string): Promise<SyncResult>;

  /** Upload content to the platform. */
  upload(userId: string, content: UploadPayload): Promise<UploadResult>;

  /** Fetch analytics data from the platform. */
  analytics(userId: string): Promise<PlatformAnalytics>;

  /** Refresh the access token using the stored refresh token. */
  refreshToken(userId: string): Promise<void>;
}

export interface PlatformConnectionResult {
  accountId: string;
  accountName: string;
  accountEmail?: string;
  profileImage?: string;
  platform: string;
}

export interface SyncResult {
  success: boolean;
  videosUpdated: number;
  analyticsUpdated: boolean;
  lastSync: string;
}

export interface UploadPayload {
  title: string;
  description: string;
  tags: string[];
  thumbnailPath?: string;
  videoPath: string;
  visibility: "public" | "private" | "unlisted";
  scheduledAt?: string;
}

export interface UploadResult {
  success: boolean;
  platformVideoId?: string;
  url?: string;
  error?: string;
}

export interface PlatformAnalytics {
  channelName: string;
  subscribers: number;
  totalViews: number;
  totalVideos: number;
  watchTimeHours: number;
  revenue: number;
  topVideos: VideoAnalytics[];
  latestUploads: VideoAnalytics[];
}

export interface VideoAnalytics {
  videoId: string;
  title: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
  revenue: number;
  publishedAt: string;
  duration?: string;
}

// ─── Connected Platform record stored in database ───
export interface ConnectedPlatformRecord {
  id: string;
  user_id: string;
  platform: string;
  account_id: string | null;
  account_name: string | null;
  account_email: string | null;
  profile_image: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
  connected_at: string;
  last_sync: string | null;
  is_connected: number;
}

// ─── Supported Platform Types ───
export type SupportedPlatform = "youtube" | "instagram" | "tiktok" | "facebook" | "twitter";

export const PLATFORM_DISPLAY_NAMES: Record<SupportedPlatform, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  twitter: "X (Twitter)",
};
