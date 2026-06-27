import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

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
  const [marks, setMarks] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setLoading(true);
    const endpoint = type === 'group' ? `/groups/${id}` : `/theses/${id}`;
    api.get(endpoint)
      .then(({ data }) => { setItem(data); })
      .catch(() => { toast.error('Failed to load details'); });

    const evalEndpoint = type === 'group' ? `/evaluations/group/${id}` : `/evaluations/thesis/${id}`;
    api.get(evalEndpoint)
      .then(({ data }) => {
        if (data.summary) setSummary(data.summary);
        setComponents(data.components || []);
        setEvaluations(data.evaluations || []);
        // Find the Internal Examiner (EXTERNAL_EXAMINER) component
        const intComp = (data.components || []).find(c => c.evaluationType === 'EXTERNAL_EXAMINER');
        if (intComp) {
          const existing = (data.evaluations || []).find(e => e.componentId === intComp.id);
          if (existing && existing.marks !== null && existing.marks !== undefined) {
            setMarks(existing.marks.toString());
            setComment(existing.comment || '');
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, type]);

  // Get the Internal Examiner component (the one this user evaluates)
  const internalExaminerComponent = components.find(c => c.evaluationType === 'EXTERNAL_EXAMINER');
  const existingEvaluation = internalExaminerComponent
    ? evaluations.find(e => e.componentId === internalExaminerComponent.id)
    : null;

  const handleSubmit = async () => {
    if (!internalExaminerComponent) {
      toast.error('No Internal Examiner component assigned for this project');
      return;
    }
    if (!marks && !comment.trim()) {
      toast.warning('Please enter marks or a comment');
      return;
    }
    const marksNum = parseFloat(marks);
    if (Number.isNaN(marksNum) || marksNum < 0 || marksNum > internalExaminerComponent.maxMarks) {
      toast.warning(`Please enter valid marks between 0 and ${internalExaminerComponent.maxMarks}`);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        componentId: internalExaminerComponent.id,
        marks: marksNum,
        comment,
      };
      if (type === 'group') payload.groupId = parseInt(id);
      else payload.thesisId = parseInt(id);
      await api.post('/external-examiners/evaluation', payload);
      toast.success('Internal Examiner marks submitted');
      navigate('/external/evaluations');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  const name = type === 'group' ? item?.name : `${item?.student?.firstName} ${item?.student?.lastName}`;
  const title = type === 'group' ? item?.projectTitle : item?.title;

  // Order components for display
  const orderedComponents = [...components].sort((a, b) => {
    const order = ['PROPOSAL_DEFENSE', 'MIDTERM_DEFENSE', 'FINAL_DEFENSE', 'SUPERVISOR', 'EXTERNAL_EXAMINER'];
    return order.indexOf(a.evaluationType) - order.indexOf(b.evaluationType);
  });

  return (
    <PageLayout title={`Internal Examiner Evaluation`} subtitle={title} user={user}>
      {loading ? (
        <div className="loading-state"><span className="material-symbols-outlined">progress_activity</span></div>
      ) : !item ? (
        <div className="empty-state" style={{ padding: 40 }}><p>Item not found</p></div>
      ) : (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header"><h3>Details</h3></div>
              <div className="detail-grid">
                <div className="detail-item"><span className="detail-label">{type === 'group' ? 'Group' : 'Student'}</span><span style={{ fontWeight: 600 }}>{name}</span></div>
                <div className="detail-item"><span className="detail-label">{type === 'group' ? 'Project' : 'Thesis'} Title</span><span>{title}</span></div>
                <div className="detail-item"><span className="detail-label">Supervisor</span><span>{item.supervisor ? `${item.supervisor.firstName} ${item.supervisor.lastName}` : '—'}</span></div>
                <div className="detail-item"><span className="detail-label">Academic Year</span><span>{item.academicYear?.year || '—'}</span></div>
              </div>
            </div>

            {/* Internal Examiner submission card */}
            {internalExaminerComponent && (
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <div>
                    <h3 style={{ margin: 0 }}>Internal Examiner Marks</h3>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                      You are evaluating the <strong>{internalExaminerComponent.name}</strong> component.
                    </p>
                  </div>
                  <span className="badge" style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}>
                    Max: {internalExaminerComponent.maxMarks}
                  </span>
                </div>
                {existingEvaluation && (
                  <div style={{
                    padding: 10, marginBottom: 12, borderRadius: 8,
                    background: 'var(--color-surface-container-low)', fontSize: 12,
                    color: 'var(--color-on-surface-variant)'
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>edit</span>
                    Last updated {new Date(existingEvaluation.updatedAt).toLocaleString()}
                    {existingEvaluation.marks !== null && existingEvaluation.marks !== undefined && (
                      <> · Currently <strong style={{ color: 'var(--color-primary)' }}>{existingEvaluation.marks} / {internalExaminerComponent.maxMarks}</strong></>
                    )}
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
                    Marks (out of {internalExaminerComponent.maxMarks})
                  </label>
                  <input
                    type="number"
                    className="marks-input"
                    value={marks}
                    onChange={e => setMarks(e.target.value)}
                    max={internalExaminerComponent.maxMarks}
                    min="0"
                    step="0.5"
                    placeholder={`Enter marks out of ${internalExaminerComponent.maxMarks}`}
                    style={{ width: '100%', maxWidth: 220 }}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>Comment (optional)</label>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Enter your evaluation comment..."
                    style={{ minHeight: 80, width: '100%' }}
                  />
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSubmit} disabled={submitting}>
                  <span className="material-symbols-outlined">{submitting ? 'progress_activity' : 'save'}</span>
                  {submitting ? 'Submitting...' : existingEvaluation ? 'Update Internal Examiner Marks' : 'Submit Internal Examiner Marks'}
                </button>
              </div>
            )}
          </div>

          {/* Side: full 5-component breakdown */}
          <div style={{ width: 380, minWidth: 280 }}>
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h3>Evaluation Breakdown</h3>
                <span className="badge" style={{ background: 'var(--color-surface-container)' }}>
                  {summary?.completedCount || 0} / {summary?.totalCount || 5} done
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {orderedComponents.map(c => {
                  const e = evaluations.find(ev => ev.componentId === c.id);
                  const hasMarks = e && e.marks !== null && e.marks !== undefined;
                  const isMine = c.evaluatorRole === 'EXTERNAL_EXAMINER';
                  return (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8,
                      background: isMine ? 'var(--color-primary-container)' : 'var(--color-surface-container-low)',
                      border: isMine ? '1px solid var(--color-primary)' : '1px solid var(--color-outline-variant)',
                    }}>
                      <span className="material-symbols-outlined" style={{
                        fontSize: 18,
                        color: hasMarks ? (isMine ? 'var(--color-on-primary-container)' : 'var(--color-success)') : 'var(--color-on-surface-variant)',
                      }}>
                        {hasMarks ? 'check_circle' : 'pending'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: isMine ? 700 : 500 }}>{c.name}</div>
                        <div style={{ fontSize: 10, color: isMine ? 'var(--color-on-primary-container)' : 'var(--color-on-surface-variant)' }}>
                          {ROLE_LABEL[c.evaluatorRole]}
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, color: hasMarks ? (isMine ? 'var(--color-on-primary-container)' : 'var(--color-primary)') : 'var(--color-on-surface-variant)' }}>
                        {hasMarks ? e.marks : '—'}
                        <span style={{ fontSize: 11, fontWeight: 400 }}> / {c.maxMarks}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header"><h3>Grand Total</h3></div>
              <div style={{ padding: 20, textAlign: 'center', background: 'var(--color-surface-container-low)', borderRadius: 12 }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--color-primary)' }}>
                  {summary?.total || 0}
                  <span style={{ fontSize: 18, fontWeight: 400, color: 'var(--color-on-surface-variant)' }}> / {summary?.maxTotal || 50}</span>
                </div>
                {summary?.isComplete && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>verified</span> All components evaluated
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default ExternalExaminerEvaluationPage;
