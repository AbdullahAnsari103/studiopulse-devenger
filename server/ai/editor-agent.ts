/**
 * AI Editor Agent — Complete, World-Class Autonomous Video Co-Pilot
 *
 * Capabilities:
 * - Momentary & Targeted Effects (Zoom at Xs, Punch-in, Shake, Glitch, Flash, Slow-Mo)
 * - Transitions (Swipe, Whip Pan, Dissolve, Zoom Blur, Fade)
 * - Intelligent Time Parsing & Segment Isolation
 * - Cinematic Color Grading (Matrix, Hollywood, Cyberpunk, Film Noir, Vintage)
 * - Dynamic Subtitles & Viral Animated Captions
 * - Pacing, Jump Cuts & Silence Removal
 * - Audio Mastering, Volume Ducking & Normalization
 * - Multi-Track Video Composition
 */

import { callGemini } from './gemini.js';

// ─── Types ───────────────────────────────────────────────────────────────────
export type EditOperationType =
  | 'trim_clip' | 'split_clip' | 'delete_clip' | 'move_clip' | 'set_speed'
  | 'remove_silence' | 'remove_filler_words' | 'add_caption' | 'add_effect'
  | 'remove_effect' | 'set_volume' | 'add_transition' | 'color_grade'
  | 'add_marker' | 'set_keyframe' | 'add_text' | 'audio_duck' | 'normalize_audio'
  | 'update_clip';

export interface EditOperation {
  id: string;
  operation: EditOperationType;
  description: string;
  params: Record<string, unknown>;
  clipIds?: string[];
  accepted?: boolean;
}

export interface EditPlan {
  id: string;
  projectId: string;
  prompt: string;
  operations: EditOperation[];
  summary: string;
  estimatedDurationChange: number;
  createdAt: string;
  appliedAt?: string;
}

export interface TimelineProject {
  id: string;
  duration: number;
  fps: number;
  tracks: Array<{
    id: string;
    type: string;
    name: string;
    clips: Array<{
      id: string;
      name: string;
      start: number;
      duration: number;
      speed: number;
      trimIn?: number;
      trimOut?: number;
    }>;
  }>;
}

