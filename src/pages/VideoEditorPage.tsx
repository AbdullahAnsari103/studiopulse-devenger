import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useEditorStore } from '@/hooks/useEditorStore';
import EditorLayout from '@/components/video-editor/EditorLayout';
import type { Clip } from '@/types/editor';

export default function VideoEditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useUser();
  const navigate = useNavigate();
  const { createNewProject, loadProject, setMediaAssets, project } = useEditorStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (!projectId) {
      navigate('/editor/default', { replace: true });
      return;
    }

    if (projectId === 'new') {
      const newProject = createNewProject('Untitled Project', user?.id || 'dev');
      navigate(`/editor/${newProject.id}`, { replace: true });
      return;
    }

    // Load from server
    fetch(`/api/editor/project/${projectId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.project) {
          const loadedProject = { ...data.project };
          const loadedAssets = data.mediaAssets || [];
          
          // If tracks are empty and we have a video asset, populate initial clip
          const videoTrack = loadedProject.tracks?.find((t: { type: string }) => t.type === 'video');
          const firstVideo = loadedAssets.find((a: { type: string }) => a.type === 'video');

          if (videoTrack && videoTrack.clips.length === 0 && firstVideo) {
            const initialClip: Clip = {
              id: `clip_${Date.now()}`,
              trackId: videoTrack.id,
              mediaId: firstVideo.id,
              name: firstVideo.name,
              start: 0,
              duration: firstVideo.duration || 10,
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
            videoTrack.clips = [initialClip];
            loadedProject.duration = Math.max(loadedProject.duration || 0, initialClip.duration);
          }

          loadProject(loadedProject);
          setMediaAssets(loadedAssets);
        } else {
          const newProject = createNewProject('Untitled Project', user?.id || 'dev');
          if (projectId !== 'default') {
            navigate(`/editor/${newProject.id}`, { replace: true });
          }
        }
      })
      .catch(() => {
        createNewProject('Untitled Project', user?.id || 'dev');
      });
  }, [projectId, user?.id, navigate, createNewProject, loadProject, setMediaAssets]);

  if (!project && projectId !== 'new') {
    return (
      <div className="editor-loading">
        <div className="editor-loading-spinner" />
        <p>Loading project…</p>
      </div>
    );
  }

  return <EditorLayout />;
}
