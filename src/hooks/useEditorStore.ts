import { create } from 'zustand';
import type { 
  TimelineProject, Track, Clip, MediaAsset, EditPlan, EditorUIState, 
  ToolMode, AspectRatio, TrackType 
} from '@/types/editor';

// ─── Default values ──────────────────────────────────────────────────────────

const defaultExportSettings = {
  preset: 'youtube' as const,
  format: 'mp4' as const,
  resolution: { width: 1920, height: 1080 },
  fps: 30,
  videoBitrate: 8000,
  audioBitrate: 192,
  codec: 'h264' as const,
  aspectRatio: '16:9' as const,
};

const createDefaultTracks = (): Track[] => [
  { id: 'track-video-1', type: 'video', name: 'Video 1', clips: [], muted: false, locked: false, solo: false, visible: true, height: 64, color: '#8b5cf6' },
  { id: 'track-overlay-1', type: 'overlay', name: 'Overlay', clips: [], muted: false, locked: false, solo: false, visible: true, height: 48, color: '#06b6d4' },
  { id: 'track-text-1', type: 'text', name: 'Titles', clips: [], muted: false, locked: false, solo: false, visible: true, height: 40, color: '#3b82f6' },
  { id: 'track-caption-1', type: 'caption', name: 'Captions', clips: [], muted: false, locked: false, solo: false, visible: true, height: 40, color: '#10b981' },
  { id: 'track-audio-1', type: 'voice', name: 'Audio 1', clips: [], muted: false, locked: false, solo: false, visible: true, height: 56, volume: 100, color: '#22c55e' },
  { id: 'track-music-1', type: 'music', name: 'Music', clips: [], muted: false, locked: false, solo: false, visible: true, height: 48, volume: 80, color: '#ec4899' },
  { id: 'track-sfx-1', type: 'sfx', name: 'SFX', clips: [], muted: false, locked: false, solo: false, visible: true, height: 40, volume: 100, color: '#f59e0b' },
];

// ─── State Shape ─────────────────────────────────────────────────────────────

export interface EditorState {
  // Project
  project: TimelineProject | null;
  mediaAssets: MediaAsset[];

  // UI State
  ui: EditorUIState;

  // Actions — Project
  loadProject: (project: TimelineProject) => void;
  setMediaAssets: (assets: MediaAsset[]) => void;
  createNewProject: (name: string, userId: string) => TimelineProject;
  updateProjectName: (name: string) => void;

  // Actions — Tracks
  addTrack: (type: TrackType) => void;
  removeTrack: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackSolo: (trackId: string) => void;
  toggleTrackVisibility: (trackId: string) => void;

  // Actions — Clips
  addClip: (trackId: string, clip: Clip) => void;
  removeClip: (clipId: string) => void;
  moveClip: (clipId: string, newStart: number, newTrackId?: string) => void;
  trimClip: (clipId: string, trimIn: number, trimOut: number) => void;
  splitClip: (clipId: string, splitTime: number) => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  selectClip: (clipId: string, multi?: boolean) => void;
  clearSelection: () => void;

  // Actions — Media
  addMediaAsset: (asset: MediaAsset) => void;
  removeMediaAsset: (assetId: string) => void;

  // Actions — Edit Plan
  setPendingEditPlan: (plan: EditPlan | null) => void;
  applyEditPlan: (plan: EditPlan) => void;

