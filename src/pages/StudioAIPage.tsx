/**
 * StudioAIPage — Full-screen AI Creator Assistant.
 * Premium deep cosmic theme with animated star particles, nebula glows,
 * and the Studio Pulse logo (image.png) with a thinking animation.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Menu, Settings } from "lucide-react";
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
  const { t } = useSettings();

  const {
    conversations,
    activeConversationId,
    messages,
    streamingMessage,
    isLoading,
    isSending,
    sendMessage,
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
    <div className="h-screen flex bg-[#050510] overflow-hidden" id="studio-ai-page">
      {/* ─── Premium Galaxy Background ─── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Galaxy space gradient base - deep dark space */}
        <div className="absolute inset-0 bg-[#020206]" />

        {/* Real Galaxy Image Backdrop - optimized low-visibility for perfect text readability */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.06] pointer-events-none mix-blend-screen"
          style={{ backgroundImage: 'url("/galaxy_bg.png")' }}
        />

        {/* Space atmospheric lighting - soft ambient core & nebulas */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#020206]/50 via-transparent to-[#050510]/90" />
        <div className="absolute top-[10%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-purple-500/[0.06] rounded-full blur-[90px] rotate-[-10deg] pointer-events-none" />

        {/* Drifting Nebula Gas Clouds */}
        <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] bg-indigo-950/[0.12] rounded-full blur-[140px] animate-nebula-drift" style={{ animationDuration: "35s" }} />
        <div className="absolute bottom-[10%] right-[-5%] w-[600px] h-[600px] bg-purple-950/[0.10] rounded-full blur-[130px] animate-nebula-drift" style={{ animationDelay: "6s", animationDuration: "40s" }} />

        {/* Star dust particles grid overlay */}
        <div className="absolute inset-0 bg-dot-pattern opacity-20" />

        {/* Twinkling star field */}
        <StarField />
      </div>

      {/* ─── Unified App Sidebar ─── */}
      <Sidebar activePage="/studio-ai" />

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
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#1a1a2e]/30 bg-[#050510]/60 backdrop-blur-2xl flex-shrink-0" id="studio-ai-header">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle button (collapsible on desktop & mobile) */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 transition-all"
              id="sidebar-toggle"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo + Title */}
            <div className="flex items-center gap-2.5">
              <img
                src="/image.png"
                alt="Studio AI"
                className="w-8 h-8 rounded-lg object-contain animate-logo-think"
              />
              <h1 className="text-white font-semibold text-[16px]">Studio AI</h1>
              <span className="text-[10px] font-semibold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/20">
                Pro
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* AI Status */}
            <div className="hidden sm:flex items-center gap-2 bg-[#0d0d1a]/60 border border-[#1e1e30] rounded-full px-3 py-1.5">
              <div className="relative">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-40" />
              </div>
              <span className="text-[11.5px] text-gray-400">{t("ai.statusOnline")}</span>
            </div>

            {/* Settings */}
            <button className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-all border border-[#1e1e30]/60 bg-[#0d0d1a]/40">
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
        />

        {/* Input Bar */}
        <StudioAIInput
          onSend={sendMessage}
          isSending={isSending}
        />
      </main>
    </div>
  );
}
