import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import ErrorBoundary from '../../components/ErrorBoundary';

function MaintainerDashboard() {
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/stats').then(({ data }) => setStats(data)),
      api.get('/departments').then(({ data }) => setDepartments(data)),
      api.get('/departments/programs').then(({ data }) => setPrograms(data)),
      api.get('/users/audit-logs', { params: { limit: 8, offset: 0 } }).then(({ data }) => {
        if (data.success) setRecentLogs(data.data.logs);
      }),
    ])
      .catch(() => toast.error('Failed to load maintainer dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  const totalUsers = useMemo(() => {
    if (!stats) return 0;
    return (stats.totalStudents || 0) + (stats.totalSupervisors || 0) + (stats.totalCoordinators || 0);
  }, [stats]);

  const totalProjects = useMemo(() => {
    if (!stats) return 0;
    return (stats.totalGroups || 0) + (stats.totalTheses || 0);
  }, [stats]);

  const activeProjects = useMemo(() => {
    if (!stats) return 0;
    return (stats.activeGroups || 0) + (stats.activeTheses || 0);
  }, [stats]);

  const pendingProjects = useMemo(() => {
    if (!stats) return 0;
    return (stats.pendingGroups || 0) + (stats.pendingTheses || 0);
  }, [stats]);

  const completedProjects = useMemo(() => {
    if (!stats) return 0;
    return (stats.completedGroups || 0) + (stats.completedTheses || 0);
  }, [stats]);

  const actionColors = {
    CREATE: 'var(--color-success-container)',
    UPDATE: 'var(--color-primary-container)',
    DELETE: 'var(--color-error-container)',
    DEACTIVATE: 'var(--color-error-container)',
    ACTIVATE: 'var(--color-success-container)',
    LOGIN: 'var(--color-primary-container)',
    LOGIN_FAILED: 'var(--color-error-container)',
    SUBMIT_MARKS: 'var(--color-success-container)',
  };

  const actionOnColors = {
    CREATE: 'var(--color-on-success-container)',
    UPDATE: 'var(--color-on-primary-container)',
    DELETE: 'var(--color-on-error-container)',
    DEACTIVATE: 'var(--color-on-error-container)',
    ACTIVATE: 'var(--color-on-success-container)',
    LOGIN: 'var(--color-on-primary-container)',
    LOGIN_FAILED: 'var(--color-on-error-container)',
    SUBMIT_MARKS: 'var(--color-on-success-container)',
  };

  return (
    <ErrorBoundary>
      <PageLayout title="System Administration" user={user}>
        {/* Welcome Header */}
        <div className="page-header" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                <Icon name="admin_panel_settings" className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--color-primary)' }} />
                System Administration & Overview
              </h1>
              <p style={{ margin: '6px 0 0 0', color: 'var(--color-on-surface-variant)' }}>
                System-wide metrics, department health, user rosters, and activity logs across Pulchowk Campus IOE
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/maintainer/users" className="btn btn-secondary btn-sm">
                <Icon name="groups" className="material-symbols-outlined" />
                Manage Users
              </Link>
              <Link to="/maintainer/departments" className="btn btn-primary btn-sm">
                <Icon name="account_balance" className="material-symbols-outlined" />
                Departments & Programs
              </Link>
            </div>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="stats-grid" style={{ marginBottom: 28 }}>
          <div className="stat-card bento-card">
            <div className="stat-icon" style={{ background: 'var(--color-primary-container)', color: 'var(--color-primary)' }}>
              <Icon name="people" className="material-symbols-outlined" />
            </div>
            <div className="stat-number">{totalUsers}</div>
            <div className="stat-label">Total Users</div>
          </div>

          <div className="stat-card bento-card">
            <div className="stat-icon" style={{ background: 'var(--color-tertiary-container)', color: 'var(--color-tertiary)' }}>
              <Icon name="folder" className="material-symbols-outlined" />
            </div>
            <div className="stat-number">{totalProjects}</div>
            <div className="stat-label">Total Projects & Theses</div>
          </div>

          <div className="stat-card bento-card">
            <div className="stat-icon" style={{ background: 'var(--color-success-container)', color: 'var(--color-success)' }}>
              <Icon name="check_circle" className="material-symbols-outlined" />
            </div>
            <div className="stat-number">{activeProjects}</div>
            <div className="stat-label">Active Lifecycle</div>
          </div>

          <div className="stat-card bento-card">
            <div className="stat-icon" style={{ background: 'var(--color-warning-container)', color: 'var(--color-warning)' }}>
              <Icon name="pending_actions" className="material-symbols-outlined" />
            </div>
            <div className="stat-number">{pendingProjects}</div>
            <div className="stat-label">Pending Reviews</div>
          </div>

          <div className="stat-card bento-card">
            <div className="stat-icon" style={{ background: 'var(--color-secondary-container)', color: 'var(--color-secondary)' }}>
              <Icon name="done_all" className="material-symbols-outlined" />
            </div>
            <div className="stat-number">{completedProjects}</div>
            <div className="stat-label">Graduated / Completed</div>
          </div>
        </div>

        {/* Academic Breakdown Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 28 }}>
          {/* User Distribution */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="badge" className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }} />
                User Directory Distribution
              </h3>
              <Link to="/maintainer/users" style={{ fontSize: 13, color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                View Directory →
              </Link>
            </div>
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--color-outline-variant)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-on-surface)' }}>
                  <Icon name="school" className="material-symbols-outlined" style={{ fontSize: 20, color: '#3b82f6' }} />
                  Students (Bachelor & Master)
                </span>
                <span style={{ fontWeight: 600 }}>{stats?.totalStudents || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--color-outline-variant)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-on-surface)' }}>
                  <Icon name="supervisor_account" className="material-symbols-outlined" style={{ fontSize: 20, color: '#10b981' }} />
                  Supervisors & Faculty
                </span>
                <span style={{ fontWeight: 600 }}>{stats?.totalSupervisors || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--color-outline-variant)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-on-surface)' }}>
                  <Icon name="admin_panel_settings" className="material-symbols-outlined" style={{ fontSize: 20, color: '#6366f1' }} />
                  Program Coordinators
                </span>
                <span style={{ fontWeight: 600 }}>{stats?.totalCoordinators || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-on-surface)' }}>
                  <Icon name="rate_review" className="material-symbols-outlined" style={{ fontSize: 20, color: '#f59e0b' }} />
                  Supervisor Allocation Status
                </span>
                <span style={{ fontWeight: 600, color: stats?.supervisorAssignmentPending > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                  {stats?.supervisorAssignmentPending || 0} Pending / {stats?.supervisorAssignmentAccepted || 0} Active
                </span>
              </div>
            </div>
          </div>

          {/* Academic Projects Distribution */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="school" className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }} />
                Academic Degree Workflows
              </h3>
              <Link to="/maintainer/departments" style={{ fontSize: 13, color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                Manage Programs →
              </Link>
            </div>
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--color-outline-variant)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-on-surface)' }}>
                  <Icon name="group_work" className="material-symbols-outlined" style={{ fontSize: 20, color: '#06b6d4' }} />
                  Bachelor Minor Projects (3rd Year)
                </span>
                <span style={{ fontWeight: 600 }}>{stats?.minorGroups || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--color-outline-variant)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-on-surface)' }}>
                  <Icon name="engineering" className="material-symbols-outlined" style={{ fontSize: 20, color: '#8b5cf6' }} />
                  Bachelor Major Projects (4th Year)
                </span>
                <span style={{ fontWeight: 600 }}>{stats?.majorGroups || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--color-outline-variant)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-on-surface)' }}>
                  <Icon name="library_books" className="material-symbols-outlined" style={{ fontSize: 20, color: '#ec4899' }} />
                  Master Theses (MSCSK, MSICE, MSDSA, MSNCS)
                </span>
                <span style={{ fontWeight: 600 }}>{stats?.totalTheses || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-on-surface)' }}>
                  <Icon name="account_balance" className="material-symbols-outlined" style={{ fontSize: 20, color: '#14b8a6' }} />
                  Configured Departments / Programs
                </span>
                <span style={{ fontWeight: 600 }}>
                  {departments.length} Depts / {programs.length} Programs
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Department Overview & Quick Status */}
        <div className="card" style={{ marginBottom: 28 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="account_balance" className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }} />
              Academic Department Directory
            </h3>
            <Link to="/maintainer/departments" className="btn btn-outline btn-sm">
              <Icon name="tune" className="material-symbols-outlined" />
              Manage All
            </Link>
          </div>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>Loading departments...</div>
          ) : departments.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>No departments configured.</div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Department Name</th>
                    <th>Code</th>
                    <th>Head Coordinator</th>
                    <th>Affiliated Programs</th>
                    <th>Academic Years</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept.id}>
                      <td style={{ fontWeight: 600 }}>{dept.name}</td>
                      <td>
                        <span className="badge badge-primary">
                          <span className="dot" />
                          {dept.code}
                        </span>
                      </td>
                      <td>
                        {dept.coordinator ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Icon name="person" className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-primary)' }} />
                            {dept.coordinator.firstName} {dept.coordinator.lastName}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>
                      <td>
                        {dept.programs?.length ? (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {dept.programs.map((p) => (
                              <span key={p.id} className="badge badge-inactive" style={{ fontSize: 11 }}>
                                {p.code} ({p.degreeType || 'DEGREE'})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-on-surface-variant)' }}>0 programs</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--color-on-surface-variant)' }}>{dept.academicYears?.length || 0} batches</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Audit Activity */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="history" className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }} />
              System Activity & Audit Trail
            </h3>
            <Link to="/maintainer/audit-log" className="btn btn-outline btn-sm">
              <Icon name="visibility" className="material-symbols-outlined" />
              View Full Audit Log
            </Link>
          </div>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>Loading audit records...</div>
          ) : recentLogs.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>No activity logs recorded yet.</div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Details</th>
                    <th>Initiator</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: actionColors[log.action] || 'var(--color-surface-container)',
                            color: actionOnColors[log.action] || 'var(--color-on-surface)',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {log.entity}
                        {log.entityId ? ` #${log.entityId}` : ''}
                      </td>
                      <td style={{ maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.details || '-'}
                      </td>
                      <td>{log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : 'System'}</td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--color-on-surface-variant)', fontSize: 13 }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PageLayout>
    </ErrorBoundary>
  );
}

export default MaintainerDashboard;
