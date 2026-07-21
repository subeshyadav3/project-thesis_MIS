import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import DocumentViewer from '../../components/DocumentViewer';
import { useToast } from '../../contexts/ToastContext';
import ErrorBoundary from '../../components/ErrorBoundary';
import { downloadFile } from '../../utils/download';
import api from '../../services/api';

const ROLE_LABEL = {
  SUPERVISOR: 'Supervisor',
  COORDINATOR: 'Coordinator',
  EXTERNAL_EXAMINER: 'Internal Examiner',
};

function StudentProjectDetail() {
  const { type, id } = useParams();
  const isGroup = type === 'project';
  const [assignment, setAssignment] = useState(null);
  const [evaluationsData, setEvaluationsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackTab, setFeedbackTab] = useState('PROPOSAL');
  const [viewerDoc, setViewerDoc] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const toast = useToast();

  const nameLabel = isGroup ? 'Project' : 'Thesis';

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const endpoint = isGroup ? `/students/groups/${id}` : `/students/theses/${id}`;
    api.get(endpoint)
      .then(({ data }) => setAssignment(data))
      .catch(err => { toast.error(err.response?.data?.error || 'Failed to load assignment'); setAssignment(null); });

    // Also pull evaluations (for progress overview) — silently handle permission errors
    const evalEndpoint = isGroup ? `/evaluations/group/${id}` : `/evaluations/thesis/${id}`;
    api.get(evalEndpoint)
      .then(({ data }) => setEvaluationsData(data))
      .catch(() => { setEvaluationsData(null); })
      .finally(() => setLoading(false));
  }, [id, type]);

  if (loading) {
    return (
      <ErrorBoundary><PageLayout title={nameLabel} user={user}>
        <div className="loading-state"><span className="material-symbols-outlined">progress_activity</span><p>Loading...</p></div>
      </PageLayout></ErrorBoundary>
    );
  }

  if (!assignment) {
    return (
      <ErrorBoundary><PageLayout title={nameLabel} user={user}>
        <div className="empty-state" style={{ padding: 60, textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }}>error_outline</span>
          <h3>{nameLabel} not found</h3>
        </div>
      </PageLayout></ErrorBoundary>
    );
  }

  const title = isGroup ? assignment.projectTitle : assignment.title;
  const members = (assignment.members || []).filter(m => m.student);
  const proposals = assignment.proposals || [];
  const evaluations = assignment.evaluations || [];
  const stageKeys = ['PROPOSAL', 'MID_TERM', 'FINAL'];
  const submittedStages = proposals.filter(p => p.documentUrl).map(p => p.stage);

  const stageStatus = (stage) => {
    const hasSubmitted = submittedStages.includes(stage);
    const hasFeedback = evaluations.some(e => e.stage === stage && e.comment);
    if (hasSubmitted && hasFeedback) return 'done';
    if (hasSubmitted) return 'submitted';
    return 'inactive';
  };

  const stageColor = (stage) => {
    const s = stageStatus(stage);
    if (s === 'done') return 'var(--color-success)';
    if (s === 'submitted') return 'var(--color-primary)';
    return 'var(--color-outline-variant)';
  };

  const currentFeedback = evaluations.filter(e => e.stage === feedbackTab && e.comment);

  const tabProposal = proposals.find(p => p.stage === feedbackTab && p.documentUrl);
  const tabExt = tabProposal?.documentUrl?.match(/\.(\w+)$/)?.[1] || 'pdf';
  const tabLabel = feedbackTab === 'MID_TERM' ? 'Mid-Term' : feedbackTab.charAt(0) + feedbackTab.slice(1).toLowerCase();

  // Ordered 5-component breakdown
  const orderedTypes = ['PROPOSAL_DEFENSE', 'MIDTERM_DEFENSE', 'FINAL_DEFENSE', 'SUPERVISOR', 'EXTERNAL_EXAMINER'];
  const components = (evaluationsData?.components || []).slice().sort((a, b) =>
    orderedTypes.indexOf(a.evaluationType) - orderedTypes.indexOf(b.evaluationType)
  );
  const evalByComponent = new Map((evaluationsData?.evaluations || []).map(e => [e.componentId, e]));
  const breakdown = components.map(c => ({ component: c, evaluation: evalByComponent.get(c.id) }));
  const completedComponents = breakdown.filter(b => b.evaluation && b.evaluation.marks !== null && b.evaluation.marks !== undefined).length;
  const isComplete = completedComponents === breakdown.length && breakdown.length > 0;

  return (
    <ErrorBoundary><PageLayout
      title={title}
      subtitle={
        <Link to={isGroup ? '/student/projects' : '/student/theses'}
          style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
          Back to {isGroup ? 'Projects' : 'Theses'}
        </Link>
      }
      user={user}
    >


      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
        <div className="card" style={{ flex: 1.5, minWidth: 300, marginBottom: 0 }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-on-primary-container)' }}>
                  {isGroup ? 'group' : 'person'}
                </span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>{nameLabel} Details</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                  {isGroup ? 'Bachelor Project' : "Master's Thesis"}
                </p>
              </div>
            </div>
            <span className={`badge badge-${assignment.status?.toLowerCase() === 'active' ? 'active' : assignment.status?.toLowerCase() || 'pending'}`}>
              <span className="dot" />{assignment.status}
            </span>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Title</span>
                <span style={{ fontWeight: 600 }}>{title}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">{isGroup ? 'Group' : 'Student'}</span>
                <span>{isGroup ? assignment.name : `${assignment.student?.firstName} ${assignment.student?.lastName}`}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Supervisor</span>
                <span style={{ fontWeight: 500 }}>
                  {assignment.supervisor
                    ? `${assignment.supervisor.firstName} ${assignment.supervisor.lastName}`
                    : <span className="badge badge-pending"><span className="dot" />Unassigned</span>
                  }
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Batch</span>
                <span>{assignment.batch || assignment.academicYear?.year || '—'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Department</span>
                <span>{assignment.academicYear?.department?.name || assignment.student?.program?.department?.name || assignment.department?.name || '—'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Program</span>
                <span>{assignment.program?.name || assignment.programName || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {isGroup && (
          <div className="card" style={{ flex: 1, minWidth: 260, marginBottom: 0 }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-on-secondary-container)' }}>people</span>
                </div>
                <h3 style={{ margin: 0, fontSize: 15 }}>Group Members</h3>
              </div>
              <span className="badge badge-active"><span className="dot" />{members.length}</span>
            </div>
            {members.length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}><p>No members</p></div>
            ) : (
              <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {members.map((m, i) => {
                  const initials = `${m.student?.firstName?.[0] || ''}${m.student?.lastName?.[0] || ''}`;
                  const colors = ['var(--color-primary-container)', 'var(--color-secondary-container)', 'var(--color-tertiary-container)'];
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: colors[i % 3], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {initials || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.student?.firstName} {m.student?.lastName}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>
                          {m.rollNumber} · {m.student?.email}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!isGroup && (
          <div className="card" style={{ flex: 1, minWidth: 260, marginBottom: 0 }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-on-secondary-container)' }}>person</span>
                </div>
                <h3 style={{ margin: 0, fontSize: 15 }}>Student</h3>
              </div>
            </div>
            <div style={{ padding: '0 16px 16px' }}>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Name</span>
                  <span style={{ fontWeight: 600 }}>{assignment.student?.firstName} {assignment.student?.lastName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <span style={{ fontSize: 13 }}>{assignment.student?.email || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ width: 180, minWidth: 180 }}>
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header">
              <h3 style={{ fontSize: 13 }}>Progress</h3>
              {assignment.status === 'COMPLETED' && <span className="badge badge-completed"><span className="dot" />Completed</span>}
            </div>
            <div style={{ padding: '0 16px 16px' }}>
              {stageKeys.map((s, i) => {
                const status = stageStatus(s);
                const color = stageColor(s);
                const isActive = feedbackTab === s;
                const label = s === 'MID_TERM' ? 'Mid-Term' : s.charAt(0) + s.slice(1).toLowerCase();
                const icons = { done: 'check_circle', submitted: 'hourglass_top', inactive: 'radio_button_unchecked' };
                return (
                  <div key={s} style={{ display: 'flex', position: 'relative', minHeight: 48 }}>
                    {i < stageKeys.length - 1 && (
                      <div style={{ position: 'absolute', left: 14, top: 32, width: 2, height: 24, background: status === 'done' ? 'var(--color-success)' : 'var(--color-outline-variant)' }} />
                    )}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingTop: 6, cursor: 'pointer', width: '100%' }}
                      onClick={() => setFeedbackTab(s)}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color, flexShrink: 0, fontVariationSettings: status === 'done' ? "'FILL' 1" : "'FILL' 0" }}>
                        {icons[status]}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: color === 'var(--color-outline-variant)' ? 'var(--color-on-surface-variant)' : 'var(--color-on-surface)' }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--color-on-surface-variant)', marginTop: 1 }}>
                          {status === 'done' ? 'Completed' : status === 'submitted' ? 'Awaiting review' : 'Not started'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 300 }}>
          <div className="tabs" style={{ marginBottom: 16 }}>
            {stageKeys.map(st => (
              <div key={st} className={`tab ${feedbackTab === st ? 'active' : ''}`} onClick={() => setFeedbackTab(st)}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: submittedStages.includes(st) ? "'FILL' 1" : "'FILL' 0", color: submittedStages.includes(st) ? 'var(--color-primary)' : undefined }}>
                  {st === 'PROPOSAL' ? 'description' : st === 'MID_TERM' ? 'schedule' : 'flag'}
                </span>
                {st === 'MID_TERM' ? 'Mid-Term' : st.charAt(0) + st.slice(1).toLowerCase()}
              </div>
            ))}
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-tertiary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-on-tertiary-container)' }}>reviews</span>
                </div>
                <h3 style={{ margin: 0, fontSize: 14 }}>{tabLabel} Feedback</h3>
              </div>
              <span className={`badge badge-${submittedStages.includes(feedbackTab) ? 'active' : 'pending'}`}>
                <span className="dot" />{submittedStages.includes(feedbackTab) ? 'Submitted' : 'Pending'}
              </span>
            </div>

            {tabProposal && (
              <div style={{ padding: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', marginBottom: 12, borderRadius: 8, background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)', cursor: 'pointer' }}
                  onClick={() => setViewerDoc({ url: tabProposal.documentUrl, name: `${tabLabel}_Document.${tabExt}` })}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--color-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-on-primary-container)' }}>{tabExt === 'pdf' ? 'picture_as_pdf' : 'description'}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tabLabel}_Document.{tabExt}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>
                      {tabProposal.submittedBy?.firstName} {tabProposal.submittedBy?.lastName} · {new Date(tabProposal.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }}
                      onClick={() => setViewerDoc({ url: tabProposal.documentUrl, name: `${tabLabel}_Document.${tabExt}` })} title="Preview">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }}
                      onClick={(e) => { e.stopPropagation(); downloadFile(tabProposal.documentUrl, `${tabLabel}_Document`); }} title="Download">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentFeedback.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--color-outline)' }}>chat_bubble_outline</span>
                </div>
                <p>No feedback yet for this stage.</p>
                <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', margin: '4px 0 0' }}>
                  {submittedStages.includes(feedbackTab)
                    ? 'Your document has been submitted. Please wait for your supervisor to review.'
                    : 'Upload your document in the Submissions page to receive feedback.'}
                </p>
              </div>
            ) : (
              <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {currentFeedback.map(e => (
                  <div key={e.id} style={{ padding: 14, borderRadius: 10, background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.6 }}>{e.comment}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person</span>
                      {e.submittedBy?.firstName} {e.submittedBy?.lastName}
                      <span style={{ marginLeft: 4 }}>·</span>
                      <span>{new Date(e.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {viewerDoc && <DocumentViewer fileUrl={viewerDoc.url} fileName={viewerDoc.name} onClose={() => setViewerDoc(null)} />}

      {assignment?.recommendations?.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <h3>Recommendations from Supervisor</h3>
            <span className="badge" style={{ background: 'var(--color-tertiary-container)', color: 'var(--color-on-tertiary-container)' }}>
              {assignment.recommendations.length}
            </span>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {assignment.recommendations.map((r) => (
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
                  <p style={{ margin: '0 0 6px', fontSize: 14, lineHeight: 1.5 }}>{r.content}</p>
                  <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', marginTop: 6 }}>
                    Issued {new Date(r.createdAt).toLocaleDateString()} at {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                  <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }}
                    onClick={() => window.open(`/api/supervisors/recommendation/${r.id}/pdf`, '_blank')}
                    title="View Recommendation PDF">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>picture_as_pdf</span>
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const a = document.createElement('a');
                      a.href = `/api/supervisors/recommendation/${r.id}/pdf`;
                      a.download = `recommendation_${r.id}.pdf`;
                      document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    }}
                    title="Download PDF">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageLayout></ErrorBoundary>
  );
}

export default StudentProjectDetail;
