import { useUser, useClerk } from "@clerk/clerk-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  BarChart3,
  Sparkles,
  Upload,
  Link2,
  Users,
  Bot,
  CalendarDays,
  DollarSign,
  UsersRound,
  Settings,
  Search,
  Bell,
  LogOut,
  ChevronRight,
  Crown,
  HardDrive,
  Check,
  Loader2,
  RefreshCw,
  Shield,
  Zap,
  Menu,
  X,
  Home,
  Plus,
} from "lucide-react";
import { usePlatformStatus, useConnectYouTube, useConnectMeta, useDisconnectPlatform, useSyncPlatform } from "@/hooks/usePlatforms";
import type { SupportedPlatform, PlatformConnectionInfo } from "@/types/platform";
import { formatDistanceToNow } from "date-fns";
import apiClient from "@/lib/apiClient";
import Sidebar, { NAV_ITEMS } from "@/components/layout/Sidebar";

// ─── Platform Configuration ─────────────────────────────────────────────────

interface PlatformCardConfig {
  id: SupportedPlatform;
  name: string;
  description: string;
  features: string[];
  color: string;
  bgGradient: string;
  borderColor: string;
  glowShadow: string;
  iconBg: string;
}

const PLATFORMS: PlatformCardConfig[] = [
  {
    id: "youtube",
    name: "YouTube",
    description: "Connect your channel to access analytics, manage videos, and grow faster.",
    features: ["Channel Analytics", "Video Management", "Revenue Tracking", "Comments & Insights"],
    color: "#FF0000",
    bgGradient: "from-red-500/10 via-red-900/5 to-transparent",
    borderColor: "border-red-500/20",
    glowShadow: "hover:shadow-[0_0_40px_rgba(255,0,0,0.08)]",
    iconBg: "bg-red-500/10",
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Connect your Instagram to schedule posts, analyze stories, and track growth.",
    features: ["Post & Reels Insights", "Stories Analytics", "Audience Growth", "Best Time to Post"],
    color: "#E1306C",
    bgGradient: "from-pink-500/10 via-purple-900/5 to-transparent",
    borderColor: "border-pink-500/20",
    glowShadow: "hover:shadow-[0_0_40px_rgba(225,48,108,0.08)]",
    iconBg: "bg-gradient-to-br from-pink-500/10 to-purple-500/10",
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Connect your TikTok to analyze performance and discover trends.",
    features: ["Video Analytics", "Engagement Tracking", "Trending Hashtags", "Audience Insights"],
    color: "#00F2EA",
    bgGradient: "from-cyan-500/10 via-teal-900/5 to-transparent",
    borderColor: "border-cyan-500/20",
    glowShadow: "hover:shadow-[0_0_40px_rgba(0,242,234,0.08)]",
    iconBg: "bg-cyan-500/10",
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Connect your Facebook page to manage content and track performance.",
    features: ["Page Insights", "Post Scheduling", "Audience Metrics", "Lead Tracking"],
    color: "#1877F2",
    bgGradient: "from-blue-500/10 via-blue-900/5 to-transparent",
    borderColor: "border-blue-500/20",
    glowShadow: "hover:shadow-[0_0_40px_rgba(24,119,242,0.08)]",
    iconBg: "bg-blue-500/10",
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    description: "Connect your X account to schedule tweets and grow your presence.",
    features: ["Tweet Scheduling", "Engagement Stats", "Follower Insights", "Hashtag Analytics"],
    color: "#ffffff",
    bgGradient: "from-gray-400/10 via-gray-900/5 to-transparent",
    borderColor: "border-gray-500/20",
    glowShadow: "hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]",
    iconBg: "bg-white/10",
  },
];

// ─── SVG Platform Icons ─────────────────────────────────────────────────────

function YouTubeIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M43.2 13.4a5 5 0 0 0-3.5-3.5C36.4 9 24 9 24 9s-12.4 0-15.7.9A5 5 0 0 0 4.8 13.4 52 52 0 0 0 3.9 24a52 52 0 0 0 .9 10.6 5 5 0 0 0 3.5 3.5c3.3.9 15.7.9 15.7.9s12.4 0 15.7-.9a5 5 0 0 0 3.5-3.5A52 52 0 0 0 44.1 24a52 52 0 0 0-.9-10.6Z" fill="#FF0000"/>
      <path d="M19.8 30.4 31.2 24l-11.4-6.4v12.8Z" fill="#fff"/>
    </svg>
  );
}

function InstagramIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <radialGradient id="ig1" cx="20%" cy="100%" r="120%">
          <stop offset="0%" stopColor="#fdf497"/>
          <stop offset="5%" stopColor="#fdf497"/>
          <stop offset="45%" stopColor="#fd5949"/>
          <stop offset="60%" stopColor="#d6249f"/>
          <stop offset="90%" stopColor="#285AEB"/>
        </radialGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#ig1)"/>
      <circle cx="24" cy="24" r="9" stroke="#fff" strokeWidth="3" fill="none"/>
      <circle cx="35" cy="13" r="2.5" fill="#fff"/>
    </svg>
  );
}

function TikTokIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#000"/>
      <path d="M33.5 14.5a7.5 7.5 0 0 1-5-2 7.5 7.5 0 0 1-2-5h-4.5v21a4.5 4.5 0 1 1-3-4.24V19.5a9 9 0 1 0 7.5 8.87V20a12 12 0 0 0 7 2.25V17.5a7.5 7.5 0 0 1-2-3z" fill="#00F2EA"/>
      <path d="M32 13a7.5 7.5 0 0 1-5-2 7.5 7.5 0 0 1-2-5h-4.5v21a4.5 4.5 0 1 1-3-4.24V18a9 9 0 1 0 7.5 8.87V18.5a12 12 0 0 0 7 2.25V16a7.5 7.5 0 0 1 0-3z" fill="#FF0050"/>
      <path d="M32.75 13.75a7.5 7.5 0 0 1-5-2 7.5 7.5 0 0 1-2-5H21.3v21a4.5 4.5 0 1 1-3-4.24V18.75a9 9 0 1 0 7.5 8.87v-9.37a12 12 0 0 0 7 2.25v-4.75a7.5 7.5 0 0 1 0-2z" fill="#fff"/>
    </svg>
  );
}

function FacebookIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#1877F2"/>
      <path d="M32 25l.8-5.2H27.8V16.7c0-1.4.7-2.8 2.9-2.8h2.3V9.4s-2.1-.4-4-.4c-4.1 0-6.8 2.5-6.8 7v4H17v5.2h5.2V39h6.4V25H32z" fill="#fff"/>
    </svg>
  );
}

function TwitterIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#000"/>
      <path d="M27.1 22.2 35.3 13h-1.9l-7.1 8L20.3 13h-6.5l8.6 12.5L13.5 35h1.9l7.5-8.7 6 8.7h6.5L27.1 22.2zm-2.6 3.1-.9-1.3-7-10h3l5.7 8.2.9 1.3 7.3 10.5h-3l-6-8.7z" fill="#fff"/>
    </svg>
  );
}

function getPlatformIcon(platform: SupportedPlatform, size = 28) {
  switch (platform) {
    case "youtube": return <YouTubeIcon size={size} />;
    case "instagram": return <InstagramIcon size={size} />;
    case "tiktok": return <TikTokIcon size={size} />;
    case "facebook": return <FacebookIcon size={size} />;
    case "twitter": return <TwitterIcon size={size} />;
  }
}

// ─── Sidebar Navigation Items ───────────────────────────────────────────────


// ─── Safe Date Helper ────────────────────────────────────────────────────────

function safeFormatDistance(dateStr?: string | null): string {
  if (!dateStr) return "Recently";
  try {
    const formatted = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + (dateStr.endsWith("Z") ? "" : "Z");
    const d = new Date(formatted);
    if (isNaN(d.getTime())) return "Recently";
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "Recently";
  }
}

// ─── Direct Connect Modal Component ─────────────────────────────────────────

