import React, { useRef, useState, useCallback } from 'react';
import { useEditorStore } from '@/hooks/useEditorStore';
import type { Track, Clip } from '@/types/editor';
import TimelineClip from './TimelineClip';

interface Props {
  track: Track;
  pxPerSec: number;
}

export default function TimelineTrack({ track, pxPerSec }: Props) {
  const { addClip, moveClip, mediaAssets } = useEditorStore();
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const assetId = e.dataTransfer.getData('assetId');
    const clipId = e.dataTransfer.getData('clipId');

    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dropX = e.clientX - rect.left;
    const dropTime = Math.max(0, dropX / pxPerSec);

    if (clipId) {
      // Moving existing clip
      moveClip(clipId, dropTime, track.id);
      return;
    }

    if (assetId) {
      // Adding new clip from media library
      const asset = mediaAssets.find(a => a.id === assetId);
      if (!asset) return;

      const newClip: Clip = {
        id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        trackId: track.id,
        mediaId: asset.id,
        name: asset.name,
        start: dropTime,
        duration: asset.duration || 10,
        trimIn: 0,
        trimOut: 0,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 100, cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 },
        audio: { volume: 100, fadeIn: 0, fadeOut: 0, muted: false, normalize: false, noiseReduction: false },
        effects: [],
        keyframes: [],
        speed: 1,
        reverse: false,
        locked: false,
        selected: false,
      };
      addClip(track.id, newClip);
    }
  }, [track.id, pxPerSec, addClip, moveClip, mediaAssets]);

  return (
    <div
      ref={trackRef}
      className={`editor-track ${isDragOver ? 'drag-over' : ''} ${track.muted ? 'muted' : ''} ${!track.visible ? 'hidden' : ''}`}
      style={{ height: track.height }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {track.clips.map(clip => (
        <TimelineClip
          key={clip.id}
          clip={clip}
          track={track}
          pxPerSec={pxPerSec}
        />
      ))}

      {track.clips.length === 0 && (
        <div className="editor-track-empty">
          {track.type === 'video' ? 'Drag video here' :
            track.type === 'music' ? 'Drag music here' :
              track.type === 'sfx' ? 'Drag SFX here' : ''}
        </div>
      )}
    </div>
  );
}
