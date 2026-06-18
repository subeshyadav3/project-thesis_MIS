import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

function ProjectDetail() {
  const { type, id } = useParams();
  const [item, setItem] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const [components, setComponents] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [marks, setMarks] = useState({});
  const [showRecommend, setShowRecommend] = useState(false);
  const [recommendContent, setRecommendContent] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSupervisor = user.role === 'SUPERVISOR';

  const stages = [
    { key: 'PROPOSAL', label: 'Proposal' },
    { key: 'MID_TERM', label: 'Mid-Term' },
    { key: 'FINAL', label: 'Final' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  const loadData = () => {
    setLoading(true);
    const endpoint = type === 'group' ? `/groups/${id}` : `/theses/${id}`;
    api.get(endpoint).then(({ data }) => { setItem(data); }).catch(() => {});
    const evalEndpoint = type === 'group' ? `/evaluations/group/${id}` : `/evaluations/thesis/${id}`;
    api.get(evalEndpoint).then(({ data }) => {
      setEvaluations(data.evaluations || []);
      setComponents(data.components || []);
      const m = {};
      (data.components || []).forEach(c => { m[c.id] = ''; });
      setMarks(m);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [id, type]);

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) { toast.warning('Please enter feedback'); return; }
    try {
      const payload = { stage: activeTab.toUpperCase(), comment: feedback };
      if (type === 'group') payload.groupId = parseInt(id);
      else payload.thesisId = parseInt(id);
      await api.post('/evaluations/feedback', payload);
      toast.success('Feedback submitted. Email sent to students.');
      setFeedback('');
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Error submitting feedback'); }
  };

  const handleSubmitMarks = async () => {
    try {
      const totalMarks = Object.values(marks).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
      const payload = { stage: activeTab.toUpperCase(), marks: totalMarks, comment: 'Marks submitted' };
      if (type === 'group') payload.groupId = parseInt(id);
      else payload.thesisId = parseInt(id);
      await api.post('/evaluations', payload);
      toast.success('Marks submitted. Email sent to students.');
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Error submitting marks'); }
  };

  const handleRecommend = async () => {
    if (!recommendContent.trim()) { toast.warning('Please enter recommendation content'); return; }
    try {
      const payload = { content: recommendContent };
      if (type === 'group') payload.groupId = parseInt(id);
      else payload.thesisId = parseInt(id);
      await api.post('/supervisors/recommendation', payload);
      toast.success('Letter of recommendation issued. Email sent.');
      setShowRecommend(false);
      setRecommendContent('');
    } catch (err) { toast.error(err.response?.data?.error || 'Error issuing recommendation'); }
  };

  const getStageEvals = (stage) => evaluations.filter(e => e.stage === stage.toUpperCase());
  const hasStageEval = (stage) => evaluations.some(e => e.stage === stage.toUpperCase());
  const calcTotal = () => evaluations.reduce((s, e) => s + (e.marks || 0), 0);
  const safeMembers = (item) => (item?.members || []).filter(m => m.student);

  if (!item && loading) {
    return (
      <PageLayout title="Project Detail" user={user}>
        <div className="loading-state">
          <span className="material-symbols-outlined">progress_activity</span>
          <p>Loading project details...</p>
        </div>
      </PageLayout>
    );
  }

  const name = type === 'group' ? item?.name : `${item?.student?.firstName} ${item?.student?.lastName}`;
  const title = type === 'group' ? item?.projectTitle : item?.title;

  // Role-based stats
  const stats = isSupervisor ? [
    { icon: 'score', value: calcTotal(), label: 'Total Marks / 50' },
    { icon: 'grading', value: evaluations.length, label: 'Evaluations' },
    { icon: 'groups', value: item?.members?.length || 1, label: 'Students' },
  ] : [
    { icon: 'badge', value: type === 'group' ? 'Group' : 'Thesis', label: 'Type' },
    { icon: 'calendar_month', value: item?.academicYear?.year || '—', label: 'Academic Year' },
    { icon: 'school', value: item?.status || 'PENDING', label: 'Status', isBadge: true },
  ];

  // Progress stepper logic
  const completedStages = stages.filter(s => {
    if (s.key === 'COMPLETED') return item?.status === 'COMPLETED';
    return hasStageEval(s.key);
  }).map(s => s.key);

  return (
    <PageLayout
      title={title}
      subtitle={name}
      user={user}
      actions={isSupervisor ? (
        <button className="btn btn-primary btn-sm" onClick={() => setShowRecommend(true)}>
          <span className="material-symbols-outlined">description</span>
          Issue Recommendation
        </button>
      ) : null}
    >
      {/* ─── Role-based Stats ─────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div key={i} className="stat-card bento-card">
            <div className="stat-icon"><span className="material-symbols-outlined">{s.icon}</span></div>
            <div className="stat-number" style={{ fontSize: isSupervisor ? undefined : 20 }}>
              {s.isBadge ? <span className={`badge badge-${(s.value).toLowerCase?.() || 'pending'}`}><span className="dot" />{s.value}</span> : s.value}
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ─── Tabs ────────────────────────────────────── */}
      <div className="tabs">
        <div className={`tab ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')}>
          <span className="material-symbols-outlined">info</span>
          Description
        </div>
        <div className={`tab ${activeTab === 'proposal' ? 'active' : ''}`} onClick={() => setActiveTab('proposal')}>
          <span className="material-symbols-outlined">description</span>
          Proposal
        </div>
        <div className={`tab ${activeTab === 'MID_TERM' ? 'active' : ''}`} onClick={() => setActiveTab('MID_TERM')}>
          <span className="material-symbols-outlined">schedule</span>
          Mid-Term
        </div>
        <div className={`tab ${activeTab === 'FINAL' ? 'active' : ''}`} onClick={() => setActiveTab('FINAL')}>
          <span className="material-symbols-outlined">flag</span>
          Final
        </div>
      </div>

      {/* ─── Main Content + Right Stepper Sidebar ─────── */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Tab Content */}
        <div style={{ flex: 1, minWidth: 280 }}>
          {/* ─── Description Tab ───────────────────── */}
          {activeTab === 'description' ? (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div className="card" style={{ flex: 1, minWidth: 280, marginBottom: 0 }}>
                <div className="card-header">
                  <h3>Details</h3>
                  <span className={`badge badge-${item?.status?.toLowerCase() || 'pending'}`}>
                    <span className="dot" />
                    {item?.status || 'PENDING'}
                  </span>
                </div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">{type === 'group' ? 'Group' : 'Student'}</span>
                    <span style={{ fontWeight: 600 }}>{name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{type === 'group' ? 'Project' : 'Thesis'} Title</span>
                    <span>{title}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Supervisor</span>
                    <span>{item?.supervisor ? `${item.supervisor.firstName} ${item.supervisor.lastName}` : <span className="badge badge-pending"><span className="dot" />Unassigned</span>}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Academic Year</span>
                    <span>{item?.academicYear?.year || '—'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Created</span>
                    <span>{item?.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
              </div>

              {type === 'group' && (
                <div className="card" style={{ flex: 1, minWidth: 280, marginBottom: 0, overflowX: 'auto' }}>
                  <div className="card-header">
                    <h3>Members ({safeMembers(item).length})</h3>
                  </div>
                  {safeMembers(item).length === 0 ? (
                    <div className="empty-state" style={{ padding: '32px 16px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }}>group_off</span>
                      <p>No members assigned yet</p>
                    </div>
                  ) : (
                    <table className="detail-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Roll</th>
                          <th>Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {safeMembers(item).map((m, i) => (
                          <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{m.student?.firstName || ''} {m.student?.lastName || ''}</td>
                        <td style={{ color: 'var(--color-on-surface-variant)' }}>{m.rollNumber || '—'}</td>
                        <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13, wordBreak: 'break-all' }}>{m.student?.email || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {type === 'thesis' && (
                <div className="card" style={{ flex: 1, minWidth: 280, marginBottom: 0 }}>
                  <div className="card-header">
                    <h3>Student Information</h3>
                  </div>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Name</span>
                      <span style={{ fontWeight: 600 }}>{item?.student?.firstName} {item?.student?.lastName}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email</span>
                      <span>{item?.student?.email || '—'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Roll Number</span>
                      <span>{item?.student?.rollNumber || '—'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ─── Stage Tabs ────────────────────── */
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {/* Left: Components (Requirements) */}
              <div className="card" style={{ flex: 1, minWidth: 300, marginBottom: 0 }}>
                <div className="card-header">
                  <h3>Evaluation Components</h3>
                </div>
                {components.length === 0 ? (
                  <div className="empty-state" style={{ padding: '32px 16px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }}>checklist</span>
                    <p>No evaluation components configured</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {components.map(c => (
                      <div key={c.id} style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        padding: '12px 16px', background: 'var(--color-surface-container-low)', 
                        borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-outline-variant)' 
                      }}>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</span>
                        <span className="badge" style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}>
                          Max: {c.maxMarks}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Stage-specific evaluation history (read-only for coordinator) */}
                <div style={{ marginTop: 32 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12, display: 'block' }}>
                    Stage History
                  </label>
                  {getStageEvals(activeTab).length === 0 ? (
                    <div className="empty-state" style={{ padding: '24px 16px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--color-outline)' }}>history</span>
                      <p style={{ fontSize: 14 }}>No evaluations for this stage yet</p>
                    </div>
                  ) : (
                    getStageEvals(activeTab).map(e => (
                      <div key={e.id} style={{
                        background: 'var(--color-surface-container-low)', padding: 16, borderRadius: 8, 
                        marginBottom: 12, border: '1px solid var(--color-outline-variant)' 
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <strong style={{ color: 'var(--color-primary)', fontSize: 14 }}>{e.marks !== null ? `Marks: ${e.marks}` : 'Feedback Only'}</strong>
                          <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 12 }}>{new Date(e.createdAt).toLocaleDateString()}</span>
                        </div>
                        {e.comment && <p style={{ margin: '0 0 8px', color: 'var(--color-on-surface-variant)', fontSize: 14 }}>{e.comment}</p>}
                        <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontSize: 12 }}>
                          by {e.submittedBy?.firstName} {e.submittedBy?.lastName}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right: Feedback & Marks (Supervisor only) or Read-only summary (Coordinator) */}
              <div className="card" style={{ flex: 1, minWidth: 300, marginBottom: 0 }}>
                <div className="card-header">
                  <h3>{isSupervisor ? 'Submit Evaluation' : 'Evaluation Summary'}</h3>
                </div>

                {isSupervisor ? (
                  <>
                    <div className="form-group">
                      <label>Feedback</label>
                      <textarea
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        placeholder="Enter your feedback for this stage..."
                      />
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={handleSubmitFeedback}>
                      <span className="material-symbols-outlined">send</span>
                      Submit Feedback
                    </button>

                    <div style={{ marginTop: 24 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12, display: 'block' }}>
                        Marks
                      </label>
                      {components.map(c => (
                        <div key={c.id} className="marks-row">
                          <span className="marks-row-label">{c.name}</span>
                          <input
                            type="number"
                            className="marks-input"
                            value={marks[c.id] || ''}
                            onChange={e => setMarks({...marks, [c.id]: e.target.value})}
                            max={c.maxMarks}
                            min="0"
                            placeholder="0"
                          />
                          <span className="marks-row-max">/ {c.maxMarks}</span>
                        </div>
                      ))}
                      <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={handleSubmitMarks}>
                        <span className="material-symbols-outlined">save</span>
                        Submit Marks
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="empty-state" style={{ padding: '32px 16px', textAlign: 'left', alignItems: 'flex-start' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--color-outline)' }}>visibility</span>
                      <p style={{ margin: '8px 0 4px', fontWeight: 600 }}>Coordinator View</p>
                      <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', textAlign: 'left' }}>
                        You have read-only access to evaluations. Only supervisors can submit marks and feedback.
                      </p>
                    </div>

                    {/* Show latest evaluation for this stage if any */}
                    {getStageEvals(activeTab).length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12, display: 'block' }}>
                          Latest Evaluation
                        </label>
                        {(() => {
                          const latest = getStageEvals(activeTab)[0];
                          return (
                            <div style={{
                              background: 'var(--color-surface-container-low)', padding: 16, borderRadius: 8,
                              border: '1px solid var(--color-outline-variant)'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <strong style={{ color: 'var(--color-primary)', fontSize: 14 }}>{latest.marks !== null ? `Marks: ${latest.marks}` : 'Feedback Only'}</strong>
                                <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 12 }}>{new Date(latest.createdAt).toLocaleDateString()}</span>
                              </div>
                              {latest.comment && <p style={{ margin: '0 0 8px', color: 'var(--color-on-surface-variant)', fontSize: 14 }}>{latest.comment}</p>}
                              <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontSize: 12 }}>
                                by {latest.submittedBy?.firstName} {latest.submittedBy?.lastName}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Right Sidebar: Vertical Stage Stepper ────── */}
        <div style={{ width: 140, minWidth: 140 }}>
          <div className="card" style={{ padding: '16px 12px', marginBottom: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-on-surface-variant)', marginBottom: 16 }}>
              Progress
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {stages.map((s, i) => {
                const isCompleted = completedStages.includes(s.key);
                const isActive = activeTab === (s.key === 'PROPOSAL' ? 'proposal' : s.key === 'MID_TERM' ? 'MID_TERM' : s.key === 'FINAL' ? 'FINAL' : 'description');
                return (
                  <div key={s.key} style={{ display: 'flex', position: 'relative' }}>
                    {/* Connector line */}
                    {i < stages.length - 1 && (
                      <div style={{
                        position: 'absolute', left: 11, top: 24, width: 2, height: 24, 
                        background: isCompleted ? 'var(--color-success)' : 'var(--color-outline-variant)', zIndex: 0 
                      }} />
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', position: 'relative', zIndex: 1 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                        background: isCompleted ? 'var(--color-success)' : isActive ? 'var(--color-primary)' : 'var(--color-surface-container)',
                        color: isCompleted || isActive ? '#fff' : 'var(--color-on-surface)',
                        border: `2px solid ${isCompleted ? 'var(--color-success)' : isActive ? 'var(--color-primary)' : 'var(--color-outline-variant)'}`,
                      }}>
                        {isCompleted ? <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span> : i + 1}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isCompleted || isActive ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)' }}>
                        {s.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendation Modal */}
      {showRecommend && (
        <div className="modal-overlay" onClick={() => setShowRecommend(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <span className="material-symbols-outlined">description</span>
              </div>
              <div className="modal-header-text">
                <h2>Issue Letter of Recommendation</h2>
                <p>Create and send a letter of recommendation for this project</p>
              </div>
            </div>
            <div className="form-group">
              <label>Project / Thesis</label>
              <input value={`${name} — ${title}`} disabled />
            </div>
            <div className="form-group">
              <label>Supervisor</label>
              <input value={`${user.firstName} ${user.lastName}`} disabled />
            </div>
            <div className="form-group">
              <label>Content</label>
              <textarea
                value={recommendContent}
                onChange={e => setRecommendContent(e.target.value)}
                placeholder="Write the recommendation content..."
                style={{ minHeight: 150 }}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowRecommend(false)}>
                <span className="material-symbols-outlined">close</span>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleRecommend}>
                <span className="material-symbols-outlined">send</span>
                Issue & Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default ProjectDetail;
