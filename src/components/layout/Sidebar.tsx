/**
 * Sidebar — Unified Sidebar Component for StudioPulse.
 * Mobile responsive, supports active path highlighting, connected platform status, and user profile summary.
 */

import React, { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Upload, Play, Bot, BarChart3, DollarSign,
  UsersRound, Users, CalendarDays, Link2, Settings, Plus,
  Crown, ChevronRight, ChevronDown, X, Layers, Sparkles, Rocket
} from "lucide-react";
import { usePlatformStatus, useDirectConnectPlatform } from "@/hooks/usePlatforms";
import { useSettings } from "@/context/SettingsContext";
import toast from "react-hot-toast";

// ─── Platform Icons ───────────────────────────────────────────────────────────

function YouTubeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M43.2 13.4a5 5 0 0 0-3.5-3.5C36.4 9 24 9 24 9s-12.4 0-15.7.9A5 5 0 0 0 4.8 13.4 52 52 0 0 0 3.9 24a52 52 0 0 0 .9 10.6 5 5 0 0 0 3.5 3.5c3.3.9 15.7.9 15.7.9s12.4 0 15.7-.9a5 5 0 0 0 3.5-3.5A52 52 0 0 0 44.1 24a52 52 0 0 0-.9-10.6Z" fill="#FF0000" />
      <path d="M19.8 30.4 31.2 24l-11.4-6.4v12.8Z" fill="#fff" />
    </svg>
  );
}

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <radialGradient id="ig_side_v1" cx="20%" cy="100%" r="120%">
          <stop offset="0%" stopColor="#fdf497" /><stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" /><stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#ig_side_v1)" />
      <path d="M34 24a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" stroke="#fff" strokeWidth="3" fill="none" />
      <circle cx="34.5" cy="13.5" r="2.5" fill="#fff" />
    </svg>
  );
}

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M33.6 17.5a11.8 11.8 0 0 1-7.2-2.4v13.7a9.4 9.4 0 1 1-9.4-9.4c.5 0 1 .1 1.5.2v4.4a5 5 0 1 0 3.5 4.8V6h4.4a7.4 7.4 0 0 0 7.2 7.2v4.3Z" fill="#00F2FE" />
      <path d="M32.5 16.4a11.8 11.8 0 0 1-7.2-2.4v13.7a9.4 9.4 0 1 1-9.4-9.4c.5 0 1 .1 1.5.2v4.4a5 5 0 1 0 3.5 4.8V6h4.4a7.4 7.4 0 0 0 7.2 7.2v3.2Z" fill="#FF004F" />
    </svg>
  );
}

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="20" fill="#1877F2" />
      <path d="M29.5 25.5h-4v14h-6v-14h-3v-5h3v-3.3c0-4.1 2.4-6.4 6.2-6.4 1.8 0 3.7.3 3.7.3v4.1h-2.1c-2 0-2.7 1.3-2.7 2.6v2.7h4.6l-.7 5Z" fill="#fff" />
    </svg>
  );
}

function TwitterXIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="10" fill="#000" />
      <path d="M34.5 11.5h4.2l-9.2 10.5 10.8 14.5H31.7l-6.8-8.9-7.7 8.9h-4.2l9.8-11.2L12.5 11.5h8.8l6.1 8.1 7.1-8.1Zm-1.5 22.5h2.3L19.4 13.8h-2.5l16.1 20.2Z" fill="#fff" />
    </svg>
  );
}

export interface NavItemConfig {
  id: string;
  icon: any;
  label: string;
  path: string;
  badge?: string;
}

export const NAV_ITEMS: NavItemConfig[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { id: "analytics", icon: BarChart3, label: "Analytics", path: "/analytics" },
  { id: "my-videos", icon: Play, label: "My Videos", path: "/my-videos" },
  { id: "upload-center", icon: Upload, label: "Upload Center", path: "/upload-center" },
  { id: "autopilot", icon: Rocket, label: "Autopilot Queue", path: "/autopilot", badge: "NEW" },
  { id: "connected-platforms", icon: Link2, label: "Connected Platforms", path: "/content-studio" },
  { id: "collaborations", icon: Users, label: "Collaborations", path: "/collaborations" },
  { id: "studio-ai", icon: Bot, label: "AI Assistant", path: "/studio-ai", badge: "NEW" },
  { id: "calendar", icon: CalendarDays, label: "Calendar", path: "/calendar" },
  { id: "monetization", icon: DollarSign, label: "Monetization", path: "/dashboard#revenue" },
  { id: "audience", icon: UsersRound, label: "Audience", path: "/audience", badge: "NEW" },
  { id: "settings", icon: Settings, label: "Settings", path: "/settings" },
];

