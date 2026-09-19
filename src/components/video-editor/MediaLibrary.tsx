import React, { useCallback, useRef, useState } from 'react';
import { useEditorStore } from '@/hooks/useEditorStore';
import type { MediaAsset } from '@/types/editor';
import { Upload, Search, Film, Music, Image, Trash2, Mic } from 'lucide-react';

export default function MediaLibrary() {
  const { mediaAssets, addMediaAsset, project } = useEditorStore();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'video' | 'audio' | 'image'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const filteredAssets = mediaAssets.filter(a => {
    if (filter !== 'all' && a.type !== filter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const uploadFile = useCallback(async (file: File) => {
    if (!project) return;
    setUploading(true);
    setUploadProgress(0);

    const pId = project.id || 'default';
    const formData = new FormData();
    formData.append('projectId', pId);
    formData.append('file', file);

    try {
      const res = await fetch(`/api/editor/upload?projectId=${encodeURIComponent(pId)}`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      if (data.asset) {
        addMediaAsset(data.asset);
      }
    } catch (err) {
      console.warn('[MediaLibrary] Server upload failed, adding local asset:', err);
      // Fallback local asset for offline / testing
      const blobUrl = URL.createObjectURL(file);
      const localAsset: MediaAsset = {
        id: `asset_${Date.now()}`,
        projectId: project.id || 'default',
        name: file.name,
        type: file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image',
        url: blobUrl,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        duration: 0,
      };
      addMediaAsset(localAsset);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [project, addMediaAsset]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(uploadFile);
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    files.forEach(uploadFile);
  }, [uploadFile]);

  const formatDuration = (sec?: number) => {
    if (!sec || isNaN(sec)) return '';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getIcon = (type: string) => {
    if (type === 'video') return <Film size={14} />;
    if (type === 'audio') return <Music size={14} />;
    return <Image size={14} />;
  };

  return (
    <div className="editor-media-library">
      {/* Search + filter */}
      <div className="editor-media-search-row">
        <div className="editor-search-box">
          <Search size={13} className="editor-search-icon" />
          <input
            type="text"
            placeholder="Search media…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="editor-search-input"
          />
        </div>
      </div>

      <div className="editor-media-filters">
        {(['all', 'video', 'audio', 'image'] as const).map(f => (
          <button
            key={f}
            className={`editor-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        ref={dropZoneRef}
        className="editor-drop-zone"
        onDragOver={e => { e.preventDefault(); dropZoneRef.current?.classList.add('drag-active'); }}
        onDragLeave={() => dropZoneRef.current?.classList.remove('drag-active')}
        onDrop={e => { dropZoneRef.current?.classList.remove('drag-active'); handleDrop(e); }}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={24} className="editor-drop-icon" />
        <span className="editor-drop-text">Drop files or click to upload</span>
        <span className="editor-drop-sub">Video, Audio, Images</span>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,audio/*,image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {uploading && (
        <div className="editor-upload-progress">
          <div className="editor-upload-progress-bar">
            <div className="editor-upload-progress-fill" style={{ width: '60%' }} />
          </div>
          <span>Uploading…</span>
        </div>
      )}

      {/* Asset list */}
      <div className="editor-asset-list">
        {filteredAssets.length === 0 && !uploading && (
          <div className="editor-asset-empty">No media yet. Upload files to get started.</div>
        )}
        {filteredAssets.map(asset => (
          <div
            key={asset.id}
            className="editor-asset-item"
            draggable
            onDragStart={e => {
              e.dataTransfer.setData('assetId', asset.id);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            title={`${asset.name}\n${formatSize(asset.fileSize)}${asset.duration ? ` · ${formatDuration(asset.duration)}` : ''}`}
          >
            {/* Thumbnail or icon */}
            <div className="editor-asset-thumb">
              {asset.thumbnail ? (
                <img
                  src={asset.thumbnail}
                  alt={asset.name}
                  className="editor-asset-thumb-img"
                  onError={(e) => {
                    // Hide broken image and let fallback icon display
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="editor-asset-thumb-icon">{getIcon(asset.type)}</div>
              )}
              {asset.duration ? (
                <span className="editor-asset-duration">{formatDuration(asset.duration)}</span>
              ) : null}
            </div>

            {/* Info */}
            <div className="editor-asset-info">
              <span className="editor-asset-name">{asset.name}</span>
              <span className="editor-asset-meta">{formatSize(asset.fileSize)}</span>
            </div>

            {/* Actions */}
            <button
              className="editor-asset-delete"
              onClick={(e) => {
                e.stopPropagation();
                useEditorStore.getState().removeMediaAsset(asset.id);
              }}
              title="Remove"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
