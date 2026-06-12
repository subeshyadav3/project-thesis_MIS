import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import api from '../../services/api';

function CoordinatorDashboard() {
  const [stats, setStats] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    api.get('/stats').then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <PageLayout title="Dashboard" user={user}>
      <div className="stats-grid">
        <div className="stat-card bento-card">
          <div className="stat-icon">
            <span className="material-symbols-outlined">groups</span>
          </div>
          <div className="stat-number">{stats?.totalGroups || 0}</div>
          <div className="stat-label">Bachelor Groups</div>
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
            <span className="material-symbols-outlined">pending_actions</span>
          </div>
          <div className="stat-number">{stats?.pendingGroups || 0}</div>
          <div className="stat-label">Pending Assignments</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div className="stat-number">{stats?.activeGroups || 0}</div>
          <div className="stat-label">Active Projects</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon">
            <span className="material-symbols-outlined">done_all</span>
          </div>
          <div className="stat-number">{stats?.completedGroups || 0}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginTop: 24 }}>
        <div className="stat-card bento-card" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/coordinator/bachelor-projects'}>
          <div className="stat-icon">
            <span className="material-symbols-outlined">school</span>
          </div>
          <div className="stat-number" style={{ fontSize: 18 }}>Manage Bachelor Projects</div>
          <div className="stat-label">View groups, assign supervisors</div>
        </div>
        <div className="stat-card bento-card" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/coordinator/master-thesis'}>
          <div className="stat-icon">
            <span className="material-symbols-outlined">library_books</span>
          </div>
          <div className="stat-number" style={{ fontSize: 18 }}>Manage Master's Thesis</div>
          <div className="stat-label">View theses, assign supervisors</div>
        </div>
        <div className="stat-card bento-card" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/coordinator/evaluations'}>
          <div className="stat-icon">
            <span className="material-symbols-outlined">grading</span>
          </div>
          <div className="stat-number" style={{ fontSize: 18 }}>Evaluations</div>
          <div className="stat-label">View marks, forward to exam dept</div>
        </div>
      </div>
    </PageLayout>
  );
}

export default CoordinatorDashboard;