  // Actions — UI
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;
  setActiveTool: (tool: ToolMode) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  togglePanel: (panel: 'mediaLibrary' | 'inspector' | 'aiPanel' | 'transcript') => void;
  setShowEditPlanModal: (show: boolean) => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─── Store ───────────────────────────────────────────────────────────────────

export const useEditorStore = create<EditorState>()(
  (set, get) => ({
    project: null,
    mediaAssets: [],

      ui: {
        currentTime: 0,
        isPlaying: false,
        playbackRate: 1,
        volume: 100,
        zoom: 100, // px per second
        scrollX: 0,
        scrollY: 0,
        selectedClipIds: [],
        selectedTrackId: null,
        activeTool: 'select',
        showMediaLibrary: true,
        showInspector: true,
        showAIPanel: true,
        showTranscript: false,
        previewAspectRatio: '16:9',
        showSafeZones: false,
        showGrid: false,
        pendingEditPlan: null,
        showEditPlanModal: false,
      },

      // ─── Project ─────────────────────────────────────────────────────────

      loadProject: (project) => set({ project }),
      setMediaAssets: (mediaAssets) => set({ mediaAssets }),

      createNewProject: (name, userId) => {
        const project: TimelineProject = {
          id: generateId(),
          name,
          userId,
          tracks: createDefaultTracks(),
          duration: 0,
          fps: 30,
          width: 1920,
          height: 1080,
          aspectRatio: '16:9',
          markers: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          exportSettings: defaultExportSettings,
        };
        set({ project });
        return project;
      },

      updateProjectName: (name) =>
        set((s) => s.project ? { project: { ...s.project, name } } : {}),

      // ─── Tracks ──────────────────────────────────────────────────────────

      addTrack: (type) =>
        set((s) => {
          if (!s.project) return {};
          const newTrack: Track = {
            id: generateId(),
            type,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${s.project.tracks.filter(t => t.type === type).length + 1}`,
            clips: [],
            muted: false,
            locked: false,
            solo: false,
            visible: true,
            height: type === 'video' ? 64 : type === 'audio' || type === 'music' ? 56 : 40,
          };
          return { project: { ...s.project, tracks: [...s.project.tracks, newTrack] } };
        }),

      removeTrack: (trackId) =>
        set((s) => {
          if (!s.project) return {};
          return { project: { ...s.project, tracks: s.project.tracks.filter(t => t.id !== trackId) } };
        }),

      toggleTrackMute: (trackId) =>
        set((s) => {
          if (!s.project) return {};
          return { project: { ...s.project, tracks: s.project.tracks.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t) } };
        }),

      toggleTrackLock: (trackId) =>
        set((s) => {
          if (!s.project) return {};
          return { project: { ...s.project, tracks: s.project.tracks.map(t => t.id === trackId ? { ...t, locked: !t.locked } : t) } };
        }),

      toggleTrackSolo: (trackId) =>
        set((s) => {
          if (!s.project) return {};
          return { project: { ...s.project, tracks: s.project.tracks.map(t => t.id === trackId ? { ...t, solo: !t.solo } : t) } };
        }),

      toggleTrackVisibility: (trackId) =>
        set((s) => {
          if (!s.project) return {};
          return { project: { ...s.project, tracks: s.project.tracks.map(t => t.id === trackId ? { ...t, visible: !t.visible } : t) } };
        }),

      // ─── Clips ───────────────────────────────────────────────────────────

      addClip: (trackId, clip) =>
        set((s) => {
          if (!s.project) return {};
          const tracks = s.project.tracks.map(t =>
            t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
          );
          const duration = Math.max(s.project.duration, clip.start + clip.duration);
          return { project: { ...s.project, tracks, duration } };
        }),

      removeClip: (clipId) =>
        set((s) => {
          if (!s.project) return {};
          const tracks = s.project.tracks.map(t => ({
            ...t,
            clips: t.clips.filter(c => c.id !== clipId),
          }));
          return { project: { ...s.project, tracks } };
        }),

      moveClip: (clipId, newStart, newTrackId) =>
        set((s) => {
          if (!s.project) return {};
          let clip: Clip | null = null;
          let sourceTrackId: string | null = null;
          for (const track of s.project.tracks) {
            const found = track.clips.find(c => c.id === clipId);
            if (found) { clip = found; sourceTrackId = track.id; break; }
          }
          if (!clip || !sourceTrackId) return {};
          const targetTrackId = newTrackId || sourceTrackId;
          const tracks = s.project.tracks.map(t => {
            if (t.id === sourceTrackId && t.id !== targetTrackId) {
              return { ...t, clips: t.clips.filter(c => c.id !== clipId) };
            }
            if (t.id === targetTrackId) {
              const filtered = t.clips.filter(c => c.id !== clipId);
              return { ...t, clips: [...filtered, { ...clip!, start: Math.max(0, newStart), trackId: targetTrackId }] };
            }
            return t;
          });
          return { project: { ...s.project, tracks } };
        }),

      trimClip: (clipId, trimIn, trimOut) =>
        set((s) => {
          if (!s.project) return {};
          const tracks = s.project.tracks.map(t => ({
            ...t,
            clips: t.clips.map(c => c.id === clipId ? { ...c, trimIn, trimOut } : c),
          }));
          return { project: { ...s.project, tracks } };
        }),

      splitClip: (clipId, splitTime) =>
        set((s) => {
          if (!s.project) return {};
          let tracks = s.project.tracks;
          for (const track of tracks) {
            const clip = track.clips.find(c => c.id === clipId);
            if (!clip) continue;
            const splitRelative = splitTime - clip.start;
            if (splitRelative <= 0 || splitRelative >= clip.duration) break;
            const clipA: Clip = { ...clip, duration: splitRelative };
            const clipB: Clip = { ...clip, id: generateId(), start: splitTime, duration: clip.duration - splitRelative, trimIn: clip.trimIn + splitRelative };
            tracks = tracks.map(t => t.id === track.id
              ? { ...t, clips: t.clips.filter(c => c.id !== clipId).concat([clipA, clipB]) }
              : t
            );
            break;
          }
          return { project: { ...s.project, tracks } };
        }),

      updateClip: (clipId, updates) =>
        set((s) => {
          if (!s.project) return {};
          const tracks = s.project.tracks.map(t => ({
            ...t,
            clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c),
          }));
          return { project: { ...s.project, tracks } };
        }),

      selectClip: (clipId, multi = false) =>
        set((s) => ({
          ui: {
            ...s.ui,
            selectedClipIds: multi
              ? s.ui.selectedClipIds.includes(clipId)
                ? s.ui.selectedClipIds.filter(id => id !== clipId)
                : [...s.ui.selectedClipIds, clipId]
              : [clipId],
          },
        })),

      clearSelection: () =>
        set((s) => ({ ui: { ...s.ui, selectedClipIds: [], selectedTrackId: null } })),

      // ─── Media ───────────────────────────────────────────────────────────

      addMediaAsset: (asset) =>
        set((s) => ({ mediaAssets: [...s.mediaAssets, asset] })),

      removeMediaAsset: (assetId) =>
        set((s) => ({ mediaAssets: s.mediaAssets.filter(a => a.id !== assetId) })),

      // ─── Edit Plan ───────────────────────────────────────────────────────

      setPendingEditPlan: (plan) =>
        set((s) => ({ ui: { ...s.ui, pendingEditPlan: plan, showEditPlanModal: !!plan } })),

      applyEditPlan: (plan) => {
        const { project } = get();
        if (!project) return;

        // Apply accepted operations to timeline state
        for (const op of plan.operations) {
          if (op.accepted === false) continue;

          const allClips = project.tracks.flatMap(t => t.clips);
          const targetClipIds = (op.clipIds && op.clipIds.length > 0)
            ? op.clipIds
            : allClips.map(c => c.id);

          switch (op.operation) {
            case 'delete_clip':
              if (op.clipIds) op.clipIds.forEach(id => get().removeClip(id));
              break;

            case 'move_clip':
              if (op.clipIds?.[0]) {
                get().moveClip(op.clipIds[0], Number(op.params.start) || 0, op.params.trackId as string | undefined);
              }
              break;

            case 'trim_clip':
              if (op.clipIds?.[0]) {
                get().trimClip(op.clipIds[0], Number(op.params.trimIn) || 0, Number(op.params.trimOut) || 0);
              }
              break;

            case 'split_clip':
              if (op.clipIds?.[0]) {
                get().splitClip(op.clipIds[0], Number(op.params.time) || 0);
              }
              break;

            case 'set_speed': {
              const speed = Number(op.params.speed) || Number(op.params.playbackRate) || 1;
              targetClipIds.forEach(id => {
                const clip = allClips.find(c => c.id === id);
                if (clip) {
                  get().updateClip(id, { speed, duration: clip.duration / speed });
                }
              });
              break;
            }

            case 'color_grade': {
              const grade = (op.params.colorGrade || op.params) as Record<string, number>;
              const colorGrade = {
                exposure: Number(grade.exposure) || 0,
                contrast: Number(grade.contrast) || (grade.style === 'cinematic' ? 25 : 0),
                saturation: Number(grade.saturation) || (grade.style === 'cinematic' ? 20 : 0),
                temperature: Number(grade.temperature) || (grade.style === 'cinematic' ? 10 : 0),
                tint: Number(grade.tint) || 0,
                highlights: Number(grade.highlights) || 0,
                shadows: Number(grade.shadows) || 0,
                sharpness: Number(grade.sharpness) || 15,
                vignette: Number(grade.vignette) || (grade.style === 'cinematic' ? 20 : 0),
                grain: Number(grade.grain) || 0,
              };
              targetClipIds.forEach(id => {
                get().updateClip(id, { colorGrade });
              });
              break;
            }

            case 'add_transition': {
              const transType = (op.params.type as any) || 'whip';
              const duration = Number(op.params.duration) || 0.8;
              const transition = {
                id: `trans_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                type: transType,
                duration,
                easing: 'ease-in-out' as const,
              };
              targetClipIds.forEach(id => {
                get().updateClip(id, {
                  transitionIn: transition,
                  transitionOut: transition,
                  effects: [
                    ...(allClips.find(c => c.id === id)?.effects || []).filter(e => e.type !== 'swipe'),
                    { id: `fx_swipe_${Date.now()}`, type: 'swipe', enabled: true, params: { type: 'swipe', duration } }
                  ]
                });
              });
              break;
            }

            case 'add_effect': {
              const effectType = (op.params.type as string) || (op.params.effect as string) || 'swipe';
              const effect = {
                id: `fx_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                type: effectType,
                enabled: true,
                params: op.params,
              };
              targetClipIds.forEach(id => {
                const clip = allClips.find(c => c.id === id);
                if (clip) {
                  get().updateClip(id, {
                    effects: [...(clip.effects || []).filter(e => e.type !== effectType), effect],
                    ...(effectType === 'punch_in' ? {
                      transform: {
                        ...clip.transform,
                        scaleX: clip.transform.scaleX * 1.15,
                        scaleY: clip.transform.scaleY * 1.15,
                      }
                    } : {})
                  });
                }
              });
              break;
            }

            case 'remove_effect': {
              targetClipIds.forEach(id => {
                get().updateClip(id, { effects: [] });
              });
              break;
            }

            case 'set_volume': {
              const volume = Number(op.params.volume) || 100;
              targetClipIds.forEach(id => {
                const clip = allClips.find(c => c.id === id);
                if (clip) {
                  get().updateClip(id, { audio: { ...(clip.audio || {}), volume } });
                }
              });
              break;
            }

            case 'normalize_audio': {
              targetClipIds.forEach(id => {
                const clip = allClips.find(c => c.id === id);
                if (clip) {
                  get().updateClip(id, { audio: { ...(clip.audio || {}), normalize: true, volume: 100 } });
                }
              });
              break;
            }

            case 'remove_silence':
            case 'remove_filler_words': {
              // Shorten clips by trimming/reducing duration
              targetClipIds.forEach(id => {
                const clip = allClips.find(c => c.id === id);
                if (clip && clip.duration > 3) {
                  const cutAmount = Math.min(clip.duration * 0.15, 3);
                  get().updateClip(id, { duration: Math.max(1, clip.duration - cutAmount) });
                }
              });
              break;
            }

            case 'add_caption':
            case 'add_text': {
              const textTrack = project.tracks.find(t => t.type === 'text' || t.type === 'caption');
              if (textTrack) {
                const newClip: Clip = {
                  id: `text_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                  trackId: textTrack.id,
                  mediaId: 'text_asset',
                  name: (op.params.text as string) || (op.params.style as string) || 'Dynamic Captions',
                  start: 0,
                  duration: project.duration || 10,
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
                get().addClip(textTrack.id, newClip);
              }
              break;
            }

            case 'update_clip':
              if (op.clipIds?.[0]) get().updateClip(op.clipIds[0], op.params as Partial<Clip>);
              break;

            default:
              break;
          }
        }
        set((s) => ({ ui: { ...s.ui, pendingEditPlan: null, showEditPlanModal: false } }));
      },

      // ─── UI ──────────────────────────────────────────────────────────────

      setCurrentTime: (time) =>
        set((s) => ({ ui: { ...s.ui, currentTime: Math.max(0, time) } })),

      setIsPlaying: (playing) =>
        set((s) => ({ ui: { ...s.ui, isPlaying: playing } })),

      setZoom: (zoom) =>
        set((s) => ({ ui: { ...s.ui, zoom: Math.max(10, Math.min(zoom, 1000)) } })),

      setActiveTool: (tool) =>
        set((s) => ({ ui: { ...s.ui, activeTool: tool } })),

      setAspectRatio: (ratio) =>
        set((s) => ({ ui: { ...s.ui, previewAspectRatio: ratio } })),

      togglePanel: (panel) =>
        set((s) => {
          const map = {
            mediaLibrary: 'showMediaLibrary',
            inspector: 'showInspector',
            aiPanel: 'showAIPanel',
            transcript: 'showTranscript',
          } as const;
          const key = map[panel];
          return { ui: { ...s.ui, [key]: !s.ui[key] } };
        }),

      setShowEditPlanModal: (show) =>
        set((s) => ({ ui: { ...s.ui, showEditPlanModal: show } })),
  })
);
