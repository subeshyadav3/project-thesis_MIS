import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

function StudentMarksFeedback() {
  const [group, setGroup] = useState(null);
  const [thesis, setThesis] = useState(null);
  const [activeTab, setActiveTab] = useState('marks');
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setLoading(true);
    let foundGroup = null;
    let foundThesis = null;
    Promise.all([
      api.get('/students/my-group').then(({ data }) => { foundGroup = data; setGroup(data); }).catch(() => {}),
      api.get('/students/my-thesis').then(({ data }) => { foundThesis = data; setThesis(data); }).catch(() => {}),
    ]).catch((err) => { toast.error(err.response?.data?.error || 'Failed to load data'); })
      .finally(() => {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        if (foundGroup) u.studentType = 'bachelor';
        else if (foundThesis) u.studentType = 'master';
        else u.studentType = 'unassigned';
        localStorage.setItem('user', JSON.stringify(u));
        setLoading(false);
      });
  }, []);

  const hasAssignment = group || thesis;
  const assignment = group || thesis;

  const evalsByStage = (stage) => {
    if (!assignment?.evaluations) return [];
    return assignment.evaluations.filter(e => e.stage === stage);
  };

  const getTotalMarks = () => {
    if (!assignment?.evaluations) return 0;
    return assignment.evaluations.filter(e => e.marks !== null).reduce((sum, e) => sum + e.marks, 0);
  };

  return (
    <PageLayout title="Marks & Feedback" subtitle="View your evaluations and supervisor feedback" user={user}>
      {loading ? (
        <div className="loading-state"><span className="material-symbols-outlined">progress_activity</span><p>Loading...</p></div>
      ) : !hasAssignment ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }}>school</span>
          <p>You have not been assigned to any project or thesis yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="tabs">
            <div className={`tab ${activeTab === 'marks' ? 'active' : ''}`} onClick={() => setActiveTab('marks')}>
              <span className="material-symbols-outlined">grading</span> Marks
            </div>
            <div className={`tab ${activeTab === 'feedback' ? 'active' : ''}`} onClick={() => setActiveTab('feedback')}>
              <span className="material-symbols-outlined">chat</span> Feedback
            </div>
          </div>

          {activeTab === 'marks' ? (
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header">
                <h3>Evaluation Marks</h3>
                <span className="badge" style={{ background: 'var(--color-success-container)', color: 'var(--color-on-success-container)' }}>
                  Total: {getTotalMarks()}
                </span>
              </div>
              {['PROPOSAL', 'MID_TERM', 'FINAL'].map(stage => {
                const evals = evalsByStage(stage);
                const stageMarks = evals.filter(e => e.marks !== null).reduce((sum, e) => sum + e.marks, 0);
                const hasMarks = evals.some(e => e.marks !== null);
                const evaluator = evals.find(e => e.marks !== null)?.submittedBy;
                return (
                  <div key={stage} style={{
                    marginBottom: 12, padding: 16, borderRadius: 8,
                    background: hasMarks ? 'rgba(22,163,74,0.05)' : 'var(--color-surface-container-low)',
                    border: `1px solid ${hasMarks ? 'var(--color-success)' : 'var(--color-outline-variant)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{stage.replace('_', ' ')}</span>
                        {evaluator && (
                          <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginLeft: 8 }}>
                            by {evaluator.firstName} {evaluator.lastName}
                          </span>
                        )}
                      </div>
                      <span style={{ fontWeight: 700, color: hasMarks ? 'var(--color-primary)' : 'var(--color-on-surface-variant)', fontSize: 20 }}>
                        {hasMarks ? stageMarks : '—'}
                      </span>
                    </div>
                    {!hasMarks && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>Not yet evaluated</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header"><h3>Supervisor Feedback</h3></div>
              {['PROPOSAL', 'MID_TERM', 'FINAL'].map(stage => {
                const feedbacks = evalsByStage(stage).filter(e => e.comment);
                return (
                  <div key={stage} style={{ marginBottom: 12, padding: 16, borderRadius: 8, background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)' }}>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize', display: 'block', marginBottom: 8 }}>{stage.replace('_', ' ')}</span>
                    {feedbacks.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>No feedback yet</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {feedbacks.map(f => (
                          <div key={f.id} style={{ padding: 10, borderRadius: 6, background: 'var(--color-surface-container)', border: '1px solid var(--color-outline-variant)' }}>
                            <p style={{ margin: 0, fontSize: 14 }}>{f.comment}</p>
                            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                              — {f.submittedBy?.firstName} {f.submittedBy?.lastName}, {new Date(f.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}

export default StudentMarksFeedback;
