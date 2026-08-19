import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Sparkles,
  Award,
  Flame,
  Clock,
  Bot,
  Bell,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  X,
  Search,
  SlidersHorizontal,
  Trash2,
  Edit2,
  CalendarDays,
  Target,
  Trophy,
  ArrowRight,
  Share2,
  Copy,
  Zap,
} from "lucide-react";
import { useCalendar, type CalendarEvent } from "../hooks/useCalendar";
import Sidebar from "@/components/layout/Sidebar";

function YoutubeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function FacebookIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

// TikTok Icon SVG Component
function TikTokIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 2.378 6.338 6.338 0 0 0 .614 8.784 6.328 6.328 0 0 0 8.243-.654 6.3 6.3 0 0 0 1.996-4.568V8.756a8.214 8.214 0 0 0 4.774 1.49V6.78a4.83 4.83 0 0 1-1.002-.094z" />
    </svg>
  );
}

export function CalendarPage() {
  const {
    data: calendarData,
    isLoading,
    createEvent,
    updateEvent,
    moveEvent,
    deleteEvent,
    markNotificationRead,
    optimizeScheduleWithAI,
    isCreating,
    isOptimizing,
  } = useCalendar();

  // State Management
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 1)); // August 2026
  const [activeView, setActiveView] = useState<"month" | "week" | "list" | "timeline" | "mobileFeed">(() => {
    return typeof window !== "undefined" && window.innerWidth < 768 ? "mobileFeed" : "month";
  });
  const [selectedMobileDate, setSelectedMobileDate] = useState<string>("2026-08-01");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  // Modals
  const [showNewUploadModal, setShowNewUploadModal] = useState(false);
  const [showEventDetailModal, setShowEventDetailModal] = useState<CalendarEvent | null>(null);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [showAIOptimizerModal, setShowAIOptimizerModal] = useState(false);
  const [aiAdviceText, setAiAdviceText] = useState<string | null>(null);

  // Drag & Drop State
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);

  // New Event Form State
  const [formTitle, setFormTitle] = useState("");
  const [formPlatform, setFormPlatform] = useState<"youtube" | "instagram" | "facebook" | "tiktok">("youtube");
  const [formType, setFormType] = useState<"upload" | "reel" | "video" | "short" | "campaign" | "meeting" | "reminder">("upload");
  const [formDate, setFormDate] = useState("2026-08-15");
  const [formTime, setFormTime] = useState("10:00");
  const [formDescription, setFormDescription] = useState("");
  const [formReminderMins, setFormReminderMins] = useState(30);

  const THUMB_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' fill='%23111128'%3E%3Crect width='320' height='180' rx='8'/%3E%3Cpath d='M140 70 L195 100 L140 130 Z' fill='%23383868'/%3E%3C/svg%3E";

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    target.onerror = null;
    if (target.src !== THUMB_FALLBACK) {
      target.src = THUMB_FALLBACK;
    }
  };

  // Month Navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const resetToday = () => {
    setCurrentDate(new Date(2026, 7, 1));
  };

  const monthYearLabel = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Filtered Events
  const events = useMemo(() => {
    if (!calendarData?.events) return [];
    return calendarData.events.filter((evt) => {
      const matchPlatform = selectedPlatform === "all" || evt.platform.toLowerCase() === selectedPlatform.toLowerCase();
      const matchStatus = selectedStatusFilter === "all" || evt.status === selectedStatusFilter;
      const matchSearch =
        !searchQuery ||
        evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchPlatform && matchStatus && matchSearch;
    });
  }, [calendarData?.events, selectedPlatform, selectedStatusFilter, searchQuery]);

  // Calendar Grid Calculations for Current Month View
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: Array<{ dayNum: number; isCurrentMonth: boolean; fullDate: string }> = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const pMonth = month === 0 ? 11 : month - 1;
      const pYear = month === 0 ? year - 1 : year;
      const fullDate = `${pYear}-${String(pMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dayNum: d, isCurrentMonth: false, fullDate });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const fullDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dayNum: d, isCurrentMonth: true, fullDate });
    }

    // Next month padding to complete 35 or 42 cells grid
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nMonth = month === 11 ? 0 : month + 1;
      const nYear = month === 11 ? year + 1 : year;
      const fullDate = `${nYear}-${String(nMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dayNum: d, isCurrentMonth: false, fullDate });
    }

    return days;
  }, [currentDate]);

  // Handle Event Creation Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle) return;

    const startTimeISO = `${formDate}T${formTime}:00Z`;
    await createEvent({
      title: formTitle,
      description: formDescription,
      eventType: formType,
      platform: formPlatform,
      startTime: startTimeISO,
      status: "scheduled",
      reminderMinutes: formReminderMins,
      color:
        formPlatform === "youtube"
          ? "#FF0000"
          : formPlatform === "instagram"
          ? "#E1306C"
          : formPlatform === "facebook"
          ? "#1877F2"
          : "#00F2FE",
    });

    setShowNewUploadModal(false);
    setFormTitle("");
    setFormDescription("");
  };

  // Handle Drag & Drop Drop onto Date Cell
  const handleDropOnDay = async (targetFullDate: string) => {
    if (!draggedEventId) return;
    const evt = events.find((e) => e.id === draggedEventId);
    if (!evt) return;

    const oldTimePart = evt.startTime.includes("T") ? evt.startTime.split("T")[1] : "10:00:00Z";
    const newStartTime = `${targetFullDate}T${oldTimePart}`;
    await moveEvent({ id: draggedEventId, startTime: newStartTime });
    setDraggedEventId(null);
  };

  // Handle AI Schedule Optimization
  const handleTriggerAIOptimize = async () => {
    setShowAIOptimizerModal(true);
    const res = await optimizeScheduleWithAI("Analyze channel stats and give optimal post time recommendations.");
    if (res?.advice) {
      setAiAdviceText(res.advice);
    }
  };

  // Helper for Platform Badge Styling
  const renderPlatformBadge = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "youtube":
        return <YoutubeIcon className="w-3.5 h-3.5 text-red-500 shrink-0" />;
      case "instagram":
        return <InstagramIcon className="w-3.5 h-3.5 text-pink-400 shrink-0" />;
      case "facebook":
        return <FacebookIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case "tiktok":
        return <TikTokIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      default:
        return <CalendarIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080811] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#8200DB] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-gray-400">Loading StudioPulse Production Content Calendar...</p>
        </div>
      </div>
    );
  }

  const unreadCount = calendarData?.stats?.unreadNotifications || 0;

  return (
    <div className="min-h-screen bg-[#080811] flex">
      {/* ─── Shared Unified Sidebar ─── */}
      <Sidebar activePage="/calendar" />

      {/* ─── Main Content Area ─── */}
      <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 select-text overflow-y-auto min-w-0">
      {/* ── TOP NAV BAR & HEADER ────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 sm:gap-4 bg-[#0e0e1c]/80 border border-[#1d1d38] rounded-2xl p-3.5 sm:p-5 backdrop-blur-xl shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Content Calendar 🗓️
            </h1>
            <span className="bg-[#8200DB]/20 border border-[#8200DB]/40 text-[#a855f7] text-xs font-bold px-2.5 py-0.5 rounded-full">
              Production V2
            </span>
          </div>
          <p className="text-xs md:text-sm text-gray-400">Plan. Create. Schedule. Conquer.</p>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          {/* Notification Bell Button */}
          <button
            onClick={() => setShowNotificationDrawer(true)}
            className="relative p-2.5 rounded-xl bg-[#141428] border border-[#222242] hover:border-[#8200DB] transition text-gray-300 hover:text-white"
            title="Notification Center"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Date Navigator */}
          <div className="flex items-center gap-1.5 bg-[#141428] border border-[#222242] rounded-xl p-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[#202040] text-gray-400 hover:text-white transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold px-3 text-white">{monthYearLabel}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[#202040] text-gray-400 hover:text-white transition">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={resetToday} className="text-[11px] font-semibold bg-[#202040] hover:bg-[#2a2a54] text-gray-300 hover:text-white px-2.5 py-1 rounded-lg transition">
              Today
            </button>
          </div>

          {/* View Mode Buttons (Month / Week / List / Timeline / MobileFeed) */}
          <div className="flex items-center bg-[#141428] border border-[#222242] rounded-xl p-1 text-xs overflow-x-auto max-w-full custom-scrollbar">
            <button
              onClick={() => setActiveView("mobileFeed")}
              className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                activeView === "mobileFeed" ? "bg-[#8200DB] text-white shadow-lg" : "text-gray-400 hover:text-white"
              }`}
            >
              📱 Day Feed
            </button>
            <button
              onClick={() => setActiveView("month")}
              className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                activeView === "month" ? "bg-[#8200DB] text-white shadow-lg" : "text-gray-400 hover:text-white"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setActiveView("week")}
              className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                activeView === "week" ? "bg-[#8200DB] text-white shadow-lg" : "text-gray-400 hover:text-white"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setActiveView("list")}
              className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                activeView === "list" ? "bg-[#8200DB] text-white shadow-lg" : "text-gray-400 hover:text-white"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setActiveView("timeline")}
              className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                activeView === "timeline" ? "bg-[#8200DB] text-white shadow-lg" : "text-gray-400 hover:text-white"
              }`}
            >
              Timeline
            </button>
          </div>

          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141428] border border-[#222242] hover:border-[#8200DB] text-xs font-semibold text-gray-300 transition"
            >
              <Filter className="w-3.5 h-3.5" /> Filter
            </button>
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-[#0e0e1c] border border-[#25254d] rounded-xl p-2 shadow-2xl z-40 space-y-1 text-xs">
                <p className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase">Filter By Status</p>
                {["all", "scheduled", "published", "draft"].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setSelectedStatusFilter(st);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg capitalize font-medium transition ${
                      selectedStatusFilter === st ? "bg-[#8200DB]/30 text-[#a855f7]" : "text-gray-300 hover:bg-[#181832]"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* New Upload Action Button */}
          <button
            onClick={() => setShowNewUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#8200DB] to-[#a855f7] hover:from-[#7000bc] hover:to-[#9333ea] text-white text-xs font-extrabold shadow-lg shadow-[#8200DB]/30 transition"
          >
            <Plus className="w-4 h-4" /> + New Upload
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT & SIDEBAR GRID LAYOUT ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── LEFT & CENTER: CALENDAR ENGINE (3 COLS) ────────────────────────── */}
        <div className="lg:col-span-3 space-y-5">
          {/* Platform Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 bg-[#0e0e1c]/60 border border-[#1d1d38] rounded-2xl p-2.5">
            {[
              { id: "all", label: "All Platforms", icon: CalendarIcon, color: "bg-[#8200DB] text-white" },
              { id: "youtube", label: "YouTube", icon: YoutubeIcon, color: "bg-red-600/20 text-red-400 border border-red-500/30" },
              { id: "instagram", label: "Instagram", icon: InstagramIcon, color: "bg-pink-600/20 text-pink-400 border border-pink-500/30" },
              { id: "facebook", label: "Facebook", icon: FacebookIcon, color: "bg-blue-600/20 text-blue-400 border border-blue-500/30" },
              { id: "tiktok", label: "TikTok", icon: TikTokIcon, color: "bg-cyan-600/20 text-cyan-400 border border-cyan-500/30" },
            ].map((p) => {
              const IconComp = p.icon;
              const isActive = selectedPlatform === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlatform(p.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                    isActive ? "bg-[#8200DB] text-white shadow-lg shadow-[#8200DB]/30" : "bg-[#141428] text-gray-400 hover:text-white border border-[#222242]"
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* ── CALENDAR VIEW: MOBILE DAY FEED & SWIPEABLE DAY RIBBON ── */}
          {activeView === "mobileFeed" && (
            <div className="bg-[#0e0e1c] border border-[#1d1d38] rounded-2xl p-4 space-y-4 shadow-2xl select-text">
              {/* Month / Year Ribbon Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#a855f7]" /> Daily Content Feed
                  </h3>
                  <p className="text-[11px] text-gray-400">Tap any day to view posts & scheduled content</p>
                </div>

                <button
                  onClick={() => {
                    setFormDate(selectedMobileDate);
                    setShowNewUploadModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8200DB] hover:bg-[#7000bc] text-white text-xs font-bold shadow-lg shadow-purple-900/40"
                >
                  <Plus className="w-3.5 h-3.5" /> Post
                </button>
              </div>

              {/* Scrollable Horizontal Day Ribbon */}
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 pt-1 -mx-1 px-1">
                {calendarDays.filter((d) => d.isCurrentMonth).map((day) => {
                  const isSelected = selectedMobileDate === day.fullDate;
                  const dayEvents = events.filter((e) => e.startTime.startsWith(day.fullDate));
                  const dayName = new Date(day.fullDate + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short" });

                  return (
                    <button
                      key={day.fullDate}
                      onClick={() => setSelectedMobileDate(day.fullDate)}
                      className={`flex flex-col items-center justify-center min-w-[56px] h-[68px] rounded-2xl px-2 border transition-all shrink-0 relative ${
                        isSelected
                          ? "bg-gradient-to-b from-[#8200DB] to-[#5c00a3] border-purple-400 text-white shadow-lg shadow-purple-900/50 scale-105"
                          : "bg-[#141428] border-[#222244] text-gray-400 hover:text-white hover:border-purple-500/40"
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{dayName}</span>
                      <span className="text-base font-extrabold my-0.5">{day.dayNum}</span>

                      {dayEvents.length > 0 && (
                        <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-amber-300 animate-pulse" : "bg-purple-400"}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Event List Feed */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-[#1f1f3e] pb-2">
                  <h4 className="text-xs font-bold text-gray-200 flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-purple-400" />
                    {new Date(selectedMobileDate + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  </h4>
                  <span className="text-[10px] font-semibold text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                    {events.filter((e) => e.startTime.startsWith(selectedMobileDate)).length} Posts
                  </span>
                </div>

                {events.filter((e) => e.startTime.startsWith(selectedMobileDate)).length === 0 ? (
                  <div className="py-8 px-4 text-center bg-[#121226] border border-[#202040] rounded-2xl space-y-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">No Content Scheduled for this Day</p>
                      <p className="text-[11px] text-gray-400 mt-1">Tap below to schedule a video, Short, Reel, or reminder.</p>
                    </div>
                    <button
                      onClick={() => {
                        setFormDate(selectedMobileDate);
                        setShowNewUploadModal(true);
                      }}
                      className="py-2 px-4 rounded-xl bg-[#8200DB] hover:bg-[#7000bc] text-white text-xs font-bold transition shadow-lg shadow-purple-900/40"
                    >
                      + Schedule Post for {selectedMobileDate}
                    </button>
                  </div>
                ) : (
                  events
                    .filter((e) => e.startTime.startsWith(selectedMobileDate))
                    .map((evt) => {
                      const isMilestone = evt.isMilestone || evt.eventType === "milestone";
                      const rawThumb = evt.thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80";
                      const thumbUrl = rawThumb.includes("hqdefault.jpg") ? rawThumb.replace("hqdefault.jpg", "mqdefault.jpg") : rawThumb;

                      return (
                        <div
                          key={evt.id}
                          onClick={() => setShowEventDetailModal(evt)}
                          className="bg-[#121226] border border-[#202040] hover:border-purple-500/50 rounded-2xl p-3.5 space-y-3 transition duration-200 shadow-xl cursor-pointer group"
                        >
                          {/* Banner Thumbnail & Badges */}
                          {!isMilestone && (
                            <div className="relative rounded-xl overflow-hidden h-36 w-full">
                              <img
                                src={thumbUrl}
                                alt=""
                                onError={handleImageError}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                              <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1.5 border border-white/10">
                                {renderPlatformBadge(evt.platform)}
                                <span className="text-[10px] font-bold text-white capitalize">{evt.platform}</span>
                              </div>

                              <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-extrabold text-white border border-white/10">
                                ⏰ {evt.startTime.includes("T") ? new Date(evt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "10:00 AM"}
                              </div>
                            </div>
                          )}

                          {/* Content details */}
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition line-clamp-1">{evt.title}</h4>
                              <span
                                className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase shrink-0 border ${
                                  evt.status === "published"
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                    : evt.status === "draft"
                                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                    : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                                }`}
                              >
                                {evt.status}
                              </span>
                            </div>

                            {evt.description && (
                              <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{evt.description}</p>
                            )}
                          </div>

                          {/* Footer Action Strip */}
                          <div className="pt-2 border-t border-[#1a1a36] flex items-center justify-between text-xs text-gray-400">
                            <span className="flex items-center gap-1 text-[11px]">
                              <Clock className="w-3.5 h-3.5 text-purple-400" />
                              Reminds {evt.reminderMinutes || 30}m before
                            </span>
                            <span className="text-purple-400 font-bold flex items-center gap-1 text-[11px] group-hover:translate-x-1 transition-transform">
                              Tap for Details <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* ── CALENDAR VIEW: MONTH GRID ───────────────────────────────────── */}
          {activeView === "month" && (
            <div className="bg-[#0e0e1c] border border-[#1d1d38] rounded-2xl p-3 md:p-5 space-y-4 shadow-2xl select-text">
              <div className="overflow-x-auto pb-2 custom-scrollbar">
                <div className="min-w-[650px] md:min-w-0">
                  {/* Day Headers (Sun - Sat) */}
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400 pb-2 border-b border-[#181832] mb-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="py-1 uppercase tracking-wider text-[11px]">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Month Cells Grid */}
                  <div className="grid grid-cols-7 gap-2 md:gap-3">
                    {calendarDays.map((cell, idx) => {
                      const dayEvents = events.filter((e) => e.startTime.startsWith(cell.fullDate));

                      return (
                        <div
                          key={idx}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDropOnDay(cell.fullDate)}
                          onClick={() => {
                            setFormDate(cell.fullDate);
                            setShowNewUploadModal(true);
                          }}
                          className={`min-h-[100px] md:min-h-[120px] rounded-2xl p-2 border transition flex flex-col justify-between cursor-pointer group ${
                            cell.isCurrentMonth
                              ? "bg-[#101022]/90 border-[#1f1f3e] hover:border-[#8200DB]/60 hover:bg-[#14142a]"
                              : "bg-[#0a0a14]/40 border-[#141426] opacity-40"
                          }`}
                        >
                          {/* Cell Header: Day Number */}
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-extrabold px-2 py-0.5 rounded-lg ${
                                cell.fullDate === "2026-08-01" || cell.fullDate === "2026-08-24"
                                  ? "bg-[#8200DB] text-white"
                                  : "text-gray-300 group-hover:text-white"
                              }`}
                            >
                              {cell.dayNum}
                            </span>
                            {dayEvents.length > 0 && (
                              <span className="text-[10px] text-gray-500 font-semibold">{dayEvents.length} post</span>
                            )}
                          </div>

                          {/* Event Cards inside Day Cell with Video Thumbnails */}
                          <div className="space-y-1.5 mt-1 flex-1 overflow-y-auto max-h-[95px] custom-scrollbar">
                            {dayEvents.map((evt) => {
                              const isMilestone = evt.isMilestone || evt.eventType === "milestone";
                              const rawThumb = evt.thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80";
                              const thumbUrl = rawThumb.includes("hqdefault.jpg") ? rawThumb.replace("hqdefault.jpg", "mqdefault.jpg") : rawThumb;

                              return (
                                <div
                                  key={evt.id}
                                  draggable
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    setDraggedEventId(evt.id);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowEventDetailModal(evt);
                                  }}
                                  className={`p-1.5 rounded-xl border text-[11px] font-semibold space-y-1 transition duration-200 shadow-md group/card relative overflow-hidden select-text ${
                                    isMilestone
                                      ? "bg-gradient-to-r from-[#8200DB]/50 to-[#a855f7]/40 border-[#8200DB] text-white shadow-purple-900/50"
                                      : evt.status === "draft"
                                      ? "bg-[#181832] border-[#2c2c54] text-gray-300 hover:border-[#8200DB]"
                                      : "bg-[#141428] border-[#222244] hover:border-[#8200DB] text-white"
                                  }`}
                                >
                                  {/* Video Thumbnail banner if thumbnail exists or standard upload */}
                                  {!isMilestone && (
                                    <div className="relative rounded-lg overflow-hidden h-12 w-full mb-1 group-hover/card:scale-105 transition duration-300">
                                      <img
                                        src={thumbUrl}
                                        alt=""
                                        onError={handleImageError}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                      <div className="absolute top-1 left-1 bg-black/80 backdrop-blur-md p-1 rounded-md">
                                        {renderPlatformBadge(evt.platform)}
                                      </div>
                                      <div className="absolute top-1 right-1 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[9px] font-bold text-gray-200">
                                        {evt.startTime.includes("T")
                                          ? new Date(evt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                          : "10:00 AM"}
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between gap-1">
                                    <span className="truncate text-[10px] font-bold flex-1">{evt.title}</span>
                                    <span
                                      className={`text-[8px] px-1.5 py-0.2 rounded-full font-bold uppercase shrink-0 ${
                                        evt.status === "published"
                                          ? "bg-emerald-500/20 text-emerald-400"
                                          : evt.status === "draft"
                                          ? "bg-amber-500/20 text-amber-400"
                                          : "bg-purple-500/20 text-purple-300"
                                      }`}
                                    >
                                      {evt.status}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── CALENDAR VIEW: LIST / AGENDA VIEW ───────────────────────────── */}
          {activeView === "list" && (
            <div className="bg-[#0e0e1c] border border-[#1d1d38] rounded-2xl p-5 space-y-4 shadow-2xl select-text">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#a855f7]" /> Scheduled Content Agenda ({events.length})
              </h3>
              <div className="space-y-3">
                {events.map((evt) => {
                  const rawThumb = evt.thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80";
                  const thumbUrl = rawThumb.includes("hqdefault.jpg") ? rawThumb.replace("hqdefault.jpg", "mqdefault.jpg") : rawThumb;

                  return (
                    <div
                      key={evt.id}
                      onClick={() => setShowEventDetailModal(evt)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[#121226] border border-[#202040] hover:border-[#8200DB] transition cursor-pointer gap-3 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-20 h-12 rounded-lg overflow-hidden shrink-0 group-hover:scale-105 transition duration-300">
                          <img src={thumbUrl} alt="" onError={handleImageError} className="w-full h-full object-cover" />
                          <div className="absolute top-1 left-1 bg-black/80 backdrop-blur-md p-1 rounded-md">
                            {renderPlatformBadge(evt.platform)}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-[#a855f7] transition">{evt.title}</h4>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(evt.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at{" "}
                            {new Date(evt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold bg-[#1a1a36] border border-[#2c2c56] px-3 py-1 rounded-full text-purple-300 capitalize">
                          {evt.eventType}
                        </span>
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                            evt.status === "published"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : evt.status === "draft"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-purple-500/20 text-purple-300"
                          }`}
                        >
                          {evt.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── BOTTOM CAROUSEL: YOUR JOURNEY HIGHLIGHTS ─────────────────────── */}
          <div className="bg-[#0e0e1c] border border-[#1d1d38] rounded-2xl p-5 space-y-4 shadow-2xl select-text relative overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="w-4.5 h-4.5 text-amber-400" /> Your Journey Highlights
              </h3>
              <span className="text-xs text-[#a855f7] font-semibold bg-[#8200DB]/20 px-2.5 py-0.5 rounded-full border border-[#8200DB]/30">
                Milestone Memories
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {(calendarData?.journeyHighlights || []).map((card: any, idx: number) => (
                <div
                  key={card.id || idx}
                  className={`relative rounded-2xl p-4 flex flex-col justify-between hover:border-[#8200DB] border border-[#282850] transition duration-300 group cursor-pointer h-44 overflow-hidden shadow-xl select-text`}
                >
                  {/* Real Video Thumbnail Background Image */}
                  <img
                    src={card.img}
                    alt=""
                    onError={handleImageError}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition duration-500 opacity-40"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${card.gradient || "from-purple-950/90 to-indigo-950/90"} via-black/60 to-black/30`} />

                  <div className="relative z-10 space-y-1">
                    <span className="text-[10px] font-extrabold text-white bg-[#8200DB]/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-purple-400/40 inline-block shadow-md">
                      {card.badge}
                    </span>
                    <h4 className="text-sm font-bold text-white pt-1 group-hover:text-[#a855f7] transition">{card.title}</h4>
                    <p className="text-xs text-gray-300 font-medium line-clamp-1">{card.subtitle || card.desc}</p>
                  </div>

                  <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-[10px] text-gray-300 font-semibold">{card.date}</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR: ACHIEVEMENTS, MILESTONES & AI SUGGESTIONS ───────── */}
        <div className="space-y-6">
          {/* 1. Creator Achievements Card */}
          <div className="bg-[#0e0e1c] border border-[#1d1d38] rounded-2xl p-5 space-y-4 shadow-2xl select-text">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" /> Creator Achievements
              </h3>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                Real Stats
              </span>
            </div>

            {/* Top Showcase Achievement (100% Real) */}
            <div className="bg-gradient-to-br from-[#181836] to-[#0e0e1c] border border-[#282850] rounded-xl p-4 text-center space-y-2">
              <div className="text-2xl">👏 🎬</div>
              <h4 className="text-sm font-bold text-white">First Video Upload</h4>
              <p className="text-xs text-gray-400">
                {calendarData?.stats?.totalEvents && calendarData.stats.totalEvents > 0
                  ? `${calendarData.stats.totalEvents} uploaded items synced`
                  : "Upload your first video to kick off your channel!"}
              </p>
              <p className="text-[11px] font-semibold text-[#a855f7]">
                Channel Subs: {calendarData?.stats?.totalSubscribers ?? 0} · Views: {calendarData?.stats?.totalViews ?? 0}
              </p>
            </div>

            {/* Badges list */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#141428] border border-[#222242]">
                <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 font-extrabold flex items-center justify-center border border-purple-500/30">
                  {calendarData?.stats?.totalSubscribers ?? 0}
                </span>
                <div>
                  <h5 className="font-bold text-white">Real Subscribers</h5>
                  <p className="text-[10px] text-gray-400">Live account subscriber count</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#141428] border border-[#222242]">
                <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 font-extrabold flex items-center justify-center border border-amber-500/30">
                  {calendarData?.stats?.totalViews ?? 0}
                </span>
                <div>
                  <h5 className="font-bold text-white">Total Channel Views</h5>
                  <p className="text-[10px] text-gray-400">Live account view count</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Dynamic Real Milestones with Creative Locked Vault UI */}
          <div className="bg-[#0e0e1c] border border-[#1d1d38] rounded-2xl p-5 space-y-4 shadow-2xl select-text">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" /> Channel Milestones ({calendarData?.milestones?.length || 0})
              </h3>
              <span className="text-[10px] text-emerald-400 font-extrabold bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                {calendarData?.milestones?.filter((m: any) => m.status === "achieved").length || 0} Unlocked
              </span>
            </div>

            <div className="space-y-3.5 text-xs max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
              {calendarData?.milestones?.map((m: any) => {
                const isAchieved = m.status === "achieved";
                return (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-xl border transition duration-300 relative overflow-hidden ${
                      isAchieved
                        ? "bg-gradient-to-r from-emerald-950/40 via-[#10241a] to-[#0e0e1c] border-emerald-500/50 text-white"
                        : "bg-[#101022] border-[#222244] text-gray-300 hover:border-[#8200DB]/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{m.icon}</span>
                        <h4 className="font-bold text-white">{m.title}</h4>
                      </div>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                          isAchieved
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        }`}
                      >
                        {isAchieved ? "Unlocked 🎉" : "🔒 Locked Vault"}
                      </span>
                    </div>

                    {/* Progress Bar & Real Numbers */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-medium text-gray-300">
                        <span>Progress</span>
                        <span className={isAchieved ? "text-emerald-400 font-bold" : "text-[#a855f7] font-bold"}>
                          {m.currentValue.toLocaleString()} / {m.targetValue.toLocaleString()} ({m.progressPct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#181832] overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isAchieved
                              ? "bg-gradient-to-r from-emerald-500 to-teal-300"
                              : "bg-gradient-to-r from-[#8200DB] to-[#a855f7]"
                          }`}
                          style={{ width: `${m.progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Creative Tip / Action Quest for Locked State */}
                    {m.tip && (
                      <p className="text-[11px] text-gray-400 mt-2 bg-[#161630] p-2 rounded-lg border border-[#242448] leading-relaxed">
                        {m.tip}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. AI Smart Suggestions Card */}
          <div className="bg-[#0e0e1c] border border-[#8200DB]/40 rounded-2xl p-5 space-y-4 shadow-2xl select-text relative">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#a855f7]" /> AI Smart Suggestions
              </h3>
              <span className="bg-[#8200DB] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">New</span>
            </div>

            <div className="space-y-3 text-xs">
              {calendarData?.aiSuggestions?.map((sug) => (
                <div key={sug.id} className="p-3 rounded-xl bg-[#141428] border border-[#222242] space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-white">
                    {renderPlatformBadge(sug.platform)}
                    <span>{sug.title}</span>
                  </div>
                  <p className="text-[11px] text-gray-300 leading-relaxed">{sug.recommendation}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleTriggerAIOptimize}
              disabled={isOptimizing}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#8200DB] to-[#a855f7] hover:from-[#7000bc] hover:to-[#9333ea] text-white text-xs font-extrabold shadow-lg shadow-[#8200DB]/30 transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> {isOptimizing ? "Optimizing with Gemini..." : "Optimize Schedule with AI ✨"}
            </button>
          </div>
        </div>
      </div>

      {/* ── NEW UPLOAD MODAL ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showNewUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowNewUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0e0e1c] border border-[#25254d] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative select-text"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#a855f7]" /> Schedule New Content Upload
                </h3>
                <button onClick={() => setShowNewUploadModal(false)} className="p-1.5 rounded-lg bg-[#181832] text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Content Title</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Editing Like a Pro 🎬"
                    className="w-full px-3 py-2 rounded-xl bg-[#141428] border border-[#222242] text-white focus:outline-none focus:border-[#8200DB]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">Target Platform</label>
                    <select
                      value={formPlatform}
                      onChange={(e) => setFormPlatform(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-[#141428] border border-[#222242] text-white focus:outline-none focus:border-[#8200DB]"
                    >
                      <option value="youtube">YouTube</option>
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                      <option value="tiktok">TikTok</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">Content Type</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-[#141428] border border-[#222242] text-white focus:outline-none focus:border-[#8200DB]"
                    >
                      <option value="upload">Video Upload</option>
                      <option value="short">Short / Reel</option>
                      <option value="campaign">Campaign</option>
                      <option value="reminder">Reminder</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">Publish Date</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#141428] border border-[#222242] text-white focus:outline-none focus:border-[#8200DB]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">Publish Time</label>
                    <input
                      type="time"
                      required
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#141428] border border-[#222242] text-white focus:outline-none focus:border-[#8200DB]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Reminder Notification</label>
                  <select
                    value={formReminderMins}
                    onChange={(e) => setFormReminderMins(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#141428] border border-[#222242] text-white focus:outline-none focus:border-[#8200DB]"
                  >
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                    <option value={60}>1 hour before</option>
                    <option value={1440}>1 day before</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Description / Notes</label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Add publishing strategy notes..."
                    className="w-full px-3 py-2 rounded-xl bg-[#141428] border border-[#222242] text-white focus:outline-none focus:border-[#8200DB]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#8200DB] to-[#a855f7] hover:from-[#7000bc] hover:to-[#9333ea] text-white font-extrabold shadow-lg shadow-[#8200DB]/30 transition"
                >
                  {isCreating ? "Scheduling..." : "Schedule Upload"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── EVENT DETAIL & EDIT MODAL ───────────────────────────────────────── */}
      <AnimatePresence>
        {showEventDetailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowEventDetailModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0e0e1c] border border-[#25254d] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative select-text"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {renderPlatformBadge(showEventDetailModal.platform)}
                  <h3 className="text-base font-bold text-white truncate">{showEventDetailModal.title}</h3>
                </div>
                <button onClick={() => setShowEventDetailModal(null)} className="p-1.5 rounded-lg bg-[#181832] text-gray-400 hover:text-white shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Video Thumbnail Preview Banner */}
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-[#25254d]">
                <img
                  src={showEventDetailModal.thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80"}
                  alt=""
                  onError={handleImageError}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-2 text-xs font-bold text-white bg-black/70 px-2 py-0.5 rounded-md backdrop-blur-md">
                  {showEventDetailModal.platform.toUpperCase()} Post
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#141428] border border-[#222242] space-y-1">
                  <p className="text-gray-400">
                    Scheduled Time: <strong className="text-white">{new Date(showEventDetailModal.startTime).toLocaleString()}</strong>
                  </p>
                  <p className="text-gray-400">
                    Platform: <strong className="text-white capitalize">{showEventDetailModal.platform}</strong>
                  </p>
                  <p className="text-gray-400">
                    Status: <strong className="text-purple-300 uppercase">{showEventDetailModal.status}</strong>
                  </p>
                </div>

                {showEventDetailModal.description && (
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">Description</label>
                    <p className="p-3 rounded-xl bg-[#141428] border border-[#222242] text-gray-300 leading-relaxed">
                      {showEventDetailModal.description}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={async () => {
                      await deleteEvent(showEventDetailModal.id);
                      setShowEventDetailModal(null);
                    }}
                    className="flex-1 py-2 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600 hover:text-white font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Event
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI OPTIMIZER ADVICE MODAL ────────────────────────────────────────── */}
      <AnimatePresence>
        {showAIOptimizerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAIOptimizerModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0e0e1c] border border-[#8200DB]/50 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative select-text"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#a855f7]" /> AI Schedule Optimizer Recommendations
                </h3>
                <button onClick={() => setShowAIOptimizerModal(false)} className="p-1.5 rounded-lg bg-[#181832] text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isOptimizing ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <div className="w-8 h-8 border-4 border-[#8200DB] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-400">Gemini is analyzing your channel watch time & returning viewers...</p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#141428] border border-[#222242] text-xs text-gray-300 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                  {aiAdviceText || "Gemini recommends posting on Thursdays at 10:00 AM for maximum reach!"}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NOTIFICATION DRAWER ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showNotificationDrawer && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-[#0e0e1c] border-l border-[#25254d] p-5 shadow-2xl space-y-4 flex flex-col justify-between select-text"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#181832] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#a855f7]" /> Notification Center
                </h3>
                <button onClick={() => setShowNotificationDrawer(false)} className="p-1 rounded bg-[#181832] text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 overflow-y-auto max-h-[75vh]">
                {calendarData?.notifications?.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markNotificationRead(notif.id)}
                    className={`p-3 rounded-xl border text-xs space-y-1 cursor-pointer transition ${
                      notif.isRead ? "bg-[#101020] border-[#1f1f3a] text-gray-400" : "bg-[#161630] border-[#8200DB]/50 text-white font-semibold"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#a855f7]">{notif.title}</span>
                      <span className="text-[10px] text-gray-500">{new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed">{notif.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => markNotificationRead()}
              className="w-full py-2 rounded-xl bg-[#181832] hover:bg-[#8200DB] border border-[#25254d] text-xs font-bold text-gray-300 hover:text-white transition"
            >
              Mark All As Read
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      </main>
    </div>
  );
}
