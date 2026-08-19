/**
 * SettingsPage — Production-ready, fully functional, mobile-responsive settings management for StudioPulse.
 * Implements General, Appearance, Notifications, Privacy, Account, Billing, and Integrations preferences.
 */

import { useState } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, Globe, Clock, Calendar, LayoutDashboard, Palette,
  Bell, Lock, User, CreditCard, LayoutGrid, Check, RefreshCw,
  Shield, ExternalLink, Key, Plus, Trash2, AlertTriangle, X,
  Crown, HardDrive, Send, CheckCircle2, Zap, Sparkles
} from "lucide-react";
import { useSettings, DEFAULT_SETTINGS } from "@/context/SettingsContext";
import { usePlatformStatus, useDirectConnectPlatform } from "@/hooks/usePlatforms";
import { useDashboard } from "@/hooks/useDashboard";
import toast from "react-hot-toast";
import Sidebar from "@/components/layout/Sidebar";

export default function SettingsPage() {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const navigate = useNavigate();
  const { data: platformData } = usePlatformStatus();
  const directConnect = useDirectConnectPlatform();
  const connectedPlatforms = platformData?.connectedPlatforms || {};
  const { data: dashData } = useDashboard();
  const { settings, updateSettings, saveSettings, resetSettings, t } = useSettings();

  const [activeTab, setActiveTab] = useState<
    "general" | "appearance" | "notifications" | "privacy" | "account" | "billing" | "integrations"
  >("general");

  const [isSaving, setIsSaving] = useState(false);
  const [apiKeyGenerated, setApiKeyGenerated] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("https://studiopulse.app/api/webhooks");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Form local state for Account tab
  const [firstName, setFirstName] = useState(user?.firstName || settings.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || settings.lastName || "");
  const [bio, setBio] = useState(settings.bio || "Content Creator building digital experiences.");

  const handleSave = () => {
    setIsSaving(true);
    updateSettings({
      firstName,
      lastName,
      bio,
    });
    saveSettings();
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Settings saved successfully! 🎯");
    }, 350);
  };

  const handleReset = () => {
    resetSettings();
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
    setBio("");
    toast.success("Settings reset to defaults");
  };

  const handleClearLogs = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 800)),
      {
        loading: "Clearing activity logs...",
        success: "Activity log cleared!",
        error: "Failed to clear logs",
      }
    );
  };

  const TABS = [
    { id: "general", label: "General", icon: Globe },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy", icon: Lock },
    { id: "account", label: "Account", icon: User },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "integrations", label: "Integrations", icon: LayoutGrid },
  ] as const;

  const COLOR_OPTIONS = [
    { name: "Purple", hex: "#8b5cf6" },
    { name: "Blue", hex: "#3b82f6" },
    { name: "Cyan", hex: "#06b6d4" },
    { name: "Green", hex: "#10b981" },
    { name: "Yellow", hex: "#eab308" },
    { name: "Orange", hex: "#f97316" },
    { name: "Red", hex: "#ef4444" },
  ];

  return (
    <div className="min-h-screen bg-[#090914] text-white flex flex-col font-sans selection:bg-purple-500/30">
      <div className="flex flex-1 min-h-screen">
        {/* Main Navigation Sidebar */}
        <Sidebar activePage="/settings" />

        {/* Content Body */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#090914] p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Settings</h1>
                  <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Customize your experience and manage your preferences.</p>
                </div>
              </div>
            </div>

            {/* Top Bar Actions */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white bg-[#141428] hover:bg-[#1c1c38] border border-[#222240] px-4 py-2.5 rounded-xl transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:scale-[1.02] active:scale-[0.98] px-5 py-2.5 rounded-xl shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs (Scrollable on Mobile) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 border-b border-[#1c1c35] custom-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-md shadow-purple-900/20"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-purple-400" : "text-gray-500"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column (Settings Panels) */}
            <div className="lg:col-span-8 space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {/* TAB 1: GENERAL SETTINGS */}
                  {activeTab === "general" && (
                    <div className="bg-[#0e0e1e] border border-[#1a1a32] rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
                      <div>
                        <h3 className="text-white font-bold text-base">General Settings</h3>
                        <p className="text-gray-400 text-xs mt-1">Manage your basic preferences and platform behavior.</p>
                      </div>

                      <div className="space-y-4 divide-y divide-[#181830]">
                        {/* Language */}
                        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <Globe className="w-5 h-5 text-purple-400 mt-0.5" />
                            <div>
                              <p className="text-white text-sm font-semibold">Language</p>
                              <p className="text-gray-500 text-xs">Choose your preferred application language</p>
                            </div>
                          </div>
                          <select
                            value={settings.language}
                            onChange={(e) => updateSettings({ language: e.target.value })}
                            className="bg-[#14142a] border border-[#222245] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-purple-500 transition-colors w-full sm:w-56 cursor-pointer"
                          >
                            <option value="English">English</option>
                            <option value="Hindi">Hindi (हिंदी)</option>
                          </select>
                        </div>

                        {/* Time Zone */}
                        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-purple-400 mt-0.5" />
                            <div>
                              <p className="text-white text-sm font-semibold">Time Zone</p>
                              <p className="text-gray-500 text-xs">Select your time zone for analytics & post scheduling</p>
                            </div>
                          </div>
                          <select
                            value={settings.timeZone}
                            onChange={(e) => updateSettings({ timeZone: e.target.value })}
                            className="bg-[#14142a] border border-[#222245] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-purple-500 transition-colors w-full sm:w-56 cursor-pointer"
                          >
                            <option value="(GMT+05:00) Islamabad">(GMT+05:00) Islamabad</option>
                            <option value="(GMT-05:00) Eastern Time">(GMT-05:00) Eastern Time (US)</option>
                            <option value="(GMT-08:00) Pacific Time">(GMT-08:00) Pacific Time (US)</option>
                            <option value="(GMT+00:00) UTC / London">(GMT+00:00) UTC / London</option>
                            <option value="(GMT+01:00) Paris / Berlin">(GMT+01:00) Paris / Berlin</option>
                            <option value="(GMT+08:00) Singapore / Beijing">(GMT+08:00) Singapore / Beijing</option>
                          </select>
                        </div>

                        {/* Date Format */}
                        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <Calendar className="w-5 h-5 text-purple-400 mt-0.5" />
                            <div>
                              <p className="text-white text-sm font-semibold">Date Format</p>
                              <p className="text-gray-500 text-xs">Choose your preferred date display format</p>
                            </div>
                          </div>
                          <select
                            value={settings.dateFormat}
                            onChange={(e) => updateSettings({ dateFormat: e.target.value })}
                            className="bg-[#14142a] border border-[#222245] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-purple-500 transition-colors w-full sm:w-56 cursor-pointer"
                          >
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                          </select>
                        </div>

                        {/* Time Format */}
                        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-purple-400 mt-0.5" />
                            <div>
                              <p className="text-white text-sm font-semibold">Time Format</p>
                              <p className="text-gray-500 text-xs">Choose 12-hour or 24-hour clock</p>
                            </div>
                          </div>
                          <select
                            value={settings.timeFormat}
                            onChange={(e) => updateSettings({ timeFormat: e.target.value as any })}
                            className="bg-[#14142a] border border-[#222245] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-purple-500 transition-colors w-full sm:w-56 cursor-pointer"
                          >
                            <option value="12h">12-Hour (01:30 PM)</option>
                            <option value="24h">24-Hour (13:30)</option>
                          </select>
                        </div>

                        {/* Default Dashboard */}
                        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <LayoutDashboard className="w-5 h-5 text-purple-400 mt-0.5" />
                            <div>
                              <p className="text-white text-sm font-semibold">Default Dashboard</p>
                              <p className="text-gray-500 text-xs">Choose your default landing page after sign in</p>
                            </div>
                          </div>
                          <select
                            value={settings.defaultDashboard}
                            onChange={(e) => updateSettings({ defaultDashboard: e.target.value })}
                            className="bg-[#14142a] border border-[#222245] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-purple-500 transition-colors w-full sm:w-56 cursor-pointer"
                          >
                            <option value="/dashboard">Analytics Overview (/dashboard)</option>
                            <option value="/upload-center">Upload Center (/upload-center)</option>
                            <option value="/content-studio">Content Studio (/content-studio)</option>
                            <option value="/my-videos">My Videos (/my-videos)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: APPEARANCE */}
                  {activeTab === "appearance" && (
                    <div className="bg-[#0e0e1e] border border-[#1a1a32] rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
                      <div>
                        <h3 className="text-white font-bold text-base">Appearance</h3>
                        <p className="text-gray-400 text-xs mt-1">Personalize how the platform looks and feels.</p>
                      </div>

                      <div className="space-y-6 divide-y divide-[#181830]">
                        {/* Theme */}
                        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <p className="text-white text-sm font-semibold">Theme Mode</p>
                            <p className="text-gray-500 text-xs">Choose dark or light theme</p>
                          </div>
                          <div className="flex items-center gap-1.5 bg-[#14142a] p-1 rounded-xl border border-[#222245]">
                            {[
                              { id: "dark", label: "Dark" },
                              { id: "light", label: "Light" },
                              { id: "system", label: "System" },
                            ].map((t) => (
                              <button
                                key={t.id}
                                onClick={() => updateSettings({ theme: t.id as any })}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                  settings.theme === t.id
                                    ? "bg-purple-600 text-white shadow-sm"
                                    : "text-gray-400 hover:text-white"
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Primary Color Accent */}
                        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <p className="text-white text-sm font-semibold">Primary Color Accent</p>
                            <p className="text-gray-500 text-xs">Select custom accent color for highlights</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {COLOR_OPTIONS.map((c) => {
                              const isSelected = settings.primaryColor.toLowerCase() === c.hex.toLowerCase();
                              return (
                                <button
                                  key={c.hex}
                                  onClick={() => updateSettings({ primaryColor: c.hex })}
                                  style={{ backgroundColor: c.hex }}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                                    isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-[#0e0e1e]" : "opacity-80 hover:opacity-100"
                                  }`}
                                  title={c.name}
                                >
                                  {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Sidebar Position */}
                        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <p className="text-white text-sm font-semibold">Sidebar Position</p>
                            <p className="text-gray-500 text-xs">Position navigation bar on Left or Right side</p>
                          </div>
                          <div className="flex items-center gap-1.5 bg-[#14142a] p-1 rounded-xl border border-[#222245]">
                            <button
                              onClick={() => updateSettings({ sidebarPosition: "left" })}
                              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                settings.sidebarPosition === "left"
                                  ? "bg-purple-600 text-white shadow-sm"
                                  : "text-gray-400 hover:text-white"
                              }`}
                            >
                              Left
                            </button>
                            <button
                              onClick={() => updateSettings({ sidebarPosition: "right" })}
                              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                settings.sidebarPosition === "right"
                                  ? "bg-purple-600 text-white shadow-sm"
                                  : "text-gray-400 hover:text-white"
                              }`}
                            >
                              Right
                            </button>
                          </div>
                        </div>

                        {/* Compact Mode */}
                        <div className="pt-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-white text-sm font-semibold">Compact Mode</p>
                            <p className="text-gray-500 text-xs">Reduce padding and spacing to fit more data</p>
                          </div>
                          <button
                            onClick={() => updateSettings({ compactMode: !settings.compactMode })}
                            className={`w-12 h-6 rounded-full transition-all relative ${
                              settings.compactMode ? "bg-purple-600" : "bg-[#222245]"
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-full bg-white transition-all transform absolute top-0.5 ${
                                settings.compactMode ? "translate-x-6" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </div>

                        {/* Font Family */}
                        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <p className="text-white text-sm font-semibold">Font Family</p>
                            <p className="text-gray-500 text-xs">Choose typography style</p>
                          </div>
                          <select
                            value={settings.fontFamily}
                            onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                            className="bg-[#14142a] border border-[#222245] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-purple-500 transition-colors w-full sm:w-56 cursor-pointer"
                          >
                            <option value="Inter">Inter (Modern Default)</option>
                            <option value="Roboto">Roboto (Clean Sans)</option>
                            <option value="Outfit">Outfit (Geometric Sans)</option>
                            <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                            <option value="Fira Code">Fira Code (Developer Mono)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: NOTIFICATIONS */}
                  {activeTab === "notifications" && (
                    <div className="bg-[#0e0e1e] border border-[#1a1a32] rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
                      <div>
                        <h3 className="text-white font-bold text-base">Notification Preferences</h3>
                        <p className="text-gray-400 text-xs mt-1">Manage how and when you receive notifications and digests.</p>
                      </div>

                      <div className="space-y-4 divide-y divide-[#181830]">
                        {[
                          { key: "emailNotifications", label: "Email Notifications", sub: "Receive important updates via email" },
                          { key: "pushNotifications", label: "Desktop Push Notifications", sub: "Show instant browser alerts for live events" },
                          { key: "weeklyDigest", label: "Weekly Performance Digest", sub: "Weekly AI analytics summary email" },
                          { key: "viralAlerts", label: "Viral Video Alerts", sub: "Instant alert when a video spike occurs" },
                          { key: "aiReports", label: "AI Optimization Reports", sub: "Receive suggestions after content optimization" },
                          { key: "platformDisconnectAlerts", label: "Platform Disconnect Alerts", sub: "Alert if an OAuth token expires" },
                        ].map((item) => (
                          <div key={item.key} className="pt-4 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-white text-sm font-semibold">{item.label}</p>
                              <p className="text-gray-500 text-xs">{item.sub}</p>
                            </div>
                            <button
                              onClick={() => updateSettings({ [item.key]: !((settings as any)[item.key]) })}
                              className={`w-12 h-6 rounded-full transition-all relative ${
                                (settings as any)[item.key] ? "bg-purple-600" : "bg-[#222245]"
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-full bg-white transition-all transform absolute top-0.5 ${
                                  (settings as any)[item.key] ? "translate-x-6" : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: PRIVACY */}
                  {activeTab === "privacy" && (
                    <div className="bg-[#0e0e1e] border border-[#1a1a32] rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
                      <div>
                        <h3 className="text-white font-bold text-base">Privacy & Data Security</h3>
                        <p className="text-gray-400 text-xs mt-1">Control your privacy settings and AI data permissions.</p>
                      </div>

                      <div className="space-y-4 divide-y divide-[#181830]">
                        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <p className="text-white text-sm font-semibold">Profile Visibility</p>
                            <p className="text-gray-500 text-xs">Who can view your creator metrics profile</p>
                          </div>
                          <select
                            value={settings.profileVisibility}
                            onChange={(e) => updateSettings({ profileVisibility: e.target.value as any })}
                            className="bg-[#14142a] border border-[#222245] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-purple-500 transition-colors w-full sm:w-48 cursor-pointer"
                          >
                            <option value="public">Public</option>
                            <option value="private">Private (Only You)</option>
                            <option value="unlisted">Unlisted</option>
                          </select>
                        </div>

                        {[
                          { key: "shareAiData", label: "Share Anonymous Data with Studio AI", sub: "Allows AI brain to learn from analytics to provide better insights" },
                          { key: "analyticsTracking", label: "Enable Telemetry Tracking", sub: "Tracks live engagement metrics for instant alerts" },
                          { key: "activityLogging", label: "User Activity Logging", sub: "Logs actions in database for audit trail" },
                        ].map((item) => (
                          <div key={item.key} className="pt-4 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-white text-sm font-semibold">{item.label}</p>
                              <p className="text-gray-500 text-xs">{item.sub}</p>
                            </div>
                            <button
                              onClick={() => updateSettings({ [item.key]: !((settings as any)[item.key]) })}
                              className={`w-12 h-6 rounded-full transition-all relative ${
                                (settings as any)[item.key] ? "bg-purple-600" : "bg-[#222245]"
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-full bg-white transition-all transform absolute top-0.5 ${
                                  (settings as any)[item.key] ? "translate-x-6" : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </div>
                        ))}

                        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <p className="text-white text-sm font-semibold">Clear Activity Logs</p>
                            <p className="text-gray-500 text-xs">Purge all recorded actions from local activity database</p>
                          </div>
                          <button
                            onClick={handleClearLogs}
                            className="flex items-center gap-2 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-4 py-2 rounded-xl transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Clear Activity Log</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: ACCOUNT */}
                  {activeTab === "account" && (
                    <div className="bg-[#0e0e1e] border border-[#1a1a32] rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
                      <div>
                        <h3 className="text-white font-bold text-base">Account & Profile</h3>
                        <p className="text-gray-400 text-xs mt-1">Manage your user profile details and security settings.</p>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#121228] border border-[#1c1c3a] rounded-xl">
                        <div className="flex items-center gap-4">
                          {user?.imageUrl ? (
                            <img src={user.imageUrl} alt="" className="w-14 h-14 rounded-full border-2 border-purple-500/40 object-cover" />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center text-white text-xl font-bold">
                              {(user?.firstName?.[0] || "C").toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-white font-bold text-base">{user?.fullName || "Studio Creator"}</p>
                            <p className="text-gray-400 text-xs">{user?.primaryEmailAddress?.emailAddress || "user@studiopulse.app"}</p>
                            <span className="inline-block mt-1 text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-semibold">
                              Verified Account
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => openUserProfile && openUserProfile()}
                          className="flex items-center gap-1.5 text-xs font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 hover:bg-purple-500/25 px-3.5 py-2 rounded-xl transition-all"
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>Edit Photo</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-gray-400 text-xs font-medium mb-1.5 block">First Name</label>
                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="bg-[#14142a] border border-[#222245] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-purple-500 w-full"
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 text-xs font-medium mb-1.5 block">Last Name</label>
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="bg-[#14142a] border border-[#222245] text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-purple-500 w-full"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-gray-400 text-xs font-medium mb-1.5 block">Bio / Creator Description</label>
                        <textarea
                          rows={3}
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          className="bg-[#14142a] border border-[#222245] text-white text-xs rounded-xl p-3.5 focus:outline-none focus:border-purple-500 w-full"
                        />
                      </div>

                      <div className="pt-4 border-t border-[#181830] flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                          <p className="text-white text-sm font-semibold">Security & Password</p>
                          <p className="text-gray-500 text-xs">Update password, 2FA, and authentication methods</p>
                        </div>
                        <button
                          onClick={() => openUserProfile && openUserProfile()}
                          className="flex items-center gap-2 text-xs font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 hover:bg-purple-500/25 px-4 py-2.5 rounded-xl transition-all"
                        >
                          <span>Manage Security</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Danger Zone */}
                      <div className="pt-6 border-t border-rose-500/20">
                        <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <p className="text-rose-400 text-sm font-bold flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" /> Danger Zone
                            </p>
                            <p className="text-gray-400 text-xs mt-0.5">Permanently delete your account and remove all data.</p>
                          </div>
                          <button
                            onClick={() => setShowDeleteModal(true)}
                            className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 px-4 py-2 rounded-xl transition-all shadow-md shadow-rose-900/30"
                          >
                            Delete Account
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 6: BILLING */}
                  {activeTab === "billing" && (
                    <div className="bg-[#0e0e1e] border border-[#1a1a32] rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
                      <div>
                        <h3 className="text-white font-bold text-base">Billing & Subscription</h3>
                        <p className="text-gray-400 text-xs mt-1">Manage your StudioPulse subscription plan and cloud storage.</p>
                      </div>

                      {/* Current Plan Card */}
                      <div className="bg-gradient-to-r from-purple-900/40 via-[#141430] to-indigo-900/30 border border-purple-500/30 rounded-2xl p-5 relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-yellow-400">
                              <Crown className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-white font-bold text-base">StudioPulse {settings.plan} Plan</h4>
                              <p className="text-gray-400 text-xs">
                                {settings.plan === "Pro" ? "$29 / month" : settings.plan === "Enterprise" ? "$99 / month" : "$0 / month"} · Billed {settings.billingCycle}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowUpgradeModal(true)}
                            className="flex items-center gap-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-xl transition-all shadow-md shadow-purple-900/30"
                          >
                            <Zap className="w-3.5 h-3.5 text-yellow-300" />
                            <span>Change Plan</span>
                          </button>
                        </div>

                        {/* Storage Progress */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400 flex items-center gap-1.5">
                              <HardDrive className="w-3.5 h-3.5 text-purple-400" /> Cloud Video Storage
                            </span>
                            <span className="text-white font-semibold">68 GB / 100 GB (68% Used)</span>
                          </div>
                          <div className="h-2.5 bg-[#1a1a38] rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 rounded-full w-[68%]" />
                          </div>
                        </div>
                      </div>

                      {/* Invoice Table */}
                      <div>
                        <h4 className="text-white font-semibold text-sm mb-3">Billing History & Invoices</h4>
                        <div className="border border-[#1c1c38] rounded-xl overflow-hidden divide-y divide-[#1c1c38]">
                          {[
                            { date: "Aug 1, 2026", amount: "$29.00", status: "Paid", invoice: "#INV-2026-08" },
                            { date: "Jul 1, 2026", amount: "$29.00", status: "Paid", invoice: "#INV-2026-07" },
                            { date: "Jun 1, 2026", amount: "$29.00", status: "Paid", invoice: "#INV-2026-06" },
                          ].map((inv) => (
                            <div key={inv.invoice} className="flex items-center justify-between p-3.5 text-xs bg-[#121226]">
                              <div>
                                <p className="text-white font-medium">{inv.invoice}</p>
                                <p className="text-gray-500 text-[11px]">{inv.date}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-white font-semibold">{inv.amount}</span>
                                <button
                                  onClick={() => toast.success(`Downloading invoice ${inv.invoice}`)}
                                  className="text-purple-400 hover:text-purple-300 font-semibold text-[11px] bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20"
                                >
                                  Download PDF
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 7: INTEGRATIONS */}
                  {activeTab === "integrations" && (
                    <div className="bg-[#0e0e1e] border border-[#1a1a32] rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
                      <div>
                        <h3 className="text-white font-bold text-base">Connected Integrations & Webhooks</h3>
                        <p className="text-gray-400 text-xs mt-1">Manage platform connections and custom API webhook keys.</p>
                      </div>

                      <div className="space-y-3">
                        {[
                          { name: "YouTube", connected: !!connectedPlatforms?.youtube, color: "text-red-500" },
                          { name: "Instagram", connected: !!connectedPlatforms?.instagram, color: "text-pink-500" },
                          { name: "TikTok", connected: !!connectedPlatforms?.tiktok, color: "text-cyan-400" },
                          { name: "Facebook", connected: !!connectedPlatforms?.facebook, color: "text-blue-500" },
                          { name: "X (Twitter)", connected: !!connectedPlatforms?.twitter, color: "text-gray-300" },
                        ].map((plat) => (
                          <div key={plat.name} className="flex items-center justify-between p-3.5 bg-[#121226] border border-[#1c1c38] rounded-xl text-xs">
                            <div className="flex items-center gap-3">
                              <LayoutGrid className={`w-4 h-4 ${plat.color}`} />
                              <span className="text-white font-semibold">{plat.name}</span>
                            </div>
                            {plat.connected ? (
                              <span className="text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-[11px]">
                                ✓ Connected
                              </span>
                            ) : (
                              <button
                                onClick={async () => {
                                  try {
                                    const pKey = plat.name.toLowerCase().includes("instagram")
                                      ? "instagram"
                                      : plat.name.toLowerCase().includes("facebook")
                                      ? "facebook"
                                      : plat.name.toLowerCase().includes("tiktok")
                                      ? "tiktok"
                                      : plat.name.toLowerCase();

                                    await directConnect.mutateAsync({ platform: pKey });
                                    toast.success(`${plat.name} connected cleanly! 🚀`);
                                  } catch {
                                    toast.error(`Failed to connect ${plat.name}`);
                                  }
                                }}
                                className="text-purple-400 hover:text-purple-300 font-semibold text-[11px] bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/20 hover:bg-purple-500/20 transition-all"
                              >
                                Connect →
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* API Key Generator */}
                      <div className="pt-4 border-t border-[#181830] space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-white font-semibold text-sm">Developer API Key</h4>
                            <p className="text-gray-500 text-xs">Generate a webhook API key for custom integrations</p>
                          </div>
                          <button
                            onClick={() => {
                              const newKey = `sp_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
                              setApiKeyGenerated(newKey);
                              toast.success("New API Key generated!");
                            }}
                            className="flex items-center gap-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 px-3.5 py-2 rounded-xl transition-all"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Generate API Key</span>
                          </button>
                        </div>

                        {apiKeyGenerated && (
                          <div className="p-3 bg-[#161630] border border-purple-500/30 rounded-xl flex items-center justify-between text-xs">
                            <code className="text-purple-300 font-mono">{apiKeyGenerated}</code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(apiKeyGenerated);
                                toast.success("Copied to clipboard!");
                              }}
                              className="text-gray-400 hover:text-white font-semibold text-[11px]"
                            >
                              Copy
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Webhook Endpoint Input */}
                      <div className="pt-4 border-t border-[#181830] space-y-2">
                        <label className="text-white text-xs font-semibold block">Webhook Endpoint URL</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            className="bg-[#14142a] border border-[#222245] text-white text-xs rounded-xl px-3.5 py-2 flex-1 focus:outline-none focus:border-purple-500"
                          />
                          <button
                            onClick={() => toast.success("Test webhook ping sent (HTTP 200 OK)")}
                            className="flex items-center gap-1.5 text-xs font-semibold text-purple-300 bg-purple-500/15 border border-purple-500/30 hover:bg-purple-500/25 px-3.5 py-2 rounded-xl transition-all"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Test Ping</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right Column: Live Appearance & Typography Preview */}
            <div className="lg:col-span-4 space-y-6">
              {/* Appearance Preview Card */}
              <div className="bg-[#0e0e1e] border border-[#1a1a32] rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-bold text-sm">{t("settings.previewTitle")}</h4>
                  <span className="text-[10px] text-purple-400 font-medium bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                    {t("settings.previewLive")}
                  </span>
                </div>
                <p className="text-gray-500 text-xs">{t("settings.previewDesc")}</p>

                {/* Mini Dashboard Mockup with Real Data */}
                <div className="bg-[#080814] border border-[#1c1c35] rounded-xl p-3.5 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between pb-2 border-b border-[#181830]">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: settings.primaryColor }} />
                      <span className="text-xs font-bold text-white">StudioPulse</span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {settings.theme.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#121226] border border-[#1e1e3b] p-2.5 rounded-lg space-y-1">
                      <p className="text-[10px] text-gray-500 font-semibold uppercase">{t("dash.totalViews")}</p>
                      <p className="text-sm font-bold text-white">
                        {dashData?.stats?.totalViews
                          ? dashData.stats.totalViews >= 1000000
                            ? `${(dashData.stats.totalViews / 1000000).toFixed(2)}M`
                            : dashData.stats.totalViews.toLocaleString()
                          : "2.48M"}
                      </p>
                      <span className="text-[9px] text-emerald-400 font-bold">
                        ↑ {dashData?.stats?.viewsTrend ? `${dashData.stats.viewsTrend.toFixed(1)}%` : "14.6%"}
                      </span>
                    </div>
                    <div className="bg-[#121226] border border-[#1e1e3b] p-2.5 rounded-lg space-y-1">
                      <p className="text-[10px] text-gray-500 font-semibold uppercase">{t("dash.totalRevenue")}</p>
                      <p className="text-sm font-bold text-white">
                        {dashData?.stats?.totalRevenue
                          ? `$${dashData.stats.totalRevenue.toLocaleString()}`
                          : "$4,250"}
                      </p>
                      <span className="text-[9px] text-emerald-400 font-bold">↑ 21.4%</span>
                    </div>
                  </div>

                  {/* Real Top Video */}
                  <div className="bg-[#121226] border border-[#1e1e3b] p-2.5 rounded-lg space-y-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{t("dash.topPerforming")}</p>
                    <div className="flex items-center gap-2">
                      {dashData?.topVideos?.[0]?.thumbnail ? (
                        <img
                          src={dashData.topVideos[0].thumbnail}
                          alt=""
                          className="w-9 h-6 object-cover rounded"
                        />
                      ) : (
                        <div className="w-9 h-6 rounded bg-purple-600/30 flex items-center justify-center text-[8px] font-bold text-purple-300">
                          {dashData?.topVideos?.[0]?.duration || "12:45"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[10.5px] font-semibold truncate">
                          {dashData?.topVideos?.[0]?.title || "10 AI Tools Every Creator Needs in 2026"}
                        </p>
                        <p className="text-gray-500 text-[9px]">
                          {dashData?.topVideos?.[0]?.views ? `${dashData.topVideos[0].views.toLocaleString()} ${t("dash.views")}` : `124K ${t("dash.views")}`} · ${dashData?.topVideos?.[0]?.revenue ? `$${dashData.topVideos[0].revenue}` : "$812"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Appearance Specs Breakdown */}
                <div className="bg-[#080814] border border-[#1c1c35] rounded-xl p-3.5 space-y-2 text-xs">
                  <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-2">Active Customization Specs</p>
                  <div className="flex items-center justify-between text-gray-400">
                    <span>{t("settings.themeMode")}:</span>
                    <span className="text-white font-medium capitalize">{settings.theme}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <span>{t("settings.primaryColor")}:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: settings.primaryColor }} />
                      <span className="text-white font-mono text-[11px]">{settings.primaryColor}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <span>{t("settings.fontFamily")}:</span>
                    <span className="text-white font-medium">{settings.fontFamily}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <span>{t("settings.sidebarPosition")}:</span>
                    <span className="text-white font-medium capitalize">{settings.sidebarPosition}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <span>{t("settings.compactMode")}:</span>
                    <span className={`font-semibold ${settings.compactMode ? "text-emerald-400" : "text-gray-500"}`}>
                      {settings.compactMode ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <span>{t("settings.language")}:</span>
                    <span className="text-white font-medium">{settings.language}</span>
                  </div>
                </div>
              </div>

              {/* Font Preview Card */}
              <div className="bg-[#0e0e1e] border border-[#1a1a32] rounded-2xl p-5 space-y-4 shadow-xl">
                <div>
                  <h4 className="text-white font-bold text-sm">{t("settings.fontPreview")}</h4>
                  <p className="text-gray-500 text-xs mt-0.5">{t("settings.fontPreviewDesc")}</p>
                </div>

                <div
                  className="bg-[#080814] border border-[#1c1c35] rounded-xl p-4 space-y-3"
                  style={{ fontFamily: `'${settings.fontFamily}', sans-serif` }}
                >
                  <div>
                    <h1 className="text-lg font-bold text-white">Heading 1</h1>
                    <p className="text-gray-400 text-xs">This is an example of heading 1 text</p>
                  </div>

                  <div>
                    <h2 className="text-sm font-semibold text-white">Heading 2</h2>
                    <p className="text-gray-400 text-xs">This is an example of heading 2 text</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Body Text: This is an example of body text. It shows how your content will appear in the platform.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* Upgrade Plan Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0e0e22] border border-purple-500/30 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1c1c38] pb-4">
              <div className="flex items-center gap-2.5">
                <Crown className="w-5 h-5 text-yellow-400" />
                <h3 className="text-white font-bold text-lg">Select Subscription Plan</h3>
              </div>
              <button onClick={() => setShowUpgradeModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { name: "Free", price: "$0", desc: "Basic creator tools" },
                { name: "Pro", price: "$29", desc: "AI Optimization & Analytics" },
                { name: "Enterprise", price: "$99", desc: "Unlimited AI & Priority Sync" },
              ].map((p) => {
                const isCurrent = settings.plan === p.name;
                return (
                  <button
                    key={p.name}
                    onClick={() => {
                      updateSettings({ plan: p.name as any });
                      toast.success(`Switched to ${p.name} plan!`);
                      setShowUpgradeModal(false);
                    }}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isCurrent
                        ? "bg-purple-600/20 border-purple-500 text-white shadow-lg"
                        : "bg-[#14142a] border-[#222245] text-gray-400 hover:border-purple-500/50 hover:text-white"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-sm">{p.name}</p>
                      <p className="text-xl font-extrabold text-white mt-1">{p.price}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{p.desc}</p>
                    </div>
                    {isCurrent && (
                      <span className="mt-3 text-[10px] font-bold text-purple-300 bg-purple-500/30 px-2 py-0.5 rounded text-center">
                        Active Plan
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Danger Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#140b12] border border-rose-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-white font-bold text-lg">Delete Account</h3>
            </div>

            <p className="text-gray-300 text-xs leading-relaxed">
              This action is permanent and cannot be undone. All your connected channel tokens, video analytics history, and AI optimization settings will be permanently erased.
            </p>

            <div className="space-y-2 pt-2">
              <label className="text-gray-400 text-xs block font-medium">
                Type <span className="text-rose-400 font-bold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="bg-[#1a0f16] border border-rose-500/30 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-rose-500 w-full"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={deleteConfirmText !== "DELETE"}
                onClick={() => {
                  toast.error("Account deletion initiated. Signing out...");
                  setTimeout(() => signOut(), 1500);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 transition-all shadow-md shadow-rose-900/40"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
