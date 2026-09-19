import React, { useState } from 'react';
import './editor.css';
import { useEditorStore } from '@/hooks/useEditorStore';
import MediaLibrary from './MediaLibrary';
import VideoPreview from './VideoPreview';
import Timeline from './Timeline';
import InspectorPanel from './InspectorPanel';
import AICommandCenter from './AICommandCenter';
import Toolbar from './Toolbar';
import EditPlanModal from './EditPlanModal';
import ExportModal from './ExportModal';
import { Undo2, Redo2, Download, Settings2, Maximize2 } from 'lucide-react';

export default function EditorLayout() {
  const { project, ui } = useEditorStore();
  const [leftTab, setLeftTab] = useState<'media' | 'ai'>('media');
  const [showExport, setShowExport] = useState(false);

  if (!project) return null;

  return (
    <div className="editor-root">
      {/* ── Top Bar ── */}
      <header className="editor-topbar">
        <div className="editor-topbar-left">
          <div className="editor-logo">
            <img src="/editor.png" alt="Studio Pulse" className="editor-logo-img" />
            <span>Studio Pulse</span>
            <span className="editor-badge">AI Video Studio</span>
          </div>
          <div className="editor-project-name">
            <span>{project.name}</span>
            <span className="editor-autosave">● Auto-saved</span>
          </div>
        </div>

        <Toolbar />

        <div className="editor-topbar-right">
          <button className="editor-icon-btn" title="Undo (Ctrl+Z)"><Undo2 size={16} /></button>
          <button className="editor-icon-btn" title="Redo (Ctrl+Y)"><Redo2 size={16} /></button>
          <div className="editor-divider" />
          <button className="editor-icon-btn" title="Settings"><Settings2 size={16} /></button>
          <button
            className="editor-icon-btn"
            title="Fullscreen"
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
            }}
          >
            <Maximize2 size={16} />
          </button>
          <button className="editor-btn-primary" onClick={() => setShowExport(true)}>
            <Download size={14} />
            Export
          </button>
        </div>
      </header>

      {/* ── Main Body ── */}
      <div className="editor-body">
        {/* ── LEFT PANEL ── */}
        <aside className="editor-left">
          <div className="editor-left-tabs">
            <button
              className={`editor-left-tab ${leftTab === 'media' ? 'active' : ''}`}
              onClick={() => setLeftTab('media')}
            >
              Media
            </button>
            <button
              className={`editor-left-tab ${leftTab === 'ai' ? 'active' : ''}`}
              onClick={() => setLeftTab('ai')}
            >
              AI
            </button>
          </div>
          <div className="editor-left-content">
            {leftTab === 'media' ? <MediaLibrary /> : <AICommandCenter />}
          </div>
        </aside>

        {/* ── CENTER: Preview + Timeline ── */}
        <main className="editor-center">
          <VideoPreview />
          <Timeline />
        </main>

        {/* ── RIGHT PANEL ── */}
        <aside className="editor-right">
          <InspectorPanel />
        </aside>
      </div>

      {/* ── Edit Plan Modal ── */}
      {ui.showEditPlanModal && ui.pendingEditPlan && <EditPlanModal />}

      {/* ── Export Modal ── */}
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  );
}
