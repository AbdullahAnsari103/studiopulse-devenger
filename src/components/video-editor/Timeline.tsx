import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useEditorStore } from '@/hooks/useEditorStore';
import TimelineTrack from './TimelineTrack';
import { Plus, ZoomIn, ZoomOut, AlignJustify, Scissors, Trash2 } from 'lucide-react';
import type { TrackType } from '@/types/editor';

const TRACK_TYPE_COLORS: Record<TrackType, string> = {
  video: '#8b5cf6',
  overlay: '#06b6d4',
  text: '#3b82f6',
  caption: '#10b981',
  voice: '#22c55e',
  music: '#ec4899',
  sfx: '#f59e0b',
  adjustment: '#6b7280',
};

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}

export default function Timeline() {
  const { project, ui, setCurrentTime, setZoom, addTrack, splitClip, removeClip } = useEditorStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const clipsAreaRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const PX_PER_SEC = ui.zoom;
  const totalDuration = project?.duration || 60;
  const totalWidth = Math.max((totalDuration + 20) * PX_PER_SEC, 1200);

  // ── Scrubbing on ruler or track background ─────────────────────────────────
  const calculateTimeFromClientX = useCallback((clientX: number) => {
    if (!clipsAreaRef.current) return 0;
    const rect = clipsAreaRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current?.scrollLeft || 0;
    const x = clientX - rect.left + scrollLeft;
    return Math.max(0, x / PX_PER_SEC);
  }, [PX_PER_SEC]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Only scrub if left mouse button and not clicking on interactive child (buttons etc)
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.editor-clip') || (e.target as HTMLElement).closest('button')) {
      return;
    }
    setIsScrubbing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    const newTime = calculateTimeFromClientX(e.clientX);
    setCurrentTime(newTime);
  }, [calculateTimeFromClientX, setCurrentTime]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    const newTime = calculateTimeFromClientX(e.clientX);
    setCurrentTime(newTime);
  }, [isScrubbing, calculateTimeFromClientX, setCurrentTime]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing) {
      setIsScrubbing(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  }, [isScrubbing]);

  // ── Split at playhead shortcut & button ────────────────────────────────────
  const handleSplitAtPlayhead = useCallback(() => {
    if (!project) return;
    const currentTime = ui.currentTime;
    // Split clip on selected track or any clip under playhead
    const clipsToSplit = project.tracks.flatMap(t => t.clips).filter(
      c => currentTime > c.start && currentTime < c.start + c.duration
    );
    if (clipsToSplit.length > 0) {
      clipsToSplit.forEach(c => splitClip(c.id, currentTime));
    }
  }, [project, ui.currentTime, splitClip]);

  const handleDeleteSelected = useCallback(() => {
    if (ui.selectedClipIds.length > 0) {
      ui.selectedClipIds.forEach(id => removeClip(id));
    }
  }, [ui.selectedClipIds, removeClip]);

  // Keyboard shortcuts (S = split, Delete/Backspace = delete, Left/Right = scrub)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 's' || e.key === 'S' || e.key === 'b' || e.key === 'B' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleSplitAtPlayhead();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentTime(Math.max(0, ui.currentTime - (e.shiftKey ? 1 : 0.1)));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentTime(ui.currentTime + (e.shiftKey ? 1 : 0.1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSplitAtPlayhead, handleDeleteSelected, ui.currentTime, setCurrentTime]);

  // ── Generate ruler ticks ──────────────────────────────────────────────────
  const renderRulerTicks = () => {
    const ticks = [];
    const interval = PX_PER_SEC >= 80 ? 1 : PX_PER_SEC >= 30 ? 2 : 5;
    for (let t = 0; t <= totalDuration + 20; t += interval) {
      const x = t * PX_PER_SEC;
      ticks.push(
        <div key={t} className="editor-ruler-tick" style={{ left: `${x}px` }}>
          <div className="editor-ruler-tick-line" />
          <span className="editor-ruler-tick-label">{formatTime(t)}</span>
        </div>
      );
    }
    return ticks;
  };

  const playheadX = (ui.currentTime || 0) * PX_PER_SEC;

  return (
    <div className="editor-timeline">
      {/* Timeline toolbar */}
      <div className="editor-timeline-toolbar">
        <div className="editor-timeline-toolbar-left">
          <button className="editor-icon-btn" title="Add track" onClick={() => addTrack('video')}>
            <Plus size={14} />
          </button>
          <select
            className="editor-track-type-select"
            onChange={(e) => addTrack(e.target.value as TrackType)}
            value=""
          >
            <option value="" disabled>Add track…</option>
            <option value="video">Video Track</option>
            <option value="overlay">Overlay Track</option>
            <option value="text">Text Track</option>
            <option value="caption">Caption Track</option>
            <option value="voice">Audio Track</option>
            <option value="music">Music Track</option>
            <option value="sfx">SFX Track</option>
          </select>
          <div className="editor-divider" />
          <button
            className="editor-btn-secondary"
            onClick={handleSplitAtPlayhead}
            title="Split clip at playhead (S)"
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 11 }}
          >
            <Scissors size={12} /> Split (S)
          </button>
          {ui.selectedClipIds.length > 0 && (
            <button
              className="editor-btn-secondary"
              onClick={handleDeleteSelected}
              title="Delete selected clip (Del)"
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 11, color: '#ef4444' }}
            >
              <Trash2 size={12} /> Delete (Del)
            </button>
          )}
        </div>
        <div className="editor-timeline-toolbar-right">
          <button className="editor-icon-btn" onClick={() => setZoom(ui.zoom * 0.75)} title="Zoom out">
            <ZoomOut size={14} />
          </button>
          <div className="editor-zoom-label">{Math.round(ui.zoom)}px/s</div>
          <button className="editor-icon-btn" onClick={() => setZoom(ui.zoom * 1.33)} title="Zoom in">
            <ZoomIn size={14} />
          </button>
          <button
            className="editor-icon-btn"
            title="Fit timeline to window"
            onClick={() => {
              if (totalDuration > 0 && containerRef.current) {
                const availableWidth = containerRef.current.clientWidth - 180;
                setZoom(Math.max(20, Math.min(300, availableWidth / totalDuration)));
              }
            }}
          >
            <AlignJustify size={14} />
          </button>
        </div>
      </div>

      {/* Timeline scroll area */}
      <div className="editor-timeline-scroll" ref={containerRef}>
        {/* Fixed header column */}
        <div className="editor-timeline-headers">
          <div className="editor-ruler-corner" />
          {project?.tracks.map(track => (
            <div
              key={track.id}
              className="editor-track-header"
              style={{ height: track.height, borderLeft: `3px solid ${TRACK_TYPE_COLORS[track.type] || '#6b7280'}` }}
            >
              <span className="editor-track-name">{track.name}</span>
              <div className="editor-track-controls">
                <button
                  className={`editor-track-btn ${track.muted ? 'active' : ''}`}
                  onClick={() => useEditorStore.getState().toggleTrackMute(track.id)}
                  title="Mute"
                >M</button>
                <button
                  className={`editor-track-btn ${track.locked ? 'active' : ''}`}
                  onClick={() => useEditorStore.getState().toggleTrackLock(track.id)}
                  title="Lock"
                >L</button>
                <button
                  className={`editor-track-btn ${!track.visible ? 'active' : ''}`}
                  onClick={() => useEditorStore.getState().toggleTrackVisibility(track.id)}
                  title="Hide"
                >V</button>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable clip area */}
        <div
          className="editor-timeline-clips-area"
          ref={clipsAreaRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ width: `${totalWidth}px`, cursor: isScrubbing ? 'ew-resize' : 'crosshair' }}
        >
          {/* Ruler */}
          <div
            className="editor-ruler"
            style={{ width: `${totalWidth}px`, touchAction: 'none' }}
          >
            {renderRulerTicks()}
            {/* Playhead thumb on ruler */}
            <div
              className="editor-playhead-ruler"
              style={{ left: `${playheadX}px` }}
            />
          </div>

          {/* Tracks */}
          <div className="editor-tracks-container" style={{ width: `${totalWidth}px` }}>
            {/* Playhead line across all tracks */}
            <div
              className="editor-playhead-line"
              style={{ left: `${playheadX}px` }}
            />

            {project?.tracks.map(track => (
              <TimelineTrack
                key={track.id}
                track={track}
                pxPerSec={PX_PER_SEC}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
