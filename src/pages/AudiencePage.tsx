/**
 * Audience Intelligence — Enhanced
 * Video leaderboard, reply templates, emotion radar, comment status counters,
 * skeleton loading, animated counters, enriched auto-reply cards.
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import {
  UsersRound, MessageSquare, ThumbsUp, Sparkles, RefreshCw, Search,
  Lightbulb, Smile, Frown, MessageCircle, Zap, ChevronDown,
  Flame, Copy, Check, Menu, Globe, Film, Heart, UserCheck,
  ShieldAlert, Hash, Bot, Settings2, Upload, CheckCircle,
  AlertTriangle, Reply, ExternalLink, Play, CornerDownRight, X,
  Eye, TrendingUp, ArrowUpRight, Trash2, Pencil, Send, BarChart3,
  Clock, MessageSquareDashed, Filter, ChevronRight, Bookmark,
  Wand2, Volume2,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { useAudienceAnalysis, type YouTubeComment } from "@/hooks/useAudienceAnalysis";
import { celebrate } from "@/lib/celebrate";
import { showActionToast } from "@/lib/actionToast";
import toast from "react-hot-toast";

const THUMB_FB = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='90' fill='%23111128'%3E%3Crect width='120' height='90' rx='4'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='%23282852'%3E▶%3C/text%3E%3C/svg%3E";
const AVT_FB = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' fill='%23161636'%3E%3Ccircle cx='20' cy='20' r='20'/%3E%3Ctext x='50%25' y='56%25' dominant-baseline='middle' text-anchor='middle' font-size='13' fill='%23444470'%3E?%3C/text%3E%3C/svg%3E";
const onImgErr = (e: React.SyntheticEvent<HTMLImageElement>, fb: string) => {
  const target = e.currentTarget;
  target.onerror = null;
  if (target.src !== fb) {
    target.src = fb;
  }
};

/* ── Anim ── */
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };

/* ── Animated Number ── */
function AnimNum({ value, className }: { value: number; className?: string }) {
  const spring = useSpring(0, { stiffness: 50, damping: 20 });
  const [display, setDisplay] = useState("0");
  useEffect(() => { spring.set(value); }, [value, spring]);
  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(Math.round(v).toLocaleString()));
    return unsub;
  }, [spring]);
  return <span className={className}>{display}</span>;
}

/* ── Skeleton Pulse ── */
const Skel = ({ w, h = "h-4" }: { w: string; h?: string }) => (
  <div className={`${w} ${h} rounded-lg bg-white/[0.03] animate-pulse`} />
);

/* ── Reply Templates ── */
const REPLY_TEMPLATES = [
  { label: "Thank", text: "Thank you so much for watching! Really appreciate the support 🙌" },
  { label: "Answer", text: "Great question! " },
  { label: "Encourage", text: "Glad you found this helpful! Don't forget to try it out yourself 💪" },
  { label: "Acknowledge", text: "I hear you — appreciate the honest feedback. I'll keep this in mind for future videos." },
  { label: "Redirect", text: "Check the description for links and resources mentioned in the video!" },
];

