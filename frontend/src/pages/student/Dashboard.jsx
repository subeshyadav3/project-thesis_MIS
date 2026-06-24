import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

function StudentDashboard() {
  const [myGroup, setMyGroup] = useState(null);
  const [myThesis, setMyThesis] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setLoading(true);
    let foundGroup = null;
    let foundThesis = null;
    Promise.all([
      api.get('/students/my-group').then(({ data }) => { foundGroup = data; setMyGroup(data); }).catch(() => {}),
      api.get('/students/my-thesis').then(({ data }) => { foundThesis = data; setMyThesis(data); }).catch(() => {}),
      api.get('/students/notifications').then(({ data }) => setNotifications(data)).catch(() => {}),
    ]).catch((err) => {
      toast.error(err.response?.data?.error || 'Failed to load data');
    }).finally(() => {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (foundGroup) u.studentType = 'bachelor';
      else if (foundThesis) u.studentType = 'master';
      else u.studentType = 'unassigned';
      localStorage.setItem('user', JSON.stringify(u));
      setLoading(false);
    });
  }, []);

  const hasAssignment = myGroup || myThesis;
  const assignmentType = myGroup ? 'Bachelor Project' : myThesis ? "Master's Thesis" : null;
  const assignment = myGroup || myThesis;

  return (
    <PageLayout title="Student Dashboard" subtitle="Overview of your academic project/thesis" user={user}>
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">school</span></div>
          <div className="stat-number">{assignmentType || 'N/A'}</div>
          <div className="stat-label">Assignment Type</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">pending_actions</span></div>
          <div className="stat-number">{assignment?.status || 'PENDING'}</div>
          <div className="stat-label">Status</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">notifications</span></div>
          <div className="stat-number">{notifications.filter(n => !n.read).length}</div>
          <div className="stat-label">Unread Notifications</div>
        </div>
      </div>

      {/* Assignment Details & Supervisor */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
        {/* Left: My Project / Thesis */}
        <div className="card" style={{ flex: 2, minWidth: 280, marginBottom: 0 }}>
          <div className="card-header">
            <h3>My {assignmentType || 'Assignment'}</h3>
            <span className={`badge badge-${assignment?.status?.toLowerCase() || 'pending'}`}>
              <span className="dot" />
              {assignment?.status || 'PENDING'}
            </span>
          </div>
          {loading ? (
            <div className="loading-state" style={{ padding: 20 }}>
              <span className="material-symbols-outlined">progress_activity</span>
            </div>
          ) : !hasAssignment ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }}>school</span>
              <p>You have not been assigned to any project or thesis yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="detail-grid" style={{ marginBottom: 0 }}>
                <div className="detail-item">
                  <span className="detail-label">{myGroup ? 'Project Title' : 'Thesis Title'}</span>
                  <span style={{ fontWeight: 600 }}>{myGroup ? assignment.projectTitle : assignment.title}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">{myGroup ? 'Group' : 'Student'}</span>
                  <span>{myGroup ? assignment.name : `${user.firstName} ${user.lastName}`}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Supervisor</span>
                  <span>{assignment.supervisor ? `${assignment.supervisor.firstName} ${assignment.supervisor.lastName}` : <span className="badge badge-pending"><span className="dot" />Unassigned</span>}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Academic Year</span>
                  <span>{assignment.academicYear?.year || '—'}</span>
                </div>
              </div>
              <div style={{ paddingTop: 12, borderTop: '1px solid var(--color-outline-variant)' }}>
                <Link to="/student/assignment" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                  <span className="material-symbols-outlined">visibility</span>
                  View Details
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right: Supervisor Info & Quick Links */}
        <div style={{ width: 300, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header" style={{ paddingBottom: 12 }}>
              <h3>Supervisor</h3>
            </div>
            {assignment?.supervisor ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700
                }}>
                  {assignment.supervisor.firstName[0]}{assignment.supervisor.lastName[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{assignment.supervisor.firstName} {assignment.supervisor.lastName}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>{assignment.supervisor.email}</div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)' }}>No supervisor assigned yet.</p>
            )}
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header" style={{ paddingBottom: 12 }}>
              <h3>Quick Actions</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/student/submissions" className="btn btn-outline" style={{ justifyContent: 'flex-start', gap: 8 }}>
                <span className="material-symbols-outlined">upload_file</span>
                My Submissions
              </Link>
              <Link to="/student/marks" className="btn btn-outline" style={{ justifyContent: 'flex-start', gap: 8 }}>
                <span className="material-symbols-outlined">grading</span>
                View Marks
              </Link>
              <Link to="/student/feedback" className="btn btn-outline" style={{ justifyContent: 'flex-start', gap: 8 }}>
                <span className="material-symbols-outlined">chat</span>
                Feedback
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Notifications */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-header">
          <h3>Notifications</h3>
          <span className="badge" style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}>
            {notifications.filter(n => !n.read).length} unread
          </span>
        </div>
        {loading ? (
          <div className="loading-state" style={{ padding: 20 }}>
            <span className="material-symbols-outlined">progress_activity</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state" style={{ padding: 24 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--color-outline)' }}>notifications_off</span>
            <p>No notifications yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.slice(0, 5).map(n => (
              <div key={n.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 8,
                background: n.read ? 'transparent' : 'var(--color-primary-container)', opacity: n.read ? 0.7 : 1
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-on-surface-variant)' }}>
                  {n.read ? 'check_circle' : 'notifications'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{n.message}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                    {new Date(n.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {!n.read && <span className="badge badge-pending" style={{ fontSize: 10, padding: '2px 6px' }}><span className="dot" />New</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default StudentDashboard;
