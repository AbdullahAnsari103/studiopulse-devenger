/**
 * Render Service — FFmpeg Abstraction Layer
 *
 * This module wraps fluent-ffmpeg. The abstraction means the frontend timeline
 * architecture never changes when this moves to a cloud/Linux worker.
 *
 * Security: Only accepts validated EditOperations — never arbitrary shell commands.
 */

import path from 'path';
import fs from 'fs';
import { jobQueue } from '../utils/job-queue.js';

async function getFfmpeg() {
  const ffmpeg = (await import('fluent-ffmpeg')).default;
  try {
    const ffmpegStatic = (await import('ffmpeg-static')).default;
    if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);
    const ffprobeStatic = (await import('ffprobe-static')).default;
    if (ffprobeStatic && ffprobeStatic.path) ffmpeg.setFfprobePath(ffprobeStatic.path);
  } catch (e) {
    // Use system ffmpeg if ffmpeg-static fails
    console.warn('[RenderService] ffmpeg-static or ffprobe-static not available, using system ffmpeg', e);
  }
  return ffmpeg;
}

export interface SilenceRegion {
  start: number;
  end: number;
  duration: number;
}

export interface RenderOperation {
  type: 'trim' | 'concat' | 'silence_remove' | 'export';
  inputPath: string;
  outputPath: string;
  params?: Record<string, unknown>;
}

// ─── Detect silence regions in a video/audio file ───────────────────────────

export async function detectSilence(
  inputPath: string,
  jobId: string,
  options: { threshold?: number; minDuration?: number } = {}
): Promise<SilenceRegion[]> {
  const ffmpeg = await getFfmpeg();
  const threshold = options.threshold ?? -40; // dB
  const minDuration = options.minDuration ?? 0.5; // seconds

  return new Promise((resolve, reject) => {
    const regions: SilenceRegion[] = [];
    let currentStart: number | null = null;

    jobQueue.update(jobId, { status: 'processing', progress: 10, message: 'Analyzing audio…' });

    ffmpeg(inputPath)
      .audioFilters([`silencedetect=n=${threshold}dB:d=${minDuration}`])
      .format('null')
      .output('/dev/null')
      .on('error', (err) => {
        // On Windows, /dev/null doesn't exist — use NUL
        reject(err);
      })
      .on('stderr', (line: string) => {
        const startMatch = line.match(/silence_start:\s*([\d.]+)/);
        const endMatch = line.match(/silence_end:\s*([\d.]+)/);
        if (startMatch) currentStart = parseFloat(startMatch[1]);
        if (endMatch && currentStart !== null) {
          const end = parseFloat(endMatch[1]);
          regions.push({ start: currentStart, end, duration: end - currentStart });
          currentStart = null;
        }
      })
      .on('end', () => {
        jobQueue.update(jobId, { progress: 30, message: `Found ${regions.length} silence regions` });
        resolve(regions);
      })
      .run();
  });
}

// Windows-compatible silence detection using NUL
export async function detectSilenceWindows(
  inputPath: string,
  jobId: string,
  options: { threshold?: number; minDuration?: number } = {}
): Promise<SilenceRegion[]> {
  const ffmpeg = await getFfmpeg();
  const threshold = options.threshold ?? -40;
  const minDuration = options.minDuration ?? 0.5;

  return new Promise((resolve, reject) => {
    const regions: SilenceRegion[] = [];
    let currentStart: number | null = null;

    jobQueue.update(jobId, { status: 'processing', progress: 10, message: 'Analyzing audio…' });

    const proc = ffmpeg(inputPath)
      .audioFilters([`silencedetect=n=${threshold}dB:d=${minDuration}`])
      .format('null');

    // Use NUL on Windows, /dev/null on Unix
    const nullOut = process.platform === 'win32' ? 'NUL' : '/dev/null';
    proc.output(nullOut)
      .on('error', reject)
      .on('stderr', (line: string) => {
        const startMatch = line.match(/silence_start:\s*([\d.]+)/);
        const endMatch = line.match(/silence_end:\s*([\d.]+)/);
        if (startMatch) currentStart = parseFloat(startMatch[1]);
        if (endMatch && currentStart !== null) {
          const end = parseFloat(endMatch[1]);
          regions.push({ start: currentStart, end, duration: end - currentStart });
          currentStart = null;
        }
      })
      .on('end', () => {
        jobQueue.update(jobId, { progress: 30, message: `Found ${regions.length} silence regions` });
        resolve(regions);
      })
      .run();
  });
}

// ─── Extract audio for transcription ────────────────────────────────────────

