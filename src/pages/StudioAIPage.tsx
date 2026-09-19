import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Settings, Globe, History } from "lucide-react";
import StudioAISidebar from "@/components/studio-ai/StudioAISidebar";
import StudioAIChat from "@/components/studio-ai/StudioAIChat";
import StudioAIInput from "@/components/studio-ai/StudioAIInput";
import Sidebar from "@/components/layout/Sidebar";
import { useStudioAI } from "@/hooks/useStudioAI";
import { useSettings } from "@/context/SettingsContext";

/* ── Floating star particles ── */
function StarField() {
  const stars = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1.2 + Math.random() * 2.2,
        duration: 4 + Math.random() * 5,
        delay: Math.random() * 6,
        opacity: 0.2 + Math.random() * 0.4,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full animate-twinkle"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            background:
              s.id % 3 === 0
                ? "rgba(168, 85, 247, 0.8)"
                : s.id % 3 === 1
                ? "rgba(96, 165, 250, 0.7)"
                : "rgba(255, 255, 255, 0.6)",
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
            boxShadow: `0 0 ${s.size * 3}px ${
              s.id % 3 === 0
                ? "rgba(168,85,247,0.4)"
                : s.id % 3 === 1
                ? "rgba(96,165,250,0.35)"
                : "rgba(255,255,255,0.3)"
            }`,
          }}
        />
      ))}
    </div>
  );
}

