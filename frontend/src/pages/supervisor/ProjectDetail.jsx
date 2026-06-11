import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

function ProjectDetail() {
  const { type, id } = useParams();
  const [item, setItem] = useState(null);
  const [activeTab, setActiveTab] = useState('proposal');
  const [components, setComponents] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [marks, setMarks] = useState({});
  const [showRecommend, setShowRecommend] = useState(false);
  const [recommendContent, setRecommendContent] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

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
  const calcTotal = () => evaluations.reduce((s, e) => s + (e.marks || 0), 0);

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

  return (
    <PageLayout
      title={title}
      subtitle="Evaluate and provide feedback for each stage"
      user={user}
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setShowRecommend(true)}>
          <span className="material-symbols-outlined">description</span>
          Issue Recommendation
        </button>
      }
    >
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">score</span></div>
          <div className="stat-number">{calcTotal()}</div>
          <div className="stat-label">Total Marks / 50</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">grading</span></div>
          <div className="stat-number">{evaluations.length}</div>
          <div className="stat-label">Evaluations</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">groups</span></div>
          <div className="stat-number">{item?.members?.length || 1}</div>
          <div className="stat-label">Students</div>
        </div>
      </div>

      <div className="tabs">
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

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 300, marginBottom: 0 }}>
          <div className="card-header">
            <h3>Feedback</h3>
          </div>
          <div className="form-group">
            <label>Add Feedback</label>
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
              Previous Feedback
            </label>
            {getStageEvals(activeTab).filter(e => e.comment).length === 0 ? (
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 14 }}>No feedback for this stage yet.</p>
            ) : (
              getStageEvals(activeTab).filter(e => e.comment).map(e => (
                <div key={e.id} style={{
                  background: 'var(--color-surface-container-low)',
                  padding: 16,
                  borderRadius: 8,
                  marginTop: 12,
                  border: '1px solid var(--color-outline-variant)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong style={{ color: 'var(--color-on-surface)', fontSize: 14 }}>{e.submittedBy?.firstName} {e.submittedBy?.lastName}</strong>
                    <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 12 }}>{new Date(e.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontSize: 14 }}>{e.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 300, marginBottom: 0 }}>
          <div className="card-header">
            <h3>Marks</h3>
          </div>
          {components.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ flex: 1, fontSize: 14, color: 'var(--color-on-surface)', fontWeight: 500 }}>{c.name}</span>
              <input
                type="number"
                style={{
                  width: 80,
                  padding: '8px 12px',
                  border: '1px solid var(--color-outline)',
                  borderRadius: 6,
                  fontSize: 14,
                  fontFamily: 'var(--font-body)',
                  backgroundColor: 'var(--color-surface-container-lowest)',
                  textAlign: 'center'
                }}
                value={marks[c.id] || ''}
                onChange={e => setMarks({...marks, [c.id]: e.target.value})}
                max={c.maxMarks}
                min="0"
              />
              <span style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>/ {c.maxMarks}</span>
            </div>
          ))}
          <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={handleSubmitMarks}>
            <span className="material-symbols-outlined">save</span>
            Submit Marks
          </button>

          <div style={{ marginTop: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12, display: 'block' }}>
              Previous Marks
            </label>
            {getStageEvals(activeTab).filter(e => e.marks !== null).length === 0 ? (
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 14 }}>No marks submitted yet.</p>
            ) : (
              getStageEvals(activeTab).filter(e => e.marks !== null).map(e => (
                <div key={e.id} style={{
                  background: 'var(--color-surface-container-low)',
                  padding: 16,
                  borderRadius: 8,
                  marginTop: 12,
                  border: '1px solid var(--color-outline-variant)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong style={{ color: 'var(--color-primary)', fontSize: 14 }}>Marks: {e.marks}</strong>
                    <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 12 }}>{new Date(e.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontSize: 13 }}>
                    by {e.submittedBy?.firstName} {e.submittedBy?.lastName}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

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
