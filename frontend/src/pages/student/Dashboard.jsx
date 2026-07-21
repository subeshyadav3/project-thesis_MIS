import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import ErrorBoundary from '../../components/ErrorBoundary';
import api from '../../services/api';

function StudentDashboard() {
  const [groups, setGroups] = useState([]);
  const [theses, setTheses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isBachelor = user.degreeType === 'BACHELOR';
  const isMaster = user.degreeType === 'MASTER';

  useEffect(() => {
    setLoading(true);
    const promises = [];
    if (!isMaster) {
      promises.push(
        api.get('/students/groups').then(({ data }) => { setGroups(data); return data; }).catch(() => [])
      );
    }
    if (!isBachelor) {
      promises.push(
        api.get('/students/theses').then(({ data }) => { setTheses(data); return data; }).catch(() => [])
      );
    }
    promises.push(
      api.get('/students/notifications').then(({ data }) => setNotifications(data)).catch(() => {})
    );
    Promise.all(promises).then(() => {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (isBachelor) u.studentType = 'bachelor';
      else if (isMaster) u.studentType = 'master';
      else u.studentType = 'unassigned';
      localStorage.setItem('user', JSON.stringify(u));
    }).catch(() => {
      toast.error('Failed to load data');
    }).finally(() => setLoading(false));
  }, []);

  const all = [...groups, ...theses];
  const completed = all.filter(a => a.status === 'COMPLETED').length;
  const active = all.filter(a => a.status === 'ACTIVE' || a.status === 'PENDING').length;
  const unread = notifications.filter(n => !n.read).length;

  return (
    <ErrorBoundary><PageLayout title="Student Dashboard" subtitle={`${all.length} assignment${all.length !== 1 ? 's' : ''} total`} user={user}>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">assignment</span></div>
          <div className="stat-number">{all.length}</div>
          <div className="stat-label">Total Assignments</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">check_circle</span></div>
          <div className="stat-number">{completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">pending_actions</span></div>
          <div className="stat-number">{active}</div>
          <div className="stat-label">Working / Pending</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">notifications</span></div>
          <div className="stat-number">{unread}</div>
          <div className="stat-label">Unread Notifications</div>
        </div>
      </div>

      {/* Projects list */}
      {loading ? (
        <div className="loading-state" style={{ padding: 20 }}>
          <span className="material-symbols-outlined">progress_activity</span>
        </div>
      ) : (
        <>
          {groups.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <h3>Bachelor Projects ({groups.length})</h3>
                <Link to="/student/projects" className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: 12, textDecoration: 'none' }}>
                  View All
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {groups.slice(0, 3).map(g => (
                  <Link key={g.id} to={`/student/project/${g.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{
                      padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
                      borderBottom: '1px solid var(--color-outline-variant)',
                      transition: 'background 0.15s', cursor: 'pointer',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-container)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: g.status === 'COMPLETED' ? 'var(--color-success)' : g.status === 'ACTIVE' ? 'var(--color-primary)' : 'var(--color-outline)',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {g.projectTitle}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>
                          {g.name} · {g.batch || '—'}
                        </div>
                      </div>
                      <span className={`badge badge-${g.status?.toLowerCase() === 'active' ? 'active' : g.status?.toLowerCase() === 'completed' ? 'completed' : 'pending'}`} style={{ fontSize: 10 }}>
                        <span className="dot" />{g.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {theses.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <h3>Master's Theses ({theses.length})</h3>
                <Link to="/student/theses" className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: 12, textDecoration: 'none' }}>
                  View All
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {theses.slice(0, 3).map(t => (
                  <Link key={t.id} to={`/student/thesis/${t.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{
                      padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
                      borderBottom: '1px solid var(--color-outline-variant)',
                      transition: 'background 0.15s', cursor: 'pointer',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-container)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: t.status === 'COMPLETED' ? 'var(--color-success)' : t.status === 'ACTIVE' ? 'var(--color-primary)' : 'var(--color-outline)',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>
                          {t.batch ? `Batch ${t.batch}` : '—'}
                        </div>
                      </div>
                      <span className={`badge badge-${t.status?.toLowerCase() === 'active' ? 'active' : t.status?.toLowerCase() === 'completed' ? 'completed' : 'pending'}`} style={{ fontSize: 10 }}>
                        <span className="dot" />{t.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Notifications */}
          <div className="card">
            <div className="card-header">
              <h3>Notifications</h3>
              {unread > 0 && (
                <span className="badge" style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}>
                  {unread} unread
                </span>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--color-outline)' }}>notifications_off</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {notifications.slice(0, 5).map(n => (
                  <div key={n.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
                    background: n.read ? 'transparent' : 'var(--color-primary-container)',
                    opacity: n.read ? 0.6 : 1,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-on-surface-variant)' }}>
                      {n.read ? 'check_circle' : 'notifications'}
                    </span>
                    <div style={{ flex: 1, fontSize: 13 }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>
                      {new Date(n.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {notifications.length > 5 && (
                  <Link to="/student/notifications" style={{ padding: '8px 16px', fontSize: 12, color: 'var(--color-primary)', textDecoration: 'none', textAlign: 'center' }}>
                    View all notifications
                  </Link>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </PageLayout></ErrorBoundary>
  );
}

export default StudentDashboard;
