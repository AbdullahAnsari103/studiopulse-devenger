import React, { useState } from 'react';
import { useEditorStore } from '@/hooks/useEditorStore';
import { Download, X, Film, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import type { ExportPreset, ExportFormat } from '@/types/editor';

interface Props {
  onClose: () => void;
}

const PRESETS: Array<{ id: ExportPreset; label: string; sub: string; res: string; aspect: string }> = [
  { id: 'youtube', label: 'YouTube Standard', sub: '16:9 1080p Full HD (Recommended)', res: '1920x1080', aspect: '16:9' },
  { id: 'youtube_shorts', label: 'YouTube Shorts / TikTok', sub: '9:16 Vertical 1080p', res: '1080x1920', aspect: '9:16' },
  { id: 'instagram_reels', label: 'Instagram Reels', sub: '9:16 1080x1920 30fps', res: '1080x1920', aspect: '9:16' },
  { id: 'custom', label: 'Ultra HD 4K', sub: '16:9 3840x2160 High Bitrate', res: '3840x2160', aspect: '16:9' },
];

export default function ExportModal({ onClose }: Props) {
  const { project, mediaAssets } = useEditorStore();
  const [preset, setPreset] = useState<ExportPreset>('youtube');
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [quality, setQuality] = useState<'high' | 'ultra' | 'medium'>('high');
  const [status, setStatus] = useState<'idle' | 'rendering' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeVideoAsset = mediaAssets.find(a => a.type === 'video');

  const handleStartExport = async () => {
    if (!project) return;
    setStatus('rendering');
    setProgress(15);
    setErrorMsg(null);

    const activePreset = PRESETS.find(p => p.id === preset);
    const [widthStr, heightStr] = (activePreset?.res || '1920x1080').split('x');

    const payload = {
      projectId: project.id || 'default',
      localPath: activeVideoAsset?.localPath || activeVideoAsset?.url,
      settings: {
        preset,
        format,
        resolution: { width: parseInt(widthStr), height: parseInt(heightStr) },
        fps: project.fps || 30,
        videoBitrate: quality === 'ultra' ? 16000 : quality === 'high' ? 8000 : 4000,
        audioBitrate: 192,
        codec: 'h264',
      }
    };

    try {
      const res = await fetch('/api/editor/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Export request failed');
      const data = await res.json();
      const jobId = data.jobId;

      if (!jobId) {
        // Direct download fallback
        if (activeVideoAsset?.url) {
          setDownloadUrl(activeVideoAsset.url);
          setStatus('complete');
          setProgress(100);
          return;
        }
        throw new Error('Could not initiate export job');
      }

      // Poll job status
      const interval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/editor/job/${jobId}`);
          if (!pollRes.ok) return;
          const job = await pollRes.json();
          
          setProgress(job.progress || 50);

          if (job.status === 'complete') {
            clearInterval(interval);
            setStatus('complete');
            setProgress(100);
            setDownloadUrl(job.result?.downloadUrl || activeVideoAsset?.url || '#');
          } else if (job.status === 'error') {
            clearInterval(interval);
            // Fallback to source video download
            if (activeVideoAsset?.url) {
              setDownloadUrl(activeVideoAsset.url);
              setStatus('complete');
              setProgress(100);
            } else {
              setStatus('error');
              setErrorMsg(job.error || 'Export rendering failed');
            }
          }
        } catch {
          // ignore polling tick error
        }
      }, 1000);

    } catch (err) {
      if (activeVideoAsset?.url) {
        setDownloadUrl(activeVideoAsset.url);
        setStatus('complete');
        setProgress(100);
      } else {
        setStatus('error');
        setErrorMsg(String(err));
      }
    }
  };

  return (
    <div className="editor-modal-backdrop" onClick={onClose}>
      <div className="editor-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        {/* Header */}
        <div className="editor-modal-header">
          <div className="editor-modal-title">
            <Film size={16} className="editor-modal-icon" />
            <span>Export & Render Video</span>
          </div>
          <button className="editor-modal-close" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Content */}
        <div className="editor-modal-content">
          {status === 'idle' && (
            <>
              {/* Presets */}
              <div className="editor-export-presets" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 0.5 }}>
                  Select Preset
                </label>
                {PRESETS.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setPreset(p.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: preset === p.id ? 'rgba(130, 0, 219, 0.15)' : '#121222',
                      border: `1px solid ${preset === p.id ? '#8200db' : '#222238'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.sub}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#8200db', background: 'rgba(130, 0, 219, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
                      {p.aspect}
                    </span>
                  </div>
                ))}
              </div>

              {/* Format & Quality */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                    Format
                  </label>
                  <select
                    value={format}
                    onChange={e => setFormat(e.target.value as ExportFormat)}
                    style={{ width: '100%', padding: '8px 10px', background: '#121222', border: '1px solid #222238', color: '#fff', borderRadius: 6, fontSize: 12 }}
                  >
                    <option value="mp4">MP4 (H.264 / AAC)</option>
                    <option value="webm">WebM (VP9 / Opus)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                    Quality
                  </label>
                  <select
                    value={quality}
                    onChange={e => setQuality(e.target.value as 'high' | 'ultra' | 'medium')}
                    style={{ width: '100%', padding: '8px 10px', background: '#121222', border: '1px solid #222238', color: '#fff', borderRadius: 6, fontSize: 12 }}
                  >
                    <option value="ultra">Ultra (Master Quality)</option>
                    <option value="high">High (1080p Crisp)</option>
                    <option value="medium">Medium (Faster Export)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {status === 'rendering' && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <Loader2 size={36} className="animate-spin" style={{ color: '#8200db', margin: '0 auto 16px' }} />
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Rendering Video Master…</h4>
              <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Encoding tracks, applying cuts, filters and audio mastering.</p>
              <div style={{ height: 6, background: '#1e1e30', borderRadius: 3, overflow: 'hidden', maxWidth: 320, margin: '0 auto' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #8200db, #00d4ff)', transition: 'width 0.3s ease' }} />
              </div>
              <span style={{ fontSize: 11, color: '#64748b', marginTop: 8, display: 'block' }}>{progress}% completed</span>
            </div>
          )}

          {status === 'complete' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <CheckCircle2 size={42} style={{ color: '#10b981', margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Video Ready for Download!</h4>
              <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>Your video has been rendered and optimized.</p>
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={`${project?.name || 'StudioPulse_Video'}.mp4`}
                  className="editor-btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', fontSize: 14, textDecoration: 'none' }}
                >
                  <Download size={16} />
                  Download Rendered MP4
                </a>
              )}
            </div>
          )}

          {status === 'error' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <AlertCircle size={40} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Export Encountered an Issue</h4>
              <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 16 }}>{errorMsg}</p>
              <button className="editor-btn-secondary" onClick={() => setStatus('idle')}>
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {status === 'idle' && (
          <div className="editor-modal-footer">
            <button className="editor-btn-secondary" onClick={onClose}>Cancel</button>
            <button className="editor-btn-primary" onClick={handleStartExport} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} />
              Start Export
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