export default function StudioAIPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mainSidebarOpen, setMainSidebarOpen] = useState(false);
  const [externalPrompt, setExternalPrompt] = useState<string | undefined>();
  const { t } = useSettings();

  const {
    conversations,
    activeConversationId,
    messages,
    streamingMessage,
    isLoading,
    isSending,
    aiMode,
    setAiMode,
    sendMessage,
    editMessage,
    loadConversation,
    startNewConversation,
    deleteConversation,
  } = useStudioAI();

  // ⌘K shortcut for new conversation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        startNewConversation();
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startNewConversation]);

  const handleSelectConversation = useCallback((id: string) => {
    loadConversation(id);
    setSidebarOpen(false);
  }, [loadConversation]);

  const handleNewConversation = useCallback(() => {
    startNewConversation();
    setSidebarOpen(false);
  }, [startNewConversation]);

  return (
    <div className="h-screen flex bg-[#03030a] overflow-hidden select-none" id="studio-ai-page">
      {/* ─── Seamless Cosmic & Moving Earth Transition System ─── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Base dark space */}
        <div className="absolute inset-0 bg-[#030308]" />

        {/* ─── Layer A: Standard Galaxy Theme (Normal Mode) ─── */}
        <motion.div
          animate={{
            opacity: aiMode === "normal" ? 1 : 0,
            scale: aiMode === "normal" ? 1 : 0.92,
            filter: aiMode === "normal" ? "blur(0px)" : "blur(8px)",
          }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 pointer-events-none will-change-transform"
        >
          {/* Galaxy backdrop image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.06] mix-blend-screen"
            style={{ backgroundImage: 'url("/galaxy_bg.png")' }}
          />
          {/* Space atmospheric lighting */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#020206]/50 via-transparent to-[#050510]/90" />
          <div className="absolute top-[10%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-purple-500/[0.06] rounded-full blur-[90px] rotate-[-10deg]" />
          <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] bg-indigo-950/[0.12] rounded-full blur-[140px] animate-nebula-drift" style={{ animationDuration: "35s" }} />
          <div className="absolute bottom-[10%] right-[-5%] w-[600px] h-[600px] bg-purple-950/[0.10] rounded-full blur-[130px] animate-nebula-drift" style={{ animationDelay: "6s", animationDuration: "40s" }} />
          <div className="absolute inset-0 bg-dot-pattern opacity-20" />
          <StarField />
        </motion.div>

        {/* ─── Layer B: 3D Moving Earth Horizon Moving & Locking into Picture (`web.png`) ─── */}
        <AnimatePresence>
          {aiMode === "web" && (
            <motion.div
              key="earth-web-horizon"
              initial={{
                opacity: 0,
                scale: 1.35,
                x: -45,
                y: 80,
                rotateZ: -10,
                rotateY: -22,
                filter: "blur(10px) brightness(1.25)",
              }}
              animate={{
                opacity: 1,
                scale: 1,
                x: 0,
                y: 0,
                rotateZ: 0,
                rotateY: 0,
                filter: "blur(0px) brightness(1)",
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
                x: 35,
                y: 60,
                rotateZ: 8,
                rotateY: 15,
                filter: "blur(8px) brightness(0.8)",
              }}
              transition={{
                duration: 1.3,
                ease: [0.16, 1, 0.3, 1], // cinematic smooth ease-out curve
              }}
              className="absolute inset-0 pointer-events-none will-change-transform"
              style={{ perspective: "1500px", transformStyle: "preserve-3d" }}
            >
              {/* High-Resolution Universe & Earth Background (`public/web.png`) */}
              <motion.div
                animate={{
                  scale: [1, 1.025, 1],
                  rotate: [0, 0.35, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 30,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 bg-cover bg-center bg-no-repeat will-change-transform"
                style={{ backgroundImage: 'url("/web.png")' }}
              />

              {/* Atmospheric Orbit Flare / Ozone Rim Light during lock-in */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0, 0.75, 0.4], scale: [0.85, 1.05, 1] }}
                transition={{ duration: 1.6, ease: "easeOut" }}
                className="absolute bottom-[-10%] left-[50%] -translate-x-1/2 w-[130vw] h-[480px] bg-gradient-to-t from-cyan-400/25 via-blue-600/15 to-transparent rounded-full blur-[110px] pointer-events-none"
              />

              {/* Cinematic Orbital Sweep Flare across the horizon */}
              <motion.div
                initial={{ opacity: 0.8, x: "-100%", skewX: -20 }}
                animate={{ opacity: 0, x: "150%", skewX: -20 }}
                transition={{ duration: 1.1, ease: "easeInOut" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent pointer-events-none"
              />

              {/* Deep Space Atmospheric Contrast Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#04040c]/70 via-[#050512]/35 to-[#020208]/85" />
              
              {/* Subtle Ambient Cosmic Core Glows */}
              <div className="absolute top-[15%] right-[20%] w-[500px] h-[500px] bg-purple-600/[0.08] rounded-full blur-[140px]" />
              <div className="absolute bottom-[0%] left-[50%] -translate-x-1/2 w-[800px] h-[300px] bg-cyan-500/[0.06] rounded-full blur-[120px]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Unified App Sidebar (Collapsible only on AI Page) ─── */}
      <Sidebar
        activePage="/studio-ai"
        collapsible
        isCollapsed={!mainSidebarOpen}
        onToggleCollapse={() => setMainSidebarOpen(false)}
      />

      {/* ─── Chat History Drawer ─── */}
      <StudioAISidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={deleteConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* ─── Main Area ─── */}
      <main className="flex-1 flex flex-col relative z-10 min-w-0">
        {/* Top Bar seamlessly mixing with cosmic background */}
        <header className="flex items-center justify-between px-2.5 sm:px-6 py-2 sm:py-3 border-b border-white/[0.04] bg-gradient-to-b from-black/40 via-black/15 to-transparent backdrop-blur-[3px] flex-shrink-0 relative z-30 transition-all duration-500" id="studio-ai-header">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Main App Navigation Sidebar toggle */}
            <button
              onClick={() => setMainSidebarOpen(!mainSidebarOpen)}
              className={`p-1.5 sm:p-2 rounded-xl transition-all backdrop-blur-sm ${
                mainSidebarOpen
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "hover:bg-white/10 text-gray-400 hover:text-white"
              }`}
              id="main-sidebar-toggle"
              title={mainSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Chat History Drawer toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-1.5 sm:p-2 rounded-xl transition-all backdrop-blur-sm ${
                sidebarOpen
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "hover:bg-white/10 text-gray-400 hover:text-white"
              }`}
              id="chat-history-toggle"
              title={sidebarOpen ? "Close chat history" : "Open chat history"}
            >
              <History className="w-4.5 h-4.5" />
            </button>

            {/* Logo + Title */}
            <div className="flex items-center gap-1.5 sm:gap-2 ml-1">
              <img
                src="/image.png"
                alt="Studio AI"
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-contain animate-logo-think"
              />
              <h1 className="text-white font-semibold text-[13.5px] sm:text-[15.5px] drop-shadow-sm truncate max-w-[70px] sm:max-w-none">Studio AI</h1>
              <span className="hidden md:inline-block text-[10px] font-semibold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/20 backdrop-blur-sm">
                Pro
              </span>
            </div>
          </div>

          {/* ─── Center: Mode Switcher Toggle (Normal vs Web Mode) ─── */}
          <div className="flex items-center p-0.5 sm:p-1 rounded-full bg-black/25 border border-white/10 backdrop-blur-xl shadow-lg">
            <button
              onClick={() => setAiMode("normal")}
              className={`relative flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-all ${
                aiMode === "normal"
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {aiMode === "normal" && (
                <motion.div
                  layoutId="ai-mode-indicator"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600/90 to-indigo-600/90 border border-purple-400/40 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <span>Normal</span>
              </span>
            </button>

            <button
              onClick={() => setAiMode("web")}
              className={`relative flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-all ${
                aiMode === "web"
                  ? "text-white"
                  : "text-gray-400 hover:text-purple-300"
              }`}
            >
              {aiMode === "web" && (
                <motion.div
                  layoutId="ai-mode-indicator"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 border border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1 sm:gap-1.5">
                <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-300 animate-spin-slow" style={{ animationDuration: "12s" }} />
                <span>Web Mode</span>
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* AI Status */}
            <div className="hidden lg:flex items-center gap-2 bg-black/20 border border-white/10 backdrop-blur-md rounded-full px-3 py-1.5 shadow-sm">
              <div className="relative">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-40" />
              </div>
              <span className="text-[11.5px] text-gray-300">{t("ai.statusOnline")}</span>
            </div>

            {/* Settings */}
            <button className="p-1.5 sm:p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-all border border-white/10 bg-black/20 backdrop-blur-md shadow-sm">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <StudioAIChat
          messages={messages}
          streamingMessage={streamingMessage}
          isLoading={isLoading}
          isSending={isSending}
          aiMode={aiMode}
          onSelectPrompt={(prompt) => setExternalPrompt(prompt)}
          onEditMessage={(id, newContent) => editMessage(id, newContent, aiMode)}
        />

        {/* Floating Input Dock */}
        <StudioAIInput
          onSend={(msg) => sendMessage(msg, aiMode)}
          isSending={isSending}
          aiMode={aiMode}
          externalPrompt={externalPrompt}
          onClearExternalPrompt={() => setExternalPrompt(undefined)}
        />
      </main>
    </div>
  );
}

