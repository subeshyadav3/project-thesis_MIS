import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

function StudentThesisDetail() {
  const [thesis, setThesis] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setLoading(true);
    api.get('/students/my-thesis')
      .then(({ data }) => setThesis(data))
      .catch((err) => { toast.error(err.response?.data?.error || 'Failed to load thesis'); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout title="My Thesis" subtitle="Master's thesis details" user={user}>
      {loading ? (
        <div className="loading-state"><span className="material-symbols-outlined">progress_activity</span><p>Loading...</p></div>
      ) : !thesis ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }}>library_books</span>
          <p>You have not been assigned any thesis.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div className="card" style={{ flex: 1, minWidth: 280, marginBottom: 0 }}>
              <div className="card-header">
                <h3>{thesis.title}</h3>
                <span className={`badge badge-${thesis.status?.toLowerCase() || 'pending'}`}><span className="dot" />{thesis.status}</span>
              </div>
              <div className="detail-grid">
                <div className="detail-item"><span className="detail-label">Thesis Title</span><span style={{ fontWeight: 600 }}>{thesis.title}</span></div>
                <div className="detail-item"><span className="detail-label">Student</span><span>{thesis.student?.firstName} {thesis.student?.lastName}</span></div>
                <div className="detail-item"><span className="detail-label">Supervisor</span><span>{thesis.supervisor ? `${thesis.supervisor.firstName} ${thesis.supervisor.lastName}` : <span className="badge badge-pending"><span className="dot" />Unassigned</span>}</span></div>
                <div className="detail-item"><span className="detail-label">Academic Year</span><span>{thesis.academicYear?.year || '—'}</span></div>
                <div className="detail-item"><span className="detail-label">Status</span><span className={`badge badge-${thesis.status?.toLowerCase() || 'pending'}`}><span className="dot" />{thesis.status}</span></div>
              </div>
            </div>

            <div className="card" style={{ flex: 1, minWidth: 280, marginBottom: 0 }}>
              <div className="card-header"><h3>Student Information</h3></div>
              <div className="detail-grid">
                <div className="detail-item"><span className="detail-label">Name</span><span style={{ fontWeight: 600 }}>{thesis.student?.firstName} {thesis.student?.lastName}</span></div>
                <div className="detail-item"><span className="detail-label">Email</span><span>{thesis.student?.email || '—'}</span></div>
                <div className="detail-item"><span className="detail-label">User ID</span><span>{thesis.student?.id}</span></div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header"><h3>Evaluations</h3></div>
            {thesis.evaluations?.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}><p>No evaluations yet.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {thesis.evaluations.map(e => (
                  <div key={e.id} style={{ padding: 12, borderRadius: 8, background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{e.stage}</span>
                      {e.marks !== null && <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{e.marks}</span>}
                    </div>
                    {e.comment && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-on-surface-variant)' }}>{e.comment}</p>}
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>By {e.submittedBy?.firstName} {e.submittedBy?.lastName} — {new Date(e.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default StudentThesisDetail;