const generateId = () => `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const ALLOWED_OPERATIONS = new Set<EditOperationType>([
  'trim_clip', 'split_clip', 'delete_clip', 'move_clip', 'set_speed',
  'remove_silence', 'remove_filler_words', 'add_caption', 'add_effect',
  'remove_effect', 'set_volume', 'add_transition', 'color_grade',
  'add_marker', 'set_keyframe', 'add_text', 'audio_duck', 'normalize_audio',
  'update_clip',
]);

// ─── Intelligent Timecode Resolver ───────────────────────────────────────────
export function parseTimeToSeconds(timeStr: string | number, projectDuration: number): number {
  if (typeof timeStr === 'number') {
    return Math.max(0, Math.min(timeStr, projectDuration || 60));
  }
  const str = String(timeStr).trim().toLowerCase();
  
  if (str.endsWith('%')) {
    const pct = parseFloat(str) / 100;
    return Math.max(0, Math.min(pct * (projectDuration || 60), projectDuration || 60));
  }

  // Handle standard MM:SS:FF or HH:MM:SS or MM:SS.ms
  const parts = str.replace(/[^\d:.]/g, '').split(':').map(Number);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const asHoursMinutesSeconds = a * 3600 + b * 60 + c;
    if (asHoursMinutesSeconds <= projectDuration && asHoursMinutesSeconds > 0) {
      return asHoursMinutesSeconds;
    }
    const asMinutesSecondsFrames = a * 60 + b + (c / 30);
    return Math.max(0, Math.min(asMinutesSecondsFrames, projectDuration));
  } else if (parts.length === 2) {
    const [a, b] = parts;
    const total = a * 60 + b;
    if (total <= projectDuration) return total;
    return Math.max(0, Math.min(a + (b / 30), projectDuration));
  } else if (parts.length === 1 && !isNaN(parts[0])) {
    return Math.max(0, Math.min(parts[0], projectDuration || 60));
  }

  return Math.min(1, projectDuration / 2);
}

// ─── Validate & Normalize Operations ─────────────────────────────────────────
function validateOperations(ops: unknown[], projectDuration: number): EditOperation[] {
  if (!Array.isArray(ops)) return [];
  return ops
    .filter(op => {
      if (typeof op !== 'object' || !op) return false;
      const o = op as Record<string, unknown>;
      return ALLOWED_OPERATIONS.has(o.operation as EditOperationType);
    })
    .map((op, i) => {
      const o = op as Record<string, unknown>;
      const params = (o.params ?? {}) as Record<string, unknown>;

      if (params.time !== undefined) {
        params.time = parseTimeToSeconds(params.time as string | number, projectDuration);
      }
      if (params.start !== undefined) {
        params.start = parseTimeToSeconds(params.start as string | number, projectDuration);
      }

      return {
        id: generateId(),
        operation: o.operation as EditOperationType,
        description: String(o.description ?? `Step ${i + 1}: ${o.operation}`),
        params,
        clipIds: Array.isArray(o.clipIds) ? (o.clipIds as string[]) : [],
        accepted: true,
      };
    });
}

// ─── Fallback Heuristic Generator for Any User Intent ────────────────────────
function generateCreativeFallback(prompt: string, project: TimelineProject): EditPlan {
  const p = prompt.toLowerCase();
  const allClips = project.tracks.flatMap(t => t.clips);
  const primaryClipId = allClips[0]?.id;
  const clipIds = primaryClipId ? [primaryClipId] : [];
  const duration = project.duration || 40;

  const ops: EditOperation[] = [];
  let summary = `Applied creative edits based on: "${prompt}"`;

  // Extract time reference if present
  const timeMatch = prompt.match(/\d+[:.]\d+[:.]\d+|\d+[:.]\d+|\d+\s*s(?:ec)?/);
  const targetTime = timeMatch ? parseTimeToSeconds(timeMatch[0], duration) : Math.max(1, duration * 0.25);

  if (p.includes('zoom') || p.includes('punch')) {
    // Isolate a 2.5s snippet around target time so only that moment zooms
    const zoomStart = Math.max(0, targetTime);
    const zoomEnd = Math.min(duration, zoomStart + 2.5);

    ops.push({
      id: generateId(),
      operation: 'split_clip',
      description: `Split video at ${zoomStart.toFixed(2)}s to begin punch-in zoom`,
      params: { time: zoomStart },
      clipIds,
      accepted: true,
    });

    ops.push({
      id: generateId(),
      operation: 'split_clip',
      description: `Split video at ${zoomEnd.toFixed(2)}s to return to normal scale`,
      params: { time: zoomEnd },
      clipIds,
      accepted: true,
    });

    ops.push({
      id: generateId(),
      operation: 'add_effect',
      description: `Apply 1.3x punch-in zoom between ${zoomStart.toFixed(2)}s and ${zoomEnd.toFixed(2)}s`,
      params: { type: 'punch_in', scale: 1.3, startTime: zoomStart, duration: 2.5 },
      clipIds,
      accepted: true,
    });
    summary = `Applied dramatic 1.3x punch-in zoom exclusively from ${zoomStart.toFixed(2)}s to ${zoomEnd.toFixed(2)}s`;
  } else if (p.includes('transition') || p.includes('swipe') || p.includes('cut') || p.includes('split')) {
    const splitTime = targetTime;
    ops.push({
      id: generateId(),
      operation: 'split_clip',
      description: `Split clip at ${splitTime.toFixed(2)}s for transition cut point`,
      params: { time: splitTime },
      clipIds,
      accepted: true,
    });
    ops.push({
      id: generateId(),
      operation: 'add_transition',
      description: `Apply dynamic whip swipe transition at ${splitTime.toFixed(2)}s`,
      params: { type: 'whip', duration: 0.7, time: splitTime },
      clipIds,
      accepted: true,
    });
    summary = `Added dynamic swipe transition cut at ${splitTime.toFixed(2)}s`;
  } else if (p.includes('cinematic') || p.includes('color') || p.includes('grade') || p.includes('matrix') || p.includes('mood')) {
    const isMatrix = p.includes('matrix');
    ops.push({
      id: generateId(),
      operation: 'color_grade',
      description: isMatrix ? 'Apply Matrix green color grading & high contrast' : 'Apply cinematic Hollywood color grading',
      params: {
        colorGrade: {
          exposure: isMatrix ? -5 : 0,
          contrast: 25,
          saturation: isMatrix ? 10 : 20,
          temperature: isMatrix ? -15 : 8,
          tint: isMatrix ? 25 : -5,
          highlights: -10,
          shadows: 10,
          sharpness: 20,
          vignette: 25,
          grain: 5,
        }
      },
      clipIds,
      accepted: true,
    });
    summary = isMatrix ? 'Applied Matrix cyberpunk green grade' : 'Applied cinematic Hollywood color grade';
  } else if (p.includes('pause') || p.includes('silence') || p.includes('filler') || p.includes('fast') || p.includes('short')) {
    ops.push({
      id: generateId(),
      operation: 'remove_silence',
      description: 'Trim silence and tighten dead-air intervals',
      params: { threshold: -35, minDuration: 0.3 },
      clipIds,
      accepted: true,
    });
    ops.push({
      id: generateId(),
      operation: 'set_speed',
      description: 'Accelerate pacing to 1.15x for maximum retention',
      params: { speed: 1.15 },
      clipIds,
      accepted: true,
    });
    summary = 'Removed silent pauses and optimized pacing for viral engagement';
  } else if (p.includes('caption') || p.includes('subtitle') || p.includes('text') || p.includes('title')) {
    ops.push({
      id: generateId(),
      operation: 'add_caption',
      description: 'Generate dynamic high-contrast captions track',
      params: { text: 'Dynamic AI Subtitles', style: 'viral_bold', position: 'bottom' },
      clipIds: [],
      accepted: true,
    });
    summary = 'Generated dynamic animated subtitles track';
  } else {
    ops.push({
      id: generateId(),
      operation: 'color_grade',
      description: 'Enhance visual clarity and color vibrancy',
      params: { colorGrade: { exposure: 5, contrast: 15, saturation: 15, sharpness: 15 } },
      clipIds,
      accepted: true,
    });
  }

  return {
    id: `plan_${Date.now()}`,
    projectId: project.id,
    prompt,
    operations: ops,
    summary,
    estimatedDurationChange: ops.some(o => o.operation === 'remove_silence') ? -3.5 : 0,
    createdAt: new Date().toISOString(),
  };
}

// ─── Main AI Command Handler ─────────────────────────────────────────────────
export async function processEditorCommand(
  prompt: string,
  project: TimelineProject,
  transcript?: { silenceRegions: Array<{ start: number; end: number; duration: number }>; fillerWords: Array<{ word: string; start: number; end: number }> }
): Promise<EditPlan> {
  const projectSummary = {
    id: project.id,
    duration: project.duration,
    fps: project.fps,
    tracks: project.tracks.map(t => ({
      id: t.id,
      type: t.type,
      name: t.name,
      clipCount: t.clips.length,
      clips: t.clips.map(c => ({
        id: c.id,
        name: c.name,
        start: c.start,
        duration: c.duration,
        speed: c.speed,
      })),
    })),
    silenceRegions: transcript?.silenceRegions ?? [],
    fillerWordCount: transcript?.fillerWords?.length ?? 0,
  };

  const systemPrompt = `You are the World's Most Elite AI Video Editor Co-Pilot for Studio Pulse.
