/**
 * GeminiHealthPage — Admin dashboard showing Gemini API key health.
 * Displays per-key status, failure counts, cooldowns, and request logs.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, Activity, AlertTriangle, CheckCircle2,
  XCircle, Clock, Zap, Key, ShieldAlert, Server,
} from "lucide-react";

interface KeyStatus {
  index: number;
  maskedKey: string;
  status: "unknown" | "healthy" | "exhausted" | "invalid" | "error";
  lastSuccess: string | null;
  lastError: string | null;
  lastErrorCode: string | null;
  lastChecked: string | null;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  cooldownUntil: number | null;
}

interface HealthReport {
  model: string;
  healthyKeys: number;
  unhealthyKeys: number;
  totalKeys: number;
  activeKeyIndex: number | null;
  status: "healthy" | "degraded" | "down";
  keys: KeyStatus[];
  lastHealthCheck: string;
}

interface RequestLog {
  keyIndex: number;
  timestamp: string;
  errorCode: string | null;
  success: boolean;
  durationMs: number;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function GeminiHealthPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [reverifying, setReverifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setError(null);
      const [healthRes, logsRes] = await Promise.all([
        fetch(`${API_BASE}/api/ai/health`),
        fetch(`${API_BASE}/api/ai/health/logs`),
      ]);
      if (!healthRes.ok) throw new Error(`Health check failed: ${healthRes.status}`);
      const healthData = await healthRes.json();
      const logsData = await logsRes.json();
      setReport(healthData);
      setLogs(logsData.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch health data");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReverify = async () => {
    setReverifying(true);
    try {
      const res = await fetch(`${API_BASE}/api/ai/health/reverify`, { method: "POST" });
      if (!res.ok) throw new Error(`Re-verify failed: ${res.status}`);
      const data = await res.json();
      setReport(data);
      // Re-fetch logs after reverification
      const logsRes = await fetch(`${API_BASE}/api/ai/health/logs`);
      const logsData = await logsRes.json();
      setLogs(logsData.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-verification failed");
    } finally {
      setReverifying(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000); // Auto-refresh every 15s
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-emerald-400";
      case "exhausted": return "text-amber-400";
      case "invalid": return "text-red-400";
      case "error": return "text-red-400";
      default: return "text-gray-500";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "healthy": return "bg-emerald-500/10 border-emerald-500/20";
      case "exhausted": return "bg-amber-500/10 border-amber-500/20";
      case "invalid": return "bg-red-500/10 border-red-500/20";
      case "error": return "bg-red-500/10 border-red-500/20";
      default: return "bg-gray-500/10 border-gray-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy": return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case "exhausted": return <Clock className="w-5 h-5 text-amber-400" />;
      case "invalid": return <XCircle className="w-5 h-5 text-red-400" />;
      case "error": return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default: return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getOverallStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return (
          <span className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> All Systems Healthy
          </span>
        );
      case "degraded":
        return (
          <span className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2 rounded-full text-sm font-medium">
            <AlertTriangle className="w-4 h-4" /> Degraded — Some Keys Down
          </span>
        );
      case "down":
        return (
          <span className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-full text-sm font-medium">
            <XCircle className="w-4 h-4" /> All Keys Down
          </span>
        );
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleString([], {
        month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit", second: "2-digit",
        hour12: true,
      });
    } catch {
      return "—";
    }
  };

  const getCooldownRemaining = (cooldownUntil: number | null) => {
    if (!cooldownUntil) return null;
    const remaining = cooldownUntil - Date.now();
    if (remaining <= 0) return "Expired";
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading health data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12]">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-900/[0.05] rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="border-b border-[#1a1a2e]/60 bg-[#0a0a12]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/studio-ai")}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <Server className="w-5 h-5 text-purple-400" />
              <h1 className="text-white font-semibold text-lg">Gemini Health Dashboard</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {report && getOverallStatusBadge(report.status)}
            <button
              onClick={handleReverify}
              disabled={reverifying}
              className="flex items-center gap-2 bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/20 text-white rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${reverifying ? "animate-spin" : ""}`} />
              {reverifying ? "Verifying..." : "Re-verify All Keys"}
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 md:px-8 py-8 relative z-10">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {report && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <SummaryCard
                icon={<Zap className="w-5 h-5 text-purple-400" />}
                label="Model"
                value={report.model}
              />
              <SummaryCard
                icon={<Key className="w-5 h-5 text-emerald-400" />}
                label="Healthy Keys"
                value={`${report.healthyKeys} / ${report.totalKeys}`}
                highlight={report.healthyKeys === report.totalKeys ? "green" : report.healthyKeys > 0 ? "amber" : "red"}
              />
              <SummaryCard
                icon={<Activity className="w-5 h-5 text-blue-400" />}
                label="Active Key"
                value={report.activeKeyIndex !== null ? `Key ${report.activeKeyIndex}` : "None"}
                highlight={report.activeKeyIndex !== null ? "green" : "red"}
              />
              <SummaryCard
                icon={<Clock className="w-5 h-5 text-gray-400" />}
                label="Last Check"
                value={formatTime(report.lastHealthCheck)}
              />
            </div>

            {/* Key Status Cards */}
            <h2 className="text-white font-semibold text-lg mb-4">API Key Status</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              {report.keys.map((key) => (
                <div
                  key={key.index}
                  className={`rounded-2xl border p-5 transition-all ${getStatusBg(key.status)}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(key.status)}
                      <div>
                        <h3 className="text-white font-medium text-sm">Key {key.index}</h3>
                        <p className="text-gray-500 text-xs font-mono">{key.maskedKey}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold uppercase tracking-wider ${getStatusColor(key.status)}`}>
                      {key.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <MetricCell label="Successes" value={String(key.successCount)} color="text-emerald-400" />
                    <MetricCell label="Failures" value={String(key.failureCount)} color="text-red-400" />
                    <MetricCell label="Total Requests" value={String(key.totalRequests)} color="text-blue-400" />
                    <MetricCell label="Last Error" value={key.lastErrorCode || "—"} color="text-amber-400" />
                    <MetricCell label="Last Success" value={formatTime(key.lastSuccess)} color="text-gray-400" />
                    <MetricCell label="Last Checked" value={formatTime(key.lastChecked)} color="text-gray-400" />
                  </div>

                  {key.cooldownUntil && (
                    <div className="mt-3 flex items-center gap-2 bg-amber-500/5 rounded-lg px-3 py-2">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-300 text-xs">
                        Cooldown: {getCooldownRemaining(key.cooldownUntil) || "Active"}
                      </span>
                    </div>
                  )}

                  {key.lastError && (
                    <div className="mt-3 bg-black/20 rounded-lg px-3 py-2">
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Last Error</p>
                      <p className="text-red-300/80 text-xs font-mono break-all leading-relaxed">
                        {key.lastError.substring(0, 200)}{key.lastError.length > 200 ? "..." : ""}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Request Logs */}
            <h2 className="text-white font-semibold text-lg mb-4">Recent Request Logs</h2>
            <div className="bg-[#0f0f1a]/60 border border-[#1a1a2e] rounded-2xl overflow-hidden">
              {logs.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-600 text-sm">
                  No request logs yet. Send a message to generate logs.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#1a1a2e]">
                        <th className="text-left text-gray-500 text-xs uppercase tracking-wider px-5 py-3 font-medium">Timestamp</th>
                        <th className="text-left text-gray-500 text-xs uppercase tracking-wider px-5 py-3 font-medium">Key</th>
                        <th className="text-left text-gray-500 text-xs uppercase tracking-wider px-5 py-3 font-medium">Status</th>
                        <th className="text-left text-gray-500 text-xs uppercase tracking-wider px-5 py-3 font-medium">Error</th>
                        <th className="text-left text-gray-500 text-xs uppercase tracking-wider px-5 py-3 font-medium">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...logs].reverse().slice(0, 50).map((log, i) => (
                        <tr key={i} className="border-b border-[#1a1a2e]/50 hover:bg-white/[0.02]">
                          <td className="px-5 py-2.5 text-gray-400 text-xs font-mono">
                            {formatTime(log.timestamp)}
                          </td>
                          <td className="px-5 py-2.5 text-white text-xs">
                            Key {log.keyIndex}
                          </td>
                          <td className="px-5 py-2.5">
                            {log.success ? (
                              <span className="text-emerald-400 text-xs font-medium">✓ OK</span>
                            ) : (
                              <span className="text-red-400 text-xs font-medium">✗ FAIL</span>
                            )}
                          </td>
                          <td className="px-5 py-2.5 text-amber-400/70 text-xs font-mono">
                            {log.errorCode || "—"}
                          </td>
                          <td className="px-5 py-2.5 text-gray-500 text-xs">
                            {log.durationMs}ms
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, highlight }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: "green" | "amber" | "red";
}) {
  const valueColor = highlight === "green" ? "text-emerald-400" : highlight === "amber" ? "text-amber-400" : highlight === "red" ? "text-red-400" : "text-white";

  return (
    <div className="bg-[#0f0f1a]/60 border border-[#1a1a2e] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-gray-500 text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xl font-semibold ${valueColor}`}>{value}</p>
    </div>
  );
}

function MetricCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${color}`}>{value}</p>
    </div>
  );
}
