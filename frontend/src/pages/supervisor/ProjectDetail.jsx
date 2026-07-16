import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import ProposalsSection from '../../components/ProposalsSection';
import ExaminerAssignmentSection from '../../components/ExaminerAssignmentSection';
import SupervisorAssignmentSection from '../../components/SupervisorAssignmentSection';
import { useToast } from '../../contexts/ToastContext';
import ErrorBoundary from '../../components/ErrorBoundary';
import ConfirmDialog from '../../components/ConfirmDialog';
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
  const [confirmDialog, setConfirmDialog] = useState({ open: false });
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSupervisor = user.role === 'SUPERVISOR';
  const isCoordinator = user.role === 'COORDINATOR';
  const isExternal = user.role === 'EXTERNAL_EXAMINER';
  const [uploadStage, setUploadStage] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [recommendationContent, setRecommendationContent] = useState('');
  const [issuingRecommendation, setIssuingRecommendation] = useState(false);

  const loadData = useCallback((signal) => {
    setLoading(true);
    const endpoint = type === 'group' ? `/groups/${id}` : `/theses/${id}`;
    api.get(endpoint, { signal })
      .then(({ data }) => setItem(data))
      .catch((err) => { if (err.name !== 'CanceledError') toast.error(err.response?.data?.error || 'Failed to load project'); });
    const evalEndpoint = type === 'group' ? `/evaluations/group/${id}` : `/evaluations/thesis/${id}`;
    api.get(evalEndpoint, { signal })
      .then(({ data }) => {
        setSummary(data.summary || null);
        setComponents(data.components || []);
        setEvaluations(data.evaluations || []);
      })
      .catch((err) => { if (err.name !== 'CanceledError') toast.error(err.response?.data?.error || 'Failed to load evaluations'); })
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

  const doComplete = async (componentId) => {
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

  const handleComplete = (componentId) => {
    const e = evaluationForComponent(componentId);
    if (!e || e.marks === null || e.marks === undefined || e.marks === 0) {
      setConfirmDialog({
        open: true,
        title: 'Complete Evaluation',
        message: 'The marks for this component are zero or not set. Do you still want to mark it as complete?',
        danger: true,
        confirmLabel: 'Complete Anyway',
        onConfirm: () => doComplete(componentId),
      });
      return;
    }
    doComplete(componentId);
  };

  const doFinalize = async () => {
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

  const handleFinalize = () => {
    setConfirmDialog({
      open: true,
      title: 'Finalize Project',
      message: `Mark this ${type === 'group' ? 'project' : 'thesis'} as COMPLETED? This will finalize it at the project level.`,
      danger: true,
      confirmLabel: 'Finalize',
      onConfirm: () => doFinalize(),
    });
  };

  const handleIssueRecommendation = async () => {
    const content = recommendationContent.trim();
    if (!content) return toast.warning('Write the recommendation letter first');
    setIssuingRecommendation(true);
    try {
      const payload = { content };
      if (type === 'group') payload.groupId = parseInt(id);
      else payload.thesisId = parseInt(id);
      await api.post('/supervisors/recommendation', payload);
      toast.success('Recommendation issued');
      setRecommendationContent('');
      // Reload to show the new entry
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to issue recommendation');
    } finally {
      setIssuingRecommendation(false);
    }
  };

  const handleUploadProposal = async () => {
    if (!uploadFile || !uploadStage) return toast.warning('Select a file and stage');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('stage', uploadStage);
      formData.append(type === 'group' ? 'groupId' : 'thesisId', id);
      await api.post('/upload/proposal', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Proposal uploaded');
      setUploadFile(null);
      setUploadStage('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const name = type === 'group' ? item?.name : `${item?.student?.firstName} ${item?.student?.lastName}`;
  const title = type === 'group' ? item?.projectTitle : item?.title;
  const backPath = isSupervisor
    ? (type === 'group' ? '/supervisor/bachelor' : '/supervisor/master')
    : isCoordinator
      ? (type === 'group' ? '/coordinator/bachelor' : '/coordinator/master')
      : '/external/evaluations';

  const orderedComponents = [...components].sort((a, b) => {
    const order = ['SUPERVISOR', 'PROPOSAL_DEFENSE', 'MIDTERM_DEFENSE', 'FINAL_DEFENSE', 'EXTERNAL_EXAMINER'];
    return order.indexOf(a.evaluationType) - order.indexOf(b.evaluationType);
  });

  const currentUserComponents = components.filter(c => c.evaluatorRole === user.role);

  const visibleComponents = isCoordinator ? orderedComponents : currentUserComponents;
  const visibleSummary = {
    total: visibleComponents.reduce((s, c) => {
      const e = evaluationForComponent(c.id);
      return s + (e?.marks ?? 0);
    }, 0),
    maxTotal: visibleComponents.reduce((s, c) => s + c.maxMarks, 0),
    completedCount: visibleComponents.filter(c => {
      const e = evaluationForComponent(c.id);
      return e?.marks !== null && e?.marks !== undefined;
    }).length,
    totalCount: visibleComponents.length,
  };

  return (
    <ErrorBoundary><PageLayout title={title} subtitle={name || ''} user={user}
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
        <div className={`tab ${activeTab === 'recommendations' ? 'active' : ''}`} onClick={() => setActiveTab('recommendations')}>
          <span className="material-symbols-outlined">verified</span> Recommendations
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
              <span>{item?.supervisor ? `${item.supervisor.designation ? item.supervisor.designation + ' ' : ''}${item.supervisor.firstName} ${item.supervisor.lastName}` : '—'}</span>
              <span style={{ fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Internal Examiner:</span>
              <span>
                {item?.examinerAssignments?.length > 0
                  ? item.examinerAssignments.map(a => (
                    <span key={a.id} className="badge badge-info" style={{ fontSize: 12 }}>
                      {a.externalExaminer?.designation ? a.externalExaminer.designation + ' ' : ''}{a.externalExaminer?.firstName} {a.externalExaminer?.lastName}
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
              <div className="stat-number">{visibleSummary ? visibleSummary.total : 0}</div>
              <div className="stat-label">Total Marks / {visibleSummary?.maxTotal || (type === 'group' ? 100 : 200)}</div>
            </div>
            <div className="stat-card bento-card">
              <div className="stat-icon"><span className="material-symbols-outlined">check_circle</span></div>
              <div className="stat-number">{visibleSummary?.completedCount || 0}<span style={{ fontSize: 16, color: 'var(--color-on-surface-variant)' }}>/{visibleSummary?.totalCount || components.length}</span></div>
              <div className="stat-label">Components Evaluated</div>
            </div>
          </div>

          {/* Evaluation Breakdown (read-only) */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header"><h3>Evaluation Breakdown</h3></div>
            {orderedComponents.length === 0 ? (
              <p style={{ color: 'var(--color-on-surface-variant)' }}>No evaluation components yet.</p>
            ) : (() => {
              const visibleComponents = isCoordinator
                ? orderedComponents
                : orderedComponents.filter(c => c.evaluatorRole === user.role);
              if (visibleComponents.length === 0) {
                return <p style={{ color: 'var(--color-on-surface-variant)', padding: 16 }}>No evaluation components for your role.</p>;
              }
              return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {visibleComponents.map(c => {
                  const e = evaluationForComponent(c.id);
                  const hasMarks = e && e.marks !== null && e.marks !== undefined;
                  const isCompleted = e?.status === 'COMPLETED';
                  return (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                      borderRadius: 8,
                      background: isCompleted ? 'var(--color-surface-container-low)' : 'transparent',
                      border: `1px solid ${isCompleted ? 'var(--color-success)' : 'var(--color-outline-variant)'}`,
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
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 14, borderRadius: 8, background: 'var(--color-primary-grand)', border: '2px solid var(--color-primary)' }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-on-primary)' }}>Grand Total</span>
                  <span style={{ fontWeight: 800, fontSize: 24, color: 'var(--color-on-primary)' }}>
                    {visibleSummary?.total ?? 0} <span style={{ fontWeight: 400, fontSize: 14 }}>/ {visibleSummary?.maxTotal ?? (type === 'group' ? 100 : 200)}</span>
                  </span>
                </div>
              </div>
              );
            })()}
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
            {/* Proposal Upload — coordinator only */}
            {isCoordinator && (item?.status === 'ACTIVE' || item?.status === 'PENDING') && (
              <div className="card" style={{ padding: 16, marginBottom: 12 }}>
                <h4 style={{ margin: '0 0 12px' }}>Upload Proposal</h4>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label style={{ fontSize: 11 }}>Stage</label>
                    <select className="form-input" value={uploadStage} onChange={e => setUploadStage(e.target.value)}>
                      <option value="">Select stage...</option>
                      <option value="PROPOSAL">Proposal</option>
                      <option value="MID_TERM">Mid Term</option>
                      <option value="FINAL">Final</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label style={{ fontSize: 11 }}>File</label>
                    <input type="file" className="form-input" onChange={e => setUploadFile(e.target.files[0])} accept=".pdf,.doc,.docx" />
                  </div>
                  <button className="btn btn-primary" onClick={handleUploadProposal} disabled={!uploadFile || !uploadStage || uploading}>
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            )}
            <ProposalsSection proposals={item?.proposals || []} user={user} />
          </div>
        </>
      )}

      {/* ============ EVALUATION TAB ============ */}
      {activeTab === 'evaluation' && (
        <>
          {/* Supervisor / External Examiner: evaluation form(s) */}
          {!isCoordinator && currentUserComponents.length > 0 && (() => {
            return (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                {currentUserComponents.map(comp => {
                  const e = evaluationForComponent(comp.id);
                  const isCompleted = e?.status === 'COMPLETED';
                  return (
                    <div key={comp.id} className="card" style={{ flex: '1 1 300px' }}>
                      <div className="card-header">
                        <h3>{comp.name}</h3>
                        {isCompleted && <span className="badge" style={{ background: 'var(--color-success-container)', color: 'var(--color-on-success-container)' }}>Completed</span>}
                      </div>
                      <div style={{ padding: '0 12px 12px' }}>
                        <DefenseCard
                          component={comp}
                          evaluation={e}
                          onSave={(marks) => handleSaveComponent(comp, marks)}
                          onComplete={() => handleComplete(comp.id)}
                          completing={completing === comp.id}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Coordinator: defense evaluation forms (always show, read-only when done) */}
          {isCoordinator && (() => {
            const defenseTypes = ['PROPOSAL_DEFENSE', 'MIDTERM_DEFENSE', 'FINAL_DEFENSE'];
            const defenseComps = defenseTypes.map(t => componentByType(t)).filter(Boolean);
            if (defenseComps.length === 0) {
              if (type === 'thesis') {
                const supervisorComps = orderedComponents.filter(c => c.evaluatorRole === 'SUPERVISOR');
                const externalComps = orderedComponents.filter(c => c.evaluatorRole === 'EXTERNAL_EXAMINER');
                const allEvalComps = [...supervisorComps, ...externalComps];
                if (allEvalComps.length === 0) {
                  return (
                    <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: 32 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-primary)' }}>info</span>
                      <h3 style={{ marginTop: 12 }}>Coordinator Evaluation</h3>
                      <p style={{ color: 'var(--color-on-surface-variant)' }}>Master theses are evaluated by the Supervisor and External Examiner.</p>
                    </div>
                  );
                }
                return (
                  <>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                      {allEvalComps.map(comp => {
                        const e = evaluationForComponent(comp.id);
                        const hasMarks = e?.marks !== null && e?.marks !== undefined;
                        return (
                          <div key={comp.id} className="card" style={{ flex: '1 1 280px' }}>
                            <div className="card-header">
                              <h3 style={{ fontSize: 13 }}>{comp.name}</h3>
                              <span className="badge badge-info" style={{ fontSize: 10 }}>
                                {comp.evaluatorRole === 'SUPERVISOR' ? 'Supervisor' : 'External Examiner'}
                              </span>
                            </div>
                            <div style={{ padding: 16, textAlign: 'center' }}>
                              <div style={{ fontSize: 28, fontWeight: 700, color: hasMarks ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}>
                                {hasMarks ? e.marks : '—'}
                                <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--color-on-surface-variant)' }}> / {comp.maxMarks}</span>
                              </div>
                              {e?.comment && (
                                <p style={{ fontStyle: 'italic', fontSize: 11, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>
                                  "{e.comment}"
                                </p>
                              )}
                              {!hasMarks && (
                                <p style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>Not evaluated</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="card" style={{ marginBottom: 24, background: 'var(--color-primary-grand)', border: '2px solid var(--color-primary)' }}>
                      <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-on-primary)' }}>Total</span>
                        <span style={{ fontWeight: 800, fontSize: 24, color: 'var(--color-on-primary)' }}>
                          {visibleSummary?.total ?? 0} <span style={{ fontWeight: 400, fontSize: 14 }}>/ {visibleSummary?.maxTotal ?? 200}</span>
                        </span>
                      </div>
                    </div>
                  </>
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
                    <div key={c.id} className="card" style={{ flex: 1, minWidth: 240 }}>
                      <div className="card-header">
                        <h3>{c.name}</h3>
                        {isCompleted && <span className="badge" style={{ background: 'var(--color-success-container)', color: 'var(--color-on-success-container)' }}>Completed</span>}
                      </div>
                      <div style={{ padding: '0 12px 12px' }}>
                        <DefenseCard
                          component={c}
                          evaluation={e}
                          onSave={(marks) => handleSaveComponent(c, marks)}
                          onComplete={() => handleComplete(c.id)}
                          completing={completing === c.id}
                        />
                      </div>
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
          {/* Print Evaluation Form */}
          {isCoordinator && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header"><h3>Download Evaluation</h3></div>
              <div style={{ padding: 16 }}>
                <button className="btn btn-outline" onClick={() => {
                  const endpoint = type === 'group'
                    ? `/api/print/group/${id}`
                    : `/api/print/thesis/${id}`;
                  const a = document.createElement('a');
                  a.href = endpoint;
                  a.download = `evaluation_${id}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}>
                  <span className="material-symbols-outlined">download</span>
                  Download PDF
                </button>
              </div>
            </div>
          )}

          {/* If no user component found */}
          {currentUserComponents.length === 0 && !isCoordinator && (
            <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: 32 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }}>info</span>
              <h3 style={{ marginTop: 12 }}>No evaluation component assigned</h3>
              <p style={{ color: 'var(--color-on-surface-variant)' }}>You don't have an evaluation component assigned for this project.</p>
            </div>
          )}
        </>
      )}

      {/* ============ RECOMMENDATIONS TAB ============ */}
      {activeTab === 'recommendations' && (
        <RecommendationsTab
          item={item}
          isSupervisor={isSupervisor}
          recommendationContent={recommendationContent}
          setRecommendationContent={setRecommendationContent}
          issuingRecommendation={issuingRecommendation}
          onIssue={handleIssueRecommendation}
        />
      )}
    </PageLayout>
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={() => { confirmDialog.onConfirm?.(); setConfirmDialog({ open: false }); }}
        onCancel={() => setConfirmDialog({ open: false })}
        danger={confirmDialog.danger}
        confirmLabel={confirmDialog.confirmLabel}
      />
    </ErrorBoundary>
  );
}

function DefenseCard({ component, evaluation, onSave, onComplete, completing }) {
  const [marks, setMarks] = useState(evaluation?.marks?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMarks(evaluation?.marks?.toString() ?? '');
  }, [evaluation?.id, evaluation?.marks]);

  const submit = async () => {
    setSaving(true);
    try { await onSave(marks); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
      <input
        type="number"
        value={marks}
        onChange={e => setMarks(e.target.value)}
        max={component.maxMarks}
        min="0"
        step="0.5"
        placeholder="0"
        style={{ width: 80, padding: '6px 8px', fontSize: 14, textAlign: 'center' }}
      />
      <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>/ {component.maxMarks}</span>
      <button
        className="btn btn-primary btn-sm"
        onClick={submit}
        disabled={saving}
        style={{ minWidth: 32, padding: '6px 8px' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
          {saving ? 'progress_activity' : 'save'}
        </span>
      </button>
      <button
        className="btn btn-sm"
        style={{
          background: 'var(--color-success-container)',
          color: 'var(--color-on-success-container)',
          minWidth: 32, padding: '6px 8px',
        }}
        onClick={onComplete}
        disabled={completing}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
          {completing ? 'progress_activity' : 'check_circle'}
        </span>
      </button>
    </div>
  );
}

function RecommendationsTab({ item, isSupervisor, recommendationContent, setRecommendationContent, issuingRecommendation, onIssue }) {
  const list = item?.recommendations || [];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isSupervisor ? '1.4fr 1fr' : '1fr', gap: 16 }}>
      <div className="card">
        <div className="card-header">
          <h3>Issued Recommendations</h3>
          {list.length > 0 && <span className="badge" style={{ background: 'var(--color-tertiary-container)', color: 'var(--color-on-tertiary-container)' }}>{list.length}</span>}
        </div>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <span className="material-symbols-outlined">verified</span>
              <h3>No recommendations yet</h3>
              <p>Recommendations you issue will appear here and be visible to the student.</p>
            </div>
          ) : (
            list.map((r) => (
              <div key={r.id} style={{
                display: 'flex', gap: 12, padding: 14,
                border: '1px solid var(--color-outline-variant)',
                borderRadius: 10,
                background: 'var(--color-surface-container-low)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: 'var(--color-primary)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>verified</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{r.content}</p>
                  <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', marginTop: 6 }}>
                    Issued {new Date(r.createdAt).toLocaleDateString()} at {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isSupervisor && (
        <div className="card">
          <div className="card-header">
            <h3>Issue New Recommendation</h3>
          </div>
          <div style={{ padding: 12 }}>
            <div className="form-group">
              <label>Letter of Recommendation</label>
              <textarea
                className="form-input"
                rows={8}
                placeholder="Write the recommendation letter or short note for this group/thesis..."
                value={recommendationContent}
                onChange={(e) => setRecommendationContent(e.target.value)}
                style={{ minHeight: 160, resize: 'vertical', fontSize: 13 }}
              />
            </div>
            <button
              className="btn btn-primary btn-block"
              onClick={onIssue}
              disabled={!recommendationContent.trim() || issuingRecommendation}
            >
              <span className="material-symbols-outlined">send</span>
              {issuingRecommendation ? 'Issuing...' : 'Issue Recommendation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectDetail;
