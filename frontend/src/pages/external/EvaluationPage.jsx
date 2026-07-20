import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import ProposalsSection from '../../components/ProposalsSection';
import EvaluationPdfPreview from '../../components/EvaluationPdfPreview';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import ErrorBoundary from '../../components/ErrorBoundary';

const ROLE_LABEL = {
  SUPERVISOR: 'Supervisor',
  COORDINATOR: 'Coordinator',
  EXTERNAL_EXAMINER: 'Internal Examiner',
};

function ExternalExaminerEvaluationPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [summary, setSummary] = useState(null);
  const [components, setComponents] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackSuggestions, setFeedbackSuggestions] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadData = useCallback((signal) => {
    setLoading(true);
    const endpoint = type === 'group' ? `/groups/${id}` : `/theses/${id}`;
    api.get(endpoint, { signal })
      .then(({ data }) => setItem(data))
      .catch((err) => { if (err.name !== 'CanceledError') toast.error(err.response?.data?.error || 'Failed to load data'); });
    const evalEndpoint = type === 'group' ? `/evaluations/group/${id}` : `/evaluations/thesis/${id}`;
    api.get(evalEndpoint, { signal })
      .then(({ data }) => {
        setSummary(data.summary || null);
        setComponents(data.components || []);
        setEvaluations(data.evaluations || []);
        // Load existing feedback
        const evals = data.evaluations || [];
        const existingComments = evals.map(e => e.comments).filter(Boolean).join('\n');
        const existingSuggestions = evals.map(e => e.suggestions).filter(Boolean).join('\n');
        if (existingComments) setFeedbackComments(existingComments);
        if (existingSuggestions) setFeedbackSuggestions(existingSuggestions);
      })
      .catch((err) => { if (err.name !== 'CanceledError') toast.error(err.response?.data?.error || 'Failed to load data'); })
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

  const handleSaveFeedback = async () => {
    if (!feedbackComments.trim() && !feedbackSuggestions.trim()) {
      toast.warning('Please enter comments or suggestions');
      return;
    }
    setSavingFeedback(true);
    try {
      for (const comp of currentUserComponents) {
        const payload = {
          componentId: comp.id,
          marks: evaluationForComponent(comp.id)?.marks ?? null,
          comments: feedbackComments || null,
          suggestions: feedbackSuggestions || null,
        };
        if (type === 'group') payload.groupId = parseInt(id); else payload.thesisId = parseInt(id);
        await api.post('/evaluations/marks', payload);
      }
      toast.success('Feedback saved');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save feedback');
    } finally {
      setSavingFeedback(false);
    }
  };

  const name = type === 'group' ? item?.name : `${item?.student?.firstName} ${item?.student?.lastName}`;
  const title = type === 'group' ? item?.projectTitle : item?.title;

  // Auto-detect if this user is the mid-term or final external examiner for this thesis
  const externalType = useMemo(() => {
    if (type !== 'thesis' || !item) return null;
    if (item.externalMidTerm?.id === user.id) return 'MIDTERM';
    if (item.externalFinal?.id === user.id) return 'FINAL';
    return null;
  }, [item, user.id, type]);

  const orderedComponents = [...components].sort((a, b) => {
    const order = ['SUPERVISOR', 'PROPOSAL_DEFENSE', 'MIDTERM_DEFENSE', 'FINAL_DEFENSE', 'EXTERNAL_EXAMINER', 'EXTERNAL_MIDTERM', 'EXTERNAL_FINAL'];
    return order.indexOf(a.evaluationType) - order.indexOf(b.evaluationType);
  });

  // Filter components: for thesis with mid-term/final distinction, show only the relevant ones
  const currentUserComponents = useMemo(() => {
    if (type === 'thesis' && externalType === 'MIDTERM') {
      return components.filter(c => c.evaluationType === 'EXTERNAL_MIDTERM');
    }
    if (type === 'thesis' && externalType === 'FINAL') {
      return components.filter(c => c.evaluationType === 'EXTERNAL_FINAL');
    }
    // Fallback for group projects or older theses without mid-term/final distinction
    return components.filter(c => c.evaluatorRole === 'EXTERNAL_EXAMINER');
  }, [components, externalType, type]);

  if (loading) {
    return (
      <PageLayout title="Internal Examiner Evaluation" user={user}>
        <div className="loading-state"><span className="material-symbols-outlined">progress_activity</span></div>
      </PageLayout>
    );
  }

  if (!item) {
    return (
      <PageLayout title="Internal Examiner Evaluation" user={user}>
        <div className="empty-state" style={{ padding: 40 }}><p>Item not found</p></div>
      </PageLayout>
    );
  }

  return (
    <ErrorBoundary>
    <PageLayout title={type === 'thesis' && externalType === 'FINAL' ? 'External (Final) Evaluation' : type === 'thesis' && externalType === 'MIDTERM' ? 'External (Mid-Term) Evaluation' : 'Internal Examiner Evaluation'} subtitle={title} user={user}
      actions={
        <>
          <button className="btn btn-outline btn-sm" onClick={() => setShowPdfPreview(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>picture_as_pdf</span> PDF Preview
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/external/evaluations')}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span> Back to List
          </button>
        </>
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
                        {m.student?.firstName} {m.student?.lastName}
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
              <span>{item?.supervisor ? `${item.supervisor.designation ? item.supervisor.designation + ' ' : ''}${item.supervisor.firstName} ${item.supervisor.lastName}` : '—'}</span>
              <span style={{ fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Status:</span>
              <span><span className={`badge badge-${item?.status?.toLowerCase() || 'pending'}`}>{item?.status || 'PENDING'}</span></span>
              {item?.examinerAssignments?.length > 0 && (
                <>
                  <span style={{ fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Internal Examiner:</span>
                  <span>
                    {item.examinerAssignments.map(a => (
                      <span key={a.id} className="badge badge-info" style={{ fontSize: 12 }}>
                        {a.externalExaminer?.firstName} {a.externalExaminer?.lastName}
                      </span>
                    ))}
                  </span>
                </>
              )}
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
                  const isMine = c.evaluatorRole === 'EXTERNAL_EXAMINER';
                  return (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                      borderRadius: 8,
                      background: isCompleted ? 'var(--color-surface-container-low)' : isMine ? 'var(--color-primary-container)' : 'transparent',
                      border: `1px solid ${isCompleted ? 'var(--color-success)' : isMine ? 'var(--color-primary)' : 'var(--color-outline-variant)'}`,
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
                          {isCompleted ? 'check_circle' : hasMarks ? 'check_circle' : 'pending'}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {c.name}
                          {isMine && !isCompleted && <span className="badge" style={{ marginLeft: 8, fontSize: 10, background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}>Your Evaluation</span>}
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

          {/* Submitted documents */}
          <div style={{ marginBottom: 24 }}>
            <ProposalsSection proposals={item?.proposals || []} title="Submitted Documents" user={user} />
          </div>
        </>
      )}

      {/* ============ EVALUATION TAB ============ */}
      {activeTab === 'evaluation' && (
        <>
          {currentUserComponents.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              {currentUserComponents.map(comp => {
                const e = evaluationForComponent(comp.id);
                return (
                  <div key={comp.id} className="card">
                    <div className="card-header">
                      <div>
                        <h3 style={{ margin: 0 }}>{comp.name}</h3>
                        <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                          {ROLE_LABEL[comp.evaluatorRole]} evaluation · Max {comp.maxMarks} marks
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: '0 16px 16px' }}>
                      <ExaminerEvaluationForm
                        component={comp}
                        evaluation={e}
                        onSave={(marks) => handleSaveComponent(comp, marks)}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Comments + Suggestions feedback section */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3 style={{ margin: 0 }}>Feedback</h3>
                    <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                      Overall comments and suggestions for this evaluation
                    </span>
                  </div>
                </div>
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>Comments</label>
                    <textarea
                      rows={3}
                      value={feedbackComments}
                      onChange={e => setFeedbackComments(e.target.value)}
                      placeholder="Enter your overall comments about this evaluation..."
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-outline-variant)', fontSize: 13, resize: 'vertical' }}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>Suggestions & Recommendations</label>
                    <textarea
                      rows={3}
                      value={feedbackSuggestions}
                      onChange={e => setFeedbackSuggestions(e.target.value)}
                      placeholder="Enter suggestions and recommendations..."
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-outline-variant)', fontSize: 13, resize: 'vertical' }}
                    />
                  </div>
                  <div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleSaveFeedback}
                      disabled={savingFeedback}
                      style={{ padding: '6px 16px', fontSize: 13 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 4 }}>
                        {savingFeedback ? 'progress_activity' : 'save'}
                      </span>
                      {savingFeedback ? 'Saving...' : 'Save Feedback'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentUserComponents.length === 0 && (
            <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: 32 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }}>info</span>
              <h3 style={{ marginTop: 12 }}>No evaluation component assigned</h3>
              <p style={{ color: 'var(--color-on-surface-variant)' }}>You don't have an evaluation component assigned for this project.</p>
            </div>
          )}
        </>
      )}
    </PageLayout>
    {showPdfPreview && (
      <EvaluationPdfPreview
        type={type}
        id={id}
        onClose={() => setShowPdfPreview(false)}
        onSave={() => { setShowPdfPreview(false); loadData(); }}
      />
    )}
    </ErrorBoundary>
  );
}

function ExaminerEvaluationForm({ component, evaluation, onSave }) {
  const [marks, setMarks] = useState(evaluation?.marks?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setMarks(evaluation?.marks?.toString() ?? '');
  }, [evaluation?.id, evaluation?.marks]);

  const submit = async () => {
    if (marks === '' || marks === null || marks === undefined) {
      toast.warning('Please enter marks');
      return;
    }
    const m = parseFloat(marks);
    if (Number.isNaN(m) || m < 0 || m > component.maxMarks) {
      toast.warning(`Marks must be between 0 and ${component.maxMarks}`);
      return;
    }
    setSaving(true);
    try { await onSave(marks); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: (marks !== '' && marks !== null && marks !== undefined) ? 'var(--color-primary-container)' : 'var(--color-surface-container)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: (marks !== '' && marks !== null && marks !== undefined) ? 'var(--color-on-primary-container)' : 'var(--color-on-surface-variant)',
          flexShrink: 0,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            {(marks !== '' && marks !== null && marks !== undefined) ? 'check_circle' : 'edit'}
          </span>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{component.name}</div>
          <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
            Max {component.maxMarks} marks
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="number"
          value={marks}
          onChange={e => setMarks(e.target.value)}
          max={component.maxMarks}
          min="0"
          step="0.5"
          placeholder="0"
          style={{ width: 70, padding: '8px 10px', fontSize: 14, textAlign: 'center', borderRadius: 6, border: '1px solid var(--color-outline-variant)' }}
        />
        <span style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>/ {component.maxMarks}</span>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={saving || marks === '' || marks === null || marks === undefined} style={{ padding: '6px 14px', fontSize: 13 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 4 }}>{saving ? 'progress_activity' : 'save'}</span>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default ExternalExaminerEvaluationPage;