You have the skill, taste, and precision of a Hollywood film editor, top YouTube creator (MrBeast pacing), and commercial colorist.

YOUR MISSION:
Convert ANY natural language editing instruction into an ultra-precise, creative, structured JSON edit plan.

MOMENTARY / TARGETED EFFECTS RULE (CRITICAL):
- When a user asks for a zoom, punch-in, flash, glitch, shake, or momentary effect at a specific second (e.g. "zoom at 5s" or "punch in at 10s"):
  1. DO NOT zoom the whole video!
  2. ALWAYS split the clip at the start timestamp (e.g. 5.0s) AND split again at the end timestamp (e.g. 7.5s) to isolate the moment!
  3. Apply the effect/zoom ONLY to that isolated segment (or specify startTime and duration)!

CRITICAL RULES:
1. NEVER refuse a command. NEVER return an empty operations array.
2. Intelligently parse time notations: "00:01:04", "1:04", "1.4s", "5s", "10%", "halfway".
3. For transitions (swipe, whip, dissolve, zoom), split the clip at the transition timestamp and attach the transition.
4. For aesthetic edits (cinematic, matrix, cyberpunk, vintage), apply full color grading + letterbox or contrast.
5. Allowed Operations list:
   - "split_clip": { time: number }
   - "trim_clip": { trimIn: number, trimOut: number }
   - "delete_clip": {}
   - "move_clip": { start: number, trackId?: string }
   - "set_speed": { speed: number } (0.25 to 4.0)
   - "color_grade": { exposure, contrast, saturation, temperature, tint, highlights, shadows, sharpness, vignette, grain }
   - "add_effect": { type: "punch_in" | "zoom" | "swipe" | "glitch" | "blur" | "flash" | "shake", scale?: number, startTime?: number, duration?: number }
   - "add_transition": { type: "whip" | "cross_dissolve" | "fade" | "zoom" | "glitch" | "blur", duration: number }
   - "remove_silence": { threshold: number, minDuration: number }
   - "remove_filler_words": {}
   - "add_caption": { text: string, style: "viral_bold" | "clean" | "minimal", position: "bottom" | "top" | "center" }
   - "add_text": { text: string, position: "center" }
   - "set_volume": { volume: number }
   - "normalize_audio": { volume: 100 }
