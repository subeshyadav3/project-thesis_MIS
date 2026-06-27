import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import api from '../../services/api';

function MaintainerDashboard() {
  const [stats, setStats] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    api.get('/stats').then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  const breakdowns = stats ? [
    { label: 'Total Users', value: (stats.totalStudents || 0) + (stats.totalSupervisors || 0) + (stats.totalCoordinators || 0), icon: 'people', color: '#6366f1' },
    { label: 'Active Groups', value: stats.activeGroups || 0, icon: 'check_circle', color: '#22c55e' },
    { label: 'Pending Groups', value: stats.pendingGroups || 0, icon: 'pending_actions', color: '#f59e0b' },
    { label: 'Completed Groups', value: stats.completedGroups || 0, icon: 'done_all', color: '#3b82f6' },
  ] : [];

  return (
    <PageLayout title="Dashboard" user={user}>
      <div className="page-header">
        <h1>
          <span className="material-symbols-outlined">dashboard</span>
          System Overview
        </h1>
        <p>Statistics and analytics for the Thesis/Project Management System of IOE</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card bento-card">
          <div className="stat-icon">
            <span className="material-symbols-outlined">groups</span>
          </div>
          <div className="stat-number">{stats?.totalGroups || 0}</div>
          <div className="stat-label">Project Groups</div>
        </div>

        <div className="stat-card bento-card">
          <div className="stat-icon">
            <span className="material-symbols-outlined">library_books</span>
          </div>
          <div className="stat-number">{stats?.totalTheses || 0}</div>
          <div className="stat-label">Master's Theses</div>
        </div>

        <div className="stat-card bento-card">
          <div className="stat-icon">
            <span className="material-symbols-outlined">person</span>
          </div>
          <div className="stat-number">{stats?.totalSupervisors || 0}</div>
          <div className="stat-label">Supervisors</div>
        </div>

        <div className="stat-card bento-card">
          <div className="stat-icon">
            <span className="material-symbols-outlined">admin_panel_settings</span>
          </div>
          <div className="stat-number">{stats?.totalCoordinators || 0}</div>
          <div className="stat-label">Coordinators</div>
        </div>

        <div className="stat-card bento-card">
          <div className="stat-icon">
            <span className="material-symbols-outlined">school</span>
          </div>
          <div className="stat-number">{stats?.totalStudents || 0}</div>
          <div className="stat-label">Students</div>
        </div>

        <div className="stat-card bento-card">
          <div className="stat-icon">
            <span className="material-symbols-outlined">pending_actions</span>
          </div>
          <div className="stat-number">{stats?.pendingGroups || 0}</div>
          <div className="stat-label">Pending Groups</div>
        </div>

        <div className="stat-card bento-card">
          <div className="stat-icon">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div className="stat-number">{stats?.activeGroups || 0}</div>
          <div className="stat-label">Active Groups</div>
        </div>

        <div className="stat-card bento-card">
          <div className="stat-icon">
            <span className="material-symbols-outlined">done_all</span>
          </div>
          <div className="stat-number">{stats?.completedGroups || 0}</div>
          <div className="stat-label">Completed Groups</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 32 }}>
        <div className="card-header">
          <h3>Detailed Breakdown</h3>
        </div>
        <div className="stats-grid stats-grid-breakdown">
          {breakdowns.map((item, i) => (
            <div key={i} className="stat-card bento-card">
              <div className="stat-icon" style={{ background: `${item.color}15`, color: item.color }}>
                <span className="material-symbols-outlined">{item.icon}</span>
              </div>
              <div className="stat-number">{item.value}</div>
              <div className="stat-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}

export default MaintainerDashboard;
