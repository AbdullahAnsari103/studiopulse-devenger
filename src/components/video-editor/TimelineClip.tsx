import React, { useRef, useState, useCallback } from 'react';
import { useEditorStore } from '@/hooks/useEditorStore';
import type { Clip, Track } from '@/types/editor';

interface Props {
  clip: Clip;
  track: Track;
  pxPerSec: number;
}

const TRACK_TYPE_COLORS: Record<string, string> = {
  video: '#8b5cf6',
  overlay: '#06b6d4',
  text: '#3b82f6',
  caption: '#10b981',
  voice: '#22c55e',
  music: '#ec4899',
  sfx: '#f59e0b',
  adjustment: '#6b7280',
};

export default function TimelineClip({ clip, track, pxPerSec }: Props) {
  const { selectClip, ui, moveClip, trimClip, removeClip, splitClip } = useEditorStore();
  const clipRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTrimming, setIsTrimming] = useState<'left' | 'right' | null>(null);

  const isSelected = ui.selectedClipIds.includes(clip.id);
  const start = typeof clip.start === 'number' && !isNaN(clip.start) ? clip.start : 0;
  const duration = typeof clip.duration === 'number' && !isNaN(clip.duration) ? clip.duration : 10;
  const left = start * pxPerSec;
  const width = Math.max(duration * pxPerSec, 4);
  const color = TRACK_TYPE_COLORS[track.type] || '#6b7280';

  // ── Click to select or split ─────────────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (ui.activeTool === 'split' || ui.activeTool === 'cut') {
      const rect = clipRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const splitRelative = x / pxPerSec;
      splitClip(clip.id, clip.start + splitRelative);
    } else {
      selectClip(clip.id, e.shiftKey || e.metaKey);
    }
  }, [clip.id, clip.start, pxPerSec, ui.activeTool, selectClip, splitClip]);

  // ── Drag to move ─────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('clipId', clip.id);
    setIsDragging(true);
  }, [clip.id]);

  const handleDragEnd = useCallback(() => setIsDragging(false), []);

  // ── Trim handle drag ─────────────────────────────────────────────────────
  const handleTrimStart = useCallback((e: React.MouseEvent, side: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    setIsTrimming(side);

    const startX = e.clientX;
    const startTrimIn = clip.trimIn;
    const startTrimOut = clip.trimOut;
    const startDuration = clip.duration;

    const onMouseMove = (me: MouseEvent) => {
      const dx = me.clientX - startX;
      const dt = dx / pxPerSec;
      if (side === 'left') {
        const newTrimIn = Math.max(0, startTrimIn + dt);
        trimClip(clip.id, newTrimIn, startTrimOut);
      } else {
        const newTrimOut = Math.max(0, startTrimOut - dt);
        trimClip(clip.id, startTrimIn, newTrimOut);
      }
    };
    const onMouseUp = () => {
      setIsTrimming(null);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [clip.id, clip.trimIn, clip.trimOut, clip.duration, pxPerSec, trimClip]);

  // ── Context menu (right click) ────────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Could open a context menu here
  }, []);

  return (
    <div
      ref={clipRef}
      className={`editor-clip ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${clip.locked ? 'locked' : ''}`}
      style={{
        left,
        width,
        background: `linear-gradient(135deg, ${color}cc, ${color}88)`,
        borderColor: isSelected ? '#fff' : `${color}`,
      }}
      draggable={!clip.locked && ui.activeTool === 'select'}
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onContextMenu={handleContextMenu}
    >
      {/* Left trim handle */}
      <div
        className="editor-clip-trim-handle left"
        onMouseDown={(e) => handleTrimStart(e, 'left')}
      />

      {/* Clip content */}
      <div className="editor-clip-content">
        <span className="editor-clip-name">{clip.name}</span>
        {clip.transitionIn && (
          <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.2)', padding: '1px 4px', borderRadius: 3, marginLeft: 4, fontWeight: 700 }}>
            ⟡ {clip.transitionIn.type || 'Transition'}
          </span>
        )}
        {clip.effects?.map((ef, idx) => (
          <span key={idx} style={{ fontSize: 9, background: 'rgba(130,0,219,0.4)', padding: '1px 4px', borderRadius: 3, marginLeft: 4, fontWeight: 700 }}>
            ⚡ {ef.type}
          </span>
        ))}
        {(track.type === 'voice' || track.type === 'music' || track.type === 'sfx') && (
          <WaveformMini />
        )}
      </div>

      {/* Right trim handle */}
      <div
        className="editor-clip-trim-handle right"
        onMouseDown={(e) => handleTrimStart(e, 'right')}
      />

      {/* Split cursor indicator */}
      {ui.activeTool === 'split' && (
        <div className="editor-clip-split-cursor" />
      )}
    </div>
  );
}

// Minimal decorative waveform for audio clips
function WaveformMini() {
  const bars = Array.from({ length: 24 }, (_, i) => ({
    height: 20 + Math.sin(i * 1.3) * 15 + Math.random() * 10,
  }));
  return (
    <div className="editor-clip-waveform">
      {bars.map((b, i) => (
        <div key={i} className="editor-clip-wave-bar" style={{ height: `${b.height}%` }} />
      ))}
    </div>
  );
}