6. Reference real clip IDs from the project state.
7. Return ONLY valid JSON in the exact structure below.

RESPONSE FORMAT (JSON ONLY):
{
  "summary": "Clear, engaging summary of what the AI will execute",
  "estimatedDurationChange": 0.0,
  "operations": [
    {
      "operation": "split_clip",
      "description": "Split video at 5.0s to begin punch-in zoom",
      "params": { "time": 5.0 },
      "clipIds": ["clip_1"]
    },
    {
      "operation": "split_clip",
      "description": "Split video at 7.5s to restore normal scale",
      "params": { "time": 7.5 },
      "clipIds": ["clip_1"]
    },
    {
      "operation": "add_effect",
      "description": "Apply 1.3x punch-in zoom during the isolated 2.5s segment",
      "params": { "type": "punch_in", "scale": 1.3, "startTime": 5.0, "duration": 2.5 },
      "clipIds": ["clip_1"]
    }
  ]
}`;

  const userMessage = `USER INSTRUCTION: "${prompt}"

CURRENT TIMELINE STATE:
${JSON.stringify(projectSummary, null, 2)}

Generate the complete JSON edit plan:`;

  try {
    const response = await callGemini(systemPrompt, userMessage);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return generateCreativeFallback(prompt, project);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validatedOps = validateOperations(parsed.operations ?? [], project.duration || 60);

    if (validatedOps.length === 0) {
      return generateCreativeFallback(prompt, project);
    }

    return {
      id: `plan_${Date.now()}`,
      projectId: project.id,
      prompt,
      operations: validatedOps,
      summary: typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary : `AI edit plan for: "${prompt}"`,
      estimatedDurationChange: typeof parsed.estimatedDurationChange === 'number' ? parsed.estimatedDurationChange : 0,
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[EditorAgent] LLM parsing failed, using creative fallback engine:', err);
    return generateCreativeFallback(prompt, project);
  }
}
