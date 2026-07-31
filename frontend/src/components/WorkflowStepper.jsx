import React from 'react';

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

function WorkflowStepper({ status, degreeType = 'BACHELOR', currentStage = 'PROPOSAL' }) {
  const steps = degreeType === 'MASTER' ? MASTER_STEPS : BACHELOR_STEPS;

  const getStepState = (step, idx) => {
    if (status === 'COMPLETED') return 'completed';
    if (status === 'PENDING' && idx === 0) return 'active';
    if (status === 'ACTIVE') {
      if (idx === 0) return 'completed';
      if (idx === 1) return 'active';
    }
    return 'pending';
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
          const state = getStepState(step, idx);
          const isLast = idx === steps.length - 1;
          const isCompleted = state === 'completed';
          const isActive = state === 'active';

          return (
            <React.Fragment key={step.id}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, zIndex: 2, textAlign: 'center' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: isCompleted ? 'var(--color-success)' : isActive ? 'var(--color-primary)' : 'var(--color-surface-container)',
                  color: isCompleted || isActive ? '#fff' : 'var(--color-on-surface-variant)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14,
                  boxShadow: isActive ? '0 0 0 4px var(--color-primary-container)' : 'none',
                  transition: 'all 0.3s ease',
                }}>
                  {isCompleted ? (
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check</span>
                  ) : (
                    idx + 1
                  )}
                </div>
                <div style={{ marginTop: 8, fontWeight: isActive ? 700 : 600, fontSize: 12, color: isActive ? 'var(--color-primary)' : 'var(--color-on-surface)' }}>
                  {step.label}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-on-surface-variant)', marginTop: 2, maxWidth: 120 }}>
                  {step.description}
                </div>
              </div>

              {!isLast && (
                <div style={{
                  flex: 1, height: 3, marginTop: -24,
                  background: isCompleted ? 'var(--color-success)' : 'var(--color-outline-variant)',
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