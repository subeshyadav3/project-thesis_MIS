import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';

function CoordinatorDashboard() {
  const [stats, setStats] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    api.get('/stats').then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <div className="app-layout">
      <Sidebar user={user} />
      <div className="main-content">
        <div className="page-header"><h1>Coordinator Dashboard</h1><p>Manage projects, theses, and evaluations</p></div>
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-number">{stats?.totalGroups || 0}</div><div className="stat-label">Bachelor Groups</div></div>
          <div className="stat-card"><div className="stat-number">{stats?.totalTheses || 0}</div><div className="stat-label">Master's Theses</div></div>
          <div className="stat-card"><div className="stat-number">{stats?.pendingGroups || 0}</div><div className="stat-label">Pending Assignments</div></div>
          <div className="stat-card"><div className="stat-number">{stats?.activeGroups || 0}</div><div className="stat-label">Active Projects</div></div>
          <div className="stat-card"><div className="stat-number">{stats?.completedGroups || 0}</div><div className="stat-label">Completed</div></div>
        </div>
      </div>
    </div>
  );
}

export default CoordinatorDashboard;
