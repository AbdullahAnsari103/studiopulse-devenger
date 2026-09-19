import React from 'react';
import { useEditorStore } from '@/hooks/useEditorStore';
import type { ToolMode } from '@/types/editor';
import {
  MousePointer2, Scissors, SplitSquareHorizontal, Crop,
  Type, Bookmark, Trash2, Copy, RotateCcw, Gauge
} from 'lucide-react';

interface ToolDef {
  mode: ToolMode;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
}

const TOOLS: ToolDef[] = [
  { mode: 'select', icon: <MousePointer2 size={15} />, label: 'Select', shortcut: 'V' },
  { mode: 'cut', icon: <Scissors size={15} />, label: 'Cut', shortcut: 'C' },
  { mode: 'split', icon: <SplitSquareHorizontal size={15} />, label: 'Split', shortcut: 'B' },
  { mode: 'trim', icon: <Crop size={15} />, label: 'Trim', shortcut: 'T' },
  { mode: 'text', icon: <Type size={15} />, label: 'Text', shortcut: 'X' },
  { mode: 'marker', icon: <Bookmark size={15} />, label: 'Marker', shortcut: 'M' },
];

export default function Toolbar() {
  const { ui, setActiveTool, ui: { selectedClipIds }, removeClip } = useEditorStore();

  const handleDelete = () => {
    selectedClipIds.forEach(id => removeClip(id));
  };

  return (
    <div className="editor-toolbar">
      {/* Tool buttons */}
      <div className="editor-toolbar-group">
        {TOOLS.map(tool => (
          <button
            key={tool.mode}
            className={`editor-tool-btn ${ui.activeTool === tool.mode ? 'active' : ''}`}
            onClick={() => setActiveTool(tool.mode)}
            title={`${tool.label} (${tool.shortcut})`}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div className="editor-toolbar-divider" />

      {/* Clip actions (enabled when clip selected) */}
      <div className="editor-toolbar-group">
        <button
          className="editor-tool-btn"
          title="Duplicate selected"
          disabled={selectedClipIds.length === 0}
        >
          <Copy size={15} />
        </button>
        <button
          className="editor-tool-btn danger"
          title="Delete selected (Delete)"
          disabled={selectedClipIds.length === 0}
          onClick={handleDelete}
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="editor-toolbar-divider" />

      {/* Speed */}
      <div className="editor-toolbar-group">
        <button className="editor-tool-btn" title="Speed">
          <Gauge size={15} />
        </button>
        <button className="editor-tool-btn" title="Reverse">
          <RotateCcw size={15} />
        </button>
      </div>
    </div>
  );
}
