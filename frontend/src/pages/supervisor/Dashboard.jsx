import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

function SupervisorDashboard() {
  const [groups, setGroups] = useState([]);
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/supervisors/groups').then(({ data }) => setGroups(data)),
      api.get('/supervisors/theses').then(({ data }) => setTheses(data)),
    ]).catch((err) => {
      toast.error(err.response?.data?.error || 'Failed to load data');
    }).finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout title="Supervisor Dashboard" subtitle="Your assigned projects and theses" user={user}>
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">groups</span></div>
          <div className="stat-number">{groups.length}</div>
          <div className="stat-label">Bachelor Groups</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">library_books</span></div>
          <div className="stat-number">{theses.length}</div>
          <div className="stat-label">Master's Theses</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">supervisor_account</span></div>
          <div className="stat-number">{groups.length + theses.length}</div>
          <div className="stat-label">Total Assignments</div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <span className="material-symbols-outlined">progress_activity</span>
          <p>Loading your assignments...</p>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="card-header">
              <h3>Bachelor Project Groups ({groups.length})</h3>
            </div>
            {groups.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <span className="material-symbols-outlined">groups</span>
                <h3>No groups assigned</h3>
                <p>You haven't been assigned to any bachelor project groups yet.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Project Title</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(g => (
                    <tr key={g.id}>
                      <td>
                        <Link to={`/supervisor/project/group/${g.id}`} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                            {g.name}
                          </div>
                        </Link>
                      </td>
                      <td style={{ color: 'var(--color-on-surface-variant)' }}>{g.projectTitle}</td>
                      <td>
                        <span className={`badge badge-${g.status?.toLowerCase() || 'pending'}`}>
                          <span className="dot" />
                          {g.status || 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-header">
              <h3>Master's Theses ({theses.length})</h3>
            </div>
            {theses.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <span className="material-symbols-outlined">library_books</span>
                <h3>No theses assigned</h3>
                <p>You haven't been assigned to supervise any master's theses yet.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Project Title</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {theses.map(t => (
                    <tr key={t.id}>
                      <td>
                        <Link to={`/supervisor/project/thesis/${t.id}`} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                            {t.student?.firstName} {t.student?.lastName}
                          </div>
                        </Link>
                      </td>
                      <td style={{ color: 'var(--color-on-surface-variant)' }}>{t.title}</td>
                      <td>
                        <span className={`badge badge-${t.status?.toLowerCase() || 'pending'}`}>
                          <span className="dot" />
                          {t.status || 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </PageLayout>
  );
}

export default SupervisorDashboard;