function DirectConnectModal({
  platform,
  onClose,
  onSuccess,
  userId,
}: {
  platform: SupportedPlatform | null;
  onClose: () => void;
  onSuccess: () => void;
  userId?: string;
}) {
  const [handle, setHandle] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!platform) return null;

  const platformName = platform === "twitter" ? "X (Twitter)" : platform.charAt(0).toUpperCase() + platform.slice(1);

  const handleInstantConnect = async (customName?: string) => {
    setIsLoading(true);
    try {
      await apiClient.post("/api/platforms/direct-connect", {
        userId,
        platform,
        accountName: customName || handle || `${platformName} Creator`,
      });
      toast.success(`✅ ${platformName} connected successfully!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || `Failed to connect ${platformName}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0e0d1f] border border-purple-500/30 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl text-white relative"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                {getPlatformIcon(platform, 22)}
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Connect {platformName}</h3>
                <p className="text-[11px] text-gray-400">Link your account for analytics & auto-publishing</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-300 mb-1 block">Account Handle or Channel URL</label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder={`e.g. @unspokenframes or ${platform}.com/...`}
                className="w-full bg-[#16152b] border border-purple-500/25 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-purple-400 transition"
              />
            </div>

            <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-purple-300 font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span>Instant Linking Enabled</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Connect seamlessly in 1-click. You can also sync live video analytics and auto-publish clips anytime.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => handleInstantConnect()}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-yellow-300" />}
              <span>One-Click Link ⚡</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── How It Works & Terms Modal Component ───────────────────────────────────

function HowItWorksModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"how" | "security" | "terms">("how");

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0f0f22] border border-[#262652] rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative text-white select-text overflow-hidden"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between border-b border-[#222248] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#141428] border border-purple-500/30 flex items-center justify-center shrink-0">
                <img src="/image.png" alt="StudioPulse Logo" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">How StudioPulse Connects & Legal Protection Framework</h3>
                <p className="text-xs text-gray-400">Platform Integration, Privacy Safeguards & Terms of Service</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-[#181836] text-gray-400 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 p-1 bg-[#14142e] border border-[#222248] rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab("how")}
              className={`flex-1 py-2 rounded-lg transition ${activeTab === "how" ? "bg-[#8200DB] text-white font-bold" : "text-gray-400 hover:text-white"}`}
            >
              ⚡ How It Works
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`flex-1 py-2 rounded-lg transition ${activeTab === "security" ? "bg-[#8200DB] text-white font-bold" : "text-gray-400 hover:text-white"}`}
            >
              🔒 Security & Encryption
            </button>
            <button
              onClick={() => setActiveTab("terms")}
              className={`flex-1 py-2 rounded-lg transition ${activeTab === "terms" ? "bg-[#8200DB] text-white font-bold" : "text-gray-400 hover:text-white"}`}
            >
              📋 Terms & Conditions
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-4 text-xs max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
            {activeTab === "how" && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#141428] border border-[#222244] space-y-1.5">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px]">1</span>
                    Official OAuth 2.0 Direct API Authentication
                  </h4>
                  <p className="text-gray-300 leading-relaxed">
                    StudioPulse connects to YouTube, Instagram, TikTok, Facebook, and X using official platform OAuth 2.0 standards. We never ask for, see, or store your account password.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141428] border border-[#222244] space-y-1.5">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px]">2</span>
                    Automated Content Scheduling & Distribution
                  </h4>
                  <p className="text-gray-300 leading-relaxed">
                    Schedule videos, Shorts, and Reels once. StudioPulse dispatches authorized API payloads to YouTube Data API v3 and Meta Graph API at your exact target time.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141428] border border-[#222244] space-y-1.5">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px]">3</span>
                    Real-time Unified Analytics Aggregation
                  </h4>
                  <p className="text-gray-300 leading-relaxed">
                    StudioPulse pulls view counts, watch hours, subscriber growth, and audience engagement metrics into a single unified operating dashboard.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#141428] border border-[#222244] space-y-1.5">
                  <h4 className="font-bold text-white text-sm text-emerald-400 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> AES-256 Access Token Encryption
                  </h4>
                  <p className="text-gray-300 leading-relaxed">
                    All access tokens and refresh tokens are encrypted at rest using AES-256 database encryption algorithms. Transfers use HTTPS with TLS 1.3 protocol.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141428] border border-[#222244] space-y-1.5">
                  <h4 className="font-bold text-white text-sm text-purple-300 flex items-center gap-2">
                    <Check className="w-4 h-4" /> Minimal Permission Scopes & 1-Click Revocation
                  </h4>
                  <p className="text-gray-300 leading-relaxed">
                    We request only the minimum required permission scopes to publish content and read analytics. You can disconnect your accounts at any time with 1 click to immediately revoke access tokens.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141428] border border-[#222244] space-y-1.5">
                  <h4 className="font-bold text-white text-sm text-amber-400 flex items-center gap-2">
                    <Crown className="w-4 h-4" /> Zero Data Selling Commitment
                  </h4>
                  <p className="text-gray-300 leading-relaxed">
                    Your personal channel analytics, audience data, and scheduled content remain 100% private to you. StudioPulse never sells or shares creator data with third parties.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "terms" && (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-xl bg-[#141428] border border-[#222244] space-y-1.5">
                  <h4 className="font-bold text-white text-sm text-[#a855f7]">1. Service Scope & Acceptance of Terms</h4>
                  <p className="text-gray-300 leading-relaxed text-[11px]">
                    By linking social platform accounts (YouTube, Instagram, TikTok, Facebook, X) to StudioPulse, you agree to these legally binding Terms of Service. StudioPulse operates solely as a creator operations, publishing automation, and analytics management interface.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141428] border border-[#222244] space-y-1.5">
                  <h4 className="font-bold text-white text-sm text-emerald-400">2. Intellectual Property & Content Ownership</h4>
                  <p className="text-gray-300 leading-relaxed text-[11px]">
                    Creators retain 100% full legal ownership, copyright, and distribution rights to all uploaded videos, Shorts, Reels, thumbnails, scripts, and channel assets. StudioPulse asserts zero proprietary claims or copyrights over your creative content.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141428] border border-[#222244] space-y-1.5">
                  <h4 className="font-bold text-white text-sm text-amber-400">3. Limitation of Liability & Third-Party Service Disclaimer</h4>
                  <p className="text-gray-300 leading-relaxed text-[11px]">
                    StudioPulse is provided on an "AS IS" and "AS AVAILABLE" basis. StudioPulse, its developers, and operators shall not be held liable for third-party platform API quota changes, network outages, platform service downtime (YouTube, Meta, TikTok, X), account suspensions, or any indirect, incidental, or consequential losses.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141428] border border-[#222244] space-y-1.5">
                  <h4 className="font-bold text-white text-sm text-purple-300">4. Privacy Protection & Zero Third-Party Selling Policy</h4>
                  <p className="text-gray-300 leading-relaxed text-[11px]">
                    StudioPulse commits to strict data privacy standards. Creator tokens are encrypted via AES-256 algorithms. StudioPulse shall never sell, rent, lease, or monetize user data or analytics with third parties under any circumstances.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141428] border border-[#222244] space-y-1.5">
                  <h4 className="font-bold text-white text-sm text-cyan-300">5. 1-Click Revocation & Compliance</h4>
                  <p className="text-gray-300 leading-relaxed text-[11px]">
                    Creators maintain the right to disconnect linked platform accounts at any time via 1-click token revocation. StudioPulse complies with YouTube API Services Terms of Service, Google Privacy Policy, Meta Graph API Developer Data Policies, and TikTok Developer Terms.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="pt-2 border-t border-[#222248] flex justify-end">
            <button
              onClick={onClose}
              className="py-2 px-5 rounded-xl bg-[#8200DB] hover:bg-[#7000bc] text-white font-bold text-xs transition shadow-lg shadow-purple-900/50"
            >
              Got it, Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Orbit Animation Component ─────────────────────────────────────────────

function CosmicOrbitHero() {
  const orbitIcons = [
    { id: "youtube", icon: <YouTubeIcon size={26} />, radius: 105, speed: 25, color: "#FF0000" },
    { id: "instagram", icon: <InstagramIcon size={26} />, radius: 150, speed: 30, color: "#E1306C" },
    { id: "tiktok", icon: <TikTokIcon size={26} />, radius: 195, speed: 35, color: "#00F2EA" },
    { id: "facebook", icon: <FacebookIcon size={26} />, radius: 240, speed: 28, color: "#1877F2" },
    { id: "twitter", icon: <TwitterIcon size={26} />, radius: 285, speed: 32, color: "#ffffff" },
  ];

  return (
    <div className="relative w-full h-[320px] md:h-[380px] flex items-center justify-center overflow-hidden [perspective:1200px] bg-[#07060f]/60 rounded-3xl border border-purple-500/10 mb-8">
      {/* Inject hardware accelerated CSS animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes orbit-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbit-counter {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.85; }
        }
        .orbit-spin-hw {
          animation: orbit-spin var(--duration, 25s) linear infinite;
          will-change: transform;
        }
        .orbit-counter-hw {
          animation: orbit-counter var(--duration, 25s) linear infinite;
          will-change: transform;
        }
        .star-twinkle-hw {
          animation: star-twinkle var(--duration, 3s) ease-in-out infinite;
          will-change: opacity;
        }
      `}} />

      {/* Space Background nebula */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(130,0,219,0.12)_0%,_transparent_75%)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[250px] bg-purple-700/[0.07] rounded-full blur-[100px] [transform:rotateX(60deg)]" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[100px] bg-blue-500/[0.04] rounded-full blur-[70px] [transform:rotateX(60deg)]" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[100px] bg-pink-500/[0.04] rounded-full blur-[70px] [transform:rotateX(60deg)]" />

      {/* Galaxy dust / Star field - Reduced star count and optimized with pure CSS */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white star-twinkle-hw"
          style={{
            width: Math.random() * 1.2 + 0.6,
            height: Math.random() * 1.2 + 0.6,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            '--duration': `${Math.random() * 3 + 2.5}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* 3D Tilted Orbit Container */}
      <div className="absolute inset-0 flex items-center justify-center [transform-style:preserve-3d] [transform:rotateX(68deg)_rotateY(-12deg)]">
        {/* Tilted cosmic dust disk overlays for cosmic look */}
        <div className="absolute w-[540px] h-[160px] rounded-full bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 blur-xl [transform:rotateZ(45deg)] opacity-70" />
        <div className="absolute w-[420px] h-[120px] rounded-full bg-gradient-to-r from-indigo-500/0 via-indigo-500/8 to-indigo-500/0 blur-xl [transform:rotateZ(-45deg)] opacity-70" />

        {/* Concentric Elliptic Orbits with alternating dashed and solid borders */}
        <div className="absolute w-[210px] h-[210px] rounded-full border-2 border-purple-500/35 [transform-style:preserve-3d] shadow-[0_0_20px_rgba(168,85,247,0.25),inset_0_0_10px_rgba(168,85,247,0.15)]" />
        <div className="absolute w-[300px] h-[300px] rounded-full border-2 border-dashed border-purple-400/25 [transform-style:preserve-3d] shadow-[0_0_30px_rgba(168,85,247,0.18)]" />
        <div className="absolute w-[390px] h-[390px] rounded-full border border-purple-500/15 [transform-style:preserve-3d] shadow-[0_0_45px_rgba(168,85,247,0.12)]" />
        <div className="absolute w-[480px] h-[480px] rounded-full border border-dashed border-purple-400/15 [transform-style:preserve-3d] shadow-[0_0_60px_rgba(168,85,247,0.08)]" />
        <div className="absolute w-[570px] h-[570px] rounded-full border border-purple-500/[0.05] [transform-style:preserve-3d]" />

        {/* Decorative galaxy stars positioned on the orbit plane */}
        <div className="absolute w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#fff]" style={{ transform: "translate(90px, -60px)" }} />
        <div className="absolute w-1 h-1 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.8)] animate-pulse" style={{ transform: "translate(-140px, 100px)" }} />
        <div className="absolute w-1 h-1 rounded-full bg-pink-400 shadow-[0_0_6px_rgba(244,63,94,0.8)] animate-pulse" style={{ transform: "translate(220px, 40px)" }} />
        <div className="absolute w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.6)]" style={{ transform: "translate(-60px, -120px)" }} />

        {/* Orbiting platform icons with hardware accelerated rotations */}
        {orbitIcons.map((item, i) => (
          <div
            key={i}
            className="absolute orbit-spin-hw [transform-style:preserve-3d]"
            style={{
              width: 0,
              height: 0,
              '--duration': `${item.speed}s`,
            } as React.CSSProperties}
          >
            {/* Position offset along the orbit radius */}
            <div
              className="absolute [transform-style:preserve-3d]"
              style={{
                top: -item.radius,
                left: 0,
              }}
            >
              {/* Counter-rotate Z-axis using CSS to keep upright, and counter-tilt X/Y axes */}
              <div
                className="absolute orbit-counter-hw [transform-style:preserve-3d]"
                style={{
                  '--duration': `${item.speed}s`,
                } as React.CSSProperties}
              >
                <motion.div
                  className="absolute flex items-center justify-center rounded-2xl bg-[#090815]/95 border backdrop-blur-md cursor-pointer transition-all duration-300"
                  style={{
                    width: 52,
                    height: 52,
                    transform: "translate(-50%, -50%) rotateY(12deg) rotateX(-68deg)",
                    borderColor: `${item.color}44`,
                    boxShadow: `0 0 25px ${item.color}25, inset 0 0 10px ${item.color}15`,
                  }}
                  whileHover={{
                    scale: 1.15,
                    borderColor: item.color,
                    boxShadow: `0 0 35px ${item.color}45, inset 0 0 15px ${item.color}25`,
                  }}
                >
                  {item.icon}
                </motion.div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Center standing orb with Studio Pulse logo */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#120f26] to-[#07060f] border-2 border-purple-500/40 flex items-center justify-center shadow-[0_0_50px_rgba(130,0,219,0.45)]">
          <div className="absolute inset-0.5 rounded-full border border-purple-400/25 animate-ping opacity-35" />
          <div className="absolute inset-2 rounded-full border border-purple-500/10 bg-purple-500/5 blur-[2px]" />
          <img
            src="/image.png"
            alt="Studio Pulse Logo"
            className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(168,85,247,0.75)]"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Platform Card Component ────────────────────────────────────────────────

function PlatformCard({
  config,
  connection,
  onConnect,
  onDisconnect,
  onSync,
  isConnecting,
  isSyncing,
  isDisconnecting,
}: {
  config: PlatformCardConfig;
  connection?: PlatformConnectionInfo;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  isConnecting: boolean;
  isSyncing: boolean;
  isDisconnecting: boolean;
}) {
  const isConnected = connection?.isConnected;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative group bg-[#080712]/60 border rounded-3xl p-6 transition-all duration-500 flex flex-col justify-between overflow-hidden`}
      style={{
        borderColor: `${config.color}20`,
        boxShadow: `0 10px 30px rgba(0,0,0,0.3)`,
      }}
      whileHover={{
        borderColor: `${config.color}50`,
        boxShadow: `0 15px 45px rgba(0,0,0,0.5), 0 0 30px ${config.color}15`,
      }}
    >
      {/* Top background radial glow */}
      <div
        className="absolute top-0 inset-x-0 h-32 opacity-15 group-hover:opacity-25 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top, ${config.color} 0%, transparent 70%)`,
        }}
      />

      {/* Sparkle star top-right */}
      <Sparkles
        className="w-4 h-4 absolute top-5 right-5 animate-pulse opacity-40 group-hover:opacity-100 transition-opacity duration-300"
        style={{ color: config.color }}
      />

      <div>
        {/* Platform icon nested in circular glowing border */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-5 border transition-all duration-500 group-hover:scale-110"
          style={{
            borderColor: `${config.color}35`,
            background: `radial-gradient(circle, ${config.color}15 0%, transparent 70%)`,
            boxShadow: `0 0 20px ${config.color}15, inset 0 0 10px ${config.color}08`,
          }}
        >
          {getPlatformIcon(config.id, 32)}
        </div>

        {/* Title & description */}
        <h3 className="text-white font-bold text-lg mb-1.5">{config.name}</h3>
        <p className="text-gray-400 text-xs leading-relaxed mb-5 min-h-[2.5rem]">{config.description}</p>

        {/* Features list */}
        <ul className="space-y-2.5 mb-6">
          {config.features.map((feat, i) => (
            <li key={i} className="flex items-center gap-2.5 text-xs text-gray-300">
              <Check className="w-4 h-4 flex-shrink-0" style={{ color: config.color }} />
              {feat}
            </li>
          ))}
        </ul>
      </div>

      {/* Connected state / CTA Button */}
      <div className="mt-auto">
        <AnimatePresence mode="wait">
          {isConnected && connection ? (
            <motion.div
              key="connected"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              {/* Status badge */}
              <div className="flex items-center gap-2 bg-green-500/5 border border-green-500/20 rounded-xl px-3 py-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-[11px] font-bold">Connected</span>
                <span className="text-gray-500 text-[10px] ml-auto">
                  {connection.lastSync
                    ? safeFormatDistance(connection.lastSync)
                    : "Just connected"}
                </span>
              </div>

              {/* Channel info */}
              <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.04] p-2.5 rounded-xl">
                {connection.profileImage ? (
                  <img
                    src={connection.profileImage}
                    alt={connection.accountName}
                    className="w-8 h-8 rounded-full border border-gray-700 flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {connection.accountName[0]}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-semibold truncate">{connection.accountName}</p>
                  <p className="text-gray-500 text-[9px] truncate">
                    Linked {safeFormatDistance(connection.connectedAt)}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={onSync}
                  disabled={isSyncing}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] rounded-xl py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/[0.07] hover:text-white transition-all duration-200 disabled:opacity-50"
                >
                  {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {isSyncing ? "Syncing" : "Sync"}
                </button>
                <button
                  onClick={onDisconnect}
                  disabled={isDisconnecting}
                  className="flex items-center justify-center gap-1.5 bg-red-500/5 border border-red-500/20 hover:border-red-500/40 rounded-xl px-3 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/15 transition-all duration-200 disabled:opacity-50"
                >
                  {isDisconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Disconnect"}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="disconnected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button
                onClick={onConnect}
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: config.id === "twitter"
                    ? "#0e0e11"
                    : `linear-gradient(135deg, ${config.color}, ${config.color}cc)`,
                  border: config.id === "twitter" ? "1px solid rgba(255,255,255,0.15)" : "none",
                  boxShadow: `0 4px 20px ${config.color}20`,
                }}
                onMouseEnter={(e) => {
                  if (config.id !== "twitter") {
                    e.currentTarget.style.boxShadow = `0 4px 25px ${config.color}35`;
                  } else {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (config.id !== "twitter") {
                    e.currentTarget.style.boxShadow = `0 4px 20px ${config.color}20`;
                  } else {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  }
                }}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>Connect {config.name}</>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Bottom Features Section ────────────────────────────────────────────────

const BOTTOM_FEATURES = [
  { icon: LayoutDashboard, title: "Unified Dashboard", desc: "Manage all your platforms from a single powerful workspace." },
  { icon: RefreshCw, title: "Real-time Sync", desc: "All your data syncs in real-time to keep you updated everywhere." },
  { icon: Zap, title: "Smart Insights", desc: "Get AI-powered insights to make smarter content decisions." },
  { icon: Shield, title: "Secure & Private", desc: "Your data is encrypted and never shared with third parties." },
];

// ─── Mobile Platform Row Component ──────────────────────────────────────────

function MobilePlatformRow({
  config,
  connection,
  onConnect,
  onDisconnect,
  isConnecting,
  isDisconnecting,
}: {
  config: PlatformCardConfig;
  connection?: PlatformConnectionInfo;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting: boolean;
  isDisconnecting: boolean;
}) {
  const isConnected = connection?.isConnected;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 bg-[#080712]/60 border rounded-2xl p-4 transition-all duration-300`}
      style={{
        borderColor: `${config.color}15`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.2), 0 0 15px ${config.color}05`,
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border"
        style={{
          borderColor: `${config.color}25`,
          background: `radial-gradient(circle, ${config.color}15 0%, transparent 70%)`,
        }}
      >
        {getPlatformIcon(config.id, 24)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold">{config.name}</p>
        <p className="text-gray-500 text-[10px] truncate">
          {isConnected ? `Connected · ${connection?.accountName}` : `Connect your channel`}
        </p>
      </div>
      {isConnected ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5">
            <div className="w-1 h-1 rounded-full bg-green-400" />
            <span className="text-green-400 text-[9px] font-semibold">Live</span>
          </div>
          <button
            onClick={onDisconnect}
            disabled={isDisconnecting}
            className="flex items-center justify-center bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-full px-2.5 py-1 text-[10px] font-bold text-red-400 transition-all duration-200 disabled:opacity-50"
          >
            {isDisconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Disconnect"}
          </button>
        </div>
      ) : (
        <button
          onClick={onConnect}
          disabled={isConnecting}
          className="flex items-center gap-1 text-xs font-bold border rounded-full px-3.5 py-1.5 transition-all duration-200 disabled:opacity-50 flex-shrink-0"
          style={{
            borderColor: `${config.color}40`,
            color: config.color,
            background: `${config.color}10`,
          }}
        >
          {isConnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <>Connect <ChevronRight className="w-3 h-3" /></>}
        </button>
      )}
    </motion.div>
  );
}

// ─── Main Content Studio Page ───────────────────────────────────────────────

export default function ContentStudioPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [directConnectModalPlatform, setDirectConnectModalPlatform] = useState<SupportedPlatform | null>(null);

  // Platform hooks
  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = usePlatformStatus();
  const connectYouTube = useConnectYouTube();
  const connectMeta = useConnectMeta();
  const disconnectPlatform = useDisconnectPlatform();
  const syncPlatform = useSyncPlatform();

  // Handle OAuth callback query params (success / error toast)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const connected = params.get("connected");
    const channel = params.get("channel");
    const error = params.get("error");

    if (connected && channel) {
      toast.success(`${channel} connected successfully!`, { duration: 5000 });
      refetchStatus();
      // Clean URL
      navigate("/content-studio", { replace: true });
    } else if (error) {
      toast.error(`Connection failed: ${error}`, { duration: 5000 });
      refetchStatus();
      navigate("/content-studio", { replace: true });
    }
  }, [location.search, navigate, refetchStatus]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate("/");
  }, [signOut, navigate]);

  const handleConnect = useCallback(async (platform: SupportedPlatform) => {
    if (platform === "youtube") {
      connectYouTube.mutate();
    } else {
      setDirectConnectModalPlatform(platform);
    }
  }, [connectYouTube]);

  const handleDisconnect = useCallback((platform: SupportedPlatform) => {
    disconnectPlatform.mutate(platform, {
      onSuccess: () => toast.success(`${platform} disconnected.`),
      onError: () => toast.error(`Failed to disconnect ${platform}.`),
    });
  }, [disconnectPlatform]);

  const handleSync = useCallback((platform: SupportedPlatform) => {
    syncPlatform.mutate(platform, {
      onSuccess: () => toast.success(`✅ ${platform.charAt(0).toUpperCase() + platform.slice(1)} synced successfully!`),
      onError: (err: any) => {
        const msg = err?.response?.data?.error || err?.message || `Failed to sync ${platform}.`;
        toast.error(msg);
        refetchStatus();
      },
    });
  }, [syncPlatform, refetchStatus]);

  const platforms = statusData?.platforms || {};

  // Storage mock (can be replaced with real Clerk/storage data)
  const storageUsed = 66;

  return (
    <div className="min-h-screen bg-[#0a0a12] flex">
      {/* ─── Shared Unified Sidebar ────────────────────────────────── */}
      <Sidebar activePage="/content-studio" />

      {/* ─── Mobile Header ────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-50 bg-[#0c0c18]/90 backdrop-blur-xl border-b border-gray-800/50">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setMobileMenuOpen(true)} className="text-gray-400 hover:text-white p-1">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-white font-bold text-sm">Content Studio</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative text-gray-400 hover:text-white">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-purple-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">3</span>
            </button>
            {user?.imageUrl && (
              <img src={user.imageUrl} alt="Profile" className="w-7 h-7 rounded-full border border-gray-700" />
            )}
          </div>
        </div>
      </div>

      {/* ─── Mobile Sidebar Drawer ─────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-[#0c0c18] border-r border-gray-800/50 z-50 lg:hidden overflow-y-auto"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/30">
                <div className="flex items-center gap-2.5">
                  <img src="/image.png" alt="Studio Pulse" className="w-8 h-8 object-contain" />
                  <span className="text-white font-bold text-base">Studio<span className="text-purple-400">Pulse</span></span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="px-3 py-4 space-y-0.5">
                {NAV_ITEMS.map((item) => {
                  const isActive = item.active;
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.label}
                      href={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                          : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${item.badge === "NEW" ? "bg-green-500/20 text-green-400" : "text-purple-400"}`}>
                          {item.badge}
                        </span>
                      )}
                    </a>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─── Main Content Area ─────────────────────────────── */}
      <main className="flex-1 min-w-0 pt-[56px] lg:pt-0 overflow-y-auto min-h-screen">
        {/* Top bar (desktop) */}
        <div className="hidden lg:flex items-center justify-between border-b border-gray-800/40 bg-[#0c0c18]/60 backdrop-blur-xl px-6 py-3 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Link2 className="w-5 h-5 text-purple-400" />
            <h1 className="text-white font-bold text-lg">Connected Platforms</h1>
            <span className="text-purple-400 text-xs">✦</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-900/50 border border-gray-800/50 rounded-xl pl-9 pr-10 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-purple-500/30 w-[200px] transition-all duration-200 focus:w-[260px]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs bg-gray-800/60 px-1.5 py-0.5 rounded">⌘K</span>
            </div>

            {/* Storage pill */}
            <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-800/50 rounded-xl px-3 py-2">
              <span className="text-gray-400 text-xs">Storage Used</span>
              <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full" style={{ width: `${storageUsed}%` }} />
              </div>
              <span className="text-purple-400 text-xs font-semibold">{storageUsed}%</span>
            </div>

            {/* Notifications */}
            <button className="relative text-gray-400 hover:text-white p-2 bg-gray-900/40 rounded-xl border border-gray-800/30 transition-all">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-purple-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">3</span>
            </button>

            {/* User */}
            <div className="flex items-center gap-2 bg-gray-900/40 rounded-xl border border-gray-800/30 px-3 py-1.5">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="Profile" className="w-7 h-7 rounded-full border border-gray-700" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white">
                  {(user?.firstName || "U")[0]}
                </div>
              )}
              <div className="hidden xl:block">
                <p className="text-white text-xs font-medium">{user?.firstName || "Creator"}</p>
                <p className="text-gray-500 text-[9px]">Creator</p>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="px-4 md:px-6 lg:px-8 py-6 lg:py-8">
          {/* Header text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2"
          >
            <p className="text-gray-400 text-sm">
              Connect your social platforms and unlock the power of seamless content creation.
            </p>
          </motion.div>

          {/* Cosmic orbit hero */}
          <CosmicOrbitHero />

          {/* Explanation Card Banner */}
          <div className="my-6 bg-gradient-to-r from-[#12122b] via-[#161636] to-[#0f0f24] border border-[#282856] rounded-2xl p-5 shadow-xl select-text flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-white font-bold text-sm">How StudioPulse Platform Integration Works</h3>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed max-w-2xl">
                StudioPulse acts as your central publishing & analytics engine. When you connect YouTube, Instagram, TikTok, or Facebook via official OAuth 2.0 APIs, we authorize encrypted API channels to schedule posts, aggregate watch time, and sync performance live.
              </p>
            </div>

            <button
              onClick={() => setShowHowItWorksModal(true)}
              className="py-2 px-4 rounded-xl bg-[#8200DB] hover:bg-[#7000bc] text-white font-bold text-xs transition shrink-0 shadow-lg shadow-purple-900/40 flex items-center gap-1.5"
            >
              How It Works & Terms <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Connect Your Platforms header */}
          <div className="flex items-center justify-between mb-6 mt-2">
            <div className="flex items-center gap-3">
              <span className="text-purple-400 text-lg">✦</span>
              <h2 className="text-white font-bold text-lg">Connect Your Platforms</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-gray-500 text-xs">
                <Shield className="w-3.5 h-3.5 text-green-400/60" />
                <span>All connections are encrypted and secure</span>
              </div>
              <button
                onClick={() => setShowHowItWorksModal(true)}
                className="hidden md:flex items-center gap-1.5 text-gray-400 text-xs hover:text-purple-400 transition-colors"
              >
                How it Works
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* ─── Platform Cards Grid (Always Responsive & Visible) ─────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-10">
            {PLATFORMS.map((config) => (
              <PlatformCard
                key={config.id}
                config={config}
                connection={platforms[config.id]}
                onConnect={() => handleConnect(config.id)}
                onDisconnect={() => handleDisconnect(config.id)}
                onSync={() => handleSync(config.id)}
                isConnecting={(config.id === "youtube" && connectYouTube.isPending) || ((config.id === "facebook" || config.id === "instagram") && connectMeta.isPending)}
                isSyncing={syncPlatform.isPending}
                isDisconnecting={disconnectPlatform.isPending}
              />
            ))}
          </div>

          {/* ─── Mobile Platform List ────────────────────── */}
          <div className="md:hidden space-y-3 mb-8">
            {PLATFORMS.map((config, i) => (
              <motion.div
                key={config.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <MobilePlatformRow
                  config={config}
                  connection={platforms[config.id]}
                  onConnect={() => handleConnect(config.id)}
                  onDisconnect={() => handleDisconnect(config.id)}
                  isConnecting={config.id === "youtube" && connectYouTube.isPending}
                  isDisconnecting={disconnectPlatform.isPending}
                />
              </motion.div>
            ))}

            {/* Security badge (mobile) */}
            <div className="flex items-center gap-3 bg-green-500/5 border border-green-500/15 rounded-2xl p-3.5">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">100% Secure Connection</p>
                <p className="text-gray-500 text-[10px]">Your data is encrypted and safe with us.</p>
              </div>
            </div>
          </div>

          {/* ─── Bottom Feature Cards (desktop) ──────────── */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {BOTTOM_FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="bg-[#080712]/50 border border-purple-500/10 rounded-2xl p-5 hover:border-purple-500/35 hover:shadow-[0_0_30px_rgba(168,85,247,0.1)] transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-full border border-purple-500/25 bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-white text-sm font-semibold mb-1">{feat.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{feat.desc}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Scenic Cosmic Mountain Footer */}
          <div className="relative w-full h-[180px] overflow-hidden pointer-events-none select-none rounded-b-3xl -mx-4 md:-mx-6 lg:-mx-8 mt-12 border-t border-purple-500/10">
            {/* Real generated cosmic mountain panorama image */}
            <img
              src="/cosmic_mountains.png"
              alt="Cosmic Mountains"
              className="absolute bottom-0 w-full h-[160px] object-cover object-bottom"
            />
            {/* Top edge gradient blend: fades only the very top edge of the image to transparent */}
            <div className="absolute top-0 inset-x-0 h-[50px] bg-gradient-to-b from-[#0a0a12] via-[#0a0a12]/80 to-transparent pointer-events-none" />
            {/* Bottom edge gradient blend: fades the bottom base into the page color */}
            <div className="absolute bottom-0 inset-x-0 h-[40px] bg-gradient-to-t from-[#0a0a12] to-transparent pointer-events-none" />
            {/* Soft overall ambient purple wash to tie it with the cosmic theme */}
            <div className="absolute inset-0 bg-purple-500/[0.03] mix-blend-color-dodge pointer-events-none" />
          </div>

          {/* Loading skeleton */}
          {statusLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              <span className="ml-3 text-gray-400 text-sm">Loading platform status...</span>
            </div>
          )}
        </div>
      </main>

      {/* ─── Mobile Bottom Navigation ─────────────────────── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-[#0c0c18]/95 backdrop-blur-xl border-t border-gray-800/50 z-40">
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { icon: Home, label: "Dashboard", path: "/dashboard" },
            { icon: Sparkles, label: "Content Studio", path: "/content-studio", active: true },
            { icon: Plus, label: "", path: "/upload-center", isCenter: true },
            { icon: CalendarDays, label: "Calendar", path: "/calendar" },
            { icon: Settings, label: "Settings", path: "/settings" },
          ].map((item, i) => {
            const Icon = item.icon;
            if (item.isCenter) {
              return (
                <a
                  key={i}
                  href={item.path}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center -mt-4 shadow-[0_0_20px_rgba(130,0,219,0.4)] border-4 border-[#0c0c18]"
                >
                  <Icon className="w-5 h-5 text-white" />
                </a>
              );
            }
            return (
              <a
                key={i}
                href={item.path}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 ${item.active ? "text-purple-400" : "text-gray-500"}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-medium">{item.label}</span>
              </a>
            );
          })}
        </div>
      </div>

      {/* How It Works & Terms Pop-Out Modal */}
      <HowItWorksModal isOpen={showHowItWorksModal} onClose={() => setShowHowItWorksModal(false)} />

      {/* Direct Platform Connect & Link Modal */}
      <DirectConnectModal
        platform={directConnectModalPlatform}
        onClose={() => setDirectConnectModalPlatform(null)}
        onSuccess={refetchStatus}
        userId={user?.id}
      />
    </div>
  );
}
