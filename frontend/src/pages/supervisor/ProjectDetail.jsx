import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import ProposalsSection from '../../components/ProposalsSection';
import ExaminerAssignmentSection from '../../components/ExaminerAssignmentSection';
import SupervisorAssignmentSection from '../../components/SupervisorAssignmentSection';
import ExternalExaminerSection from '../../components/ExternalExaminerSection';
import EvaluationPdfPreview from '../../components/EvaluationPdfPreview';
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
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [recommendationContent, setRecommendationContent] = useState('');
  const [issuingRecommendation, setIssuingRecommendation] = useState(false);
  const [showAllBreakdown, setShowAllBreakdown] = useState(false);

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

  // Compute progress
  const orderedComponents = useMemo(() => [...components].sort((a, b) => {
    const order = ['SUPERVISOR', 'PROPOSAL_DEFENSE', 'MIDTERM_DEFENSE', 'FINAL_DEFENSE', 'EXTERNAL_EXAMINER', 'EXTERNAL_MIDTERM', 'EXTERNAL_FINAL'];
    return order.indexOf(a.evaluationType) - order.indexOf(b.evaluationType);
  }), [components]);

  const currentUserComponents = useMemo(() =>
    components.filter(c => c.evaluatorRole === user.role), [components, user.role]);

  const progress = useMemo(() => {
    const visible = isCoordinator ? orderedComponents : currentUserComponents;
    const total = visible.reduce((s, c) => s + c.maxMarks, 0);
    const earned = visible.reduce((s, c) => {
      const e = evaluationForComponent(c.id);
      return s + (e?.marks ?? 0);
    }, 0);
    const completed = visible.filter(c => {
      const e = evaluationForComponent(c.id);
      return e?.marks !== null && e?.marks !== undefined;
    }).length;
    return { total, earned, completed, count: visible.length, pct: total > 0 ? Math.round((earned / total) * 100) : 0 };
  }, [orderedComponents, currentUserComponents, evaluations, isCoordinator]);

  const name = type === 'group' ? item?.name : `${item?.student?.firstName} ${item?.student?.lastName}`;
  const title = type === 'group' ? item?.projectTitle : item?.title;
  const backPath = isSupervisor
    ? (type === 'group' ? '/supervisor/bachelor' : '/supervisor/master')
    : isCoordinator
      ? (type === 'group' ? '/coordinator/bachelor' : '/coordinator/master')
      : '/external/evaluations';

  // Mark saving handler
  const handleSaveComponent = async (component, marksValue) => {
    if (marksValue === '' || marksValue === null || marksValue === undefined) {
      toast.warning('Please enter marks'); return;
    }
    const m = parseFloat(marksValue);
    if (Number.isNaN(m) || m < 0 || m > component.maxMarks) {
      toast.warning(`Marks must be between 0 and ${component.maxMarks}`); return;
    }
    // Build feedback from existing evaluations for this user
    const existingEval = evaluationForComponent(component.id);
    try {
      const payload = {
        componentId: component.id,
        marks: m,
        comments: existingEval?.comments || null,
        suggestions: existingEval?.suggestions || null,
      };
      if (type === 'group') payload.groupId = parseInt(id); else payload.thesisId = parseInt(id);
      await api.post('/evaluations/marks', payload);
      toast.success(`✓ ${component.name} marks saved`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to save ${component.name}`);
    }
  };

  // Feedback save for all user components
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackSuggestions, setFeedbackSuggestions] = useState('');
  useEffect(() => {
    const evals = evaluations.filter(e => currentUserComponents.some(c => c.id === e.componentId));
    const comments = evals.map(e => e.comments).filter(Boolean).join('\n');
    const suggestions = evals.map(e => e.suggestions).filter(Boolean).join('\n');
    setFeedbackComments(comments || '');
    setFeedbackSuggestions(suggestions || '');
  }, [evaluations, currentUserComponents]);

  const handleSaveFeedback = async () => {
    if (!feedbackComments.trim() && !feedbackSuggestions.trim()) {
      toast.warning('Please enter comments or suggestions'); return;
    }
    setSavingFeedback(true);
    try {
      for (const comp of currentUserComponents) {
        const e = evaluationForComponent(comp.id);
        const payload = {
          componentId: comp.id,
          marks: e?.marks ?? null,
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
    } finally { setSavingFeedback(false); }
  };

  const doFinalize = async () => {
    setFinalizing(true);
    try {
      const endpoint = type === 'group' ? `/groups/${id}/status` : `/theses/${id}/status`;
      await api.put(endpoint, { status: 'COMPLETED' });
      toast.success(`${type === 'group' ? 'Project' : 'Thesis'} completed`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to finalize');
    } finally { setFinalizing(false); }
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
      setUploadFile(null); setUploadStage(''); loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally { setUploading(false); }
  };

  const handleIssueRecommendation = async () => {
    const content = recommendationContent.trim();
    if (!content) return toast.warning('Write the recommendation first');
    setIssuingRecommendation(true);
    try {
      const payload = { content };
      if (type === 'group') payload.groupId = parseInt(id); else payload.thesisId = parseInt(id);
      await api.post('/supervisors/recommendation', payload);
      toast.success('Recommendation issued');
      setRecommendationContent(''); loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setIssuingRecommendation(false); }
  };

  const tabs = [
    { key: 'overview', icon: 'overview', label: 'Overview' },
    { key: 'evaluation', icon: 'grading', label: 'Evaluation' },
    { key: 'recommendations', icon: 'verified', label: 'Recommendations' },
  ];

  if (loading && !item) {
    return <PageLayout title="" user={user}><SkeletonPage type={type} /></PageLayout>;
  }

  return (
    <ErrorBoundary>
      <PageLayout title="" user={user}>
        {/* ─── HERO HEADER ─── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #0f172a 100%)',
          borderRadius: 16, padding: '28px 32px', marginBottom: 24,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              <span className={`badge`} style={{
                background: item?.status === 'ACTIVE' ? 'rgba(22,163,74,0.2)' : item?.status === 'COMPLETED' ? 'rgba(59,130,246,0.2)' : 'rgba(234,88,12,0.2)',
                color: item?.status === 'ACTIVE' ? '#86efac' : item?.status === 'COMPLETED' ? '#93c5fd' : '#fdba74',
                fontSize: 11, padding: '3px 10px', border: 'none',
              }}>
                <span className="dot" style={{ background: 'currentColor' }} />
                {item?.status || 'PENDING'}
              </span>
              <span style={{
                background: 'rgba(255,255,255,0.1)', color: '#cbd5e1', fontSize: 11,
                padding: '3px 10px', borderRadius: 50, fontWeight: 500,
              }}>
                {type === 'group' ? (item?.projectType === 'MAJOR' ? 'Major Project' : 'Minor Project') : 'Master Thesis'}
              </span>
              {item?.batch && (
                <span style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: 11, padding: '3px 8px', borderRadius: 50 }}>
                  Batch {item.batch}
                </span>
              )}
              {item?.cluster && (
                <span style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: 11, padding: '3px 8px', borderRadius: 50 }}>
                  {item.cluster}
                </span>
              )}
            </div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.3 }}>
              {title || 'Loading...'}
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
              {name}
              {item?.batch ? ` · Batch ${item.batch}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
              onClick={() => { if (window.history.length > 1) navigate(-1); else navigate(backPath); }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span> Back
            </button>
            {(isSupervisor || isCoordinator) && item?.status === 'ACTIVE' && (
              <button className="btn" style={{ background: 'rgba(34,197,94,0.2)', color: '#86efac', border: '1px solid rgba(34,197,94,0.3)' }}
                onClick={() => setConfirmDialog({ open: true, title: 'Finalize', message: `Mark this ${type === 'group' ? 'project' : 'thesis'} as COMPLETED?`, confirmLabel: 'Finalize', onConfirm: doFinalize, danger: true })}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span> Finalize
              </button>
            )}
          </div>
        </div>

        {/* ─── TABS ─── */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          {tabs.map(t => (
            <div key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              <span className="material-symbols-outlined">{t.icon}</span> {t.label}
            </div>
          ))}
        </div>

        {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
        {activeTab === 'overview' && (
          <>
            {/* Summary cards */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
              <div className="stat-card bento-card" style={{ borderLeft: '3px solid var(--color-primary)' }}>
                <div className="stat-icon" style={{ background: 'var(--color-primary-container)' }}>
                  <span className="material-symbols-outlined">score</span>
                </div>
                <div className="stat-number">
                  {progress.earned}
                  <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--color-on-surface-variant)' }}>/{progress.total}</span>
                </div>
                <div className="stat-label">Total Marks</div>
              </div>
              <div className="stat-card bento-card" style={{ borderLeft: '3px solid var(--color-success)' }}>
                <div className="stat-icon" style={{ background: 'var(--color-success-container)' }}>
                  <span className="material-symbols-outlined">checklist</span>
                </div>
                <div className="stat-number">
                  {progress.completed}
                  <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--color-on-surface-variant)' }}>/{progress.count}</span>
                </div>
                <div className="stat-label">Components Evaluated</div>
              </div>
              <div className="stat-card bento-card" style={{ borderLeft: '3px solid var(--color-tertiary)' }}>
                <div className="stat-icon" style={{ background: 'var(--color-tertiary-container)' }}>
                  <span className="material-symbols-outlined">trending_up</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <div className="stat-number">{progress.pct}%</div>
                </div>
                <div className="stat-label">Completion</div>
                <div style={{ marginTop: 8, height: 4, background: 'var(--color-outline-variant)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress.pct}%`, background: progress.pct === 100 ? 'var(--color-success)' : 'var(--color-primary)', borderRadius: 2, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            </div>

            {/* Project info card */}
            <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
              <div className="card-header">
                <h3><span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 8 }}>info</span>Project Details</h3>
              </div>
              <div style={{ padding: '8px 0' }}>
                <InfoRow label="Title" value={title} />
                {type === 'group' && (
                  <>
                    <InfoRow label="Group" value={item?.name} />
                    <InfoRow label="Members" value={
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {item?.members?.length > 0 ? item.members.map(m => (
                          <span key={m.id} className="badge badge-info" style={{ fontSize: 11, padding: '3px 8px' }}>
                            {m.student?.firstName} {m.student?.lastName}
                            {m.rollNumber && <span style={{ opacity: 0.6, marginLeft: 4 }}>({m.rollNumber})</span>}
                          </span>
                        )) : <span style={{ color: 'var(--color-on-surface-variant)' }}>—</span>}
                      </div>
                    } />
                  </>
                )}
                {type === 'thesis' && (
                  <InfoRow label="Student" value={`${item?.student?.firstName || ''} ${item?.student?.lastName || ''}`} />
                )}
                <InfoRow label="Supervisor" value={item?.supervisor
                  ? `${item.supervisor.designation ? item.supervisor.designation + ' ' : ''}${item.supervisor.firstName} ${item.supervisor.lastName}`
                  : <span style={{ color: 'var(--color-on-surface-variant)' }}>Not assigned</span>
                } />
                {type === 'thesis' ? (
                  <>
                    <InfoRow label="External (Mid-Term)" value={
                      item?.externalMidTerm
                        ? <span className="badge badge-info" style={{ fontSize: 11 }}>{item.externalMidTerm.firstName} {item.externalMidTerm.lastName}</span>
                        : <span style={{ color: 'var(--color-on-surface-variant)' }}>Not assigned</span>
                    } />
                    <InfoRow label="External (Final)" value={
                      item?.externalFinal
                        ? <span className="badge badge-info" style={{ fontSize: 11 }}>{item.externalFinal.firstName} {item.externalFinal.lastName}</span>
                        : <span style={{ color: 'var(--color-on-surface-variant)' }}>Not assigned</span>
                    } />
                  </>
                ) : (
                  <InfoRow label="Internal Examiner" value={
                    item?.examinerAssignments?.length > 0
                      ? item.examinerAssignments.map(a => (
                        <span key={a.id} className="badge badge-info" style={{ fontSize: 11, marginRight: 6 }}>
                          {a.externalExaminer?.firstName} {a.externalExaminer?.lastName}
                        </span>
                      ))
                      : <span style={{ color: 'var(--color-on-surface-variant)' }}>Not assigned</span>
                  } />
                )}
                {item?.description && <InfoRow label="Description" value={item.description} />}
              </div>
            </div>

            {/* Evaluation breakdown */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h3><span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 8 }}>assignment</span>Evaluation Breakdown</h3>
              </div>
              <div style={{ padding: '4px 0' }}>
                {orderedComponents.length === 0 ? (
                  <div className="empty-state" style={{ padding: 24 }}>
                    <span className="material-symbols-outlined">info</span>
                    <p>No evaluation components yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {(showAllBreakdown ? orderedComponents : orderedComponents.slice(0, 3)).map(c => {
                      const e = evaluationForComponent(c.id);
                      const hasMarks = e && e.marks !== null && e.marks !== undefined;
                      const pct = hasMarks ? Math.round((e.marks / c.maxMarks) * 100) : 0;
                      return (
                        <div key={c.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 20px', borderBottom: '1px solid var(--color-outline-variant)',
                          opacity: hasMarks ? 1 : 0.65,
                        }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                            background: hasMarks ? 'var(--color-success-container)' : 'var(--color-surface-container)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: hasMarks ? 'var(--color-on-success-container)' : 'var(--color-on-surface-variant)',
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                              {hasMarks ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-on-surface)' }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>
                              {ROLE_LABEL[c.evaluatorRole]} · Max {c.maxMarks}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 60, height: 4, background: 'var(--color-outline-variant)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: hasMarks ? 'var(--color-success)' : 'var(--color-outline)', borderRadius: 2, transition: 'width 0.4s' }} />
                            </div>
                            <div style={{ minWidth: 50, textAlign: 'right' }}>
                              <span style={{ fontWeight: 700, fontSize: 15, color: hasMarks ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}>
                                {hasMarks ? e.marks : '—'}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>/{c.maxMarks}</span>
                            </div>
                          </div>
                          {e?.submittedBy && (
                            <div className="submitted-by-label" style={{ fontSize: 10, color: 'var(--color-on-surface-variant)', maxWidth: 100, textAlign: 'right' }}>
                              {e.submittedBy.firstName}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {orderedComponents.length > 3 && (
                      <div style={{ textAlign: 'center', padding: '8px 20px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowAllBreakdown(!showAllBreakdown)}
                          style={{ fontSize: 12, color: 'var(--color-primary)', cursor: 'pointer', border: 'none', background: 'none' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>
                            {showAllBreakdown ? 'expand_less' : 'expand_more'}
                          </span>
                          {showAllBreakdown ? 'Show less' : `Show all (${orderedComponents.length} components)`}
                        </button>
                      </div>
                    )}
                    {/* Grand total bar */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '16px 20px', margin: '8px 12px', borderRadius: 10,
                      background: 'linear-gradient(135deg, var(--color-primary-grand) 0%, var(--color-primary) 100%)',
                    }}>
                      <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Grand Total</span>
                      <span style={{ fontWeight: 800, fontSize: 22, color: '#fff' }}>
                        {progress.earned}{' '}
                        <span style={{ fontWeight: 400, fontSize: 13, opacity: 0.7 }}>/ {progress.total}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Coordinator sections */}
            {isCoordinator && (
              <div style={{ display: 'grid', gap: 24, marginBottom: 24 }}>
                <SupervisorAssignmentSection
                  type={type} id={parseInt(id)}
                  currentSupervisor={item?.supervisor} onRefresh={loadData} disabled={false}
                />
                {type === 'thesis' && (
                  <>
                    <ExternalExaminerSection
                      type="midterm" id={parseInt(id)}
                      currentExaminer={item?.externalMidTerm} label="Mid-Term"
                      onRefresh={loadData} disabled={false}
                    />
                    <ExternalExaminerSection
                      type="final" id={parseInt(id)}
                      currentExaminer={item?.externalFinal} label="Final"
                      onRefresh={loadData} disabled={false}
                    />
                  </>
                )}
                {type !== 'thesis' && (
                  <ExaminerAssignmentSection
                    type={type} id={parseInt(id)}
                    currentAssignments={item?.examinerAssignments || []} onRefresh={loadData} disabled={false}
                  />
                )}
              </div>
            )}

            {/* Proposal upload */}
            {isCoordinator && (item?.status === 'ACTIVE' || item?.status === 'PENDING') && (
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                  <h3><span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 8 }}>upload_file</span>Upload Document</h3>
                </div>
                <div style={{ padding: '0 20px 20px', display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ marginBottom: 0, minWidth: 160, flex: 1 }}>
                    <label style={{ fontSize: 12 }}>Stage</label>
                    <select className="form-input" value={uploadStage} onChange={e => setUploadStage(e.target.value)}>
                      <option value="">Select...</option>
                      <option value="PROPOSAL">Proposal</option>
                      <option value="MID_TERM">Mid Term</option>
                      <option value="FINAL">Final</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, flex: 2 }}>
                    <label style={{ fontSize: 12 }}>File (PDF/DOC)</label>
                    <input type="file" className="form-input" onChange={e => setUploadFile(e.target.files[0])} accept=".pdf,.doc,.docx" />
                  </div>
                  <button className="btn btn-primary" onClick={handleUploadProposal} disabled={!uploadFile || !uploadStage || uploading}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{uploading ? 'progress_activity' : 'upload'}</span>
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            )}

            {/* Proposals */}
            <ProposalsSection proposals={item?.proposals || []} user={user} />
          </>
        )}

        {/* ═══════════════ EVALUATION TAB ═══════════════ */}
        {activeTab === 'evaluation' && (
          <>
            {/* Evaluation progress summary */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
              <div className="stat-card bento-card" style={{ borderLeft: '3px solid var(--color-primary)' }}>
                <div className="stat-icon"><span className="material-symbols-outlined">score</span></div>
                <div className="stat-number">{progress.earned}<span style={{ fontSize: 16, fontWeight: 400, color: 'var(--color-on-surface-variant)' }}>/{progress.total}</span></div>
                <div className="stat-label">Your Total</div>
              </div>
              <div className="stat-card bento-card" style={{ borderLeft: '3px solid var(--color-success)' }}>
                <div className="stat-icon"><span className="material-symbols-outlined">checklist</span></div>
                <div className="stat-number">{progress.completed}<span style={{ fontSize: 16, fontWeight: 400, color: 'var(--color-on-surface-variant)' }}>/{progress.count}</span></div>
                <div className="stat-label">Components Done</div>
              </div>
              <div className="stat-card bento-card" style={{ borderLeft: '3px solid var(--color-secondary)' }}>
                <div className="stat-icon"><span className="material-symbols-outlined">download</span></div>
                <div style={{ marginBottom: 8 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setShowPdfPreview(true)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>picture_as_pdf</span> PDF Preview
                  </button>
                </div>
                <div className="stat-label">Download Evaluation Sheet</div>
              </div>
            </div>

            {/* Non-coordinator: evaluation form(s) */}
            {!isCoordinator && currentUserComponents.length > 0 && (
              <>
              <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface-container-low)' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.3px', borderBottom: '1px solid var(--color-outline-variant)' }}>Component</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.3px', borderBottom: '1px solid var(--color-outline-variant)' }}>Max Marks</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, fontSize: 12, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.3px', borderBottom: '1px solid var(--color-outline-variant)' }}>Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, fontSize: 12, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.3px', borderBottom: '1px solid var(--color-outline-variant)' }}>Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentUserComponents.map(comp => {
                      const e = evaluationForComponent(comp.id);
                      const hasMarks = e?.marks !== null && e?.marks !== undefined;
                      return (
                        <tr key={comp.id} style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
                          <td style={{ padding: '8px 14px' }}>
                            <div style={{ fontWeight: 500 }}>{comp.name}</div>
                            <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>{ROLE_LABEL[comp.evaluatorRole]}</span>
                          </td>
                          <td style={{ padding: '8px 14px', color: 'var(--color-on-surface-variant)', fontSize: 12 }}>{comp.maxMarks}</td>
                          <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                            {e?.status === 'COMPLETED' ? (
                              <span className="badge badge-completed" style={{ fontSize: 10 }}>Completed</span>
                            ) : (
                              <span className="material-symbols-outlined" style={{ fontSize: 18, color: hasMarks ? 'var(--color-success)' : 'var(--color-outline)' }}>
                                {hasMarks ? 'check_circle' : 'radio_button_unchecked'}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '6px 14px', textAlign: 'right' }}>
                            <DefenseCard component={comp} evaluation={e} onSave={(marks) => handleSaveComponent(comp, marks)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

                <div className="card" style={{ marginBottom: 24 }}>
                  <div style={{
                    padding: '14px 20px', background: 'var(--color-surface-container-low)',
                    borderBottom: '1px solid var(--color-outline-variant)',
                  }}>
                    <h3 style={{ margin: 0, fontSize: 15 }}>Feedback</h3>
                  </div>
                  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comments</label>
                      <textarea rows={3} value={feedbackComments} onChange={e => setFeedbackComments(e.target.value)}
                        placeholder="Overall comments about this evaluation..."
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--color-outline)', fontSize: 13, resize: 'vertical' }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Suggestions & Recommendations</label>
                      <textarea rows={3} value={feedbackSuggestions} onChange={e => setFeedbackSuggestions(e.target.value)}
                        placeholder="What improvements would you recommend?"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--color-outline)', fontSize: 13, resize: 'vertical' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="btn btn-primary btn-sm" onClick={handleSaveFeedback} disabled={savingFeedback}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                          {savingFeedback ? 'progress_activity' : 'save'}
                        </span>
                        {savingFeedback ? 'Saving...' : 'Save Feedback'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Coordinator evaluation view */}
            {isCoordinator && (
              <CoordinatorEvaluationView
                type={type}
                orderedComponents={orderedComponents}
                componentByType={componentByType}
                evaluationForComponent={evaluationForComponent}
                progress={progress}
                handleSaveComponent={handleSaveComponent}
              />
            )}

            {/* No component fallback */}
            {currentUserComponents.length === 0 && !isCoordinator && (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }}>info</span>
                <h3 style={{ marginTop: 12 }}>No Evaluation Component</h3>
                <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: 400, margin: '0 auto' }}>
                  You don't have an evaluation component assigned for this {type === 'group' ? 'project' : 'thesis'}.
                </p>
              </div>
            )}
          </>
        )}

        {/* ═══════════════ RECOMMENDATIONS TAB ═══════════════ */}
        {activeTab === 'recommendations' && (
          <div style={{ display: 'grid', gridTemplateColumns: isSupervisor ? '1.5fr 1fr' : '1fr', gap: 24, alignItems: 'start' }}>
            {/* Recommendation list */}
            <div className="card">
              <div className="card-header">
                <h3><span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 8 }}>verified</span>Issued Recommendations</h3>
                {(item?.recommendations?.length || 0) > 0 && (
                  <span className="badge badge-primary" style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}>
                    {item?.recommendations?.length}
                  </span>
                )}
              </div>
              <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(!item?.recommendations || item.recommendations.length === 0) ? (
                  <div className="empty-state" style={{ padding: 32 }}>
                    <span className="material-symbols-outlined">verified</span>
                    <h3>No recommendations yet</h3>
                    <p>Issued recommendations will appear here and be visible to the student.</p>
                  </div>
                ) : (
                  item.recommendations.map((r, i) => (
                    <div key={r.id} style={{
                      display: 'flex', gap: 14, padding: 16,
                      border: '1px solid var(--color-outline-variant)', borderRadius: 12,
                      background: 'var(--color-surface-container-lowest)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        background: `hsl(${i * 47 + 210}, 30%, 45%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff',
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>verified</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 6px', fontSize: 14, lineHeight: 1.6, color: 'var(--color-on-surface)' }}>{r.content}</p>
                        <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>
                          Issued {new Date(r.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          {' at '}
                          {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Issue recommendation form (supervisor only) */}
            {isSupervisor && (
              <div className="card">
                <div className="card-header">
                  <h3><span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 8 }}>edit_note</span>Issue Recommendation</h3>
                </div>
                <div style={{ padding: '0 20px 20px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: 12 }}>Letter of Recommendation</label>
                    <textarea className="form-input" rows={8}
                      placeholder="Write the recommendation letter for this student/group..."
                      value={recommendationContent} onChange={e => setRecommendationContent(e.target.value)}
                      style={{ minHeight: 180, resize: 'vertical', fontSize: 13 }}
                    />
                  </div>
                  <button className="btn btn-primary btn-block" onClick={handleIssueRecommendation}
                    disabled={!recommendationContent.trim() || issuingRecommendation}>
                    <span className="material-symbols-outlined">send</span>
                    {issuingRecommendation ? 'Issuing...' : 'Issue Recommendation'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </PageLayout>

      {/* PDF Preview modal */}
      {showPdfPreview && (
        <EvaluationPdfPreview
          type={type} id={id}
          onClose={() => setShowPdfPreview(false)}

        />
      )}

      {/* Confirm dialog */}
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

// ─── Sub-components ───

function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 16,
      padding: '10px 20px', borderBottom: '1px solid var(--color-outline-variant)',
    }}>
      <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-on-surface-variant)', minWidth: 130, textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ fontSize: 14, color: 'var(--color-on-surface)', lineHeight: 1.5, wordBreak: 'break-word' }}>
        {value || '—'}
      </div>
    </div>
  );
}

function DefenseCard({ component, evaluation, onSave }) {
  const [marks, setMarks] = useState(evaluation?.marks?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMarks(evaluation?.marks?.toString() ?? '');
  }, [evaluation?.id, evaluation?.marks]);

  const submit = async () => {
    if (marks === '' || marks === null || marks === undefined) return;
    setSaving(true);
    try { await onSave(marks); }
    finally { setSaving(false); }
  };

  const hasValue = marks !== '' && marks !== null && marks !== undefined;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: hasValue ? 'var(--color-success)' : 'var(--color-outline)' }}>
          {hasValue ? 'check_circle' : 'radio_button_unchecked'}
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{component.name}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input type="number" value={marks}
          onChange={e => setMarks(e.target.value)}
          max={component.maxMarks} min="0" step="0.5" placeholder="0"
          style={{
            width: 56, padding: '4px 6px', fontSize: 13, textAlign: 'center',
            border: hasValue ? '1px solid var(--color-primary-container)' : '1px solid var(--color-outline)',
            borderRadius: 6, background: 'transparent', outline: 'none',
            fontWeight: 600, color: hasValue ? 'var(--color-primary)' : 'var(--color-on-surface)',
          }}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
        />
        <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>/ {component.maxMarks}</span>
        <button className="btn btn-primary btn-sm" onClick={submit}
          disabled={saving || marks === '' || marks === null || marks === undefined}
          style={{ padding: '4px 10px', minWidth: 52, fontSize: 12 }}>
          {saving ? '...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function CoordinatorEvaluationView({ type, orderedComponents, componentByType, evaluationForComponent, progress, handleSaveComponent }) {
  if (orderedComponents.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 32, marginBottom: 24 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--color-primary)' }}>info</span>
        <h3 style={{ marginTop: 8, fontSize: 15 }}>Coordinator View</h3>
        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>All evaluation components are shown below. You can view and edit marks for any component.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--color-surface-container-low)' }}>
            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.3px', borderBottom: '1px solid var(--color-outline-variant)' }}>Component</th>
            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.3px', borderBottom: '1px solid var(--color-outline-variant)' }}>Evaluator</th>
            <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, fontSize: 12, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.3px', borderBottom: '1px solid var(--color-outline-variant)' }}>Marks</th>
            <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, fontSize: 12, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.3px', borderBottom: '1px solid var(--color-outline-variant)' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {orderedComponents.map(c => {
            const e = evaluationForComponent(c.id);
            const hasMarks = e?.marks !== null && e?.marks !== undefined;
            const roleLabel = c.evaluatorRole === 'SUPERVISOR' ? 'Supervisor'
              : c.evaluationType === 'EXTERNAL_MIDTERM' ? 'External (Mid)'
              : c.evaluationType === 'EXTERNAL_FINAL' ? 'External (Final)'
              : c.evaluatorRole === 'EXTERNAL_EXAMINER' ? 'Internal Examiner'
              : c.name;
            return (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
                <td style={{ padding: '8px 14px' }}>
                  <div style={{ fontWeight: 500 }}>{c.name}</div>
                </td>
                <td style={{ padding: '8px 14px', color: 'var(--color-on-surface-variant)', fontSize: 12 }}>{roleLabel}</td>
                <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                  <span style={{ fontWeight: 600, color: hasMarks ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}>
                    {hasMarks ? e.marks : '—'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>/{c.maxMarks}</span>
                </td>
                <td style={{ padding: '6px 14px', textAlign: 'right' }}>
                  <DefenseCard component={c} evaluation={e} onSave={(marks) => handleSaveComponent(c, marks)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-primary)', color: '#fff' }}>
        <span style={{ fontWeight: 600, fontSize: 13, opacity: 0.9 }}>Grand Total</span>
        <span style={{ fontWeight: 700, fontSize: 16 }}>
          {progress.earned} <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.7 }}>/{progress.total}</span>
        </span>
      </div>
    </div>
  );
}

function SkeletonPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
      <div className="stats-grid">
        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 12 }} />)}
      </div>
      <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
    </div>
  );
}

export default ProjectDetail;
