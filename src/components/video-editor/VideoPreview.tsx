import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '@/hooks/useEditorStore';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2,
  Grid3X3, Shrink, ChevronDown
} from 'lucide-react';

function formatTimecode(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * 30);
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
}

export default function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { project, ui, setCurrentTime, setIsPlaying, mediaAssets } = useEditorStore();
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // All video clips on visible video tracks
  const videoClips = (project?.tracks || [])
    .filter(t => t.type === 'video' && t.visible)
    .flatMap(t => t.clips)
    .sort((a, b) => a.start - b.start);

  // Find clip at current playhead
  const currentVideoClip = videoClips.find(
    c => ui.currentTime >= c.start && ui.currentTime < c.start + c.duration
  );

  // Primary video clip (either at playhead, or the first clip on timeline)
  const activeVideoClip = currentVideoClip || videoClips[0] || null;

  // Find the corresponding media asset
  const activeVideoAsset = activeVideoClip
    ? mediaAssets.find(a => a.id === activeVideoClip.mediaId) || null
    : (mediaAssets.find(a => a.type === 'video') || null);

  const totalDuration = project?.duration || (activeVideoClip ? activeVideoClip.start + activeVideoClip.duration : 0) || 0;

  // ── Global Playback Loop ───────────────────────────────────────────────────
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      if (ui.isPlaying) {
        const video = videoRef.current;
        if (video && !video.paused && !video.ended) {
          // Drive timeline from actual video playback if clip is active
          if (currentVideoClip) {
            const calculatedTime = currentVideoClip.start + (video.currentTime - currentVideoClip.trimIn);
            if (!isNaN(calculatedTime)) {
              setCurrentTime(Math.max(0, calculatedTime));
            }
          } else {
            const nextTime = useEditorStore.getState().ui.currentTime + delta;
            if (nextTime >= totalDuration) {
              setCurrentTime(0);
              setIsPlaying(false);
            } else {
              setCurrentTime(nextTime);
            }
          }
        } else {
          const nextTime = useEditorStore.getState().ui.currentTime + delta;
          if (totalDuration > 0 && nextTime >= totalDuration) {
            setCurrentTime(0);
            setIsPlaying(false);
          } else {
            setCurrentTime(nextTime);
          }
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    if (ui.isPlaying) {
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(loop);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [ui.isPlaying, totalDuration, currentVideoClip, setCurrentTime, setIsPlaying]);

  // ── Video Play / Pause Sync ────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeVideoAsset) return;

    if (ui.isPlaying) {
      if (currentVideoClip) {
        const targetTime = Math.max(0, ui.currentTime - currentVideoClip.start + currentVideoClip.trimIn);
        if (Math.abs(video.currentTime - targetTime) > 0.3) {
          video.currentTime = targetTime;
        }
        video.play().catch((err) => {
          console.warn('[VideoPreview] Play error:', err);
        });
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
    }
  }, [ui.isPlaying, activeVideoAsset, currentVideoClip]);

  // ── Seeking / Scrubbing Sync (When Paused) ──────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || ui.isPlaying) return;

    if (currentVideoClip) {
      const targetTime = Math.max(0, ui.currentTime - currentVideoClip.start + currentVideoClip.trimIn);
      if (Math.abs(video.currentTime - targetTime) > 0.05 && isFinite(targetTime)) {
        video.currentTime = targetTime;
      }
    } else if (activeVideoClip && ui.currentTime < activeVideoClip.start) {
      if (video.currentTime !== 0) {
        video.currentTime = 0;
      }
    }
  }, [ui.currentTime, ui.isPlaying, currentVideoClip, activeVideoClip]);

  // ── Volume Sync ────────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = isMuted ? 0 : volume;
      video.muted = isMuted;
    }
  }, [volume, isMuted]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!ui.isPlaying);
  }, [ui.isPlaying, setIsPlaying]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = ratio * (totalDuration || 60);
    setCurrentTime(newTime);
  }, [totalDuration, setCurrentTime]);

  // Spacebar hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        handlePlayPause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause]);

  const progressPercent = totalDuration > 0 ? Math.min(100, (ui.currentTime / totalDuration) * 100) : 0;

  // ── Speed Sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const targetSpeed = activeVideoClip?.speed || 1;
      if (video.playbackRate !== targetSpeed) {
        video.playbackRate = Math.max(0.1, Math.min(4, targetSpeed));
      }
    }
  }, [activeVideoClip?.speed]);

  // Visual filter and transform
  const colorGrade = activeVideoClip?.colorGrade;
  const transform = activeVideoClip?.transform;

  const colorFilter = colorGrade ? [
    `brightness(${100 + (colorGrade.exposure || 0)}%)`,
    `contrast(${100 + (colorGrade.contrast || 0)}%)`,
    `saturate(${100 + (colorGrade.saturation || 0)}%)`,
    colorGrade.temperature ? `sepia(${Math.max(0, colorGrade.temperature) * 0.4}%)` : '',
    colorGrade.tint ? `hue-rotate(${colorGrade.tint * 1.8}deg)` : '',
  ].filter(Boolean).join(' ') : 'none';

  // Active effects & transitions
  const hasSwipe = activeVideoClip?.effects?.some(e => e.type === 'swipe' || e.type === 'whip' || e.params?.type === 'swipe') ||
                   activeVideoClip?.transitionIn?.type === 'whip' ||
                   activeVideoClip?.transitionIn?.type === 'cross_dissolve';

  // Check if a punch-in or zoom effect is active at current timestamp
  const activeZoomEffect = activeVideoClip?.effects?.find(e => e.type === 'punch_in' || e.type === 'zoom' || e.type === 'zoom_in');
  let isZoomActive = false;
  let zoomScaleMultiplier = 1;

  if (activeZoomEffect && activeVideoClip) {
    const efStartTime = typeof activeZoomEffect.params?.startTime === 'number'
      ? Number(activeZoomEffect.params.startTime)
      : activeVideoClip.start;
    const efDuration = typeof activeZoomEffect.params?.duration === 'number'
      ? Number(activeZoomEffect.params.duration)
      : activeVideoClip.duration;
    const targetScale = typeof activeZoomEffect.params?.scale === 'number'
      ? Number(activeZoomEffect.params.scale)
      : 1.25;

    // Active if within time window or if clip itself is the isolated cut segment
    if (ui.currentTime >= efStartTime && ui.currentTime <= efStartTime + efDuration) {
      isZoomActive = true;
      zoomScaleMultiplier = targetScale;
    } else if (activeVideoClip.duration <= 4) {
      isZoomActive = true;
      zoomScaleMultiplier = targetScale;
    }
  }

  // Camera Shake effect
  const activeShakeEffect = activeVideoClip?.effects?.find(e => e.type === 'shake');
  const isShakeActive = !!activeShakeEffect;
  const shakeOffsetX = isShakeActive ? Math.sin(ui.currentTime * 50) * 4 : 0;
  const shakeOffsetY = isShakeActive ? Math.cos(ui.currentTime * 50) * 4 : 0;

  // Swipe transition window (first 0.7s of the clip)
  const timeSinceClipStart = activeVideoClip ? Math.max(0, ui.currentTime - activeVideoClip.start) : 0;
  const isSwipeActive = hasSwipe && timeSinceClipStart < 0.7 && activeVideoClip && activeVideoClip.start > 0;
  const swipeProgress = isSwipeActive ? timeSinceClipStart / 0.7 : 1;

  // Compute animated swipe translation and motion blur
  const swipeTranslateX = isSwipeActive ? (1 - swipeProgress) * -100 : 0;
  const swipeBlur = isSwipeActive ? (1 - swipeProgress) * 10 : 0;

  const baseScaleX = (transform?.scaleX || 1) * (isZoomActive ? zoomScaleMultiplier : 1);
  const baseScaleY = (transform?.scaleY || 1) * (isZoomActive ? zoomScaleMultiplier : 1);
  const baseTranslateX = (transform?.x || 0) + swipeTranslateX + shakeOffsetX;
  const baseTranslateY = (transform?.y || 0) + shakeOffsetY;
  const baseRotation = (transform?.rotation || 0);

  const videoTransformStyle: React.CSSProperties = {
    filter: `${colorFilter} ${swipeBlur > 0 ? `blur(${swipeBlur}px)` : ''}`.trim(),
    transform: `translate(${baseTranslateX}px, ${baseTranslateY}px) rotate(${baseRotation}deg) scale(${baseScaleX}, ${baseScaleY})`,
    opacity: transform && typeof transform.opacity === 'number' ? transform.opacity / 100 : 1,
    transition: ui.isPlaying ? 'none' : 'filter 0.15s ease, transform 0.15s ease, opacity 0.15s ease',
  };

  // Find any active caption or text clip at the current playhead
  const activeTextClip = project?.tracks
    .filter(t => (t.type === 'text' || t.type === 'caption') && t.visible)
    .flatMap(t => t.clips)
    .find(c => ui.currentTime >= c.start && ui.currentTime <= c.start + c.duration);

  return (
    <div className="editor-preview">
      {/* Aspect ratio header */}
      <div className="editor-preview-header">
        <div className="editor-timecode">{formatTimecode(ui.currentTime)}</div>
        <div className="editor-preview-controls-top">
          <button className="editor-aspect-btn">
            {ui.previewAspectRatio || '16:9'} <ChevronDown size={12} />
          </button>
          <button className="editor-icon-btn" title="Safe zones"><Grid3X3 size={14} /></button>
          <button className="editor-icon-btn" title="Fit to window"><Shrink size={14} /></button>
          <button className="editor-icon-btn" title="Fullscreen"><Maximize2 size={14} /></button>
        </div>
        <div className="editor-timecode editor-timecode-total">{formatTimecode(totalDuration)}</div>
      </div>

      {/* Video canvas area */}
      <div className="editor-preview-canvas" onClick={handlePlayPause}>
        {activeVideoAsset ? (
          <>
            <video
              ref={videoRef}
              src={activeVideoAsset.url}
              className="editor-video-element"
              style={videoTransformStyle}
              onLoadedMetadata={() => {
                setVideoLoaded(true);
                setVideoError(null);
              }}
              onError={(e) => {
                console.error('[VideoPreview] Failed to load video:', activeVideoAsset.url, e);
                setVideoError('Unable to load video source');
              }}
              onEnded={() => setIsPlaying(false)}
              playsInline
              crossOrigin="anonymous"
            />
            {isSwipeActive && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(130, 0, 219, 0.5), rgba(0, 212, 255, 0.7), transparent)',
                  transform: `translateX(${(swipeProgress - 0.5) * 200}%)`,
                  pointerEvents: 'none',
                  zIndex: 10,
                  filter: 'blur(4px)',
                }}
              />
            )}
            {videoError && (
              <div className="editor-preview-empty">
                <p style={{ color: '#ef4444' }}>{videoError}</p>
              </div>
            )}
          </>
        ) : (
          <div className="editor-preview-empty">
            <div className="editor-preview-empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
            <p>Drag a video onto the timeline to begin</p>
          </div>
        )}

        {/* Dynamic captions / text overlay */}
        {activeTextClip && (
          <div
            className="editor-caption-overlay"
            style={{
              position: 'absolute',
              bottom: '12%',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              color: '#ffffff',
              padding: '6px 16px',
              borderRadius: '6px',
              fontSize: '18px',
              fontWeight: 700,
              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
              pointerEvents: 'none',
              maxWidth: '85%',
              textAlign: 'center',
            }}
          >
            {activeTextClip.name}
          </div>
        )}
      </div>

      {/* Transport controls */}
      <div className="editor-preview-transport">
        {/* Progress bar */}
        <div className="editor-progress-bar" onClick={handleProgressClick}>
          <div className="editor-progress-fill" style={{ width: `${progressPercent}%` }} />
          <div className="editor-progress-thumb" style={{ left: `${progressPercent}%` }} />
        </div>

        {/* Controls row */}
        <div className="editor-transport-row">
          <div className="editor-transport-left">
            <button className="editor-icon-btn" onClick={() => setCurrentTime(0)} title="Skip to start (Home)">
              <SkipBack size={16} />
            </button>
            <button className="editor-play-btn" onClick={handlePlayPause} title="Play/Pause (Space)">
              {ui.isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button className="editor-icon-btn" onClick={() => setCurrentTime(totalDuration)} title="Skip to end (End)">
              <SkipForward size={16} />
            </button>
          </div>

          <div className="editor-transport-center">
            <span className="editor-timecode-inline">{formatTimecode(ui.currentTime)}</span>
            <span className="editor-timecode-sep">/</span>
            <span className="editor-timecode-inline editor-timecode-dim">{formatTimecode(totalDuration)}</span>
          </div>

          <div className="editor-transport-right">
            <button
              className="editor-icon-btn"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="editor-volume-slider"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
