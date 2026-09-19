/**
 * High-Production Vertical Short Video Renderer (9:16)
 * Generates playable, high-definition 1080x1920 MP4 Shorts with crisp visuals,
 * dynamic overlays, and stereo audio for YouTube Shorts, Instagram Reels, and TikTok.
 *
 * KEY DESIGN: The renderer must always cut from the CORRECT source video.
 * For YouTube-origin clips, we download the actual YouTube video via yt-dlp.
 * For locally uploaded files, we match by videoId or explicit sourceVideoPath.
 * We NEVER blindly pick the largest .mp4 — that causes video mismatches.
 */

import fs from "fs";
import path from "path";
import axios from "axios";
import sharp from "sharp";
import { execFile, exec } from "child_process";
import ffmpegStatic from "ffmpeg-static";

export interface RenderShortParams {
  clipId: string;
  title: string;
  hookText?: string;
  summary?: string;
  tags?: string[];
  thumbnailUrl?: string;
  durationSec?: number;
  sourceVideoPath?: string;
  startTimeSec?: number;
  endTimeSec?: number;
  /** YouTube video ID — used to download the correct source video or match local files */
  videoId?: string;
}

function escapeXml(unsafe: string): string {
  return (unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generates a crisp, high-contrast 1080x1920 transparent PNG with burned-in AI captions.
 * Features a dark glassmorphic container box with gold/yellow border and bold yellow uppercase text.
 */
async function generateCaptionOverlayPng(text: string, outPath: string): Promise<string | null> {
  const clean = (text || "").trim().toUpperCase();
  if (!clean) return null;

  try {
    const words = clean.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if ((currentLine + " " + word).trim().length <= 28) {
        currentLine = (currentLine + " " + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    const displayLines = lines.slice(0, 4); // Up to 4 lines
    const lineHeight = 48;
    const paddingY = 32;
    const boxHeight = Math.max(110, displayLines.length * lineHeight + paddingY * 2);
    const boxWidth = 920;
    const boxX = (1080 - boxWidth) / 2; // 80
    const boxY = 1920 - boxHeight - 380; // 380px from bottom (above mobile Shorts UI)

    const textElements = displayLines.map((line, idx) => {
      const textY = boxY + paddingY + (idx + 0.72) * lineHeight;
      return `<text x="540" y="${textY}" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="34" font-weight="900" fill="#FACC15" text-anchor="middle" letter-spacing="0.5">${escapeXml(line)}</text>`;
    }).join("\n");

    const svg = `
      <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="boxShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.85"/>
          </filter>
        </defs>
        <!-- Dark glassmorphic caption box with rounded corners and gold border -->
        <rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" rx="24" fill="#090916" fill-opacity="0.90" stroke="#FACC15" stroke-opacity="0.45" stroke-width="3" filter="url(#boxShadow)"/>
        
        <!-- High-contrast bold yellow caption text -->
        ${textElements}
      </svg>
    `;

    await sharp(Buffer.from(svg)).png().toFile(outPath);
    return outPath;
  } catch (err) {
    console.warn("[ShortRenderer] Failed to generate caption overlay PNG:", err);
    return null;
  }
}

/**
 * Attempts to download a YouTube video or specific clip section using yt-dlp.
 * Returns the path to the downloaded file, or null on failure.
 */
async function downloadYouTubeVideo(
  videoId: string,
  outDir: string,
  startTimeSec?: number,
  endTimeSec?: number,
  ffmpegBin?: string
): Promise<string | null> {
  const isSection = startTimeSec !== undefined && endTimeSec !== undefined && endTimeSec > startTimeSec;
  const sectionPath = path.join(outDir, `yt_source_${videoId}_${Math.floor(startTimeSec || 0)}_${Math.floor(endTimeSec || 0)}.mp4`);
  const fullPath = path.join(outDir, `yt_source_${videoId}.mp4`);
  const MIN_VALID_SIZE = 50000; // 50 KB (short 3-10s clips are often 200-400 KB)

  // 1. Check existing cached files
  if (isSection && fs.existsSync(sectionPath) && fs.statSync(sectionPath).size > MIN_VALID_SIZE) {
    console.log(`[ShortRenderer] Reusing cached section download: ${sectionPath} (${(fs.statSync(sectionPath).size / 1024).toFixed(0)} KB)`);
    return sectionPath;
  }
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).size > MIN_VALID_SIZE) {
    console.log(`[ShortRenderer] Reusing cached full YouTube download: ${fullPath} (${(fs.statSync(fullPath).size / 1024 / 1024).toFixed(1)} MB)`);
    return fullPath;
  }

  const ytdlp = await findYtDlp();
  if (!ytdlp) {
    console.warn("[ShortRenderer] yt-dlp not found. Cannot download YouTube video.");
    return null;
  }

  const effectiveFfmpeg = ffmpegBin || (ffmpegStatic as any)?.default || ffmpegStatic || "ffmpeg";
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  // 2. Attempt Step A: Download exact section if requested
  if (isSection) {
    try {
      if (fs.existsSync(sectionPath)) {
        try { fs.unlinkSync(sectionPath); } catch {}
      }

      const startFmt = Math.max(0, startTimeSec || 0);
      const endFmt = endTimeSec || (startFmt + 30);
      const cmd = `"${ytdlp}" --ffmpeg-location "${effectiveFfmpeg}" -f "bv*+ba/b" --merge-output-format mp4 --no-playlist --no-warnings --quiet --force-keyframes-at-cuts --download-sections "*${startFmt}-${endFmt}" -o "${sectionPath}" "${url}"`;

      console.log(`[ShortRenderer] 📥 Downloading section (${startFmt}-${endFmt}s) for ${videoId}...`);

      await new Promise<void>((resolve, reject) => {
        exec(cmd, { timeout: 120000, maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
          if (err) reject(err);
          else resolve();
        });
      });

      if (fs.existsSync(sectionPath) && fs.statSync(sectionPath).size > MIN_VALID_SIZE) {
        console.log(`[ShortRenderer] ✅ Downloaded section: ${(fs.statSync(sectionPath).size / 1024).toFixed(0)} KB → ${sectionPath}`);
        return sectionPath;
      }
    } catch (sectionErr: any) {
      console.warn(`[ShortRenderer] Section download notice for ${videoId}: ${sectionErr?.message?.slice(0, 120)}. Falling back to full video download.`);
      try { if (fs.existsSync(sectionPath)) fs.unlinkSync(sectionPath); } catch {}
    }
  }

  // 3. Attempt Step B: Download full video as robust fallback
  try {
    if (fs.existsSync(fullPath)) {
      try { fs.unlinkSync(fullPath); } catch {}
    }

    const fullCmd = `"${ytdlp}" --ffmpeg-location "${effectiveFfmpeg}" -f "bv*+ba/b" --merge-output-format mp4 --no-playlist --no-warnings --quiet -o "${fullPath}" "${url}"`;
    console.log(`[ShortRenderer] 📥 Downloading full video fallback for ${videoId}...`);

    await new Promise<void>((resolve, reject) => {
      exec(fullCmd, { timeout: 180000, maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).size > MIN_VALID_SIZE) {
      console.log(`[ShortRenderer] ✅ Downloaded full video: ${(fs.statSync(fullPath).size / 1024 / 1024).toFixed(1)} MB → ${fullPath}`);
      return fullPath;
    }
  } catch (fullErr: any) {
    console.warn(`[ShortRenderer] Full download failed for ${videoId}:`, fullErr?.message?.slice(0, 150));
    try { if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath); } catch {}
  }

  return null;
}

/**
 * Find yt-dlp binary path
 */
async function findYtDlp(): Promise<string | null> {
  const candidates = ["yt-dlp", "yt-dlp.exe"];

  for (const candidate of candidates) {
    try {
      await new Promise<void>((resolve, reject) => {
        execFile(candidate, ["--version"], { timeout: 5000 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      return candidate;
    } catch {
      // Not found, try next
    }
  }
  return null;
}

/**
 * Finds a local video file that matches a given videoId.
 * Searches upload directories for files whose names contain the videoId.
 * Returns null if no match found — NEVER returns an unrelated file.
 */
function findLocalVideoByVideoId(videoId: string): string | null {
  const searchDirs = [
    path.resolve("server/uploads/autopilot"),
    path.resolve("server/uploads"),
  ];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".mp4"));

    for (const file of files) {
      // Check if the filename contains the videoId
      if (file.includes(videoId)) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).size > 50000) {
          console.log(`[ShortRenderer] Found local video matching videoId "${videoId}": ${fullPath}`);
          return fullPath;
        }
      }
    }
  }

  return null;
}

/**
 * Renders a complete 9:16 vertical 1080x1920 Short MP4.
 * 
 * Resolution order for source video:
 * 1. Explicit sourceVideoPath (if valid and exists)
 * 2. Local file matching videoId in upload directories
 * 3. Download from YouTube using yt-dlp (if videoId is a YouTube ID)
 * 4. Fallback to static poster image (last resort)
 */
export async function renderVerticalShortMp4(params: RenderShortParams): Promise<string> {
  const outDir = path.resolve("server/uploads/clips");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${params.clipId}.mp4`);

  // If already rendered and valid, return cached file
  if (fs.existsSync(outFile) && fs.statSync(outFile).size > 10000) {
    return outFile;
  }

  const duration = Math.min(60, Math.max(15, params.durationSec || 30));
  const ffmpegBin = (ffmpegStatic as any)?.default || ffmpegStatic || "ffmpeg";

  // ─── Resolve Source Video File — MUST match the correct video ───
  let resolvedSource: string | null = null;

  // Step 1: Explicit path provided and valid
  if (params.sourceVideoPath && fs.existsSync(params.sourceVideoPath) && fs.statSync(params.sourceVideoPath).size > 50000) {
    resolvedSource = params.sourceVideoPath;
    console.log(`[ShortRenderer] Using explicit sourceVideoPath: ${resolvedSource}`);
  }

  // Step 2: Match local file by videoId
  if (!resolvedSource && params.videoId) {
    resolvedSource = findLocalVideoByVideoId(params.videoId);
  }

  let isPreCutSection = false;
  // Step 3: Download from YouTube by videoId
  if (!resolvedSource && params.videoId && params.videoId.length >= 8) {
    // YouTube video IDs are typically 11 chars, but we check >= 8 to be safe
    const downloadDir = path.resolve("server/uploads/clips");
    fs.mkdirSync(downloadDir, { recursive: true });
    resolvedSource = await downloadYouTubeVideo(
      params.videoId,
      downloadDir,
      params.startTimeSec,
      params.endTimeSec,
      ffmpegBin
    );
    if (resolvedSource && resolvedSource.includes(`_${Math.floor(params.startTimeSec || 0)}_`)) {
      isPreCutSection = true;
    }
  }

  // ─── Strategy 1: Cut Real Video Clip into 9:16 Vertical Short with Audio & Burned Captions ───
  if (resolvedSource && fs.existsSync(resolvedSource)) {
    try {
      console.log(`[ShortRenderer] 🎬 Cutting real 9:16 vertical Short from: ${resolvedSource}`);
      console.log(`[ShortRenderer]    VideoId: ${params.videoId || "unknown"}, Start: ${params.startTimeSec}s, End: ${params.endTimeSec}s, Duration: ${duration}s`);
      const start = isPreCutSection ? 0 : Math.max(0, params.startTimeSec || 0);

      // Generate caption overlay if hookText or title is provided
      const captionText = params.hookText || params.title || "";
      const captionPngPath = path.join(outDir, `${params.clipId}_caption.png`);
      const hasCaption = await generateCaptionOverlayPng(captionText, captionPngPath);

      let filter = "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[v]";
      const inputArgs = [
        "-y",
        "-ss", String(start),
        "-i", resolvedSource,
      ];

      if (hasCaption && fs.existsSync(captionPngPath)) {
        inputArgs.push("-i", captionPngPath);
        filter = "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[vbase];[vbase][1:v]overlay=0:0[v]";
      }

      const args = [
        ...inputArgs,
        "-t", String(duration),
        "-filter_complex", filter,
        "-map", "[v]",
        "-map", "0:a?",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        outFile,
      ];

      await new Promise<void>((resolve, reject) => {
        execFile(ffmpegBin, args, (err) => {
          if (hasCaption) {
            try { fs.unlinkSync(captionPngPath); } catch {}
          }
          if (err) reject(err);
          else resolve();
        });
      });

      if (fs.existsSync(outFile) && fs.statSync(outFile).size > 10000) {
        console.log(`[ShortRenderer] ✅ Rendered real video Short with captions (${(fs.statSync(outFile).size / 1024 / 1024).toFixed(2)} MB) from videoId: ${params.videoId || "direct"}`);
        return outFile;
      }
    } catch (sourceErr) {
      console.warn("[ShortRenderer] Source video render notice:", sourceErr);
    }
  } else {
    console.warn(`[ShortRenderer] ⚠️ No source video found for videoId: ${params.videoId || "unknown"}. Falling back to static poster.`);
  }

  // ─── Strategy 2: High-Production Dynamic Short Composer (Sharp + FFmpeg) ───
  // This is a LAST RESORT — generates a static poster card, not real video
  console.log(`[ShortRenderer] Generating static poster Short for "${params.title}"...`);

  let thumbnailBuffer: Buffer | null = null;
  if (params.thumbnailUrl && params.thumbnailUrl.startsWith("http")) {
    try {
      const res = await axios.get(params.thumbnailUrl, {
        responseType: "arraybuffer",
        timeout: 5000,
      });
      thumbnailBuffer = Buffer.from(res.data);
    } catch (err: any) {
      console.warn("[ShortRenderer] Thumbnail fetch notice:", err?.message || err);
    }
  }

  const cleanTitle = (params.title || "Viral Highlight").replace(/#shorts/gi, "").trim();
  const cleanHook = (params.hookText || params.summary || "High-energy creator highlight moment.").slice(0, 140);
  const cleanTags = (params.tags || ["#Shorts", "#Viral", "#PulseAI"]).slice(0, 4).join(" ");

  const posterPath = path.join(outDir, `${params.clipId}_poster.png`);

  try {
    let baseSharp = sharp({
      create: {
        width: 1080,
        height: 1920,
        channels: 4,
        background: { r: 10, g: 10, b: 26, alpha: 1 },
      },
    });

    const composites: sharp.OverlayOptions[] = [];

    // If thumbnail is available, generate blurred background + crisp center frame
    if (thumbnailBuffer) {
      try {
        const blurredBg = await sharp(thumbnailBuffer)
          .resize(1080, 1920, { fit: "cover" })
          .blur(20)
          .modulate({ brightness: 0.4, saturation: 1.3 })
          .toBuffer();

        composites.push({ input: blurredBg, top: 0, left: 0 });

        const centerCard = await sharp(thumbnailBuffer)
          .resize(920, 520, { fit: "cover" })
          .composite([
            {
              input: Buffer.from(`
                <svg width="920" height="520">
                  <rect x="0" y="0" width="920" height="520" rx="28" fill="none" stroke="#8b5cf6" stroke-width="4" stroke-opacity="0.6"/>
                </svg>
              `),
              top: 0,
              left: 0,
            },
          ])
          .toBuffer();

        composites.push({ input: centerCard, top: 480, left: 80 });
      } catch (thumbErr) {
        console.warn("[ShortRenderer] Thumbnail composite notice:", thumbErr);
      }
    }

    // Text & Overlay UI Layer
    const overlaySvg = `
      <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradTop" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#8b5cf6"/>
            <stop offset="100%" stop-color="#ec4899"/>
          </linearGradient>
          <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#14142b" stop-opacity="0.95"/>
            <stop offset="100%" stop-color="#0a0a18" stop-opacity="0.98"/>
          </linearGradient>
        </defs>

        <!-- Top Badge -->
        <rect x="300" y="160" width="480" height="64" rx="32" fill="#8b5cf6" fill-opacity="0.25" stroke="#8b5cf6" stroke-width="2"/>
        <text x="540" y="202" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="bold" fill="#ddd6fe" text-anchor="middle">⚡ PULSE AI • VIRAL SHORT</text>

        <!-- Title Above Preview -->
        <text x="540" y="320" font-family="system-ui, -apple-system, sans-serif" font-size="42" font-weight="900" fill="#ffffff" text-anchor="middle">${escapeXml(cleanTitle.slice(0, 48))}</text>
        <text x="540" y="380" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="600" fill="#a78bfa" text-anchor="middle">${escapeXml(cleanTags)}</text>

        <!-- Play Indicator Overlay -->
        <circle cx="540" cy="740" r="54" fill="#8b5cf6" fill-opacity="0.85"/>
        <polygon points="530,718 560,740 530,762" fill="#ffffff"/>

        <!-- Bottom Hook Card -->
        <rect x="80" y="1120" width="920" height="420" rx="36" fill="url(#cardGrad)" stroke="#8b5cf6" stroke-width="2" stroke-opacity="0.3"/>
        
        <rect x="120" y="1160" width="200" height="42" rx="21" fill="url(#gradTop)"/>
        <text x="220" y="1188" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="800" fill="#ffffff" text-anchor="middle">KEY MOMENT</text>

        <text x="120" y="1260" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="bold" fill="#ffffff">${escapeXml(cleanTitle.slice(0, 45))}</text>
        
        <text x="120" y="1330" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="500" fill="#cbd5e1">${escapeXml(cleanHook.slice(0, 60))}</text>
        <text x="120" y="1375" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="500" fill="#a78bfa">${escapeXml(cleanHook.slice(60, 120))}</text>

        <!-- Bottom Channel Watermark -->
        <text x="540" y="1740" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="600" fill="#64748b" text-anchor="middle">Generated with Studio Pulse AI</text>
      </svg>
    `;

    composites.push({ input: Buffer.from(overlaySvg), top: 0, left: 0 });

    await baseSharp.composite(composites).png().toFile(posterPath);
    console.log(`[ShortRenderer] High-res 1080x1920 poster rendered: ${posterPath}`);
  } catch (err: any) {
    console.error("[ShortRenderer] Sharp poster error:", err);
  }

  // ─── Step 3: Fast H.264 MP4 Encode with Silent Audio ───
  // Use silent audio instead of synthetic tones — platforms require an audio stream
  // but we should never produce buzzing/humming sounds in the published clip.
  const args = [
    "-y",
    "-loop", "1",
    "-i", posterPath,
    "-f", "lavfi",
    "-i", `anullsrc=channel_layout=stereo:sample_rate=44100`,
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-t", String(duration),
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "128k",
    "-shortest",
    outFile,
  ];

  return new Promise<string>((resolve) => {
    execFile(ffmpegBin, args, (err) => {
      if (err) {
        console.warn("[ShortRenderer] FFmpeg execution notice:", err?.message || err);
      } else {
        console.log(`[ShortRenderer] 🚀 High-def 9:16 vertical Short MP4 generated: ${outFile} (${fs.statSync(outFile).size} bytes)`);
      }
      try { fs.unlinkSync(posterPath); } catch {}
      resolve(outFile);
    });
  });
}
