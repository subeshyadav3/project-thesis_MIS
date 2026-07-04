import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import ProposalsSection from '../../components/ProposalsSection';
import ExaminerAssignmentSection from '../../components/ExaminerAssignmentSection';
import SupervisorAssignmentSection from '../../components/SupervisorAssignmentSection';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

const ROLE_LABEL = {
  SUPERVISOR: 'Supervisor',
  COORDINATOR: 'Coordinator',
  EXTERNAL_EXAMINER: 'Internal Examiner',
};

function ProjectDetail() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [summary, setSummary] = useState(null);
  const [components, setComponents] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSupervisor = user.role === 'SUPERVISOR';
  const isCoordinator = user.role === 'COORDINATOR';
  const isExternal = user.role === 'EXTERNAL_EXAMINER';

  const loadData = useCallback((signal) => {
    setLoading(true);
    const endpoint = type === 'group' ? `/groups/${id}` : `/theses/${id}`;
    api.get(endpoint, { signal })
      .then(({ data }) => setItem(data))
      .catch((err) => { if (err.name !== 'CanceledError') console.error(err); });
    const evalEndpoint = type === 'group' ? `/evaluations/group/${id}` : `/evaluations/thesis/${id}`;
    api.get(evalEndpoint, { signal })
      .then(({ data }) => {
        setSummary(data.summary || null);
        setComponents(data.components || []);
        setEvaluations(data.evaluations || []);
      })
      .catch((err) => { if (err.name !== 'CanceledError') console.error(err); })
      .finally(() => setLoading(false));
  }, [id, type]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const componentByType = (evalType) => components.find(c => c.evaluationType === evalType);
  const evaluationForComponent = (compId) => evaluations.find(e => e.componentId === compId);

  const handleSaveComponent = async (component, marksValue, comment) => {
    if (marksValue === '' || marksValue === null || marksValue === undefined) {
      toast.warning('Please enter marks');
      return;
    }
    const m = parseFloat(marksValue);
    if (Number.isNaN(m) || m < 0 || m > component.maxMarks) {
      toast.warning(`Marks must be between 0 and ${component.maxMarks}`);
      return;
    }
    try {
      const payload = {
        componentId: component.id,
        marks: m,
        comment: comment || null,
      };
      if (type === 'group') payload.groupId = parseInt(id); else payload.thesisId = parseInt(id);
      await api.post('/evaluations/marks', payload);
      toast.success(`${component.name} marks saved`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to save ${component.name}`);
    }
  };

  const handleComplete = async (componentId) => {
    const e = evaluationForComponent(componentId);
    if (!e || e.marks === null || e.marks === undefined || e.marks === 0) {
      const confirmed = window.confirm('Warning: The marks for this component are zero or not set. Do you still want to mark it as complete?');
      if (!confirmed) return;
    }
    setCompleting(componentId);
    try {
      const payload = {};
      if (type === 'group') payload.groupId = parseInt(id); else payload.thesisId = parseInt(id);
      await api.put(`/evaluations/${componentId}/complete`, payload);
      toast.success('Evaluation marked as complete');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to complete evaluation');
    } finally {
      setCompleting(null);
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm(`Mark this ${type === 'group' ? 'project' : 'thesis'} as COMPLETED? This will finalize it at the project level.`)) return;
    setFinalizing(true);
    try {
      const endpoint = type === 'group' ? `/groups/${id}/status` : `/theses/${id}/status`;
      await api.put(endpoint, { status: 'COMPLETED' });
      toast.success(`${type === 'group' ? 'Project' : 'Thesis'} marked as completed`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to finalize');
    } finally {
      setFinalizing(false);
    }
  };

  const name = type === 'group' ? item?.name : `${item?.student?.firstName} ${item?.student?.lastName}`;
  const title = type === 'group' ? item?.projectTitle : item?.title;
  const backPath = isSupervisor
    ? (type === 'group' ? '/supervisor/bachelor' : '/supervisor/master')
    : isCoordinator
    ? (type === 'group' ? '/coordinator/bachelor-projects' : '/coordinator/master-thesis')
    : '/external/evaluations';

  const orderedComponents = [...components].sort((a, b) => {
    const order = ['SUPERVISOR', 'PROPOSAL_DEFENSE', 'MIDTERM_DEFENSE', 'FINAL_DEFENSE', 'EXTERNAL_EXAMINER'];
    return order.indexOf(a.evaluationType) - order.indexOf(b.evaluationType);
  });

  const currentUserComponent = components.find(c => c.evaluatorRole === user.role);

  return (
    <PageLayout title={title} subtitle={name || ''} user={user}
      actions={
        <button className="btn btn-outline btn-sm" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate(backPath); }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span> Back
        </button>
      }
    >
      {/* Horizontal tab bar */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <div className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <span className="material-symbols-outlined">overview</span> Overview
        </div>
        <div className={`tab ${activeTab === 'evaluation' ? 'active' : ''}`} onClick={() => setActiveTab('evaluation')}>
          <span className="material-symbols-outlined">grading</span> Evaluation
        </div>
      </div>

      {/* ============ OVERVIEW TAB ============ */}
      {activeTab === 'overview' && (
        <>
          {/* Project Overview */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header"><h3>Project Overview</h3></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 24px', padding: '12px 16px', fontSize: 14 }}>
              {type === 'group' && (
                <>
                  <span style={{ fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Group:</span>
                  <span>{item?.name}</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Group Members:</span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {item?.members?.length > 0 ? item.members.map(m => (
                      <span key={m.id} className="badge badge-info" style={{ fontSize: 12 }}>
                        {m.student?.firstName} {m.student?.lastName} ({m.rollNumber})
                      </span>
                    )) : <span style={{ color: 'var(--color-on-surface-variant)' }}>—</span>}
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Project Type:</span>
                  <span><span className={`badge badge-${item?.projectType === 'MAJOR' ? 'warning' : 'info'}`}>{item?.projectType || 'MINOR'}</span></span>
                </>
              )}
              {type === 'thesis' && (
                <>
                  <span style={{ fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Student:</span>
                  <span>{item?.student?.firstName} {item?.student?.lastName}</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Email:</span>
                  <span>{item?.student?.email || '—'}</span>
                </>
              )}
<span style={{ fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Title:</span>
              <span>{title}</span>
              <span style={{ fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Supervisor:</span>
              <span>{item?.supervisor ? `${item.supervisor.firstName} ${item.supervisor.lastName}` : '—'}</span>
              <span style={{ fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Internal Examiner:</span>
              <span>
                {item?.examinerAssignments?.length > 0
                  ? item.examinerAssignments.map(a => (
                      <span key={a.id} className="badge badge-info" style={{ fontSize: 12 }}>
                        {a.externalExaminer?.firstName} {a.externalExaminer?.lastName}
                      </span>
                    ))
                  : <span style={{ color: 'var(--color-on-surface-variant)' }}>Not assigned</span>
                }
              </span>
              <span style={{ fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Status:</span>
              <span><span className={`badge badge-${item?.status?.toLowerCase() || 'pending'}`}>{item?.status || 'PENDING'}</span></span>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card bento-card">
              <div className="stat-icon"><span className="material-symbols-outlined">score</span></div>
              <div className="stat-number">{summary ? summary.total : 0}</div>
              <div className="stat-label">Total Marks / {summary?.maxTotal || (type === 'group' ? 100 : 200)}</div>
            </div>
            <div className="stat-card bento-card">
              <div className="stat-icon"><span className="material-symbols-outlined">check_circle</span></div>
              <div className="stat-number">{summary?.completedCount || 0}<span style={{ fontSize: 16, color: 'var(--color-on-surface-variant)' }}>/{summary?.totalCount || components.length}</span></div>
              <div className="stat-label">Components Evaluated</div>
            </div>
          </div>

          {/* Evaluation Breakdown (read-only) */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header"><h3>Evaluation Breakdown</h3></div>
            {orderedComponents.length === 0 ? (
              <p style={{ color: 'var(--color-on-surface-variant)' }}>No evaluation components yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {orderedComponents.map(c => {
                  const e = evaluationForComponent(c.id);
                  const hasMarks = e && e.marks !== null && e.marks !== undefined;
                  const isCompleted = e?.status === 'COMPLETED';
                  return (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                      borderRadius: 8,
                      background: isCompleted ? 'var(--color-surface-container-low)' : 'transparent',
                      border: `1px solid ${isCompleted ? 'var(--color-success)' : 'var(--color-outline-variant)'}`,
                      opacity: isCompleted ? 0.85 : 1,
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: isCompleted ? 'var(--color-success-container)' : hasMarks ? 'var(--color-tertiary-container)' : 'var(--color-surface-container)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isCompleted ? 'var(--color-on-success-container)' : hasMarks ? 'var(--color-on-tertiary-container)' : 'var(--color-on-surface-variant)',
                        flexShrink: 0,
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                          {isCompleted ? 'lock' : hasMarks ? 'check_circle' : 'pending'}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {c.name}
                          {isCompleted && <span className="badge" style={{ marginLeft: 8, fontSize: 10, background: 'var(--color-success-container)', color: 'var(--color-on-success-container)' }}>Completed</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>
                          Evaluated by {ROLE_LABEL[c.evaluatorRole]} · Max {c.maxMarks} marks
                        </div>
                        {e?.comment && (
                          <div style={{ fontSize: 12, fontStyle: 'italic', marginTop: 4, color: 'var(--color-on-surface-variant)' }}>
                            "{e.comment}"
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 70 }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: hasMarks ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}>
                          {hasMarks ? e.marks : '—'}
                          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-on-surface-variant)' }}> / {c.maxMarks}</span>
                        </div>
                        {e?.submittedBy && (
                          <div style={{ fontSize: 10, color: 'var(--color-on-surface-variant)' }}>
                            by {e.submittedBy.firstName} {e.submittedBy.lastName}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 14, borderRadius: 8, background: 'var(--color-primary-container)', border: '2px solid var(--color-primary)' }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-on-primary)' }}>Grand Total</span>
                  <span style={{ fontWeight: 800, fontSize: 24, color: 'var(--color-on-primary)' }}>
                    {summary?.total ?? 0} <span style={{ fontWeight: 400, fontSize: 14 }}>/ {summary?.maxTotal ?? (type === 'group' ? 100 : 200)}</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* COORDINATOR: assign / change supervisor */}
          {isCoordinator && (
            <div style={{ marginBottom: 24 }}>
              <SupervisorAssignmentSection
                type={type}
                id={parseInt(id)}
                currentSupervisor={item?.supervisor}
                onRefresh={loadData}
                disabled={item?.status === 'COMPLETED'}
              />
            </div>
          )}

          {/* COORDINATOR: assign internal examiner */}
          {isCoordinator && (
            <div style={{ marginBottom: 24 }}>
              <ExaminerAssignmentSection
                type={type}
                id={parseInt(id)}
                currentAssignments={item?.examinerAssignments || []}
                onRefresh={loadData}
                disabled={item?.status === 'COMPLETED'}
              />
            </div>
          )}

          {/* Submitted documents */}
          <div style={{ marginBottom: 24 }}>
            <ProposalsSection proposals={item?.proposals || []} />
          </div>
        </>
      )}

      {/* ============ EVALUATION TAB ============ */}
      {activeTab === 'evaluation' && (
        <>
          {/* Supervisor / External Examiner: single evaluation form */}
          {!isCoordinator && currentUserComponent && (() => {
            const e = evaluationForComponent(currentUserComponent.id);
            const isCompleted = e?.status === 'COMPLETED';
            return (
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                  <div>
                    <h3 style={{ margin: 0 }}>{currentUserComponent.name} Evaluation</h3>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                      Max {currentUserComponent.maxMarks} marks · You are the evaluator
                    </p>
                  </div>
                  {isCompleted && (
                    <span className="badge" style={{ background: 'var(--color-success-container)', color: 'var(--color-on-success-container)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>lock</span> Completed
                    </span>
                  )}
                </div>
                {isCompleted ? (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36 }}>lock</span>
                    <p style={{ marginTop: 8 }}>This evaluation has been finalized and can no longer be edited.</p>
                    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8, color: 'var(--color-primary)' }}>
                      Marks: {e?.marks ?? '—'} / {currentUserComponent.maxMarks}
                    </div>
                    {e?.comment && <p style={{ fontStyle: 'italic', marginTop: 4 }}>"{e.comment}"</p>}
                    {item?.status !== 'COMPLETED' && (
                      <div style={{ marginTop: 16, borderTop: '1px solid var(--color-outline-variant)', paddingTop: 16 }}>
                        <p style={{ fontSize: 12, marginBottom: 8 }}>Finalize the entire project/thesis as completed?</p>
                        <button className="btn btn-primary" onClick={handleFinalize} disabled={finalizing}>
                          <span className="material-symbols-outlined">{finalizing ? 'progress_activity' : 'check_circle'}</span>
                          {finalizing ? 'Finalizing...' : 'Finalize Project'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <EvaluationForm
                    component={currentUserComponent}
                    evaluation={e}
                    onSave={(marks, comment) => handleSaveComponent(currentUserComponent, marks, comment)}
                    onComplete={() => handleComplete(currentUserComponent.id)}
                    completing={completing === currentUserComponent.id}
                    onFinalize={item?.status !== 'COMPLETED' ? handleFinalize : undefined}
                    finalizing={finalizing}
                  />
                )}
              </div>
            );
          })()}

          {/* Coordinator: defense evaluation forms (always show, read-only when done) */}
          {isCoordinator && (() => {
            const defenseTypes = ['PROPOSAL_DEFENSE', 'MIDTERM_DEFENSE', 'FINAL_DEFENSE'];
            const defenseComps = defenseTypes.map(t => componentByType(t)).filter(Boolean);
            if (defenseComps.length === 0) {
              if (type === 'thesis') {
                return (
                  <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: 32 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-primary)' }}>info</span>
                    <h3 style={{ marginTop: 12 }}>Coordinator Evaluation</h3>
                    <p style={{ color: 'var(--color-on-surface-variant)' }}>Master theses are evaluated by the Supervisor (100 marks) and External Examiner (100 marks). You have no direct evaluation components to fill.</p>
                  </div>
                );
              }
              return null;
            }
            return (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                {defenseComps.map(c => {
                  const e = evaluationForComponent(c.id);
                  const isCompleted = e?.status === 'COMPLETED';
                  return (
                    <div key={c.id} className="card" style={{ flex: 1, minWidth: 240, opacity: isCompleted ? 0.85 : 1 }}>
                      <div className="card-header">
                        <h3>{c.name}</h3>
                        {isCompleted && <span className="badge" style={{ background: 'var(--color-success-container)', color: 'var(--color-on-success-container)' }}>Completed</span>}
                      </div>
                      {isCompleted ? (
                        <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 36 }}>lock</span>
                          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8, color: 'var(--color-primary)' }}>
                            Marks: {e?.marks ?? '—'} / {c.maxMarks}
                          </div>
                          {e?.comment && <p style={{ fontStyle: 'italic', fontSize: 12, marginTop: 4 }}>"{e.comment}"</p>}
                        </div>
                      ) : (
                        <DefenseCard
                          component={c}
                          evaluation={e}
                          onSave={(marks, comment) => handleSaveComponent(c, marks, comment)}
                          onComplete={() => handleComplete(c.id)}
                          completing={completing === c.id}
                          onFinalize={item?.status !== 'COMPLETED' ? handleFinalize : undefined}
                          finalizing={finalizing}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Coordinator: Finalize project */}
          {isCoordinator && item?.status !== 'COMPLETED' && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h3>Finalize Project</h3>
              </div>
              <div style={{ padding: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', marginBottom: 12 }}>
                  Mark this project as completed. This will lock all assignments and prevent further edits.
                </p>
                <button className="btn btn-primary" onClick={handleFinalize} disabled={finalizing}>
                  <span className="material-symbols-outlined">{finalizing ? 'progress_activity' : 'check_circle'}</span>
                  {finalizing ? 'Finalizing...' : 'Finalize Project'}
                </button>
              </div>
            </div>
          )}

          {/* If no user component found */}
          {!currentUserComponent && !isCoordinator && (
            <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: 32 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }}>info</span>
              <h3 style={{ marginTop: 12 }}>No evaluation component assigned</h3>
              <p style={{ color: 'var(--color-on-surface-variant)' }}>You don't have an evaluation component assigned for this project.</p>
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}

function EvaluationForm({ component, evaluation, onSave, onComplete, completing, onFinalize, finalizing }) {
  const [marks, setMarks] = useState(evaluation?.marks?.toString() ?? '');
  const [comment, setComment] = useState(evaluation?.comment ?? '');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setMarks(evaluation?.marks?.toString() ?? '');
    setComment(evaluation?.comment ?? '');
  }, [evaluation?.id, evaluation?.marks, evaluation?.comment]);

  const submit = async () => {
    setSaving(true);
    try { await onSave(marks, comment); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'start', padding: '0 16px 12px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: 12 }}>Marks (out of {component.maxMarks})</label>
          <input
            type="number"
            value={marks}
            onChange={e => setMarks(e.target.value)}
            max={component.maxMarks}
            min="0"
            step="0.5"
            placeholder="0"
            style={{ fontSize: 20, fontWeight: 700, textAlign: 'center' }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: 12 }}>Comment (optional)</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Share your overall assessment..."
            style={{ minHeight: 80, width: '100%' }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '0 16px 16px' }}>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          <span className="material-symbols-outlined">{saving ? 'progress_activity' : 'save'}</span>
          {saving ? 'Saving...' : 'Save Marks'}
        </button>
        <button
          className="btn"
          style={{ background: 'var(--color-success-container)', color: 'var(--color-on-success-container)' }}
          onClick={onComplete}
          disabled={completing}
        >
          <span className="material-symbols-outlined">{completing ? 'progress_activity' : 'lock'}</span>
          {completing ? 'Completing...' : 'Complete'}
        </button>
        {onFinalize && (
          <button className="btn btn-primary" onClick={onFinalize} disabled={finalizing}>
            <span className="material-symbols-outlined">{finalizing ? 'progress_activity' : 'check_circle'}</span>
            {finalizing ? 'Finalizing...' : 'Finalize Project'}
          </button>
        )}
      </div>
    </>
  );
}

function DefenseCard({ component, evaluation, onSave, onComplete, completing, onFinalize, finalizing }) {
  const [marks, setMarks] = useState(evaluation?.marks?.toString() ?? '');
  const [comment, setComment] = useState(evaluation?.comment ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMarks(evaluation?.marks?.toString() ?? '');
    setComment(evaluation?.comment ?? '');
  }, [evaluation?.id, evaluation?.marks, evaluation?.comment]);

  const submit = async () => {
    setSaving(true);
    try { await onSave(marks, comment); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="form-group">
        <label style={{ fontSize: 12 }}>Marks (out of {component.maxMarks})</label>
        <input
          type="number"
          value={marks}
          onChange={e => setMarks(e.target.value)}
          max={component.maxMarks}
          min="0"
          step="0.5"
          placeholder="0"
        />
      </div>
      <div className="form-group">
        <label style={{ fontSize: 12 }}>Comment</label>
        <input
          type="text"
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder={`${component.name} comments...`}
        />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={submit} disabled={saving} style={{ flex: 1 }}>
          <span className="material-symbols-outlined">{saving ? 'progress_activity' : 'save'}</span>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          className="btn"
          style={{ background: 'var(--color-success-container)', color: 'var(--color-on-success-container)' }}
          onClick={onComplete}
          disabled={completing}
        >
          <span className="material-symbols-outlined">{completing ? 'progress_activity' : 'lock'}</span>
        </button>
        {onFinalize && (
          <button className="btn btn-primary" onClick={onFinalize} disabled={finalizing}>
            <span className="material-symbols-outlined">{finalizing ? 'progress_activity' : 'check_circle'}</span>
            {finalizing ? 'Finalizing...' : 'Finalize'}
          </button>
        )}
      </div>
    </>
  );
}

export default ProjectDetail;