export interface SidebarProps {
  activePage?: string;
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ activePage = "/dashboard", open = false, onClose }: SidebarProps) {
  const { user } = useUser();
  const navigate = useNavigate();
  const { settings, t } = useSettings();
  const { data: platformData } = usePlatformStatus();
  const directConnect = useDirectConnectPlatform();
  const platforms = platformData?.platforms || {};
  const [mobileOpen, setMobileOpen] = useState(open);

  const [activeHash, setActiveHash] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.location.hash || "";
    }
    return "";
  });

  React.useEffect(() => {
    const handleHashChange = () => {
      setActiveHash(window.location.hash || "");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const isMobileOpen = open || mobileOpen;
  const handleClose = () => {
    setMobileOpen(false);
    if (onClose) onClose();
  };

  const isRight = settings.sidebarPosition === "right";

  const platformRows = [
    { id: "youtube", name: "YouTube", icon: <YouTubeIcon size={16} /> },
    { id: "instagram", name: "Instagram", icon: <InstagramIcon size={16} /> },
    { id: "tiktok", name: "TikTok", icon: <TikTokIcon size={16} /> },
    { id: "facebook", name: "Facebook", icon: <FacebookIcon size={16} /> },
    { id: "twitter", name: "X (Twitter)", icon: <TwitterXIcon size={16} /> },
  ];

  const checkIsActive = (item: typeof NAV_ITEMS_RAW[0]) => {
    const currentPath = typeof window !== "undefined" ? window.location.pathname : activePage;

    if (item.path.includes("#")) {
      const [basePath, hash] = item.path.split("#");
      const isBaseMatch = activePage === basePath || currentPath === basePath;
      return isBaseMatch && activeHash === `#${hash}`;
    }

    if (item.id === "dashboard") {
      const isDashboard = activePage === "/dashboard" || currentPath === "/dashboard";
      return isDashboard && !activeHash;
    }

    return activePage === item.path || currentPath === item.path;
  };

  const handleNavClick = (item: typeof NAV_ITEMS_RAW[0]) => {
    if (item.path.includes("#")) {
      const [basePath, hash] = item.path.split("#");
      if (typeof window !== "undefined" && window.location.pathname !== basePath) {
        navigate(item.path);
        setActiveHash(`#${hash}`);
      } else {
        if (typeof window !== "undefined") {
          window.location.hash = hash;
          setActiveHash(`#${hash}`);
          const el = document.getElementById(hash);
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }
      }
    } else {
      setActiveHash("");
      if (typeof window !== "undefined" && window.location.hash) {
        history.pushState("", document.title, window.location.pathname + window.location.search);
      }
      navigate(item.path);
    }
    handleClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={handleClose}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 ${isRight ? "right-0 border-l border-r-0 order-last" : "left-0 border-r"} z-50 lg:z-auto w-[220px] flex-shrink-0 flex flex-col bg-[#08080f] border-[#14142a] transition-transform duration-300 ${
          isMobileOpen ? "translate-x-0" : isRight ? "translate-x-full lg:translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#14142a]">
          <div className="relative cursor-pointer flex items-center" onClick={() => navigate("/dashboard")}>
            <img src="/image.png" alt="StudioPulse" className="w-8 h-8 object-contain transition-transform hover:scale-105" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#08080f] animate-pulse" />
          </div>
          <span
            className="text-white font-extrabold text-[17px] tracking-tight cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            Studio<span className="text-purple-400 font-extrabold">Pulse</span>
          </span>
          <button
            onClick={handleClose}
            className="ml-auto p-1 text-gray-500 hover:text-white lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav list */}
        <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <ul className="space-y-0.5 px-3">
            {NAV_ITEMS.map((item) => {
              const isActive = checkIsActive(item);
              const Icon = item.icon;
              const label = item.label;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavClick(item)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-150 group/nav relative border ${
                      isActive
                        ? "bg-purple-600/20 text-white font-semibold border-purple-500/25 shadow-[0_0_20px_rgba(139,92,246,0.08)]"
                        : "text-gray-400 hover:text-white hover:bg-white/[0.04] border-transparent"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-purple-400 rounded-r-full" />
                    )}
                    <Icon
                      className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
                        isActive ? "text-purple-400" : "group-hover/nav:text-purple-400"
                      }`}
                    />
                    <span className="flex-1 text-left truncate">{label}</span>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          item.badge === "NEW" || item.badge === "New"
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Connected Platforms */}
          <div className="px-3 mt-6">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                Connected Platforms
              </span>
              <button
                onClick={() => navigate("/content-studio")}
                className="w-5 h-5 rounded-md bg-purple-500/15 text-purple-400 flex items-center justify-center hover:bg-purple-500/30 transition-colors"
                title="Manage platforms"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <ul className="space-y-0.5">
              {platformRows.map((p) => {
                const connected = !!platforms[p.id as keyof typeof platforms]?.isConnected;
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => navigate("/content-studio")}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors group/plat text-left"
                    >
                      {p.icon}
                      <span className="text-[12px] text-gray-300 flex-1 truncate">{p.name}</span>
                      {connected ? (
                        <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          Connected ✓
                        </span>
                      ) : (
                        <span className="text-[10px] text-purple-400 group-hover/plat:text-purple-300 font-semibold transition-colors opacity-80 group-hover/plat:opacity-100 flex items-center gap-0.5">
                          Connect <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Footer / Profile */}
        <div className="px-4 py-4 border-t border-[#14142a] space-y-3">
          <div
            className="flex items-center gap-2.5 bg-gradient-to-r from-purple-900/25 to-purple-600/10 border border-purple-500/20 rounded-xl px-3 py-2.5 cursor-pointer hover:border-purple-500/40 transition-all group/upgrade"
            onClick={() => navigate("/settings")}
          >
            <Crown className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-[12px] font-medium">StudioPulse Pro</p>
              <p className="text-[10px] text-gray-500 truncate">Manage Plan</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-purple-400 group-hover/upgrade:translate-x-0.5 transition-transform" />
          </div>

          <div
            className="flex items-center gap-2.5 px-1 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/settings")}
          >
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="" className="w-8 h-8 rounded-full border border-purple-500/30" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-white text-[13px] font-semibold">
                {(user?.firstName?.[0] || "C").toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-[12px] font-medium truncate">{user?.firstName || "Creator"}</p>
              <p className="text-gray-500 text-[10px]">Creator</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
          </div>
        </div>
      </aside>
    </>
  );
}