export default function AudiencePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [sentiment, setSentiment] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "likes" | "replies">("newest");
  const [searchQ, setSearchQ] = useState("");
  const [view, setView] = useState<"pulse" | "feed" | "engine">("pulse");
  const [commentFilter, setCommentFilter] = useState<"all" | "replied" | "unreplied">("all");

  // Reply
  const [replyTarget, setReplyTarget] = useState<YouTubeComment | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [copiedReply, setCopiedReply] = useState(false);
  const [copiedIdea, setCopiedIdea] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Settings
  const [ctx, setCtx] = useState("");
  const [autoOn, setAutoOn] = useState(false);
  const [fPos, setFPos] = useState(true);
  const [fNeg, setFNeg] = useState(true);
  const [fQ, setFQ] = useState(true);
  const [fNeu, setFNeu] = useState(false);
  const [maxR, setMaxR] = useState(10);
  const [sInit, setSInit] = useState(false);
  const [arResults, setArResults] = useState<{
    replyText: string; postedToYouTube: boolean;
    videoId?: string; videoTitle?: string; originalComment?: string; originalAuthor?: string; sentiment?: string;
  }[]>([]);

  // Smart Tone Matching / Voice Clone state
  const [testVoiceModalOpen, setTestVoiceModalOpen] = useState(false);
  const [testCommentInput, setTestCommentInput] = useState("Loved the video! What camera and lens setup do you recommend for beginners?");
  const [testAuthorInput, setTestAuthorInput] = useState("Alex");
  const [testResult, setTestResult] = useState<{ genericReply: string; personalizedReply: string; profile: any } | null>(null);
  const [showVoiceSamples, setShowVoiceSamples] = useState(false);

  // Dropdown
  const [dd, setDd] = useState(false);
  const [ddQ, setDdQ] = useState("");
  const ddRef = useRef<HTMLDivElement>(null);

  // Header glow
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const glowX = useTransform(mouseX, v => `${v}px`);
  const glowY = useTransform(mouseY, v => `${v}px`);

  const {
    videos, comments, stats, analysis, replySettings,
    toneProfile, manualRepliesCount, toneMessage,
    isLoading, isSyncing, isSavingSettings, isAutoReplying,
    isRefreshingTone, isUpdatingTone, isTestingTone,
    syncComments, generateReply, postReply, saveReplySettings, runAutoReply,
    deleteReply, editReply, refreshToneProfile, updateToneProfile, testToneReply,
  } = useAudienceAnalysis({ videoId: selectedVideoId || undefined, sentimentFilter: sentiment, sortBy });

  useEffect(() => {
    if (replySettings && !sInit) {
      setCtx(replySettings.creatorContext || ""); setAutoOn(replySettings.autoReplyEnabled);
      setFPos(replySettings.replyToPositive); setFNeg(replySettings.replyToNegative);
      setFQ(replySettings.replyToQuestions); setFNeu(replySettings.replyToNeutral);
      setMaxR(replySettings.maxRepliesPerRun); setSInit(true);
    }
  }, [replySettings, sInit]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDd(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtVids = useMemo(() => ddQ ? videos.filter(v => v.title.toLowerCase().includes(ddQ.toLowerCase())) : videos, [videos, ddQ]);

  const filteredComments = useMemo(() => {
    let list = comments;
    if (searchQ.trim()) { const q = searchQ.toLowerCase(); list = list.filter(c => c.textOriginal.toLowerCase().includes(q) || c.authorName.toLowerCase().includes(q)); }
    if (commentFilter === "replied") list = list.filter(c => c.ownerReplied);
    if (commentFilter === "unreplied") list = list.filter(c => !c.ownerReplied);
    return list;
  }, [comments, searchQ, commentFilter]);

  const selVid = useMemo(() => selectedVideoId ? videos.find(v => v.videoId === selectedVideoId) || null : null, [videos, selectedVideoId]);
  const vidFor = useCallback((vid: string) => videos.find(v => v.videoId === vid), [videos]);

  // Top videos by comment count (for leaderboard)
  const topVideos = useMemo(() => [...videos].sort((a, b) => b.dbComments - a.dbComments).slice(0, 6), [videos]);

  // Reply stats — prefer server-computed counts (from full DB) over paginated comments list
  const replyStats = useMemo(() => {
    const total = stats?.total || 0;
    // Use server-side replied/unreplied counts if available (includes all comments, not just the current page)
    if (stats && typeof stats.replied === "number") {
      const replied = stats.replied;
      return { replied, unreplied: stats.unreplied, total, pct: total > 0 ? Math.round((replied / total) * 100) : 0 };
    }
    // Fallback: compute from loaded comments (may undercount if paginated)
    const replied = comments.filter(c => c.ownerReplied).length;
    return { replied, unreplied: total - replied, total, pct: total > 0 ? Math.round((replied / total) * 100) : 0 };
  }, [stats, comments]);

  const sp = useMemo(() => {
    if (!stats || stats.total === 0) return { p: 0, n: 0, u: 0 };
    const p = Math.round((stats.positive / stats.total) * 100);
    const n = Math.round((stats.negative / stats.total) * 100);
    return { p, n, u: Math.max(0, 100 - p - n) };
  }, [stats]);
  const emo = analysis?.emotionBreakdown || { joy: 0, gratitude: 0, curiosity: 0, confusion: 0, frustration: 0 };

  /* ── Handlers ── */
  const sync = async () => { try { toast.loading("Pulling comments...", { id: "s" }); await syncComments(selectedVideoId || undefined); toast.success("Synced!", { id: "s" }); } catch { toast.error("Sync failed", { id: "s" }); } };

  const openReply = async (c: YouTubeComment) => {
    setReplyTarget(c); setReplyDraft(""); setGenLoading(true); setShowTemplates(false);
    try { const r = await generateReply({ commentDbId: c.id, parentCommentId: c.commentId, commentText: c.textOriginal, authorName: c.authorName }); setReplyDraft(r.reply || "Thanks for watching! 🙌"); }
    catch { setReplyDraft("Thanks for your comment! 🙌"); } finally { setGenLoading(false); }
  };

  const postYT = async () => {
    if (!replyTarget || !replyDraft.trim()) return; setPostLoading(true);
    try {
      const r = await postReply({ commentDbId: replyTarget.id, parentCommentId: replyTarget.commentId, commentText: replyTarget.textOriginal, authorName: replyTarget.authorName, customReplyText: replyDraft });
      if (r.postedToYouTube) {
        celebrate.sparkles();
        showActionToast({
          title: "Reply posted to YouTube! 🎉",
          message: `Your voice-matched reply to ${replyTarget.authorName} is live.`,
          icon: "💬",
          actionLabel: "Reply to Next",
          onAction: () => {
            const unreplied = comments.find(c => !c.ownerReplied && c.id !== replyTarget.id);
            if (unreplied) openReply(unreplied);
          },
        });
        setReplyTarget(null);
      }
      else toast.error("Could not post.");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setPostLoading(false); }
  };

  const handleDelete = async (c: YouTubeComment) => {
    setDeletingId(c.id);
    try { await deleteReply({ youtubeCommentId: c.ownerReplyYoutubeId || c.commentId, commentDbId: c.id }); toast.success("Reply deleted"); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
    finally { setDeletingId(null); }
  };
  const startEdit = (c: YouTubeComment) => { setEditingId(c.id); setEditText(c.ownerReplyText || ""); };
  const cancelEdit = () => { setEditingId(null); setEditText(""); };
  const submitEdit = async (c: YouTubeComment) => {
    if (!editText.trim()) return;
    try { await editReply({ youtubeCommentId: c.ownerReplyYoutubeId || c.commentId, commentDbId: c.id, newText: editText.trim() }); toast.success("Updated!"); setEditingId(null); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Edit failed"); }
  };
  const saveSett = async () => { try { await saveReplySettings({ creatorContext: ctx, autoReplyEnabled: autoOn, replyToPositive: fPos, replyToNegative: fNeg, replyToQuestions: fQ, replyToNeutral: fNeu, maxRepliesPerRun: maxR }); toast.success("Saved!"); } catch { toast.error("Save failed"); } };
  const doAR = async (post: boolean) => { try { toast.loading("Running auto-reply...", { id: "ar" }); const r = await runAutoReply({ videoId: selectedVideoId || undefined, postToYouTube: post }); setArResults(r.replies || []); toast.success(`${r.repliesGenerated} generated, ${r.repliesPosted} posted`, { id: "ar", duration: 5000 }); } catch { toast.error("Failed", { id: "ar" }); } };

  /* ── Tone Matching Handlers ── */
  const handleRefreshTone = async () => {
    try {
      toast.loading("Analyzing your past manual replies...", { id: "tone" });
      const res = await refreshToneProfile();
      if (res.profile) {
        toast.success("Voice profile updated from recent replies!", { id: "tone" });
      } else {
        toast(res.message || "Need at least 3 manual replies to calibrate.", { id: "tone", icon: "ℹ️" });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to analyze tone", { id: "tone" });
    }
  };

  const cycleFormality = async () => {
    if (!toneProfile) return;
    const next = toneProfile.formality === "casual" ? "balanced" : toneProfile.formality === "balanced" ? "formal" : "casual";
    try {
      await updateToneProfile({ formality: next });
      toast.success(`Formality set to: ${next}`);
    } catch {
      toast.error("Failed to update formality");
    }
  };

  const cycleEmoji = async () => {
    if (!toneProfile) return;
    const next = toneProfile.emojiUsage === "none" ? "sparse" : toneProfile.emojiUsage === "sparse" ? "moderate" : toneProfile.emojiUsage === "moderate" ? "heavy" : "none";
    try {
      await updateToneProfile({ emojiUsage: next });
      toast.success(`Emoji usage set to: ${next}`);
    } catch {
      toast.error("Failed to update emoji style");
    }
  };

  const cycleLength = async () => {
    if (!toneProfile) return;
    const next = toneProfile.avgReplyLength === "short" ? "medium" : toneProfile.avgReplyLength === "medium" ? "long" : "short";
    try {
      await updateToneProfile({ avgReplyLength: next });
      toast.success(`Reply length set to: ${next}`);
    } catch {
      toast.error("Failed to update reply length");
    }
  };

  const toggleFollowups = async () => {
    if (!toneProfile) return;
    try {
      await updateToneProfile({ asksFollowups: !toneProfile.asksFollowups });
      toast.success(toneProfile.asksFollowups ? "Follow-up questions turned off" : "Follow-up questions enabled");
    } catch {
      toast.error("Failed to update questions");
    }
  };

  const toggleHumor = async () => {
    if (!toneProfile) return;
    try {
      await updateToneProfile({ usesHumor: !toneProfile.usesHumor });
      toast.success(toneProfile.usesHumor ? "Humor set to straightforward" : "Witty & playful humor enabled");
    } catch {
      toast.error("Failed to update humor setting");
    }
  };

  const handleInitializeStarterTone = async () => {
    try {
      toast.loading("Setting up your voice profile...", { id: "init-tone" });
      await updateToneProfile({
        toneSummary: "Engaging, casual and authentic creator tone. Uses light slang, enthusiastic emojis, and connects genuinely with viewers.",
        formality: "casual",
        emojiUsage: "moderate",
        avgReplyLength: "short",
        asksFollowups: true,
        usesHumor: true,
        languageStyle: "English",
      });
      toast.success("Voice profile ready! You can test or customize it anytime.", { id: "init-tone" });
    } catch {
      toast.error("Failed to initialize voice profile", { id: "init-tone" });
    }
  };

  const runVoiceTest = async (comment?: string, author?: string) => {
    const textToTest = comment || testCommentInput;
    const authorToTest = author || testAuthorInput;
    if (!textToTest.trim()) return;
    try {
      toast.loading("Generating side-by-side comparison...", { id: "test-voice" });
      const res = await testToneReply({ commentText: textToTest.trim(), authorName: authorToTest.trim() || "Viewer" });
      setTestResult(res);
      toast.success("Comparison ready!", { id: "test-voice" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Test failed", { id: "test-voice" });
    }
  };

  /* ── Atoms ── */
  const Dot = ({ color }: { color: string }) => <span className={`inline-block w-[6px] h-[6px] rounded-full ${color}`} />;
  const sentColor = (s: string) => s === "positive" ? "bg-emerald-400" : s === "negative" ? "bg-rose-400" : "bg-gray-600";
  const sentTextColor = (s: string) => s === "positive" ? "text-emerald-400" : s === "negative" ? "text-rose-400" : "text-gray-500";

  const Tog = ({ on, set, label }: { on: boolean; set: (b: boolean) => void; label: string }) => (
    <button onClick={() => set(!on)} className="flex items-center justify-between w-full py-2.5 group">
      <span className="text-[13px] text-gray-400 group-hover:text-gray-200 transition">{label}</span>
      <div className={`w-9 h-[22px] rounded-full transition relative ${on ? "bg-purple-600" : "bg-[#222244]"}`}>
        <motion.div layout className="absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm" style={{ x: on ? 16 : 0 }} />
      </div>
    </button>
  );

  /* ── Emotion Bar ── */
  const EmoBar = ({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) => (
    <div className="flex items-center gap-3 py-1">
      <span className="text-[11px] text-gray-500 w-20 shrink-0 text-right">{label}</span>
      <div className="flex-1 h-[6px] rounded-full bg-[#0e0e24] overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8, delay, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`} />
      </div>
      <span className="text-[11px] font-bold text-gray-400 w-8 tabular-nums">{value}%</span>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex h-screen bg-[#07071a] text-white overflow-hidden" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <Sidebar activePage="audience" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] bg-[#07071a]/90 backdrop-blur-md sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg bg-white/[0.04]"><Menu size={18} /></button>
          <p className="text-sm font-semibold tracking-tight flex-1">Audience</p>
          <button onClick={sync} disabled={isSyncing} className="p-1.5 rounded-lg bg-white/[0.04]"><RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} /></button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10 space-y-8">

            {/* ━━━ MASTHEAD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10 border border-white/[0.04]"
              onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); mouseX.set(e.clientX - r.left); mouseY.set(e.clientY - r.top); }}>
              <motion.div className="absolute w-[300px] h-[300px] rounded-full pointer-events-none" style={{ left: glowX, top: glowY, x: "-50%", y: "-50%", background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)" }} />
              <div className="absolute -right-16 -top-16 w-48 h-48 bg-purple-600/[0.06] rounded-full blur-[60px] animate-pulse" style={{ animationDuration: "4s" }} />
              <div className="absolute -left-10 bottom-0 w-32 h-32 bg-indigo-600/[0.04] rounded-full blur-[50px] animate-pulse" style={{ animationDuration: "6s", animationDelay: "2s" }} />

              <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                <div>
                  <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                    className="text-[10px] font-mono text-purple-500/60 uppercase tracking-[0.25em] mb-3">studio pulse / audience</motion.p>
                  <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black tracking-[-0.03em] leading-[1.05]">
                    Your <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">Audience</span>
                  </motion.h1>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                    className="text-[13px] text-gray-500 mt-2.5 max-w-lg leading-relaxed">
                    Analyze, reply, edit, delete, and auto-respond to YouTube comments — all from one place.
                  </motion.p>
                </div>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
                  className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/[0.06] border border-emerald-500/[0.12]">
                    <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 animate-pulse" /><span className="text-[10px] text-emerald-400/80 font-medium">Live</span>
                  </div>
                  <button onClick={sync} disabled={isSyncing}
                    className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-[12px] text-gray-400 hover:text-white font-medium transition-all border border-white/[0.06] hover:border-white/[0.12] active:scale-95">
                    <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} /> {isSyncing ? "Syncing" : "Sync"}
                  </button>
                </motion.div>
              </div>
            </motion.header>

            {/* ━━━ VIDEO PICKER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" className="relative z-30" ref={ddRef}>
              <button onClick={() => setDd(!dd)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] hover:border-white/[0.1] transition-all w-full sm:w-auto group active:scale-[0.99]">
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/[0.03] shrink-0">
                  {selVid?.thumbnail ? <img src={selVid.thumbnail} alt="" className="w-full h-full object-cover" onError={e => onImgErr(e, THUMB_FB)} /> : <div className="w-full h-full flex items-center justify-center"><Globe size={15} className="text-purple-400/50" /></div>}
                </div>
                <div className="text-left min-w-0 flex-1"><p className="text-[13px] font-semibold truncate">{selVid?.title || "All Videos"}</p><p className="text-[10px] text-gray-600">{selVid ? `${selVid.dbComments} comments` : `${videos.length} videos`}</p></div>
                <ChevronDown size={14} className={`text-gray-600 transition-transform ${dd ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {dd && (
                  <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }} transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-2 w-full sm:w-[420px] bg-[#0c0c24] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 p-2 z-50 max-h-72 flex flex-col overflow-hidden">
                    <div className="relative mb-1.5"><Search size={12} className="absolute left-3 top-2.5 text-gray-600" />
                      <input value={ddQ} onChange={e => setDdQ(e.target.value)} placeholder="Search..."
                        className="w-full bg-white/[0.03] border border-white/[0.04] rounded-xl pl-8 pr-3 py-2 text-[11px] text-white placeholder-gray-700 outline-none focus:border-white/[0.1]" /></div>
                    <div className="overflow-y-auto space-y-px flex-1">
                      <button onClick={() => { setSelectedVideoId(""); setDd(false); }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-[12px] transition flex items-center gap-3 ${!selectedVideoId ? "bg-white/[0.05] text-white" : "text-gray-500 hover:bg-white/[0.02]"}`}>
                        <Globe size={14} className="text-purple-400/50 shrink-0" /> <span className="flex-1">All Videos</span> <span className="text-[9px] text-gray-700 font-mono">{videos.length}</span>
                      </button>
                      {filtVids.map(v => (
                        <button key={v.videoId} onClick={() => { setSelectedVideoId(v.videoId); setDd(false); }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-[12px] transition flex items-center gap-3 ${selectedVideoId === v.videoId ? "bg-white/[0.05] text-white" : "text-gray-500 hover:bg-white/[0.02]"}`}>
                          {v.thumbnail ? <img src={v.thumbnail} alt="" className="w-9 h-6 rounded object-cover shrink-0 opacity-70" onError={e => onImgErr(e, THUMB_FB)} /> : <Film size={14} className="text-purple-400/50 shrink-0" />}
                          <span className="truncate flex-1">{v.title}</span>
                          <span className="text-[9px] text-purple-400/40 font-mono shrink-0">{v.dbComments}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ━━━ NUMBERS — animated ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-3 sm:grid-cols-6 gap-px rounded-2xl overflow-hidden bg-white/[0.03]">
              {[
                { n: stats?.total || 0, l: "comments", c: "text-white", fmt: false },
                { n: sp.p, l: "positive", c: "text-emerald-400", fmt: true },
                { n: sp.n, l: "critical", c: "text-rose-400", fmt: true },
                { n: stats?.totalLikes || 0, l: "likes", c: "text-white/60", fmt: false },
                { n: replyStats.replied, l: "replied", c: "text-purple-400", fmt: false },
                { n: replyStats.unreplied, l: "unanswered", c: "text-amber-400", fmt: false },
              ].map((d, i) => (
                <motion.div key={i} variants={fadeUp} className="bg-[#09091c] p-3.5 sm:p-4 text-center hover:bg-white/[0.01] transition-colors">
                  <p className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight ${d.c}`}>
                    <AnimNum value={d.n} />{d.fmt ? "%" : ""}
                  </p>
                  <p className="text-[8px] sm:text-[9px] text-gray-600 uppercase tracking-[0.12em] mt-1 font-medium">{d.l}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* ━━━ REPLY PROGRESS BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {replyStats.total > 0 && (
              <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-600 font-mono uppercase tracking-wider">Reply coverage</span>
                  <span className="text-gray-500"><span className="text-purple-400 font-bold">{replyStats.pct}%</span> of comments answered</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#0e0e24] overflow-hidden flex">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${replyStats.pct}%` }} transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-purple-600 to-violet-400 rounded-full" />
                </div>
              </motion.div>
            )}

            {/* ━━━ MOOD + EMOTION RADAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-4">
              <div className="flex items-baseline justify-between">
                <p className="text-[11px] font-mono text-gray-600 uppercase tracking-[0.15em]">Audience mood</p>
                <p className="text-[12px] text-gray-500 italic truncate max-w-xs">"{analysis?.overallMood || "Sync to analyze"}"</p>
              </div>
              {/* Thermometer */}
              <div className="h-2.5 rounded-full overflow-hidden flex bg-[#0e0e24]">
                <motion.div initial={{ width: 0 }} animate={{ width: `${sp.p}%` }} transition={{ duration: 1, ease: "easeOut", delay: 0.3 }} className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400" />
                <motion.div initial={{ width: 0 }} animate={{ width: `${sp.u}%` }} transition={{ duration: 1, ease: "easeOut", delay: 0.5 }} className="h-full bg-[#2a2a4a]" />
                <motion.div initial={{ width: 0 }} animate={{ width: `${sp.n}%` }} transition={{ duration: 1, ease: "easeOut", delay: 0.7 }} className="h-full bg-gradient-to-r from-rose-600 to-rose-400" />
              </div>
              {/* Emotion Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                <EmoBar label="Joy" value={emo.joy} color="bg-emerald-500" delay={0.3} />
                <EmoBar label="Gratitude" value={emo.gratitude} color="bg-violet-500" delay={0.4} />
                <EmoBar label="Curiosity" value={emo.curiosity} color="bg-amber-500" delay={0.5} />
                <EmoBar label="Confusion" value={emo.confusion} color="bg-sky-500" delay={0.6} />
                <EmoBar label="Frustration" value={emo.frustration} color="bg-rose-500" delay={0.7} />
              </div>
            </motion.div>

            {/* ━━━ VIDEO LEADERBOARD (when All Videos selected) ━━━━━━━━━━━ */}
            {!selectedVideoId && topVideos.length > 1 && (
              <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-3">
                <p className="text-[11px] font-mono text-gray-600 uppercase tracking-[0.15em]">Top videos by engagement</p>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
                  {topVideos.map((v, i) => (
                    <motion.button key={v.videoId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                      onClick={() => setSelectedVideoId(v.videoId)}
                      className="shrink-0 w-48 sm:w-56 rounded-xl border border-white/[0.04] hover:border-white/[0.1] bg-white/[0.01] hover:bg-white/[0.02] p-3 transition-all group snap-start active:scale-[0.98]">
                      <div className="w-full h-24 rounded-lg overflow-hidden bg-white/[0.02] mb-2.5 relative">
                        {v.thumbnail ? <img src={v.thumbnail} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition" onError={e => onImgErr(e, THUMB_FB)} /> : <div className="w-full h-full flex items-center justify-center"><Play size={20} className="text-gray-700" /></div>}
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white">#{i + 1}</div>
                      </div>
                      <p className="text-[11px] font-semibold text-gray-300 truncate group-hover:text-white transition">{v.title}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-600">
                        <span className="flex items-center gap-1"><MessageSquare size={9} /> {v.dbComments}</span>
                        <span className="flex items-center gap-1"><Eye size={9} /> {v.views.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><ThumbsUp size={9} /> {v.likes.toLocaleString()}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ━━━ NAV ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="flex gap-1 border-b border-white/[0.04]">
              {(["pulse", "feed", "engine"] as const).map(t => (
                <button key={t} onClick={() => setView(t)}
                  className={`relative px-4 py-3 text-[13px] font-medium transition-all ${view === t ? "text-white" : "text-gray-600 hover:text-gray-400"}`}>
                  {t === "pulse" ? "Pulse" : t === "feed" ? "Comments & Reply" : "Auto-Reply"}
                  {view === t && <motion.div layoutId="nav-line" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" />}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
            {/* ═══════════ PULSE ═══════════ */}
            {view === "pulse" && (
              <motion.div key="pulse" variants={stagger} initial="hidden" animate="visible" exit={{ opacity: 0, y: -10 }} className="space-y-10">
                {isLoading ? (
                  <div className="space-y-6">{[1,2,3].map(i => <div key={i} className="space-y-2"><Skel w="w-32" /><Skel w="w-full" h="h-12" /><Skel w="w-3/4" h="h-8" /></div>)}</div>
                ) : (
                  <>
                    {analysis?.summary && <motion.p variants={fadeUp} className="text-[15px] sm:text-[17px] text-gray-300 leading-[1.8] font-light max-w-2xl">{analysis.summary}</motion.p>}

                    {/* Ideas + Demands */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                      <motion.div variants={fadeUp} className="lg:col-span-3 space-y-1">
                        <p className="text-[11px] font-mono text-gray-600 uppercase tracking-[0.15em] mb-4">Content ideas</p>
                        {analysis?.contentSuggestions?.length ? analysis.contentSuggestions.map((idea, i) => (
                          <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                            className="group flex gap-4 py-3.5 border-b border-white/[0.03] last:border-0 hover:border-white/[0.06] transition cursor-default">
                            <span className="text-[28px] font-black text-white/[0.04] leading-none select-none shrink-0 w-9 text-right">{String(i + 1).padStart(2, "0")}</span>
                            <p className="text-[14px] text-gray-400 leading-[1.7] group-hover:text-gray-200 transition flex-1">{idea}</p>
                            <button onClick={() => { navigator.clipboard.writeText(`Create a YouTube video: ${idea}`); setCopiedIdea(i); toast.success("Copied!"); setTimeout(() => setCopiedIdea(null), 2000); }}
                              className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-white/[0.04] text-gray-600 hover:text-white transition self-start shrink-0">
                              {copiedIdea === i ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </motion.div>
                        )) : <p className="text-[12px] text-gray-700 py-6">Sync to generate.</p>}
                      </motion.div>
                      <motion.div variants={fadeUp} className="lg:col-span-2 space-y-1">
                        <p className="text-[11px] font-mono text-gray-600 uppercase tracking-[0.15em] mb-4">Viewer demands</p>
                        {analysis?.audienceDemands?.length ? analysis.audienceDemands.map((d, i) => (
                          <div key={i} className="flex gap-3 items-start py-2.5 border-b border-white/[0.03] last:border-0">
                            <span className={`w-[3px] mt-1 rounded-full shrink-0 self-stretch ${d.urgency === "high" ? "bg-rose-500" : d.urgency === "medium" ? "bg-amber-500" : "bg-blue-500"}`} />
                            <div><p className="text-[13px] text-gray-300">{d.demand}</p><p className="text-[10px] text-gray-600 mt-0.5">{d.frequency} viewers · <span className={d.urgency === "high" ? "text-rose-400" : d.urgency === "medium" ? "text-amber-400" : "text-blue-400"}>{d.urgency}</span></p></div>
                          </div>
                        )) : <p className="text-[12px] text-gray-700 py-6">No demands.</p>}
                      </motion.div>
                    </div>

                    {/* Key phrases */}
                    {analysis?.keyPhrases?.length ? (
                      <motion.div variants={fadeUp} className="space-y-3">
                        <p className="text-[11px] font-mono text-gray-600 uppercase tracking-[0.15em]">Recurring phrases</p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.keyPhrases.map((kp, i) => (
                            <motion.span key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.025 }}
                              className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all hover:scale-105 cursor-default ${
                                kp.type === "positive" ? "border-emerald-500/15 text-emerald-400/80 hover:bg-emerald-500/[0.04]" :
                                kp.type === "negative" ? "border-rose-500/15 text-rose-400/80 hover:bg-rose-500/[0.04]" :
                                "border-purple-500/15 text-purple-400/80 hover:bg-purple-500/[0.04]"
                              }`}>{kp.phrase} <span className="opacity-30 ml-1">×{kp.count}</span></motion.span>
                          ))}
                        </div>
                      </motion.div>
                    ) : null}

                    {/* Archetypes */}
                    {analysis?.audiencePersonas?.length ? (
                      <motion.div variants={fadeUp} className="space-y-4">
                        <p className="text-[11px] font-mono text-gray-600 uppercase tracking-[0.15em]">Viewer archetypes</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden bg-white/[0.03]">
                          {analysis.audiencePersonas.map((p, i) => {
                            const colors = ["text-pink-400", "text-amber-400", "text-rose-400", "text-sky-400"];
                            const bgs = ["bg-pink-500/[0.03]", "bg-amber-500/[0.03]", "bg-rose-500/[0.03]", "bg-sky-500/[0.03]"];
                            return (
                              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
                                className={`bg-[#09091c] p-4 sm:p-5 space-y-3 hover:${bgs[i % 4]} transition-colors group cursor-default`}>
                                <p className={`text-3xl font-black ${colors[i % 4]} group-hover:scale-110 transition-transform origin-left`}>{p.pct}%</p>
                                <div><p className="text-[12px] font-bold text-white">{p.title}</p><p className="text-[10px] text-gray-600 leading-relaxed mt-1">{p.description}</p></div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    ) : null}

                    {/* Top comments */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      {([{ t: "Loved", items: analysis?.topPositiveComments || [], dot: "bg-emerald-400" }, { t: "Critical", items: analysis?.topNegativeComments || [], dot: "bg-rose-400" }] as const).map(sec => (
                        <motion.div key={sec.t} variants={fadeUp} className="space-y-4">
                          <p className="text-[11px] font-mono text-gray-600 uppercase tracking-[0.15em]">{sec.t} comments</p>
                          {!sec.items.length ? <p className="text-[11px] text-gray-700">No data.</p> : sec.items.map((c, i) => (
                            <div key={i} className="flex gap-3 py-2.5 border-b border-white/[0.02] last:border-0">
                              <span className={`w-[3px] rounded-full shrink-0 self-stretch ${sec.dot} opacity-40`} />
                              <div><p className="text-[13px] text-gray-400 leading-[1.7]">"{c.text}"</p><p className="text-[10px] text-gray-600 mt-1.5">— {c.author} · {c.likes} likes</p></div>
                            </div>
                          ))}
                        </motion.div>
                      ))}
                    </div>

                    {stats?.total === 0 && !isLoading && (
                      <motion.div variants={fadeUp} className="text-center py-16 space-y-3">
                        <MessageSquareDashed size={32} className="mx-auto text-gray-700" />
                        <p className="text-[15px] text-gray-500">No comments synced yet.</p>
                        <button onClick={sync} disabled={isSyncing} className="px-5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-[13px] font-medium text-white transition active:scale-95">{isSyncing ? "Syncing..." : "Pull from YouTube"}</button>
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* ═══════════ COMMENTS & REPLY ═══════════ */}
            {view === "feed" && (
              <motion.div key="feed" variants={stagger} initial="hidden" animate="visible" exit={{ opacity: 0 }} className="space-y-5">
                {/* Filters */}
                <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3.5 top-[11px] text-gray-600" />
                    <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search comments or authors..."
                      className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl pl-10 pr-3 py-2.5 text-[13px] text-white placeholder-gray-700 outline-none focus:border-white/[0.12] transition" />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {(["all", "positive", "negative", "neutral"] as const).map(s => (
                      <button key={s} onClick={() => setSentiment(s)}
                        className={`px-3 py-2 rounded-lg text-[11px] font-medium capitalize transition ${sentiment === s ? "bg-white/[0.08] text-white" : "text-gray-600 hover:text-gray-400"}`}>{s === "all" ? "All" : s}</button>
                    ))}
                    <div className="w-px bg-white/[0.06] mx-1" />
                    {(["all", "replied", "unreplied"] as const).map(f => (
                      <button key={f} onClick={() => setCommentFilter(f)}
                        className={`px-2.5 py-2 rounded-lg text-[10px] font-medium capitalize transition ${commentFilter === f ? "bg-purple-500/15 text-purple-300 border border-purple-500/20" : "text-gray-600 hover:text-gray-400 border border-transparent"}`}>{f === "all" ? "Status: All" : f}</button>
                    ))}
                  </div>
                </motion.div>

                {/* Comment count */}
                <div className="flex items-center justify-between text-[10px] text-gray-600">
                  <span>{filteredComments.length} comment{filteredComments.length !== 1 ? "s" : ""}</span>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="bg-transparent text-[10px] text-gray-500 outline-none cursor-pointer">
                    <option value="newest">Newest first</option><option value="likes">Most liked</option><option value="replies">Most replied</option>
                  </select>
                </div>

                {/* Comment feed */}
                <motion.div variants={fadeUp} className="divide-y divide-white/[0.03] max-h-[700px] overflow-y-auto">
                  {!filteredComments.length ? (
                    <div className="text-center py-20 space-y-2">
                      <MessageSquareDashed size={28} className="mx-auto text-gray-700" />
                      <p className="text-[13px] text-gray-600">No comments match your filters.</p>
                    </div>
                  ) : (
                    filteredComments.map((c, ci) => {
                      const vid = vidFor(c.videoId);
                      const isEditing = editingId === c.id;
                      const isDeleting = deletingId === c.id;
                      return (
                        <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(ci * 0.015, 0.3) }}
                          className="py-4 sm:py-5 group hover:bg-white/[0.005] transition-colors px-1">
                          {vid && (
                            <div className="flex items-center gap-2 mb-2 text-[10px] text-gray-600">
                              {vid.thumbnail ? <img src={vid.thumbnail} alt="" className="w-5 h-3.5 rounded-sm object-cover opacity-50" onError={e => onImgErr(e, THUMB_FB)} /> : <Film size={10} className="opacity-40" />}
                              <span className="truncate max-w-[240px] sm:max-w-md">{vid.title}</span>
                            </div>
                          )}
                          <div className="flex gap-3">
                            <img src={c.authorProfileImage || AVT_FB} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5 opacity-80 group-hover:opacity-100 transition" onError={e => onImgErr(e, AVT_FB)} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[13px] font-semibold">{c.authorName}</span>
                                <Dot color={sentColor(c.sentiment)} />
                                <span className={`text-[9px] font-medium ${sentTextColor(c.sentiment)}`}>{c.sentiment}</span>
                                {c.ownerReplied && <span className="text-[9px] text-emerald-500/60 font-medium flex items-center gap-0.5"><CheckCircle size={8} /> replied</span>}
                                <span className="text-[10px] text-gray-700">{new Date(c.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                              </div>
                              <p className="text-[13px] text-gray-400 leading-[1.75] mt-1">{c.textOriginal}</p>

                              {/* Reply with edit/delete */}
                              {c.ownerReplied && c.ownerReplyText && (
                                <div className="mt-2.5 ml-1 pl-3 border-l-2 border-purple-500/15">
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <textarea value={editText} onChange={e => setEditText(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5 text-[12px] text-white outline-none focus:border-purple-500/20 min-h-[60px] resize-none" />
                                      <div className="flex gap-2">
                                        <button onClick={() => submitEdit(c)} className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[11px] font-medium text-white flex items-center gap-1 transition active:scale-95"><Check size={11} /> Save to YouTube</button>
                                        <button onClick={cancelEdit} className="px-3 py-1.5 rounded-lg text-[11px] text-gray-500 hover:text-gray-300 transition">Cancel</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-start gap-2">
                                      <div className="flex-1">
                                        <p className="text-[11px] text-gray-500 italic leading-relaxed">{c.ownerReplyText}</p>
                                        {c.ownerReplyAt && <p className="text-[9px] text-gray-700 mt-1 flex items-center gap-1"><Clock size={8} /> {new Date(c.ownerReplyAt).toLocaleDateString()}</p>}
                                      </div>
                                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                                        <button onClick={() => startEdit(c)} className="p-1.5 rounded-md hover:bg-white/[0.04] text-gray-600 hover:text-white transition" title="Edit on YouTube"><Pencil size={12} /></button>
                                        <button onClick={() => handleDelete(c)} disabled={isDeleting} className="p-1.5 rounded-md hover:bg-rose-500/10 text-gray-600 hover:text-rose-400 transition" title="Delete from YouTube">
                                          {isDeleting ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center gap-5 mt-3 text-[11px] text-gray-600">
                                <span className="flex items-center gap-1"><ThumbsUp size={11} /> {c.likeCount}</span>
                                <span className="flex items-center gap-1"><MessageCircle size={11} /> {c.replyCount}</span>
                                <button onClick={() => openReply(c)}
                                  className="ml-auto flex items-center gap-1.5 text-gray-600 hover:text-purple-400 font-medium transition sm:opacity-0 sm:group-hover:opacity-100 active:scale-95">
                                  <Reply size={12} /> Reply with AI
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </motion.div>

                {/* Reply modal */}
                <AnimatePresence>
                  {replyTarget && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                      onClick={e => { if (e.target === e.currentTarget) setReplyTarget(null); }}>
                      <motion.div initial={{ y: 30, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 30, opacity: 0, scale: 0.97 }}
                        transition={{ type: "spring", damping: 30, stiffness: 400 }}
                        className="w-full max-w-lg bg-[#0a0a22] border border-white/[0.06] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="p-5 border-b border-white/[0.04]">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <p className="text-[11px] font-mono text-purple-400/60 uppercase tracking-[0.15em]">Replying to comment</p>
                              {toneProfile && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                  <Sparkles size={9} /> Voice Matched: {toneProfile.formality} · {toneProfile.emojiUsage} emojis
                                </span>
                              )}
                            </div>
                            <button onClick={() => setReplyTarget(null)} className="p-1 rounded-lg hover:bg-white/[0.05] text-gray-600 transition"><X size={16} /></button>
                          </div>
                          {(() => { const vid = vidFor(replyTarget.videoId); return vid ? (
                            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                              {vid.thumbnail ? <img src={vid.thumbnail} alt="" className="w-14 h-9 rounded-lg object-cover opacity-70 shrink-0" onError={e => onImgErr(e, THUMB_FB)} /> : <div className="w-14 h-9 rounded-lg bg-white/[0.03] flex items-center justify-center shrink-0"><Play size={14} className="text-gray-700" /></div>}
                              <div className="min-w-0"><p className="text-[12px] font-medium text-gray-300 truncate">{vid.title}</p><p className="text-[9px] text-gray-600">{vid.views.toLocaleString()} views</p></div>
                            </div>
                          ) : null; })()}
                          <div className="flex gap-3">
                            <img src={replyTarget.authorProfileImage || AVT_FB} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 opacity-70" onError={e => onImgErr(e, AVT_FB)} />
                            <div><div className="flex items-center gap-2"><span className="text-[12px] font-semibold">{replyTarget.authorName}</span><Dot color={sentColor(replyTarget.sentiment)} /><span className={`text-[9px] ${sentTextColor(replyTarget.sentiment)}`}>{replyTarget.sentiment}</span></div><p className="text-[13px] text-gray-500 mt-1 leading-relaxed">{replyTarget.textOriginal}</p></div>
                          </div>
                        </div>
                        <div className="p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><CornerDownRight size={13} className="text-purple-400/50" /><p className="text-[11px] font-mono text-gray-600 uppercase tracking-wider">Your reply</p></div>
                            <button onClick={() => setShowTemplates(!showTemplates)} className="text-[10px] text-purple-400/60 hover:text-purple-400 font-medium flex items-center gap-1 transition">
                              <Bookmark size={10} /> Templates
                            </button>
                          </div>

                          {/* Reply templates */}
                          <AnimatePresence>
                            {showTemplates && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="flex flex-wrap gap-1.5 pb-2">
                                  {REPLY_TEMPLATES.map((t, i) => (
                                    <button key={i} onClick={() => { setReplyDraft(t.text); setShowTemplates(false); }}
                                      className="px-2.5 py-1 rounded-lg bg-purple-500/[0.06] border border-purple-500/[0.12] text-[10px] text-purple-300 font-medium hover:bg-purple-500/[0.12] transition active:scale-95">{t.label}</button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {genLoading ? (
                            <div className="flex flex-col items-center py-10 gap-2.5">
                              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><RefreshCw size={18} className="text-purple-400/60" /></motion.div>
                              <p className="text-[12px] text-gray-600">Writing for <span className="text-gray-400">{replyTarget.authorName}</span>...</p>
                            </div>
                          ) : (
                            <>
                              <textarea value={replyDraft} onChange={e => setReplyDraft(e.target.value)}
                                className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 text-[14px] text-white outline-none focus:border-white/[0.12] min-h-[90px] resize-none placeholder-gray-700 transition leading-relaxed" placeholder="Edit your reply..." />
                              <div className="flex items-center justify-between text-[9px] text-gray-700">
                                <span>{replyDraft.length} chars</span>
                                <span>Posted under your channel</span>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <button onClick={postYT} disabled={postLoading || !replyDraft.trim()}
                                  className="flex-1 py-3 rounded-xl bg-white text-[#0a0a22] text-[13px] font-bold flex items-center justify-center gap-2 transition hover:bg-gray-100 disabled:opacity-20 active:scale-[0.98]">
                                  {postLoading ? <><RefreshCw size={14} className="animate-spin" /> Posting...</> : <><Upload size={14} /> Post to YouTube</>}
                                </button>
                                <button onClick={() => { navigator.clipboard.writeText(replyDraft); setCopiedReply(true); setTimeout(() => setCopiedReply(false), 2000); }}
                                  className="px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] text-[13px] text-gray-400 font-medium flex items-center justify-center gap-1.5 transition active:scale-95">
                                  {copiedReply ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                                </button>
                                <button onClick={() => openReply(replyTarget)} className="px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] text-[13px] text-gray-400 font-medium flex items-center justify-center gap-1.5 transition active:scale-95"><RefreshCw size={14} /> Redo</button>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ═══════════ AUTO-REPLY ═══════════ */}
            {view === "engine" && (
              <motion.div key="engine" variants={stagger} initial="hidden" animate="visible" exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                <motion.div variants={fadeUp} className="lg:col-span-3 space-y-8">
                  {/* ━━━ SMART REPLY TONE MATCHING — CREATOR VOICE PROFILE ━━━ */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-[#121136]/90 via-[#0d0d26]/80 to-[#07071a]/95 border border-purple-500/25 backdrop-blur-sm space-y-5 shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-44 h-44 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-300 shrink-0">
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white tracking-tight">Smart Reply Tone Matching</h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {toneProfile ? "Voice Cloned" : manualRepliesCount > 0 ? `${manualRepliesCount}/3 Synced` : "Voice Engine"}
                            </span>
                          </div>
                          <p className="text-[12px] text-gray-400 mt-0.5">
                            {toneProfile
                              ? `Replies sound authentically like you — not a generic chatbot.`
                              : `Analyzes your past replies to match your real voice, slang, emoji habits, and questions.`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setTestVoiceModalOpen(true)}
                          className="px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-[12px] font-semibold text-purple-200 hover:text-white transition flex items-center gap-1.5 active:scale-95 shadow-sm"
                        >
                          <Eye size={13} /> Test Voice Clone
                        </button>
                        <button
                          onClick={handleRefreshTone}
                          disabled={isRefreshingTone}
                          className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[12px] font-medium text-gray-300 hover:text-white transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                        >
                          <RefreshCw size={13} className={isRefreshingTone ? "animate-spin" : ""} />
                          {isRefreshingTone ? "Analyzing..." : "Re-learn Voice"}
                        </button>
                      </div>
                    </div>

                    {/* Active Tone Profile Traits */}
                    {toneProfile ? (
                      <div className="space-y-4 pt-1">
                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[13px] text-purple-200/90 leading-relaxed italic">
                          "{toneProfile.toneSummary}"
                        </div>

                        {/* Interactive characteristic badges */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {/* Formality badge */}
                          <div
                            onClick={cycleFormality}
                            title="Click to cycle formality"
                            className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] hover:border-purple-500/30 transition group cursor-pointer"
                          >
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Formality</p>
                            <p className="text-[13px] font-bold text-white capitalize mt-1 flex items-center justify-between">
                              {toneProfile.formality}
                              <ChevronRight size={12} className="text-gray-600 group-hover:text-purple-400 transition" />
                            </p>
                          </div>

                          {/* Emoji Style badge */}
                          <div
                            onClick={cycleEmoji}
                            title="Click to cycle emoji usage"
                            className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] hover:border-purple-500/30 transition group cursor-pointer"
                          >
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Emojis</p>
                            <p className="text-[13px] font-bold text-white capitalize mt-1 flex items-center justify-between">
                              {toneProfile.emojiUsage === 'none' ? 'None' : toneProfile.emojiUsage === 'sparse' ? 'Sparse (1/3)' : toneProfile.emojiUsage === 'moderate' ? 'Moderate 🙌' : 'Heavy 🔥'}
                              <ChevronRight size={12} className="text-gray-600 group-hover:text-purple-400 transition" />
                            </p>
                          </div>

                          {/* Reply Length */}
                          <div
                            onClick={cycleLength}
                            title="Click to cycle average reply length"
                            className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] hover:border-purple-500/30 transition group cursor-pointer"
                          >
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Length</p>
                            <p className="text-[13px] font-bold text-white capitalize mt-1 flex items-center justify-between">
                              {toneProfile.avgReplyLength}
                              <ChevronRight size={12} className="text-gray-600 group-hover:text-purple-400 transition" />
                            </p>
                          </div>

                          {/* Follow-up Questions */}
                          <div
                            onClick={toggleFollowups}
                            title="Click to toggle follow-up questions"
                            className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] hover:border-purple-500/30 transition group cursor-pointer"
                          >
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Questions</p>
                            <p className="text-[13px] font-bold text-white mt-1 flex items-center justify-between">
                              {toneProfile.asksFollowups ? 'Asks Back 💬' : 'Direct'}
                              <ChevronRight size={12} className="text-gray-600 group-hover:text-purple-400 transition" />
                            </p>
                          </div>

                          {/* Humor / Wit */}
                          <div
                            onClick={toggleHumor}
                            title="Click to toggle humor"
                            className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] hover:border-purple-500/30 transition group cursor-pointer"
                          >
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Humor</p>
                            <p className="text-[13px] font-bold text-white mt-1 flex items-center justify-between">
                              {toneProfile.usesHumor ? 'Witty 😂' : 'Straightforward'}
                              <ChevronRight size={12} className="text-gray-600 group-hover:text-purple-400 transition" />
                            </p>
                          </div>

                          {/* Language */}
                          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Language</p>
                            <p className="text-[13px] font-bold text-white truncate mt-1">
                              {toneProfile.languageStyle}
                            </p>
                          </div>
                        </div>

                        {/* Expandable real sample replies */}
                        {toneProfile.sampleReplies && toneProfile.sampleReplies.length > 0 && (
                          <div className="pt-1">
                            <button
                              onClick={() => setShowVoiceSamples(!showVoiceSamples)}
                              className="text-[11px] font-medium text-purple-400/80 hover:text-purple-300 transition flex items-center gap-1.5"
                            >
                              <ChevronRight size={12} className={`transition-transform ${showVoiceSamples ? "rotate-90" : ""}`} />
                              {showVoiceSamples ? "Hide" : "View"} learned sample replies ({toneProfile.sampleReplies.length})
                            </button>

                            <AnimatePresence>
                              {showVoiceSamples && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-2 overflow-hidden">
                                  {toneProfile.sampleReplies.map((sample, idx) => (
                                    <div key={idx} className="p-2.5 rounded-lg bg-black/40 border border-white/[0.03] text-[12px] text-gray-300 flex items-start gap-2">
                                      <span className="text-[10px] text-purple-400 font-mono mt-0.5">#{idx + 1}</span>
                                      <p className="leading-relaxed italic">"{sample}"</p>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <p className="text-[13px] text-gray-200 font-medium">Automatic voice learning in progress</p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                            {manualRepliesCount > 0
                              ? `Found ${manualRepliesCount} manual reply. Reply to ${3 - manualRepliesCount} more comment(s) on YouTube or initialize a starter profile below.`
                              : `Sync your YouTube comments or initialize your creator voice profile with one click.`}
                          </p>
                        </div>
                        <button
                          onClick={handleInitializeStarterTone}
                          disabled={isUpdatingTone}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[12px] font-semibold transition flex items-center gap-1.5 shrink-0 active:scale-95 shadow-lg shadow-purple-600/20"
                        >
                          <Sparkles size={13} /> Initialize Voice Profile
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ━━━ ADDITIONAL GUIDELINES ━━━ */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-mono text-gray-600 uppercase tracking-[0.15em]">Additional Guidelines & Sign-off</p>
                    <p className="text-[13px] text-gray-500 leading-relaxed">Specific instructions layered on top of your voice clone (e.g. sign-off name, links, or boundaries).</p>
                    <textarea value={ctx} onChange={e => setCtx(e.target.value)} placeholder={`"Sign off as Abdul. Mention link in description for project files."`}
                      className="w-full bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 text-[14px] text-white outline-none focus:border-white/[0.1] min-h-[90px] resize-none placeholder-gray-700 transition leading-relaxed" />
                    <p className="text-[10px] text-gray-700">{ctx.length} characters · {ctx.split(/\s+/).filter(Boolean).length} words</p>
                  </div>
                  <div className="space-y-1 py-4 border-y border-white/[0.03]">
                    <p className="text-[11px] font-mono text-gray-600 uppercase tracking-[0.15em] mb-3">Filters</p>
                    <Tog on={autoOn} set={setAutoOn} label="Enable auto-reply" />
                    <div className="h-px bg-white/[0.02] my-1" />
                    <Tog on={fPos} set={setFPos} label="Positive comments" />
                    <Tog on={fNeg} set={setFNeg} label="Critical comments" />
                    <Tog on={fQ} set={setFQ} label="Questions" />
                    <Tog on={fNeu} set={setFNeu} label="Neutral comments" />
                    <div className="h-px bg-white/[0.02] my-2" />
                    <div className="flex items-center justify-between py-2"><span className="text-[13px] text-gray-400">Max per run</span><div className="flex items-center gap-3"><input type="range" min={1} max={25} value={maxR} onChange={e => setMaxR(Number(e.target.value))} className="w-28 h-1 bg-[#1a1a36] rounded-full appearance-none cursor-pointer accent-purple-500" /><span className="text-[15px] font-bold text-white w-7 text-right tabular-nums">{maxR}</span></div></div>
                  </div>
                  <button onClick={saveSett} disabled={isSavingSettings}
                    className="px-6 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-[13px] font-semibold text-white flex items-center gap-2 transition disabled:opacity-50 active:scale-95">
                    {isSavingSettings ? <><RefreshCw size={13} className="animate-spin" /> Saving...</> : <><Check size={14} /> Save settings</>}
                  </button>
                </motion.div>

                <motion.div variants={fadeUp} className="lg:col-span-2 space-y-6">
                  {/* Voice Match auto-reply indicator */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/30 via-purple-900/10 to-transparent border border-purple-500/20 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-purple-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                        <Sparkles size={12} className="text-purple-400" /> Voice Matching
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                        {toneProfile ? "Active" : "Standard AI"}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-400 leading-relaxed">
                      {toneProfile
                        ? `Auto-replies will automatically clone your ${toneProfile.formality} style with ${toneProfile.emojiUsage} emoji density.`
                        : `No voice profile trained yet. Auto-replies will use standard creator persona.`}
                    </p>
                    <button
                      onClick={() => setTestVoiceModalOpen(true)}
                      className="w-full py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] text-purple-300 hover:text-white font-medium flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <Eye size={12} /> Test Voice Clone Simulator
                    </button>
                  </div>

                  <div className="p-5 rounded-2xl border border-dashed border-white/[0.06] space-y-4">
                    <p className="text-[11px] font-mono text-gray-600 uppercase tracking-[0.15em]">Run now</p>
                    <p className="text-[12px] text-gray-500">Reply to up to {maxR} unreplied comments{selectedVideoId ? " on this video" : " across all videos"}.</p>
                    <div className="p-3 rounded-lg bg-amber-500/[0.02] border border-amber-500/[0.08] text-[11px] text-amber-300/50 flex items-start gap-2">
                      <AlertTriangle size={13} className="shrink-0 mt-0.5" /><span><strong className="text-amber-300/70">Preview</strong> = drafts. <strong className="text-amber-300/70">Post</strong> = live on YouTube.</span>
                    </div>
                    <div className="space-y-2">
                      <button onClick={() => doAR(false)} disabled={isAutoReplying}
                        className="w-full py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] text-[13px] font-medium text-gray-300 flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-[0.98]">
                        {isAutoReplying ? <RefreshCw size={13} className="animate-spin" /> : <Eye size={14} />} Preview only
                      </button>
                      <button onClick={() => doAR(true)} disabled={isAutoReplying}
                        className="w-full py-3 rounded-xl bg-white text-[#0a0a22] text-[13px] font-bold flex items-center justify-center gap-2 transition hover:bg-gray-100 disabled:opacity-50 active:scale-[0.98]">
                        {isAutoReplying ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={14} />} Generate & post
                      </button>
                    </div>
                  </div>

                  {/* Enriched results */}
                  {arResults.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-mono text-gray-600 uppercase tracking-[0.15em]">{arResults.length} replies</p>
                        <p className="text-[10px] text-gray-600">{arResults.filter(r => r.postedToYouTube).length} posted · {arResults.filter(r => !r.postedToYouTube).length} drafts</p>
                      </div>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {arResults.map((r, i) => (
                          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            className="p-3.5 rounded-xl bg-white/[0.015] border border-white/[0.04] space-y-2.5 hover:border-white/[0.06] transition">
                            {r.videoTitle && <div className="flex items-center gap-2 text-[10px] text-gray-600"><Film size={10} className="text-purple-400/40" /><span className="truncate">{r.videoTitle}</span></div>}
                            {r.originalComment && (
                              <div className="flex items-start gap-2 py-1.5 px-2.5 rounded-lg bg-white/[0.01] border border-white/[0.02]">
                                <span className="text-[10px] text-gray-500 font-semibold shrink-0">{r.originalAuthor}:</span>
                                <p className="text-[11px] text-gray-500 italic leading-relaxed line-clamp-2">{r.originalComment}</p>
                              </div>
                            )}
                            <div className="flex gap-2 items-start"><CornerDownRight size={11} className="text-purple-400/30 shrink-0 mt-1" /><p className="text-[12px] text-gray-300 leading-relaxed">{r.replyText}</p></div>
                            <div className="flex items-center justify-between pt-1">
                              <span className={`text-[9px] font-medium flex items-center gap-1 ${r.postedToYouTube ? "text-emerald-500/60" : "text-gray-700"}`}>
                                {r.postedToYouTube ? <><CheckCircle size={9} /> Posted</> : <><Clock size={9} /> Draft</>}
                              </span>
                              {r.sentiment && <span className={`text-[9px] ${sentTextColor(r.sentiment)} capitalize`}>{r.sentiment}</span>}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
            </AnimatePresence>

            {/* ━━━ VOICE CLONE SIMULATOR / COMPARISON MODAL ━━━ */}
            <AnimatePresence>
              {testVoiceModalOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                  onClick={e => { if (e.target === e.currentTarget) setTestVoiceModalOpen(false); }}
                >
                  <motion.div
                    initial={{ y: 25, opacity: 0, scale: 0.96 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 25, opacity: 0, scale: 0.96 }}
                    transition={{ type: "spring", damping: 28, stiffness: 350 }}
                    className="w-full max-w-2xl bg-[#0c0c28] border border-purple-500/25 rounded-3xl shadow-2xl shadow-purple-950/50 overflow-hidden flex flex-col max-h-[90vh]"
                  >
                    {/* Header */}
                    <div className="p-6 border-b border-white/[0.06] flex items-center justify-between bg-gradient-to-r from-purple-950/40 to-transparent">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white tracking-tight">Voice Clone Simulator</h3>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Side-by-Side Test
                            </span>
                          </div>
                          <p className="text-[12px] text-gray-400 mt-0.5">
                            See the authentic difference between standard chatbot AI and your cloned voice.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setTestVoiceModalOpen(false)}
                        className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-400 hover:text-white transition"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-5 overflow-y-auto">
                      {/* Preset quick test buttons */}
                      <div>
                        <p className="text-[10px] font-mono uppercase text-gray-500 tracking-wider mb-2">Try sample comments</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { l: "🔥 Gear Question", a: "Alex", c: "Bro this video was insane, what camera and lens setup did you use for the cinematic shots?" },
                            { l: "❤️ Appreciation", a: "Sarah", c: "This tutorial literally saved my final university project. Thank you so much!" },
                            { l: "😂 Playful Criticism", a: "Marcus", c: "Bro you look completely exhausted in this video lmao get some sleep 😂" },
                            { l: "🇮🇳 Hinglish Fan", a: "Rohan", c: "Bhai next video kab aayegi? Studio setup tour please!" },
                          ].map((p, i) => (
                            <button
                              key={i}
                              onClick={() => { setTestCommentInput(p.c); setTestAuthorInput(p.a); }}
                              className="px-2.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-purple-500/10 border border-white/[0.05] hover:border-purple-500/30 text-[11px] text-gray-300 hover:text-purple-300 transition active:scale-95 flex items-center gap-1.5"
                            >
                              {p.l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Inputs */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div className="sm:col-span-1">
                            <label className="text-[11px] text-gray-400 font-medium block mb-1">Viewer Name</label>
                            <input
                              value={testAuthorInput}
                              onChange={e => setTestAuthorInput(e.target.value)}
                              className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2 text-[13px] text-white outline-none focus:border-purple-500/40 transition"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <label className="text-[11px] text-gray-400 font-medium block mb-1">Viewer Comment</label>
                            <input
                              value={testCommentInput}
                              onChange={e => setTestCommentInput(e.target.value)}
                              className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2 text-[13px] text-white outline-none focus:border-purple-500/40 transition"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => runVoiceTest()}
                          disabled={isTestingTone || !testCommentInput.trim()}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-[13px] flex items-center justify-center gap-2 transition disabled:opacity-40 active:scale-[0.99] shadow-lg shadow-purple-600/25"
                        >
                          {isTestingTone ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                          {isTestingTone ? "Generating Voice Comparison..." : "Compare Generic vs Cloned Voice"}
                        </button>
                      </div>

                      {/* Comparison side by side */}
                      {testResult && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          {/* Generic bot */}
                          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Bot size={12} className="text-gray-500" /> Generic Chatbot
                              </span>
                              <span className="text-[9px] text-gray-600 font-medium">Standard AI</span>
                            </div>
                            <div className="bg-black/30 p-3.5 rounded-xl border border-white/[0.02] min-h-[90px] flex items-center">
                              <p className="text-[13px] text-gray-400 leading-relaxed italic">
                                "{testResult.genericReply}"
                              </p>
                            </div>
                            <div className="text-[10px] text-rose-400/80 flex items-center gap-1.5 font-medium">
                              <X size={12} className="text-rose-400" /> Robotic & impersonal — doesn't sound like you
                            </div>
                          </div>

                          {/* Cloned voice */}
                          <div className="p-4 rounded-2xl bg-purple-500/[0.05] border border-purple-500/30 space-y-3 shadow-lg shadow-purple-950/30 relative overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-purple-300 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                                <Sparkles size={12} className="text-purple-400" /> Your Cloned Voice
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <Check size={10} /> Authentic Match
                              </span>
                            </div>
                            <div className="bg-black/50 p-3.5 rounded-xl border border-purple-500/20 min-h-[90px] flex items-center">
                              <p className="text-[13px] text-white leading-relaxed font-medium">
                                "{testResult.personalizedReply}"
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 text-[9px] font-semibold border border-purple-500/20 capitalize">
                                {testResult.profile?.formality || "casual"} tone
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 text-[9px] font-semibold border border-purple-500/20">
                                {testResult.profile?.emojiUsage || "moderate"} emojis
                              </span>
                              {testResult.profile?.asksFollowups && (
                                <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 text-[9px] font-semibold border border-purple-500/20">
                                  asks back
                                </span>
                              )}
                              {testResult.profile?.usesHumor && (
                                <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 text-[9px] font-semibold border border-purple-500/20">
                                  witty / humor
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>
    </div>
  );
}
