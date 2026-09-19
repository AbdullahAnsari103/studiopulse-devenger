import React, { useState, useRef } from 'react';
import { useEditorStore } from '@/hooks/useEditorStore';
import type { EditPlan } from '@/types/editor';
import { 
  Send, Sparkles, ChevronRight, Clock,
  Mic, Scissors, Captions, Zap, BarChart3 
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const SUGGESTED_COMMANDS = [
  { icon: <Scissors size={13} />, label: 'Remove all pauses', category: 'Smart Edit' },
  { icon: <Captions size={13} />, label: 'Add dynamic captions', category: 'Captions' },
  { icon: <Zap size={13} />, label: 'Make this cinematic', category: 'Color' },
  { icon: <BarChart3 size={13} />, label: 'Create a 60-second Short', category: 'Shorts' },
  { icon: <Mic size={13} />, label: 'Remove filler words', category: 'Audio' },
  { icon: <Sparkles size={13} />, label: 'Add punch-ins on key moments', category: 'Effects' },
];

interface CommandHistoryEntry {
  id: string;
  prompt: string;
  summary?: string;
  timestamp: string;
}

export default function AICommandCenter() {
  const { project, setPendingEditPlan } = useEditorStore();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submitCommand = async (prompt: string) => {
    if (!prompt.trim() || !project || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/editor/ai-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), project }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      if (data.plan) {
        const plan: EditPlan = data.plan;
        setPendingEditPlan(plan);

        setHistory(h => [{
          id: plan.id,
          prompt: prompt.trim(),
          summary: plan.summary,
          timestamp: new Date().toLocaleTimeString(),
        }, ...h.slice(0, 9)]);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitCommand(input);
    }
  };

  return (
    <div className="editor-ai-center">
      <div className="editor-ai-header">
        <Sparkles size={15} className="editor-ai-header-icon" />
        <span className="editor-ai-title">AI Command Center</span>
        <span className="editor-ai-badge">BETA</span>
      </div>

      {/* Greeting */}
      <div className="editor-ai-greeting">
        <p>Tell me what to change in your video.</p>
        <p className="editor-ai-greeting-sub">I'll create an edit plan for your approval.</p>
      </div>

      {/* Suggested commands */}
      <div className="editor-ai-suggestions">
        <p className="editor-ai-section-label">Suggested</p>
        {SUGGESTED_COMMANDS.map((cmd, i) => (
          <button
            key={i}
            className="editor-ai-suggestion"
            onClick={() => submitCommand(cmd.label)}
          >
            <span className="editor-ai-suggestion-icon">{cmd.icon}</span>
            <span className="editor-ai-suggestion-label">{cmd.label}</span>
            <span className="editor-ai-suggestion-cat">{cmd.category}</span>
            <ChevronRight size={11} className="editor-ai-suggestion-arrow" />
          </button>
        ))}
      </div>

      {/* Command history */}
      {history.length > 0 && (
        <div className="editor-ai-history">
          <p className="editor-ai-section-label">
            <Clock size={12} /> Recent
          </p>
          {history.map(h => (
            <button
              key={h.id}
              className="editor-ai-history-item"
              onClick={() => submitCommand(h.prompt)}
            >
              <span className="editor-ai-history-prompt">{h.prompt}</span>
              <span className="editor-ai-history-time">{h.timestamp}</span>
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="editor-ai-error">
          ⚠ {error}
        </div>
      )}

      {/* Input */}
      <div className="editor-ai-input-area">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want changed… (Enter to send)"
          className="editor-ai-textarea"
          rows={3}
          disabled={loading}
        />
        <div className="editor-ai-input-footer">
          <span className="editor-ai-input-hint">Shift+Enter for new line</span>
          <button
            className={`editor-ai-send-btn ${loading ? 'loading' : ''}`}
            onClick={() => submitCommand(input)}
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <div className="editor-ai-spinner" />
            ) : (
              <Send size={14} />
            )}
            {loading ? 'Thinking…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
