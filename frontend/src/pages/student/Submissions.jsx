import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

function StudentSubmissions() {
  const [group, setGroup] = useState(null);
  const [thesis, setThesis] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/students/my-group').then(({ data }) => setGroup(data)).catch(() => {}),
      api.get('/students/my-thesis').then(({ data }) => setThesis(data)).catch(() => {}),
    ]).catch((err) => { toast.error(err.response?.data?.error || 'Failed to load data'); })
      .finally(() => setLoading(false));
  }, []);

  const assignment = group || thesis;

  return (
    <PageLayout title="My Submissions" subtitle="Document submission status" user={user}>
      {loading ? (
        <div className="loading-state"><span className="material-symbols-outlined">progress_activity</span><p>Loading...</p></div>
      ) : !assignment ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }}>folder_open</span>
          <p>You have not been assigned to any project or thesis yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header"><h3>Submitted Documents</h3></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Proposal', 'Mid-Term Report', 'Final Report'].map((doc, i) => {
                const hasDoc = assignment.proposals?.some(p => p.stage === doc.toUpperCase());
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: 8,
                    background: hasDoc ? 'var(--color-success-container)' : 'var(--color-surface-container-low)',
                    border: `1px solid ${hasDoc ? 'var(--color-success)' : 'var(--color-outline-variant)'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="material-symbols-outlined" style={{ color: hasDoc ? 'var(--color-success)' : 'var(--color-on-surface-variant)' }}>
                        {hasDoc ? 'check_circle' : 'schedule'}
                      </span>
                      <span style={{ fontWeight: 500 }}>{doc}</span>
                    </div>
                    <span className={`badge badge-${hasDoc ? 'completed' : 'pending'}`} style={{ fontSize: 11 }}><span className="dot" />{hasDoc ? 'Submitted' : 'Pending'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header"><h3>Submission Guidelines</h3></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: 20, marginTop: 2 }}>info</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Proposal Document</div>
                  <div style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>Submit your initial proposal document for review by your supervisor.</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: 20, marginTop: 2 }}>info</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Mid-Term Report</div>
                  <div style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>Submit your progress report at the mid-term stage.</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: 20, marginTop: 2 }}>info</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Final Report</div>
                  <div style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>Submit your final report before the defense.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default StudentSubmissions;
