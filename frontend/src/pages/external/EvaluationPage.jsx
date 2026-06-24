import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

function ExternalEvaluationPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [marks, setMarks] = useState('');
  const [comment, setComment] = useState('');
  const [stage, setStage] = useState('PROPOSAL');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setLoading(true);
    const endpoint = type === 'group' ? `/groups/${id}` : `/theses/${id}`;
    api.get(endpoint)
      .then(({ data }) => { setItem(data); })
      .catch(() => { toast.error('Failed to load details'); })
      .finally(() => setLoading(false));

    const evalEndpoint = type === 'group' ? `/evaluations/group/${id}` : `/evaluations/thesis/${id}`;
    api.get(evalEndpoint)
      .then(({ data }) => { setEvaluations(data.evaluations || []); })
      .catch(() => {});
  }, [id, type]);

  const handleSubmit = async () => {
    if (!marks && !comment.trim()) {
      toast.warning('Please enter marks or a comment');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { stage, marks: marks ? parseFloat(marks) : null, comment };
      if (type === 'group') payload.groupId = parseInt(id);
      else payload.thesisId = parseInt(id);
      await api.post('/external-examiners/evaluation', payload);
      toast.success('Evaluation submitted successfully');
      setMarks('');
      setComment('');
      navigate('/external/evaluations');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  const name = type === 'group' ? item?.name : `${item?.student?.firstName} ${item?.student?.lastName}`;
  const title = type === 'group' ? item?.projectTitle : item?.title;

  const stages = [
    { key: 'PROPOSAL', label: 'Proposal' },
    { key: 'MID_TERM', label: 'Mid-Term' },
    { key: 'FINAL', label: 'Final' },
  ];

  return (
    <PageLayout title={`Evaluate: ${title}`} subtitle={name} user={user}>
      {loading ? (
        <div className="loading-state"><span className="material-symbols-outlined">progress_activity</span></div>
      ) : !item ? (
        <div className="empty-state" style={{ padding: 40 }}><p>Item not found</p></div>
      ) : (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h3>Details</h3>
                <span className={`badge badge-${item.status?.toLowerCase() || 'pending'}`}><span className="dot" />{item.status}</span>
              </div>
              <div className="detail-grid">
                <div className="detail-item"><span className="detail-label">{type === 'group' ? 'Group' : 'Student'}</span><span style={{ fontWeight: 600 }}>{name}</span></div>
                <div className="detail-item"><span className="detail-label">{type === 'group' ? 'Project' : 'Thesis'} Title</span><span>{title}</span></div>
                <div className="detail-item"><span className="detail-label">Supervisor</span><span>{item.supervisor ? `${item.supervisor.firstName} ${item.supervisor.lastName}` : '—'}</span></div>
                <div className="detail-item"><span className="detail-label">Academic Year</span><span>{item.academicYear?.year || '—'}</span></div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header"><h3>Submit Evaluation</h3></div>
              <div className="form-group">
                <label>Stage</label>
                <select value={stage} onChange={e => setStage(e.target.value)}>
                  {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Marks</label>
                <input type="number" value={marks} onChange={e => setMarks(e.target.value)} min="0" max="50" placeholder="Enter marks out of 50" step="0.5" />
              </div>
              <div className="form-group">
                <label>Comment</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Enter your evaluation comment..." style={{ minHeight: 100 }} />
              </div>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleSubmit} disabled={submitting}>
                <span className="material-symbols-outlined">{submitting ? 'progress_activity' : 'save'}</span>
                {submitting ? 'Submitting...' : 'Submit Evaluation'}
              </button>
            </div>
          </div>

          <div style={{ width: 380, minWidth: 280 }}>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header"><h3>Previous Evaluations</h3></div>
              {evaluations.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}><p>No previous evaluations</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {evaluations.map(e => (
                    <div key={e.id} style={{ padding: 12, borderRadius: 8, background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{e.stage}</span>
                        {e.marks !== null && <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{e.marks}</span>}
                      </div>
                      {e.comment && <p style={{ margin: 0, fontSize: 13, color: 'var(--color-on-surface-variant)' }}>{e.comment}</p>}
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                        {e.submittedBy?.firstName} {e.submittedBy?.lastName} — {new Date(e.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default ExternalEvaluationPage;
