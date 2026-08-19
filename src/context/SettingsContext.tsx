/**
 * SettingsContext — Global state and persistence for StudioPulse settings.
 * Handles General, Appearance, Notifications, Privacy, Account, Billing, and Integrations preferences.
 * Auto-persists every change to localStorage and provides i18n translation.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { getTranslator } from "@/i18n/translations";

export interface SettingsState {
  // General
  language: string;
  timeZone: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  defaultDashboard: string;

  // Appearance
  theme: "dark" | "light" | "system";
  primaryColor: string; // hex code
  sidebarPosition: "left" | "right";
  compactMode: boolean;
  fontFamily: string;

  // Notifications
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
  viralAlerts: boolean;
  aiReports: boolean;
  platformDisconnectAlerts: boolean;

  // Privacy
  profileVisibility: "public" | "private" | "unlisted";
  shareAiData: boolean;
  analyticsTracking: boolean;
  activityLogging: boolean;

  // Account
  firstName: string;
  lastName: string;
  bio: string;

  // Billing
  plan: "Free" | "Pro" | "Enterprise";
  billingCycle: "monthly" | "yearly";
}

export const DEFAULT_SETTINGS: SettingsState = {
  language: "English",
  timeZone: "(GMT+05:00) Islamabad",
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
  defaultDashboard: "/dashboard",

  theme: "dark",
  primaryColor: "#8b5cf6", // Purple
  sidebarPosition: "left",
  compactMode: false,
  fontFamily: "Inter",

  emailNotifications: true,
  pushNotifications: true,
  weeklyDigest: true,
  viralAlerts: true,
  aiReports: true,
  platformDisconnectAlerts: true,

  profileVisibility: "public",
  shareAiData: true,
  analyticsTracking: true,
  activityLogging: true,

  firstName: "",
  lastName: "",
  bio: "",

  plan: "Pro",
  billingCycle: "monthly",
};

/** Converts hex color to HSL CSS variable value (e.g. "270 100% 43%") */
function hexToHSL(hex: string): string {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

interface SettingsContextType {
  settings: SettingsState;
  updateSettings: (newSettings: Partial<SettingsState>) => void;
  resetSettings: () => void;
  saveSettings: () => void;
  /** Translation function — returns translated string for the current language */
  t: (key: string) => string;
}

const SETTINGS_STORAGE_KEY = "studiopulse_settings_v1";

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Translation function memoized on language
  const t = useMemo(() => getTranslator(settings.language), [settings.language]);

  // Auto-persist settings to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error("Failed to auto-save settings:", err);
    }
  }, [settings]);

  // Apply settings to DOM (theme, primary color, font family, compact mode, etc.)
  useEffect(() => {
    const root = document.documentElement;

    // Apply primary color CSS variables — both raw hex and HSL for Tailwind
    root.style.setProperty("--primary-accent", settings.primaryColor);
    const hsl = hexToHSL(settings.primaryColor);
    root.style.setProperty("--primary", hsl);
    root.style.setProperty("--accent", hsl);
    root.style.setProperty("--ring", hsl);

    // Apply font family
    root.style.fontFamily = `'${settings.fontFamily}', -apple-system, BlinkMacSystemFont, sans-serif`;

    // Apply compact mode
    if (settings.compactMode) {
      root.classList.add("compact-mode");
    } else {
      root.classList.remove("compact-mode");
    }

    // Apply Theme
    if (settings.theme === "light") {
      root.classList.add("light-theme");
      root.classList.remove("dark");
    } else if (settings.theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.remove("light-theme");
        root.classList.add("dark");
      } else {
        root.classList.add("light-theme");
        root.classList.remove("dark");
      }
    } else {
      root.classList.remove("light-theme");
      root.classList.add("dark");
    }

    // Apply language direction and lang attribute
    root.setAttribute("lang", settings.language === "Hindi" ? "hi" : "en");
  }, [settings]);

  const updateSettings = useCallback((newSettings: Partial<SettingsState>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const saveSettings = useCallback(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error("Failed to save settings to localStorage:", err);
    }
  }, [settings]);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, saveSettings, t }}>
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