export async function extractAudio(inputPath: string, outputDir: string): Promise<string> {
  const ffmpeg = await getFfmpeg();
  const outputPath = path.join(outputDir, `audio_${Date.now()}.wav`);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioChannels(1)
      .audioFrequency(16000)
      .format('wav')
      .output(outputPath)
      .on('error', reject)
      .on('end', () => resolve(outputPath))
      .run();
  });
}

// ─── Extract thumbnail from video ───────────────────────────────────────────

export async function extractThumbnail(inputPath: string, outputDir: string, timeSeconds = 1): Promise<string> {
  const ffmpeg = await getFfmpeg();
  const filename = `thumb_${Date.now()}.jpg`;
  const outputPath = path.join(outputDir, filename);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({ timestamps: [timeSeconds], filename, folder: outputDir, size: '320x?' })
      .on('error', reject)
      .on('end', () => resolve(outputPath));
  });
}

// ─── Get video/audio metadata ───────────────────────────────────────────────

export async function getMediaInfo(filePath: string): Promise<{
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  hasAudio: boolean;
  hasVideo: boolean;
}> {
  const ffmpeg = await getFfmpeg();

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      const fpsStr = videoStream?.r_frame_rate;
      let fps: number | undefined;
      if (fpsStr && fpsStr.includes('/')) {
        const [num, den] = fpsStr.split('/').map(Number);
        fps = Math.round(num / den);
      }
      resolve({
        duration: metadata.format.duration ?? 0,
        width: videoStream?.width,
        height: videoStream?.height,
        fps,
        hasAudio: !!audioStream,
        hasVideo: !!videoStream,
      });
    });
  });
}

// ─── Render: Remove silence segments and concat ─────────────────────────────

export async function renderSilenceRemoved(
  inputPath: string,
  keepSegments: Array<{ start: number; end: number }>,
  outputPath: string,
  jobId: string
): Promise<string> {
  const ffmpeg = await getFfmpeg();
  const tmpDir = path.dirname(outputPath);
  
  jobQueue.update(jobId, { progress: 40, message: `Cutting ${keepSegments.length} segments…` });

  // Cut each keep segment to temp files
  const segmentPaths: string[] = [];
  for (let i = 0; i < keepSegments.length; i++) {
    const seg = keepSegments[i];
    const segPath = path.join(tmpDir, `seg_${i}.mp4`);
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(seg.start)
        .setDuration(seg.end - seg.start)
        .output(segPath)
        .on('error', reject)
        .on('end', () => resolve())
        .run();
    });
    segmentPaths.push(segPath);
    jobQueue.update(jobId, {
      progress: 40 + Math.round((i / keepSegments.length) * 40),
      message: `Processing segment ${i + 1}/${keepSegments.length}…`
    });
  }

  // Create concat list
  const listPath = path.join(tmpDir, `concat_${Date.now()}.txt`);
  const listContent = segmentPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(listPath, listContent);

  // Concat all segments
  jobQueue.update(jobId, { progress: 85, message: 'Concatenating segments…' });
  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(listPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .output(outputPath)
      .outputOptions(['-c', 'copy'])
      .on('error', reject)
      .on('end', () => resolve())
      .run();
  });

  // Cleanup temp files
  for (const p of segmentPaths) { try { fs.unlinkSync(p); } catch { /* ignore */ } }
  try { fs.unlinkSync(listPath); } catch { /* ignore */ }

  jobQueue.update(jobId, { progress: 100, status: 'complete', message: 'Render complete!' });
  return outputPath;
}

// ─── Export final video ─────────────────────────────────────────────────────

export async function exportVideo(
  inputPath: string,
  outputPath: string,
  settings: {
    width: number;
    height: number;
    fps: number;
    videoBitrate: number;
    audioBitrate: number;
    codec: string;
  },
  jobId: string
): Promise<string> {
  const ffmpeg = await getFfmpeg();

  jobQueue.update(jobId, { status: 'processing', progress: 5, message: 'Starting export…' });

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec(settings.codec === 'h265' ? 'libx265' : 'libx264')
      .audioCodec('aac')
      .videoBitrate(settings.videoBitrate)
      .audioBitrate(settings.audioBitrate)
      .size(`${settings.width}x${settings.height}`)
      .fps(settings.fps)
      .output(outputPath)
      .on('progress', (p) => {
        jobQueue.update(jobId, { progress: Math.min(95, Math.round(p.percent ?? 0)), message: `Encoding… ${Math.round(p.percent ?? 0)}%` });
      })
      .on('error', (err) => {
        jobQueue.update(jobId, { status: 'error', error: err.message });
        reject(err);
      })
      .on('end', () => {
        jobQueue.update(jobId, { status: 'complete', progress: 100, message: 'Export complete!' });
        resolve(outputPath);
      })
      .run();
  });
}
