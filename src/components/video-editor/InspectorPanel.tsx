import React, { useState } from 'react';
import { useEditorStore } from '@/hooks/useEditorStore';
import type { Clip } from '@/types/editor';

type InspectorTab = 'transform' | 'video' | 'audio' | 'effects';

export default function InspectorPanel() {
  const { project, ui, updateClip } = useEditorStore();
  const [activeTab, setActiveTab] = useState<InspectorTab>('transform');

  // Find the selected clip
  const selectedClip: Clip | null = ui.selectedClipIds.length > 0
    ? project?.tracks.flatMap(t => t.clips).find(c => c.id === ui.selectedClipIds[0]) ?? null
    : null;

  const handleTransformChange = (key: string, value: number) => {
    if (!selectedClip) return;
    updateClip(selectedClip.id, {
      transform: { ...selectedClip.transform, [key]: value }
    });
  };

  const handleAudioChange = (key: string, value: number | boolean) => {
    if (!selectedClip) return;
    updateClip(selectedClip.id, {
      audio: { ...selectedClip.audio, [key]: value }
    });
  };

  return (
    <div className="editor-inspector">
      <div className="editor-inspector-header">
        <span className="editor-inspector-title">Inspector</span>
        {selectedClip && (
          <span className="editor-inspector-clip-name">{selectedClip.name}</span>
        )}
      </div>

      {/* Tabs */}
      <div className="editor-inspector-tabs">
        {(['transform', 'video', 'audio', 'effects'] as InspectorTab[]).map(tab => (
          <button
            key={tab}
            className={`editor-inspector-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {!selectedClip ? (
        <div className="editor-inspector-empty">
          <p>Select a clip to inspect</p>
        </div>
      ) : (
        <div className="editor-inspector-content">
          {/* ── TRANSFORM TAB ── */}
          {activeTab === 'transform' && (
            <div className="editor-inspector-section">
              <SliderRow label="Scale X" value={selectedClip.transform.scaleX * 100} min={10} max={400} unit="%" onChange={v => handleTransformChange('scaleX', v / 100)} />
              <SliderRow label="Scale Y" value={selectedClip.transform.scaleY * 100} min={10} max={400} unit="%" onChange={v => handleTransformChange('scaleY', v / 100)} />
              <SliderRow label="Rotation" value={selectedClip.transform.rotation} min={-180} max={180} unit="°" onChange={v => handleTransformChange('rotation', v)} />
              <SliderRow label="Opacity" value={selectedClip.transform.opacity} min={0} max={100} unit="%" onChange={v => handleTransformChange('opacity', v)} />
              <NumberPairRow label="Position" labelA="X" labelB="Y"
                valueA={selectedClip.transform.x} valueB={selectedClip.transform.y}
                onChangeA={v => handleTransformChange('x', v)} onChangeB={v => handleTransformChange('y', v)} />
            </div>
          )}

          {/* ── VIDEO TAB ── */}
          {activeTab === 'video' && selectedClip.colorGrade && (
            <div className="editor-inspector-section">
              <SliderRow label="Exposure" value={selectedClip.colorGrade.exposure} min={-100} max={100} unit="" onChange={() => {}} />
              <SliderRow label="Contrast" value={selectedClip.colorGrade.contrast} min={-100} max={100} unit="" onChange={() => {}} />
              <SliderRow label="Saturation" value={selectedClip.colorGrade.saturation} min={-100} max={100} unit="" onChange={() => {}} />
              <SliderRow label="Temperature" value={selectedClip.colorGrade.temperature} min={-100} max={100} unit="" onChange={() => {}} />
              <SliderRow label="Highlights" value={selectedClip.colorGrade.highlights} min={-100} max={100} unit="" onChange={() => {}} />
              <SliderRow label="Shadows" value={selectedClip.colorGrade.shadows} min={-100} max={100} unit="" onChange={() => {}} />
              <SliderRow label="Sharpness" value={selectedClip.colorGrade.sharpness} min={0} max={100} unit="" onChange={() => {}} />
              <SliderRow label="Vignette" value={selectedClip.colorGrade.vignette} min={0} max={100} unit="" onChange={() => {}} />
            </div>
          )}
          {activeTab === 'video' && !selectedClip.colorGrade && (
            <div className="editor-inspector-empty">
              <p>No color grade applied yet.</p>
              <button className="editor-btn-secondary" onClick={() => updateClip(selectedClip.id, { colorGrade: { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0, sharpness: 0, vignette: 0, grain: 0 } })}>
                Add Color Grade
              </button>
            </div>
          )}

          {/* ── AUDIO TAB ── */}
          {activeTab === 'audio' && (
            <div className="editor-inspector-section">
              <SliderRow label="Volume" value={selectedClip.audio.volume} min={0} max={200} unit="%" onChange={v => handleAudioChange('volume', v)} />
              <SliderRow label="Fade In" value={selectedClip.audio.fadeIn} min={0} max={10} unit="s" step={0.1} onChange={v => handleAudioChange('fadeIn', v)} />
              <SliderRow label="Fade Out" value={selectedClip.audio.fadeOut} min={0} max={10} unit="s" step={0.1} onChange={v => handleAudioChange('fadeOut', v)} />
              <ToggleRow label="Mute" value={selectedClip.audio.muted} onChange={v => handleAudioChange('muted', v)} />
              <ToggleRow label="Normalize" value={selectedClip.audio.normalize} onChange={v => handleAudioChange('normalize', v)} />
              <ToggleRow label="Noise Reduction" value={selectedClip.audio.noiseReduction} onChange={v => handleAudioChange('noiseReduction', v)} />
            </div>
          )}

          {/* ── EFFECTS TAB ── */}
          {activeTab === 'effects' && (
            <div className="editor-inspector-section">
              {selectedClip.effects.length === 0 ? (
                <div className="editor-inspector-empty">
                  <p>No effects on this clip.</p>
                  <p className="editor-inspector-hint">Use the AI Command Center to add effects.</p>
                </div>
              ) : (
                selectedClip.effects.map(effect => (
                  <div key={effect.id} className="editor-effect-item">
                    <span className="editor-effect-name">{effect.type}</span>
                    <div className={`editor-effect-toggle ${effect.enabled ? 'on' : ''}`} />
                  </div>
                ))
              )}
            </div>
          )}

          {/* Speed */}
          <div className="editor-inspector-section">
            <div className="editor-inspector-section-title">Speed</div>
            <SliderRow label="Speed" value={selectedClip.speed * 100} min={10} max={400} unit="%" onChange={v => updateClip(selectedClip.id, { speed: v / 100 })} />
          </div>
        </div>
      )}

      {/* Project info at bottom */}
      {project && (
        <div className="editor-inspector-project-info">
          <div className="editor-project-info-title">Project Info</div>
          <div className="editor-project-info-row"><span>Resolution</span><span>{project.width}×{project.height}</span></div>
          <div className="editor-project-info-row"><span>Frame Rate</span><span>{project.fps} fps</span></div>
          <div className="editor-project-info-row"><span>Duration</span><span>{project.duration.toFixed(1)}s</span></div>
        </div>
      )}
    </div>
  );
}

// ── Shared control components ─────────────────────────────────────────────────

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  step?: number;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, unit, step = 1, onChange }: SliderRowProps) {
  return (
    <div className="editor-control-row">
      <label className="editor-control-label">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="editor-control-slider"
      />
      <span className="editor-control-value">{typeof value === 'number' ? value.toFixed(step < 1 ? 1 : 0) : value}{unit}</span>
    </div>
  );
}

interface NumberPairRowProps {
  label: string;
  labelA: string;
  labelB: string;
  valueA: number;
  valueB: number;
  onChangeA: (v: number) => void;
  onChangeB: (v: number) => void;
}

function NumberPairRow({ label, labelA, labelB, valueA, valueB, onChangeA, onChangeB }: NumberPairRowProps) {
  return (
    <div className="editor-control-row">
      <label className="editor-control-label">{label}</label>
      <div className="editor-control-pair">
        <span className="editor-control-pair-label">{labelA}</span>
        <input type="number" value={valueA} onChange={e => onChangeA(Number(e.target.value))} className="editor-control-number" />
        <span className="editor-control-pair-label">{labelB}</span>
        <input type="number" value={valueB} onChange={e => onChangeB(Number(e.target.value))} className="editor-control-number" />
      </div>
    </div>
  );
}

interface ToggleRowProps { label: string; value: boolean; onChange: (v: boolean) => void; }

function ToggleRow({ label, value, onChange }: ToggleRowProps) {
  return (
    <div className="editor-control-row">
      <label className="editor-control-label">{label}</label>
      <button
        className={`editor-toggle ${value ? 'on' : ''}`}
        onClick={() => onChange(!value)}
      >
        <div className="editor-toggle-thumb" />
      </button>
    </div>
  );
}
