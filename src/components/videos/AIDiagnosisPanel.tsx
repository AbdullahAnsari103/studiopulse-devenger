/**
 * AIDiagnosisPanel — AI-powered video performance diagnostic component.
 * Shows a rich analysis panel with identified issues, suggested fixes,
 * and a confirmation-gated "Apply All" action that updates the video on YouTube.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Sparkles, TrendingDown, AlertTriangle, CheckCircle,
  Tag, FileText, Clock, BarChart3, Zap, ChevronDown,
  ChevronRight, RefreshCw, Check, Copy, Edit3, ArrowRight, Wand2, Info
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiagnosisIssue {
  type: "critical" | "warning" | "info";
  field: "title" | "description" | "tags" | "visibility" | "timing" | "seo" | "general";
  title: string;
  detail: string;
  impact: string;
  fix?: string;
}

export interface DiagnosisResult {
  overallScore: number;
  seoGrade: string;
  performanceLabel: string;
  summary: string;
  issues: DiagnosisIssue[];
  suggestedTitle: string;
  suggestedDescription: string;
  suggestedTags: string[];
  recommendedTime: string;
  whyUnderperforming: string;
  quickWins: string[];
  applyPayload: {
    title?: string;
    description?: string;
    tags?: string[];
  };
}

interface Props {
  videoId: string;
  videoTitle: string;
  diagnosis: DiagnosisResult | null;
  isLoading: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onApplyFixes: (payload: { title?: string; description?: string; tags?: string[] }) => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function gradeColor(grade: string): string {
  const g = (grade || "F").toUpperCase()[0];
  if (g === "A") return "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";
  if (g === "B") return "text-sky-400 border-sky-400/30 bg-sky-400/10";
  if (g === "C") return "text-amber-400 border-amber-400/30 bg-amber-400/10";
  return "text-rose-400 border-rose-400/30 bg-rose-400/10";
}

function issueIcon(type: DiagnosisIssue["type"]) {
  if (type === "critical") return <AlertTriangle size={13} className="text-rose-400 shrink-0" />;
  if (type === "warning") return <AlertTriangle size={13} className="text-amber-400 shrink-0" />;
  return <Info size={13} className="text-sky-400 shrink-0" />;
}

function issueBg(type: DiagnosisIssue["type"]) {
  if (type === "critical") return "border-rose-500/20 bg-rose-500/[0.04]";
  if (type === "warning") return "border-amber-500/20 bg-amber-500/[0.04]";
  return "border-sky-500/20 bg-sky-500/[0.04]";
}

// ─── Issue Card ───────────────────────────────────────────────────────────────

function IssueCard({ issue, idx }: { issue: DiagnosisIssue; idx: number }) {
  const [open, setOpen] = useState(idx === 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * idx }}
      className={`rounded-xl border p-3 ${issueBg(issue.type)} transition-all`}
    >
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 w-full text-left">
        {issueIcon(issue.type)}
        <span className="flex-1 text-[12px] font-semibold text-white">{issue.title}</span>
        {open ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-2 space-y-1.5">
              <p className="text-[11px] text-gray-400 leading-relaxed">{issue.detail}</p>
              {issue.impact && <p className="text-[10px] text-gray-600 italic">📉 Impact: {issue.impact}</p>}
              {issue.fix && (
                <div className="mt-2 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <p className="text-[10px] text-purple-300 font-medium">💡 Fix: {issue.fix}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Apply Confirm Dialog ─────────────────────────────────────────────────────

function ApplyConfirmDialog({ diagnosis, onConfirm, onCancel, isApplying }: {
  diagnosis: DiagnosisResult; onConfirm: () => void; onCancel: () => void; isApplying: boolean;
}) {
  const changes = [
    diagnosis.suggestedTitle && { label: "Title", to: diagnosis.suggestedTitle },
    diagnosis.suggestedTags?.length && { label: "Tags", to: diagnosis.suggestedTags.slice(0, 6).join(", ") + (diagnosis.suggestedTags.length > 6 ? ` +${diagnosis.suggestedTags.length - 6}` : "") },
    diagnosis.suggestedDescription && { label: "Description", to: diagnosis.suggestedDescription.slice(0, 90) + "…" },
  ].filter(Boolean) as { label: string; to: string }[];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
      className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-[#07071a]/90 backdrop-blur-sm rounded-2xl"
    >
      <div className="w-full max-w-xs bg-[#0e0e1c] border border-purple-500/20 rounded-2xl p-5 space-y-4 shadow-2xl">
        <div className="flex items-center gap-2">
          <Wand2 size={15} className="text-purple-400" />
          <span className="text-sm font-bold text-white">Apply AI Fixes?</span>
        </div>
        <p className="text-[11px] text-gray-400">These changes will be applied to your YouTube video immediately:</p>
        <div className="space-y-2">
          {changes.map((c, i) => (
            <div key={i} className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{c.label}</p>
              <p className="text-[11px] text-white/90 leading-relaxed">{c.to}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl text-[12px] text-gray-400 border border-white/[0.08] hover:border-white/20 transition">
            Cancel
          </button>
          <button
            onClick={onConfirm} disabled={isApplying}
            className="flex-1 py-2 rounded-xl text-[12px] font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isApplying ? <><RefreshCw size={12} className="animate-spin" /> Applying…</> : <><Check size={12} /> Confirm</>}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function AIDiagnosisPanel({ videoId, videoTitle, diagnosis, isLoading, onClose, onRefresh, onApplyFixes }: Props) {
  const [showApply, setShowApply] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);

  const handleApply = async () => {
    if (!diagnosis) return;
    setIsApplying(true);
    try {
      await onApplyFixes({
        title: editingTitle ?? diagnosis.suggestedTitle,
        description: diagnosis.suggestedDescription || diagnosis.applyPayload?.description,
        tags: diagnosis.suggestedTags,
      });
      setApplied(true);
      setShowApply(false);
      toast.success("AI fixes applied to YouTube! ✨");
    } catch {
      toast.error("Failed to apply fixes. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="fixed right-0 top-0 h-full w-full max-w-[420px] z-50 flex flex-col shadow-2xl"
      style={{ background: "linear-gradient(145deg, #0a0a1f 0%, #0d0d22 100%)", borderLeft: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div className="absolute -left-20 top-1/3 w-40 h-40 bg-purple-600/10 rounded-full blur-[60px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05] shrink-0">
        <div className="w-7 h-7 rounded-lg bg-purple-600/20 flex items-center justify-center">
          <Sparkles size={13} className="text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-white">AI Diagnosis</p>
          <p className="text-[10px] text-gray-600 truncate">{videoTitle}</p>
        </div>
        <button onClick={onRefresh} disabled={isLoading} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-500 hover:text-white transition">
          <RefreshCw size={13} className={isLoading ? "animate-spin text-purple-400" : ""} />
        </button>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-500 hover:text-white transition">
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto relative">
        <AnimatePresence>
          {showApply && diagnosis && (
            <ApplyConfirmDialog diagnosis={diagnosis} onConfirm={handleApply} onCancel={() => setShowApply(false)} isApplying={isApplying} />
          )}
        </AnimatePresence>

        {isLoading && !diagnosis ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border border-purple-500/20 flex items-center justify-center">
                <Sparkles size={20} className="text-purple-400 animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
            </div>
            <p className="text-sm text-gray-400 text-center">Analyzing video performance…</p>
            <p className="text-[11px] text-gray-600 text-center">Checking metrics, SEO, tags, and content strategy</p>
          </div>
        ) : !diagnosis ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
            <BarChart3 size={32} className="text-gray-700" />
            <p className="text-sm text-gray-500">No diagnosis yet</p>
            <button onClick={onRefresh} className="px-4 py-2 rounded-xl bg-purple-600/20 text-purple-400 text-[12px] font-medium hover:bg-purple-600/30 transition">
              Run Diagnosis
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-5 pb-28">

            {/* Score + Grade */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#1a1a38" strokeWidth="7" />
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke={diagnosis.overallScore >= 60 ? "#8b5cf6" : diagnosis.overallScore >= 40 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="7" strokeLinecap="round"
                    strokeDasharray={`${(diagnosis.overallScore / 100) * 213.6} 213.6`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-black text-white">{diagnosis.overallScore}</span>
                  <span className="text-[8px] text-gray-600 uppercase tracking-wide">score</span>
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${gradeColor(diagnosis.seoGrade)}`}>
                    {diagnosis.seoGrade}
                  </span>
                  <span className="text-[12px] font-semibold text-white">{diagnosis.performanceLabel}</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">{diagnosis.summary}</p>
              </div>
            </motion.div>

            {/* Why underperforming */}
            {diagnosis.whyUnderperforming && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="p-3.5 rounded-xl border border-amber-500/15 bg-amber-500/[0.04]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <TrendingDown size={11} className="text-amber-400" />
                  <span className="text-[10px] font-mono text-amber-500/70 uppercase tracking-wider">Why it's underperforming</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">{diagnosis.whyUnderperforming}</p>
              </motion.div>
            )}

            {/* Issues */}
            {diagnosis.issues.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={10} /> Issues Detected ({diagnosis.issues.length})
                </p>
                {diagnosis.issues.map((issue, i) => (
                  <IssueCard key={i} issue={issue} idx={i} />
                ))}
              </div>
            )}

            {/* Suggested Title */}
            {diagnosis.suggestedTitle && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-2">
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 size={10} /> Suggested Title
                </p>
                <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  {editingTitle !== null ? (
                    <textarea
                      value={editingTitle}
                      onChange={e => setEditingTitle(e.target.value)}
                      rows={2}
                      className="w-full bg-transparent text-[12px] text-white leading-relaxed resize-none outline-none"
                      autoFocus
                    />
                  ) : (
                    <p className="text-[12px] text-white leading-relaxed">{diagnosis.suggestedTitle}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {editingTitle !== null ? (
                      <>
                        <button onClick={() => setEditingTitle(null)} className="text-[10px] text-gray-500 hover:text-gray-300 transition">Cancel</button>
                        <button onClick={() => {}} className="text-[10px] text-purple-400 hover:text-purple-300 transition ml-auto">Done</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditingTitle(diagnosis.suggestedTitle)} className="text-[10px] text-gray-500 hover:text-purple-400 transition flex items-center gap-1">
                          <Edit3 size={9} /> Edit
                        </button>
                        <button
                          onClick={() => { navigator.clipboard.writeText(diagnosis.suggestedTitle); toast.success("Copied!"); }}
                          className="text-[10px] text-gray-500 hover:text-purple-400 transition flex items-center gap-1 ml-auto"
                        >
                          <Copy size={9} /> Copy
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Suggested Tags */}
            {diagnosis.suggestedTags?.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={10} /> Recommended Tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {diagnosis.suggestedTags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full border border-purple-500/20 bg-purple-500/[0.06] text-[10px] text-purple-300 font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Quick Wins */}
            {diagnosis.quickWins?.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-2">
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={10} /> Quick Wins
                </p>
                <div className="space-y-1.5">
                  {diagnosis.quickWins.map((win, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-gray-400">
                      <ArrowRight size={10} className="text-purple-400 mt-0.5 shrink-0" />
                      {win}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Best upload time */}
            {diagnosis.recommendedTime && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="flex items-center gap-3 p-3 rounded-xl border border-sky-500/15 bg-sky-500/[0.04]">
                <Clock size={13} className="text-sky-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-sky-500/70 uppercase tracking-wide">Best Upload Time</p>
                  <p className="text-[12px] text-white font-semibold">{diagnosis.recommendedTime}</p>
                </div>
              </motion.div>
            )}

            {applied && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06]">
                <CheckCircle size={13} className="text-emerald-400" />
                <p className="text-[11px] text-emerald-300">AI fixes applied to YouTube successfully!</p>
              </motion.div>
            )}

          </div>
        )}
      </div>

      {/* Footer CTA */}
      {diagnosis && !isLoading && (
        <div className="px-5 py-4 border-t border-white/[0.05] shrink-0 bg-[#0a0a1f]">
          <button
            onClick={() => setShowApply(true)}
            disabled={applied || isApplying}
            className="w-full py-3 rounded-xl text-[13px] font-bold text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30"
          >
            {applied ? <><CheckCircle size={14} /> Fixes Applied</> : <><Wand2 size={14} /> Apply AI Fixes to YouTube</>}
          </button>
          <p className="text-[10px] text-gray-600 text-center mt-2">Title, description & tags will be updated on YouTube</p>
        </div>
      )}
    </motion.div>
  );
}
