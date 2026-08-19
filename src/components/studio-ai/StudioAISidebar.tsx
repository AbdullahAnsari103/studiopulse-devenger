/**
 * StudioAISidebar — Left sidebar with conversation history.
 * Matches the cosmic dark UI with glassmorphism exactly.
 */

import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import {
  Plus, X, Menu, Sparkles, ChevronDown,
  MessageSquare, Trash2, Brain, Crown,
} from "lucide-react";
import type { AIConversation } from "@/types/ai";

interface StudioAISidebarProps {
  conversations: AIConversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function StudioAISidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpen,
  onToggle,
}: StudioAISidebarProps) {
  const { user } = useUser();
  const [memoryExpanded, setMemoryExpanded] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Group conversations by time
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split("T")[0];

  const groups: { label: string; items: AIConversation[] }[] = [];
  const todayItems: AIConversation[] = [];
  const yesterdayItems: AIConversation[] = [];
  const olderItems: AIConversation[] = [];

  for (const conv of conversations) {
    const date = (conv.updated_at || conv.created_at).split("T")[0].split(" ")[0];
    if (date === today) todayItems.push(conv);
    else if (date === yesterday) yesterdayItems.push(conv);
    else olderItems.push(conv);
  }

  if (todayItems.length > 0) groups.push({ label: "Today", items: todayItems });
  if (yesterdayItems.length > 0) groups.push({ label: "Yesterday", items: yesterdayItems });
  if (olderItems.length > 0) groups.push({ label: "Earlier", items: olderItems });

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00Z");
      if (isNaN(d.getTime())) return "";
      const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (diffDays === 0) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full w-[280px] flex-shrink-0">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 transition-all lg:hidden">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1a0a2e] to-[#0d0520] flex items-center justify-center shadow-lg shadow-purple-900/20 border border-purple-500/15 overflow-hidden flex-shrink-0">
            <img src="/image.png" alt="Studio AI" className="w-5.5 h-5.5 object-contain" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-[15px] leading-tight">Studio AI</h2>
            <p className="text-gray-500 text-[11px]">Creator Assistant</p>
          </div>
        </div>
      </div>

      {/* New Conversation Button */}
      <div className="px-3 mb-4">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-between gap-2 bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/20 hover:border-purple-500/40 text-white rounded-xl px-4 py-2.5 text-[13.5px] font-medium transition-all duration-200"
          id="new-conversation-btn"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Conversation
          </span>
          <span className="text-[10.5px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">⌘ K</span>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
        {groups.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <MessageSquare className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-600 text-[12px]">No conversations yet</p>
            <p className="text-gray-700 text-[11px] mt-0.5">Start a new chat above</p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="text-[10.5px] font-medium text-gray-600 uppercase tracking-wider px-3 mb-1.5">
                {group.label}
              </p>
              {group.items.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectConversation(conv.id);
                    }
                  }}
                  onMouseEnter={() => setHoveredId(conv.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  role="button"
                  tabIndex={0}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left cursor-pointer transition-all duration-150 group relative ${
                    activeConversationId === conv.id
                      ? "bg-purple-500/10 border border-purple-500/20 text-white"
                      : "text-gray-400 hover:bg-white/[0.03] hover:text-gray-200 border border-transparent"
                  }`}
                  id={`conv-${conv.id}`}
                >
                  <Sparkles className={`w-3.5 h-3.5 flex-shrink-0 ${
                    activeConversationId === conv.id ? "text-purple-400" : "text-gray-600"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] truncate">{conv.title || "New Conversation"}</p>
                  </div>
                  {hoveredId === conv.id ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                      className="p-1 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-600 flex-shrink-0">
                      {formatTime(conv.updated_at || conv.created_at)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Bottom Section */}
      <div className="px-3 pb-4 space-y-3 border-t border-[#1a1a2e] pt-3">
        {/* Studio AI Memory */}
        <button
          onClick={() => setMemoryExpanded(!memoryExpanded)}
          className="w-full bg-[#12121f]/60 border border-[#1e1e30] rounded-xl px-3.5 py-2.5 text-left transition-all hover:border-purple-500/10"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-white text-[12.5px] font-medium">Studio AI Memory</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${memoryExpanded ? "rotate-180" : ""}`} />
          </div>
          {memoryExpanded && (
            <div className="mt-2 pt-2 border-t border-[#1e1e30]">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-1 flex-1 bg-[#1e1e30] rounded-full overflow-hidden">
                  <div className="h-full w-[35%] bg-gradient-to-r from-purple-600 to-blue-500 rounded-full" />
                </div>
              </div>
              <p className="text-[10.5px] text-gray-500">Memory updated • 2h ago</p>
            </div>
          )}
        </button>

        {/* Pro Plan */}
        <div className="flex items-center gap-2 px-1">
          <Crown className="w-4 h-4 text-purple-400" />
          <div className="flex-1">
            <p className="text-white text-[12px] font-medium">Pro Plan</p>
            <p className="text-[10px] text-gray-600">Renews on July 28, 2026</p>
          </div>
          <button className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-medium hover:bg-emerald-500/30 transition-colors">
            Upgrade Plan
          </button>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 px-1 pt-1">
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt="" className="w-8 h-8 rounded-full border border-gray-800" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-white text-[13px] font-semibold">
              {(user?.firstName?.[0] || "A").toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-medium truncate">
              {user?.firstName || "Creator"}
            </p>
            <p className="text-gray-600 text-[11px]">Creator</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          bg-[#070714] backdrop-blur-2xl
          transition-all duration-300 ease-in-out
          flex flex-col overflow-hidden h-full
          ${isOpen 
            ? "w-[280px] translate-x-0 border-r border-[#1a1a2e]/30 opacity-100" 
            : "w-0 -translate-x-full lg:translate-x-0 lg:w-0 lg:border-none lg:opacity-0 lg:pointer-events-none"
          }
        `}
        id="studio-ai-sidebar"
      >
        {/* Close button (mobile) */}
        <button
          onClick={onToggle}
          className="absolute top-4 right-3 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all lg:hidden"
        >
          <X className="w-4 h-4" />
        </button>

        {sidebarContent}
      </aside>
    </>
  );
}
