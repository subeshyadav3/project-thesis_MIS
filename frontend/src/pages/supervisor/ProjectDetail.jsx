import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

function ProjectDetail() {
  const { type, id } = useParams();
  const navigate = useNavigate();
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
      const evals = data.evaluations || [];
      const comps = data.components || [];
      setEvaluations(evals);
      setComponents(comps);
      const m = {};
      comps.forEach(c => {
        let val = '';
        const relevant = evals.filter(e => e.evaluationType === c.evaluationType && e.marks !== null);
        if (relevant.length) val = relevant[relevant.length - 1].marks.toString();
        m[c.id] = val;
      });
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

  const handleSubmitSupervisorMarks = async () => {
    const supComp = components.find(c => c.evaluationType === 'SUPERVISOR');
    if (!supComp) {
      toast.error('Supervisor evaluation component not found.');
      return;
    }
    const valStr = marks[supComp.id];
    if (valStr === undefined || valStr === '') {
      toast.warning('Please enter supervisor marks');
      return;
    }
    const val = parseFloat(valStr);
    if (isNaN(val) || val < 0 || val > 25) {
      toast.warning('Supervisor marks must be between 0 and 25');
      return;
    }

    try {
      const payload = {
        stage: 'FINAL',
        evaluationType: 'SUPERVISOR',
        marks: val,
        comment: feedback || undefined,
      };
      if (type === 'group') payload.groupId = parseInt(id);
      else payload.thesisId = parseInt(id);
      await api.post('/evaluations', payload);
      toast.success('Supervisor marks submitted successfully.');
      setFeedback('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error submitting supervisor marks');
    }
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
  const hasStageMarks = (stage) => evaluations.some(e => e.stage === stage.toUpperCase() && e.marks !== null);
  const getLatestStageMarks = (stage) => {
    const evals = evaluations.filter(e => e.stage === stage.toUpperCase() && e.marks !== null);
    return evals.length > 0 ? evals[evals.length - 1].marks : 0;
  };
  const getLatestMarksByType = (type) => {
    const evals = evaluations.filter(e => e.evaluationType === type && e.marks !== null);
    return evals.length > 0 ? evals[evals.length - 1].marks : null;
  };
  const getSubmittedTotal = () => {
    const types = ['SUPERVISOR', 'PROPOSAL_DEFENSE', 'MIDTERM_DEFENSE', 'FINAL_DEFENSE', 'EXTERNAL_EXAMINER'];
    return types.reduce((s, type) => s + (getLatestMarksByType(type) || 0), 0);
  };
  const currentTotal = getSubmittedTotal();
  const safeMembers = (item) => (item?.members || []).filter(m => m.student);
  const filterComponents = (stage) => {
    if (stage === 'proposal') return components.filter(c => c.evaluationType === 'PROPOSAL_DEFENSE');
    if (stage === 'MID_TERM') return components.filter(c => c.evaluationType === 'MIDTERM_DEFENSE');
    return components;
  };

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
    { icon: 'score', value: getSubmittedTotal(), label: 'Total Marks / 50' },
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
    return hasStageMarks(s.key);
  }).map(s => s.key);

  const backPath = isSupervisor
    ? (type === 'group' ? '/supervisor/bachelor' : '/supervisor/master')
    : (type === 'group' ? '/coordinator/bachelor' : '/coordinator/master');

  return (
    <PageLayout
      title={title}
      subtitle={name}
      user={user}
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate(backPath)}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Back to {type === 'group' ? 'Projects' : 'Theses'}
          </button>
          {isSupervisor && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowRecommend(true)}>
              <span className="material-symbols-outlined">description</span>
              Issue Recommendation
            </button>
          )}
        </div>
      }
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
              activeTab === 'proposal' || activeTab === 'MID_TERM' ? (
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {/* Left: Marks */}
                  <div className="card" style={{ flex: 1, minWidth: 300, marginBottom: 0 }}>
                    <div className="card-header">
                      <h3>{activeTab === 'proposal' ? 'Proposal Defense' : 'Mid-Term Defense'}</h3>
                      <span className="badge" style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}>
                        Max Marks: 5
                      </span>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                      {getLatestMarksByType(activeTab === 'proposal' ? 'PROPOSAL_DEFENSE' : 'MIDTERM_DEFENSE') !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span className="material-symbols-outlined" style={{ color: 'var(--color-success)', fontSize: 32 }}>check_circle</span>
                          <div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-primary)' }}>
                              {getLatestMarksByType(activeTab === 'proposal' ? 'PROPOSAL_DEFENSE' : 'MIDTERM_DEFENSE')}
                              <span style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', fontWeight: 400 }}> / 5</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Submitted by Coordinator</div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', fontSize: 32 }}>pending_actions</span>
                          <div>
                            <div style={{ fontWeight: 600 }}>Pending Coordinator Evaluation</div>
                            <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Defense marks will be updated by the coordinator.</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Feedback + Comments */}
                  <div className="card" style={{ flex: 1, minWidth: 300, marginBottom: 0 }}>
                    <div className="card-header">
                      <h3>Supervisor Feedback</h3>
                    </div>
                    {isSupervisor ? (
                      <>
                        <div className="form-group" style={{ marginBottom: 12 }}>
                          <textarea
                            value={feedback}
                            onChange={e => setFeedback(e.target.value)}
                            placeholder="Write your feedback for this stage..."
                            style={{ minHeight: 80 }}
                          />
                        </div>
                        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleSubmitFeedback}>
                          <span className="material-symbols-outlined">send</span>
                          Submit Feedback
                        </button>
                      </>
                    ) : (
                      <div className="empty-state" style={{ padding: '24px 16px', textAlign: 'left', alignItems: 'flex-start' }}>
                        <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>visibility</span>
                          Read-only view
                        </p>
                      </div>
                    )}

                    <div style={{ marginTop: 24 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12, display: 'block' }}>
                        Comments History
                      </label>
                      {getStageEvals(activeTab).filter(e => e.comment).length === 0 ? (
                        <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>No comments yet</p>
                      ) : (
                        getStageEvals(activeTab).filter(e => e.comment).map(e => (
                          <div key={e.id} style={{
                            background: 'var(--color-surface-container-low)', padding: 12, borderRadius: 8,
                            marginBottom: 8, border: '1px solid var(--color-outline-variant)'
                          }}>
                            <p style={{ margin: '0 0 4px', fontSize: 14 }}>{e.comment}</p>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                              {e.submittedBy?.firstName} {e.submittedBy?.lastName} — {new Date(e.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* ─── Final Tab ─── */
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {/* Left: Supervisor Marks Form */}
                  <div className="card" style={{ flex: 1, minWidth: 300, marginBottom: 0 }}>
                    <div className="card-header">
                      <h3>Supervisor Assessment</h3>
                      <span className="badge" style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}>
                        Max Marks: 25
                      </span>
                    </div>
                    {isSupervisor ? (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                          {components.filter(c => c.evaluationType === 'SUPERVISOR').map(c => (
                            <div key={c.id} className="marks-row">
                              <span className="marks-row-label">Supervisor Score</span>
                              <input
                                type="number"
                                className="marks-input"
                                value={marks[c.id] || ''}
                                onChange={e => setMarks({...marks, [c.id]: e.target.value})}
                                max="25"
                                min="0"
                                step="0.5"
                                placeholder="0-25"
                              />
                              <span className="marks-row-max">/ 25</span>
                            </div>
                          ))}
                        </div>
                        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleSubmitSupervisorMarks}>
                          <span className="material-symbols-outlined">save</span>
                          Submit Supervisor Mark
                        </button>
                      </>
                    ) : (
                      <div style={{ padding: '8px 0' }}>
                        {getLatestMarksByType('SUPERVISOR') !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span className="material-symbols-outlined" style={{ color: 'var(--color-success)', fontSize: 32 }}>check_circle</span>
                            <div>
                              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-primary)' }}>
                                {getLatestMarksByType('SUPERVISOR')}
                                <span style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', fontWeight: 400 }}> / 25</span>
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Submitted by Supervisor</div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', fontSize: 32 }}>pending_actions</span>
                            <div>
                              <div style={{ fontWeight: 600 }}>Pending Supervisor Evaluation</div>
                              <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Marks will be entered by the assigned supervisor.</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Breakdown of other marks */}
                    <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--color-outline-variant)' }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16, display: 'block' }}>
                        Evaluation Components Breakdown
                      </label>
                      {[
                        { label: 'Proposal Defense', type: 'PROPOSAL_DEFENSE', max: 5, actor: 'Coordinator' },
                        { label: 'Mid-Term Defense', type: 'MIDTERM_DEFENSE', max: 5, actor: 'Coordinator' },
                        { label: 'Final Defense', type: 'FINAL_DEFENSE', max: 5, actor: 'Coordinator' },
                        { label: 'External Examiner', type: 'EXTERNAL_EXAMINER', max: 10, actor: 'External Examiner' },
                      ].map(stage => {
                        const score = getLatestMarksByType(stage.type);
                        const hasMarks = score !== null;
                        return (
                          <div key={stage.type} style={{
                            padding: '12px 14px', borderRadius: 8, marginBottom: 10,
                            border: `1px solid ${hasMarks ? 'var(--color-success)' : 'var(--color-outline-variant)'}`,
                            background: hasMarks ? 'rgba(22, 163, 74, 0.05)' : 'var(--color-surface-container-low)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className={`badge badge-${hasMarks ? 'completed' : 'pending'}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                                {hasMarks ? 'Done' : 'Pending'}
                              </span>
                              <div>
                                <span style={{ fontWeight: 600, fontSize: 13, display: 'block' }}>{stage.label}</span>
                                <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>Evaluator: {stage.actor}</span>
                              </div>
                              <span style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 700, color: 'var(--color-primary)' }}>
                                {hasMarks ? score : '—'}
                              </span>
                              <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>/ {stage.max}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Final Feedback + Grand Total */}
                  <div className="card" style={{ flex: 1, minWidth: 300, marginBottom: 0 }}>
                    <div className="card-header">
                      <h3>Final Feedback</h3>
                    </div>
                    {isSupervisor ? (
                      <>
                        <div className="form-group" style={{ marginBottom: 12 }}>
                          <textarea
                            value={feedback}
                            onChange={e => setFeedback(e.target.value)}
                            placeholder="Enter your final feedback for the project..."
                            style={{ minHeight: 80 }}
                          />
                        </div>
                        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleSubmitFeedback}>
                          <span className="material-symbols-outlined">send</span>
                          Submit Feedback
                        </button>
                      </>
                    ) : (
                      <div className="empty-state" style={{ padding: '24px 16px', textAlign: 'left', alignItems: 'flex-start' }}>
                        <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>visibility</span>
                          Read-only view
                        </p>
                      </div>
                    )}

                    {/* Final Comments History */}
                    <div style={{ marginTop: 24 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12, display: 'block' }}>
                        Comments History
                      </label>
                      {getStageEvals('FINAL').filter(e => e.comment).length === 0 ? (
                        <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>No comments yet</p>
                      ) : (
                        getStageEvals('FINAL').filter(e => e.comment).map(e => (
                          <div key={e.id} style={{
                            background: 'var(--color-surface-container-low)', padding: 12, borderRadius: 8,
                            marginBottom: 8, border: '1px solid var(--color-outline-variant)'
                          }}>
                            <p style={{ margin: '0 0 4px', fontSize: 14 }}>{e.comment}</p>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                              {e.submittedBy?.firstName} {e.submittedBy?.lastName} — {new Date(e.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Grand Total */}
                    <div style={{ marginTop: 32, padding: 20, background: 'var(--color-surface-container-low)', borderRadius: 12, border: '1px solid var(--color-outline-variant)', textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-on-surface-variant)', marginBottom: 4 }}>
                        Grand Total
                      </div>
                      <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--color-primary)' }}>
                        {currentTotal}
                        <span style={{ fontSize: 18, fontWeight: 400, color: 'var(--color-on-surface-variant)' }}> / 50</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
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
