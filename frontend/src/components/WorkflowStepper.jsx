import React from 'react';
import { Icon } from './ui';

const BACHELOR_STEPS = [
  { id: 'PENDING', label: 'Group Formation', description: 'Group created & supervisor pending' },
  { id: 'ACTIVE', label: 'Proposal & Mid-Term', description: 'Proposal submitted & evaluations ongoing' },
  { id: 'FINAL', label: 'Final Defense', description: 'Final report & external evaluation' },
  { id: 'COMPLETED', label: 'Completed & Forwarded', description: 'Final marks sent to exam department' },
];

const MASTER_STEPS = [
  { id: 'PENDING', label: 'Thesis Registration', description: 'Topic submitted for coordinator approval' },
  { id: 'PROPOSAL', label: 'Proposal Defense', description: 'Proposal report & supervisor evaluation' },
  { id: 'MID_TERM', label: 'Mid-Term Evaluation', description: 'Mid-term report & external defense' },
  { id: 'FINAL', label: 'Final Defense & Degree', description: 'Final defense & thesis completion' },
];

// Evaluation types required to consider each lifecycle step completed
const STEP_REQUIREMENTS = {
  BACHELOR: {
    ACTIVE: ['PROPOSAL_DEFENSE', 'MIDTERM_DEFENSE'],
    FINAL: ['FINAL_DEFENSE', 'SUPERVISOR', 'EXTERNAL_EXAMINER'],
  },
  MASTER: {
    PROPOSAL: ['PROPOSAL_DEFENSE'],
    MID_TERM: ['MIDTERM_DEFENSE', 'EXTERNAL_MIDTERM'],
    FINAL: ['FINAL_DEFENSE', 'SUPERVISOR', 'EXTERNAL_FINAL'],
  },
};

function WorkflowStepper({ status, degreeType = 'BACHELOR', components = [], evaluations = [] }) {
  const steps = degreeType === 'MASTER' ? MASTER_STEPS : BACHELOR_STEPS;
  const requirements = STEP_REQUIREMENTS[degreeType] || {};

  const hasMarks = (compId) => {
    const e = evaluations.find(ev => ev.componentId === compId);
    return e && e.marks !== null && e.marks !== undefined;
  };

  const isStepDone = (idx) => getStepCompletion(idx) === 'completed';

  const getStepCompletion = (idx) => {
    if (status === 'COMPLETED') return 'completed';
    const step = steps[idx];
    if (idx === 0) return status === 'ACTIVE' ? 'completed' : 'pending';
    if (idx === steps.length - 1) return 'pending';
    const required = requirements[step.id] || [];
    const compIds = required.flatMap(t => components.filter(c => c.evaluationType === t).map(c => c.id));
    if (compIds.length === 0) return 'pending';
    const doneCount = compIds.filter(hasMarks).length;
    if (doneCount === compIds.length) return 'completed';
    if (doneCount > 0) return 'partial';
    return 'pending';
  };

  const getStepState = (idx) => {
    const completion = getStepCompletion(idx);
    if (completion !== 'pending') return completion;
    if (idx === 0) return 'active';
    const prevStarted = steps.slice(0, idx).some((_, i) => getStepCompletion(i) !== 'pending');
    return prevStarted ? 'active' : 'pending';
  };

  return (
    <div className="card" style={{ marginBottom: 24, padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-primary)' }}>
          Academic Lifecycle Tracker
        </div>
        <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: 11 }}>
          {status || 'ACTIVE'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
        {steps.map((step, idx) => {
          const state = getStepState(idx);
          const isLast = idx === steps.length - 1;
          const isCompleted = state === 'completed';
          const isActive = state === 'active';
          const isPartial = state === 'partial';

          const pct = (() => {
            const required = requirements[step.id] || [];
            const compIds = required.flatMap(t => components.filter(c => c.evaluationType === t).map(c => c.id));
            if (compIds.length === 0) return 0;
            return Math.round((compIds.filter(hasMarks).length / compIds.length) * 100);
          })();

          const reviewedTotal = (() => {
            const required = requirements[step.id] || [];
            return required.flatMap(t => components.filter(c => c.evaluationType === t).map(c => c.id)).length;
          })();
          const reviewedCount = (() => {
            const required = requirements[step.id] || [];
            const compIds = required.flatMap(t => components.filter(c => c.evaluationType === t).map(c => c.id));
            return compIds.filter(hasMarks).length;
          })();

          return (
            <React.Fragment key={step.id}>
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, zIndex: 2, textAlign: 'center', position: 'relative' }}
                title={`${step.label}: ${isCompleted ? 'Completed' : isPartial ? `${reviewedCount}/${reviewedTotal} reviewer marks — ${pct}%` : isActive ? 'In progress' : 'Pending'}`}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: isCompleted ? 'var(--color-success)'
                    : isPartial ? `conic-gradient(var(--color-primary) 0deg ${pct * 3.6}deg, var(--color-surface-container) ${pct * 3.6}deg 360deg)`
                    : isActive ? 'var(--color-primary)'
                    : 'var(--color-surface-container)',
                  color: isCompleted || isActive ? '#fff' : isPartial ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14,
                  boxShadow: isActive || isPartial ? '0 0 0 4px var(--color-primary-container)' : 'none',
                  transition: 'all 0.3s ease',
                }}>
                  {isCompleted ? (
                    <Icon name="check" className="material-symbols-outlined" style={{ fontSize: 20 }} />
                  ) : (
                    idx + 1
                  )}
                </div>
                {isPartial && reviewedTotal > 0 && (
                  <div
                    style={{
                      marginTop: 4, fontSize: 10, fontWeight: 700, padding: '1px 7px',
                      borderRadius: 99, color: 'var(--color-on-primary-container)',
                      background: 'var(--color-primary-container)',
                    }}
                  >
                    {reviewedCount}/{reviewedTotal} reviewed
                  </div>
                )}
                <div style={{ marginTop: isPartial && reviewedTotal > 0 ? 2 : 8, fontWeight: (isActive || isPartial) ? 700 : 600, fontSize: 12, color: (isActive || isPartial) ? 'var(--color-primary)' : 'var(--color-on-surface)' }}>
                  {step.label}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-on-surface-variant)', marginTop: 2, maxWidth: 120 }}>
                  {step.description}
                </div>
              </div>

              {!isLast && (
                <div style={{
                  flex: 1, height: 3, marginTop: -24,
                  background: isStepDone(idx) ? 'var(--color-success)' : 'var(--color-outline-variant)',
                  transition: 'background 0.3s ease',
                  zIndex: 1,
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default WorkflowStepper;
