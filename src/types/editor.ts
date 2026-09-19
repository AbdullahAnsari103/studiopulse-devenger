// ─── Studio Pulse AI Video Editor — Complete Type System ───────────────────

export type TrackType = "video" | "overlay" | "text" | "caption" | "voice" | "music" | "sfx" | "adjustment";
export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5" | "4:3" | "custom";
export type ExportFormat = "mp4" | "webm";
export type ExportPreset = "youtube" | "youtube_shorts" | "tiktok" | "instagram" | "instagram_reels" | "linkedin" | "custom";
export type JobStatus = "pending" | "processing" | "complete" | "error" | "cancelled";
export type ToolMode = "select" | "cut" | "split" | "trim" | "ripple" | "text" | "marker";
export type EasingType = "linear" | "ease-in" | "ease-out" | "ease-in-out" | "bounce" | "spring";
export type EditOperationType = "trim_clip" | "split_clip" | "delete_clip" | "move_clip" | "set_speed" | "remove_silence" | "remove_filler_words" | "add_caption" | "add_effect" | "remove_effect" | "set_volume" | "add_transition" | "color_grade" | "add_marker" | "set_keyframe" | "add_text" | "audio_duck" | "normalize_audio";

export interface Keyframe { id: string; time: number; property: string; value: number | string; easing: EasingType; }
export interface Effect { id: string; type: string; enabled: boolean; params: Record<string, number | string | boolean>; keyframes?: Keyframe[]; }
export interface Transition { id: string; type: "cross_dissolve" | "fade" | "dip_black" | "zoom" | "whip" | "glitch" | "blur" | "light_leak"; duration: number; easing: EasingType; }
export interface AudioSettings { volume: number; fadeIn: number; fadeOut: number; muted: boolean; normalize: boolean; noiseReduction: boolean; }
export interface VideoTransform { x: number; y: number; scaleX: number; scaleY: number; rotation: number; opacity: number; cropTop: number; cropBottom: number; cropLeft: number; cropRight: number; }
export interface ColorGrade { exposure: number; contrast: number; saturation: number; temperature: number; tint: number; highlights: number; shadows: number; sharpness: number; vignette: number; grain: number; lut?: string; }
export interface WordTimestamp { word: string; start: number; end: number; confidence?: number; isFiller?: boolean; isSilence?: boolean; }
export interface SilenceRegion { start: number; end: number; duration: number; }
export interface TranscriptSegment { id: string; text: string; start: number; end: number; words: WordTimestamp[]; speaker?: string; }
export interface Transcript { clipId: string; segments: TranscriptSegment[]; fullText: string; language: string; duration: number; silenceRegions: SilenceRegion[]; fillerWords: WordTimestamp[]; }
export interface CaptionStyle { preset: string; fontFamily: string; fontSize: number; fontWeight: number; color: string; backgroundColor?: string; shadow?: boolean; glow?: boolean; position: "top" | "center" | "bottom"; alignment: "left" | "center" | "right"; }
export interface Caption { id: string; text: string; startTime: number; endTime: number; style: CaptionStyle; words?: WordTimestamp[]; }

export interface Clip { id: string; trackId: string; mediaId: string; name: string; start: number; duration: number; trimIn: number; trimOut: number; transform: VideoTransform; colorGrade?: ColorGrade; audio: AudioSettings; effects: Effect[]; keyframes: Keyframe[]; transitionIn?: Transition; transitionOut?: Transition; speed: number; reverse: boolean; locked: boolean; selected: boolean; groupId?: string; }
export interface TextClip extends Clip { text: string; style: { fontFamily: string; fontSize: number; fontWeight: number; color: string; backgroundColor?: string; padding: number; borderRadius: number; }; }
export interface CaptionClip extends Clip { captions: Caption[]; transcript?: Transcript; }

export interface Track { id: string; type: TrackType; name: string; clips: Clip[]; muted: boolean; locked: boolean; solo: boolean; visible: boolean; height: number; volume?: number; color?: string; }
export interface TimelineMarker { id: string; time: number; label: string; color: string; type: "chapter" | "ai" | "manual" | "scene"; }
export interface ExportSettings { preset: ExportPreset; format: ExportFormat; resolution: { width: number; height: number }; fps: number; videoBitrate: number; audioBitrate: number; codec: "h264" | "h265" | "vp9"; aspectRatio: AspectRatio; }

export interface TimelineProject { id: string; name: string; userId: string; tracks: Track[]; duration: number; fps: 24 | 30 | 60; width: number; height: number; aspectRatio: AspectRatio; markers: TimelineMarker[]; createdAt: string; updatedAt: string; version: number; exportSettings: ExportSettings; }

export interface MediaAsset { id: string; projectId: string; name: string; type: "video" | "audio" | "image" | "font" | "lut"; url: string; localPath?: string; duration?: number; width?: number; height?: number; fileSize: number; mimeType: string; thumbnail?: string; waveformData?: number[]; transcript?: Transcript; uploadedAt: string; }

export interface EditOperation { id: string; operation: EditOperationType; description: string; params: Record<string, unknown>; clipIds?: string[]; accepted?: boolean; }
export interface EditPlan { id: string; projectId: string; prompt: string; operations: EditOperation[]; summary: string; estimatedDurationChange: number; createdAt: string; appliedAt?: string; }

export interface EditorJob { id: string; projectId: string; type: "transcribe" | "analyze" | "render" | "export" | "ai_command"; status: JobStatus; progress: number; message: string; result?: unknown; error?: string; createdAt: string; updatedAt: string; }

export interface EditorUIState { currentTime: number; isPlaying: boolean; playbackRate: number; volume: number; zoom: number; scrollX: number; scrollY: number; selectedClipIds: string[]; selectedTrackId: string | null; activeTool: ToolMode; showMediaLibrary: boolean; showInspector: boolean; showAIPanel: boolean; showTranscript: boolean; previewAspectRatio: AspectRatio; showSafeZones: boolean; showGrid: boolean; pendingEditPlan: EditPlan | null; showEditPlanModal: boolean; }
