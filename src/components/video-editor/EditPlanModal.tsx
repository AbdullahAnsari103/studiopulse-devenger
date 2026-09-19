import React, { useState } from 'react';
import { useEditorStore } from '@/hooks/useEditorStore';
import { CheckCircle2, XCircle, Play, Wand2, AlertCircle, Clock, Scissors, X } from 'lucide-react';
import type { EditOperation } from '@/types/editor';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function EditPlanModal() {
  const { ui, project, applyEditPlan, setPendingEditPlan } = useEditorStore();
  const plan = ui.pendingEditPlan;
  const [applying, setApplying] = useState(false);
  const [operationStates, setOperationStates] = useState<Record<string, boolean>>({});

  if (!plan) return null;

  const toggleOperation = (opId: string) => {
    setOperationStates(prev => ({ ...prev, [opId]: !(prev[opId] ?? true) }));
  };

  const isAccepted = (opId: string) => operationStates[opId] ?? true;

  const acceptedCount = plan.operations.filter(op => isAccepted(op.id)).length;

  const handleApply = async () => {
    setApplying(true);
    // Mark accepted/rejected on operations
    const planWithStates = {
      ...plan,
      operations: plan.operations.map(op => ({ ...op, accepted: isAccepted(op.id) })),
    };
    
    const res = await fetch(`/api/editor/apply-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planWithStates, projectId: project?.id || 'default' })
    });

    if (res.ok) {
      await new Promise(r => setTimeout(r, 400)); // brief animation
      applyEditPlan(planWithStates);
    }
    setApplying(false);
  };

  const handleDismiss = () => setPendingEditPlan(null);

  const durationChange = plan.estimatedDurationChange;
  const durationLabel = durationChange === 0 ? 'No change' :
    durationChange < 0 ? `${Math.abs(durationChange).toFixed(1)}s shorter` :
      `${durationChange.toFixed(1)}s longer`;

  const getOpIcon = (operation: string) => {
    if (operation.includes('silence') || operation.includes('filler')) return <Scissors size={13} />;
    if (operation.includes('caption') || operation.includes('text')) return <span className="op-icon-text">T</span>;
    if (operation.includes('color') || operation.includes('grade')) return <span className="op-icon-circle" />;
    if (operation.includes('audio') || operation.includes('volume')) return <span className="op-icon-wave">♪</span>;
    return <Wand2 size={13} />;
  };

  return (
    <div className="editor-modal-overlay" onClick={handleDismiss}>
      <div className="editor-modal edit-plan-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="edit-plan-header">
          <div className="edit-plan-header-left">
            <Wand2 size={18} className="edit-plan-icon" />
            <div>
              <h2 className="edit-plan-title">AI Edit Plan</h2>
              <p className="edit-plan-prompt">"{plan.prompt}"</p>
            </div>
          </div>
          <button className="editor-icon-btn" onClick={handleDismiss}><X size={18} /></button>
        </div>

        {/* Summary */}
        <div className="edit-plan-summary">
          <p>{plan.summary}</p>
          <div className="edit-plan-stats">
            <div className="edit-plan-stat">
              <span className="edit-plan-stat-value">{plan.operations.length}</span>
              <span className="edit-plan-stat-label">Operations</span>
            </div>
            <div className="edit-plan-stat">
              <span className="edit-plan-stat-value">{acceptedCount}</span>
              <span className="edit-plan-stat-label">Selected</span>
            </div>
            <div className="edit-plan-stat">
              <Clock size={12} />
              <span className="edit-plan-stat-value">{durationLabel}</span>
            </div>
          </div>
        </div>

        {/* Operations list */}
        <div className="edit-plan-ops">
          <p className="edit-plan-ops-label">Operations — click to accept/reject individually</p>
          <div className="edit-plan-ops-list">
            {plan.operations.map((op, i) => {
              const accepted = isAccepted(op.id);
              return (
                <button
                  key={op.id}
                  className={`edit-plan-op ${accepted ? 'accepted' : 'rejected'}`}
                  onClick={() => toggleOperation(op.id)}
                >
                  <div className="edit-plan-op-num">{String(i + 1).padStart(2, '0')}</div>
                  <div className="edit-plan-op-icon">{getOpIcon(op.operation)}</div>
                  <div className="edit-plan-op-body">
                    <span className="edit-plan-op-desc">{op.description}</span>
                    <span className="edit-plan-op-type">{op.operation.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="edit-plan-op-toggle">
                    {accepted
                      ? <CheckCircle2 size={16} className="op-check" />
                      : <XCircle size={16} className="op-cross" />
                    }
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="edit-plan-actions">
          <button className="editor-btn-ghost" onClick={handleDismiss}>Cancel</button>
          <button className="editor-btn-ghost" onClick={handleDismiss}>Modify</button>
          <button className="editor-btn-ghost">
            <Play size={13} /> Preview
          </button>
          <button
            className="editor-btn-primary"
            onClick={handleApply}
            disabled={applying || acceptedCount === 0}
          >
            {applying ? (
              <><div className="editor-ai-spinner small" /> Applying…</>
            ) : (
              <><CheckCircle2 size={14} /> Apply {acceptedCount} Operations</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
