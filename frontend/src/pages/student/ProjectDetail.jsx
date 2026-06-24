import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

function StudentProjectDetail() {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setLoading(true);
    api.get('/students/my-group')
      .then(({ data }) => setGroup(data))
      .catch((err) => { toast.error(err.response?.data?.error || 'Failed to load project'); })
      .finally(() => setLoading(false));
  }, []);

  const safeMembers = (g) => (g?.members || []).filter(m => m.student);

  return (
    <PageLayout title="My Project" subtitle="Bachelor project details" user={user}>
      {loading ? (
        <div className="loading-state"><span className="material-symbols-outlined">progress_activity</span><p>Loading...</p></div>
      ) : !group ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }}>school</span>
          <p>You have not been assigned to any project group.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div className="card" style={{ flex: 1, minWidth: 280, marginBottom: 0 }}>
              <div className="card-header">
                <h3>{group.name}</h3>
                <span className={`badge badge-${group.status?.toLowerCase() || 'pending'}`}><span className="dot" />{group.status}</span>
              </div>
              <div className="detail-grid">
                <div className="detail-item"><span className="detail-label">Project Title</span><span style={{ fontWeight: 600 }}>{group.projectTitle}</span></div>
                <div className="detail-item"><span className="detail-label">Group</span><span>{group.name}</span></div>
                <div className="detail-item"><span className="detail-label">Supervisor</span><span>{group.supervisor ? `${group.supervisor.firstName} ${group.supervisor.lastName}` : <span className="badge badge-pending"><span className="dot" />Unassigned</span>}</span></div>
                <div className="detail-item"><span className="detail-label">Academic Year</span><span>{group.academicYear?.year || '—'}</span></div>
                <div className="detail-item"><span className="detail-label">Status</span><span className={`badge badge-${group.status?.toLowerCase() || 'pending'}`}><span className="dot" />{group.status}</span></div>
              </div>
            </div>

            <div className="card" style={{ flex: 1, minWidth: 280, marginBottom: 0 }}>
              <div className="card-header"><h3>Members</h3></div>
              {safeMembers(group).length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}><p>No members assigned.</p></div>
              ) : (
                <table className="detail-table">
                  <thead><tr><th>Student</th><th>Roll Number</th><th>Email</th></tr></thead>
                  <tbody>
                    {safeMembers(group).map((m, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{m.student?.firstName || ''} {m.student?.lastName || ''}</td>
                        <td style={{ color: 'var(--color-on-surface-variant)' }}>{m.rollNumber || '—'}</td>
                        <td style={{ wordBreak: 'break-all', fontSize: 13 }}>{m.student?.email || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header"><h3>Evaluations</h3></div>
            {group.evaluations?.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}><p>No evaluations yet.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {group.evaluations.map(e => (
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

export default StudentProjectDetail;
