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
            <span className="material-symbols-outlined">star</span>
          </div>
          <div className="stat-number">{stats?.minorGroups || 0}</div>
          <div className="stat-label">Minor Projects</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon">
            <span className="material-symbols-outlined">stars</span>
          </div>
          <div className="stat-number">{stats?.majorGroups || 0}</div>
          <div className="stat-label">Major Projects</div>
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
    </PageLayout>
  );
}

export default CoordinatorDashboard;
