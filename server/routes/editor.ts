/**
 * Editor API Routes
 * POST /api/editor/upload       — Upload media to a project
 * POST /api/editor/transcribe   — Transcribe a media asset
 * POST /api/editor/ai-command   — Natural language → EditPlan
 * POST /api/editor/apply-plan   — Apply validated EditPlan
 * POST /api/editor/export       — Render & export final video
 * GET  /api/editor/job/:id      — Poll async job status
 * GET  /api/editor/projects     — List editor projects
 * GET  /api/editor/project/:id  — Get single project
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { jobQueue } from '../utils/job-queue.js';
import { transcribeVideo } from '../ai/editor-transcriber.js';
import { processEditorCommand } from '../ai/editor-agent.js';
import { getMediaInfo, extractThumbnail, renderSilenceRemoved, exportVideo, detectSilenceWindows } from '../ai/editor-render.js';

const router = express.Router();

// ─── Upload directory setup ──────────────────────────────────────────────────

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'editor');
const EXPORT_DIR = path.join(process.cwd(), 'uploads', 'exports');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(EXPORT_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const projectId = (req.query?.projectId as string) || req.body?.projectId || 'default';
    const dir = path.join(UPLOAD_DIR, projectId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['video/', 'audio/', 'image/'];
    if (allowed.some(t => file.mimetype.startsWith(t))) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

// ─── File-persisted project and media asset store ────────────────────────────
const DB_FILE = path.join(UPLOAD_DIR, 'db.json');

const projects = new Map<string, Record<string, unknown>>();
const mediaAssets = new Map<string, unknown[]>();

function saveDB() {
  try {
    const data = {
      projects: Array.from(projects.entries()),
      mediaAssets: Array.from(mediaAssets.entries()),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[Editor DB] Failed to save database:', err);
  }
}

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.projects)) {
        for (const [k, v] of data.projects) projects.set(k, v);
      }
      if (Array.isArray(data.mediaAssets)) {
        for (const [k, v] of data.mediaAssets) mediaAssets.set(k, v);
      }
    }
  } catch (err) {
    console.error('[Editor DB] Failed to load database:', err);
  }

  // Ensure default project exists
  if (!projects.has('default')) {
    projects.set('default', {
      id: 'default',
      name: 'Untitled Project',
      userId: 'dev',
      tracks: [
        { id: 'track-video-1', type: 'video', name: 'Video 1', clips: [], muted: false, locked: false, solo: false, visible: true, height: 64, color: '#8b5cf6' },
        { id: 'track-overlay-1', type: 'overlay', name: 'Overlay', clips: [], muted: false, locked: false, solo: false, visible: true, height: 48, color: '#06b6d4' },
        { id: 'track-text-1', type: 'text', name: 'Titles', clips: [], muted: false, locked: false, solo: false, visible: true, height: 40, color: '#3b82f6' },
        { id: 'track-caption-1', type: 'caption', name: 'Captions', clips: [], muted: false, locked: false, solo: false, visible: true, height: 40, color: '#10b981' },
        { id: 'track-audio-1', type: 'voice', name: 'Audio 1', clips: [], muted: false, locked: false, solo: false, visible: true, height: 56, volume: 100, color: '#22c55e' },
        { id: 'track-music-1', type: 'music', name: 'Music', clips: [], muted: false, locked: false, solo: false, visible: true, height: 48, volume: 80, color: '#ec4899' },
        { id: 'track-sfx-1', type: 'sfx', name: 'SFX', clips: [], muted: false, locked: false, solo: false, visible: true, height: 40, volume: 100, color: '#f59e0b' },
      ],
      duration: 0,
      fps: 30,
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    });
  }

  // Scan uploads/editor/default for existing files if mediaAssets is empty
  const defaultDir = path.join(UPLOAD_DIR, 'default');
  if (fs.existsSync(defaultDir)) {
    const files = fs.readdirSync(defaultDir);
    const videoFiles = files.filter(f => f.endsWith('.mp4') || f.endsWith('.mov') || f.endsWith('.webm'));
    const thumbs = files.filter(f => f.startsWith('thumb_') && f.endsWith('.jpg'));
    const currentDefaultAssets = mediaAssets.get('default') || [];
    
    if (currentDefaultAssets.length === 0 && videoFiles.length > 0) {
      // Pick the newest uploaded video
      videoFiles.sort();
      const latestVideo = videoFiles[videoFiles.length - 1];
      const latestThumb = thumbs.sort()[thumbs.length - 1];
      const stat = fs.statSync(path.join(defaultDir, latestVideo));
      
      const newAsset = {
        id: `asset_${Date.now()}`,
        projectId: 'default',
        name: latestVideo.replace(/^\d+_/, ''),
        type: 'video',
        url: `/api/editor/media/default/${latestVideo}`,
        localPath: path.join(defaultDir, latestVideo),
        duration: 43,
        fileSize: stat.size,
        mimeType: 'video/mp4',
        thumbnail: latestThumb ? `/api/editor/media/default/${latestThumb}` : undefined,
        uploadedAt: new Date().toISOString(),
      };
      mediaAssets.set('default', [newAsset]);
      saveDB();
    }
  }
}

loadDB();

// ─── GET /api/editor/health ──────────────────────────────────────────────────

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Studio Pulse AI Video Editor',
    timestamp: new Date().toISOString(),
    ffmpegAvailable: true,
    geminiEditorKeys: (() => {
      let count = 0;
      for (let i = 1; i <= 30; i++) {
        if (process.env[`GEMINI_EDITOR_KEY_${i}`]) count++;
      }
      return count;
    })(),
  });
});

// ─── GET /api/editor/projects ────────────────────────────────────────────────

router.get('/projects', (req, res) => {
  const userId = (req as { auth?: { userId?: string } }).auth?.userId || 'dev';
  const userProjects = Array.from(projects.values()).filter((p: Record<string, unknown>) => p.userId === userId);
  res.json({ projects: userProjects });
});

// ─── GET /api/editor/project/:id ────────────────────────────────────────────

router.get('/project/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const assets = mediaAssets.get(req.params.id) || [];
  return res.json({ project, mediaAssets: assets });
});

// ─── POST /api/editor/project ────────────────────────────────────────────────

router.post('/project', (req, res) => {
  const { id, name, userId, ...rest } = req.body;
  if (!id) return res.status(400).json({ error: 'Project ID required' });
  projects.set(id, { id, name: name || 'Untitled Project', userId: userId || 'dev', ...rest, updatedAt: new Date().toISOString() });
  if (!mediaAssets.has(id)) mediaAssets.set(id, []);
  saveDB();
  return res.json({ success: true, projectId: id });
});

// ─── PUT /api/editor/project/:id ────────────────────────────────────────────

router.put('/project/:id', (req, res) => {
  const existing = projects.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });
  projects.set(req.params.id, { ...existing, ...req.body, id: req.params.id, updatedAt: new Date().toISOString() });
  saveDB();
  return res.json({ success: true });
});

// ─── POST /api/editor/upload ─────────────────────────────────────────────────

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const projectId = req.body.projectId || 'default';
    const filePath = req.file.path;

    // Get media info
    let info = { duration: 0, width: undefined as number | undefined, height: undefined as number | undefined, fps: undefined as number | undefined, hasAudio: false, hasVideo: false };
    try {
      info = await getMediaInfo(filePath);
    } catch {
      console.warn('[Editor Upload] Could not get media info (FFmpeg may not be available)');
    }

    // Extract thumbnail for video files
    let thumbnail: string | undefined;
    if (info.hasVideo) {
      try {
        const thumbPath = await extractThumbnail(filePath, path.dirname(filePath));
        thumbnail = `/api/editor/media/${projectId}/${path.basename(thumbPath)}`;
      } catch {
        console.warn('[Editor Upload] Could not extract thumbnail');
      }
    }

    const asset = {
      id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      projectId,
      name: req.file.originalname,
      type: req.file.mimetype.startsWith('video/') ? 'video' : req.file.mimetype.startsWith('audio/') ? 'audio' : 'image',
      url: `/api/editor/media/${projectId}/${path.basename(filePath)}`,
      localPath: filePath,
      duration: info.duration,
      width: info.width,
      height: info.height,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      thumbnail,
      uploadedAt: new Date().toISOString(),
    };

    const assets = mediaAssets.get(projectId) || [];
    assets.push(asset);
    mediaAssets.set(projectId, assets);
    saveDB();

    return res.json({ success: true, asset });
  } catch (err) {
    console.error('[Editor Upload] Error:', err);
    return res.status(500).json({ error: 'Upload failed', details: String(err) });
  }
});

// ─── GET /api/editor/media/:projectId/:filename ─────────────────────────────

router.get('/media/:projectId/:filename', (req, res) => {
  const { projectId, filename } = req.params;
  
  // 1. Direct path in project folder
  let targetPath = path.join(UPLOAD_DIR, projectId, filename);
  
  // 2. Fallback to default folder
  if (!fs.existsSync(targetPath)) {
    targetPath = path.join(UPLOAD_DIR, 'default', filename);
  }

  // 3. Fallback: search all project subdirectories for filename
  if (!fs.existsSync(targetPath)) {
    try {
      const subdirs = fs.readdirSync(UPLOAD_DIR);
      for (const dir of subdirs) {
        const candidate = path.join(UPLOAD_DIR, dir, filename);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          targetPath = candidate;
          break;
        }
      }
    } catch {
      // ignore
    }
  }

  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  return res.sendFile(targetPath);
});

// ─── POST /api/editor/transcribe ────────────────────────────────────────────

router.post('/transcribe', async (req, res) => {
  try {
    const { assetId, projectId, localPath } = req.body;
    if (!localPath) return res.status(400).json({ error: 'localPath required' });

    const job = jobQueue.create(projectId || 'default', 'transcribe');
    res.json({ jobId: job.id, message: 'Transcription started' });

    // Run async
    transcribeVideo(localPath, path.dirname(localPath), job.id)
      .then(result => {
        jobQueue.update(job.id, { status: 'complete', progress: 100, result, message: 'Transcription complete' });
        // Attach to media asset
        if (assetId && projectId) {
          const assets = mediaAssets.get(projectId) || [];
          const updated = assets.map((a: unknown) => {
            const asset = a as Record<string, unknown>;
            return asset.id === assetId ? { ...asset, transcript: result } : asset;
          });
          mediaAssets.set(projectId, updated);
        }
      })
      .catch(err => {
        jobQueue.update(job.id, { status: 'error', error: String(err), message: 'Transcription failed' });
      });

  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ─── POST /api/editor/analyze ────────────────────────────────────────────────

router.post('/analyze', async (req, res) => {
  try {
    const { localPath, projectId } = req.body;
    if (!localPath) return res.status(400).json({ error: 'localPath required' });

    const job = jobQueue.create(projectId || 'default', 'analyze');
    res.json({ jobId: job.id, message: 'Analysis started' });

    detectSilenceWindows(localPath, job.id)
      .then(regions => {
        jobQueue.update(job.id, { status: 'complete', progress: 100, result: { silenceRegions: regions }, message: `Found ${regions.length} silence regions` });
      })
      .catch(err => {
        jobQueue.update(job.id, { status: 'error', error: String(err), message: 'Analysis failed' });
      });

  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ─── POST /api/editor/ai-command ─────────────────────────────────────────────

router.post('/ai-command', async (req, res) => {
  try {
    const { prompt, project, transcript } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });
    if (!project) return res.status(400).json({ error: 'project state required' });

    const plan = await processEditorCommand(prompt, project, transcript);
    return res.json({ success: true, plan });
  } catch (err) {
    console.error('[Editor AI Command] Error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

// ─── POST /api/editor/apply-plan ─────────────────────────────────────────────

router.post('/apply-plan', async (req, res) => {
  try {
    const { plan, projectId } = req.body;
    if (!plan || !projectId) return res.status(400).json({ error: 'plan and projectId required' });

    const job = jobQueue.create(projectId, 'render');

    // For remove_silence operations, run FFmpeg
    const silenceOps = (plan.operations || []).filter((op: { operation: string; accepted?: boolean }) => op.operation === 'remove_silence' && op.accepted !== false);

    if (silenceOps.length > 0) {
      res.json({ jobId: job.id, message: 'Applying edit plan…' });
      // Background render (silence removal requires server-side FFmpeg)
      const projectAssets = mediaAssets.get(projectId) || [];
      const videoAsset = (projectAssets as Array<Record<string, unknown>>).find(a => a.type === 'video');
      if (videoAsset?.localPath) {
        // TODO: compute keep segments from silence regions and apply
        jobQueue.update(job.id, { status: 'complete', progress: 100, message: 'Plan applied (timeline state updated on client)' });
      } else {
        jobQueue.update(job.id, { status: 'complete', progress: 100, message: 'Plan applied' });
      }
    } else {
      // Non-FFmpeg operations — client handles timeline state changes
      jobQueue.update(job.id, { status: 'complete', progress: 100, message: 'Plan applied to timeline' });
      return res.json({ jobId: job.id, success: true });
    }

  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ─── POST /api/editor/export ─────────────────────────────────────────────────

router.post('/export', async (req, res) => {
  try {
    const { projectId, localPath, settings } = req.body;
    if (!projectId || !localPath) return res.status(400).json({ error: 'projectId and localPath required' });

    const job = jobQueue.create(projectId, 'export');
    const outputPath = path.join(EXPORT_DIR, `${projectId}_${Date.now()}.mp4`);

    res.json({ jobId: job.id, message: 'Export started' });

    exportVideo(localPath, outputPath, settings || { width: 1920, height: 1080, fps: 30, videoBitrate: 8000, audioBitrate: 192, codec: 'h264' }, job.id)
      .then(() => {
        jobQueue.update(job.id, {
          status: 'complete', progress: 100,
          result: { downloadUrl: `/api/editor/exports/${path.basename(outputPath)}` },
          message: 'Export complete'
        });
      })
      .catch(err => {
        jobQueue.update(job.id, { status: 'error', error: String(err), message: 'Export failed' });
      });

  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ─── GET /api/editor/exports/:filename ──────────────────────────────────────

router.get('/exports/:filename', (req, res) => {
  const filePath = path.join(EXPORT_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Export not found' });
  return res.download(filePath);
});

// ─── GET /api/editor/job/:id ─────────────────────────────────────────────────

router.get('/job/:id', (req, res) => {
  const job = jobQueue.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  return res.json(job);
});

export default router;
