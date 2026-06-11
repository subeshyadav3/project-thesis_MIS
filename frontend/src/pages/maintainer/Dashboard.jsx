import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';

function MaintainerDashboard() {
  const [stats, setStats] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    api.get('/stats').then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <div className="app-layout">
      <Sidebar user={user} />
      <div className="main-content">
        <div className="page-header"><h1>Maintainer Dashboard</h1><p>System overview and statistics</p></div>
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-number">{stats?.totalGroups || 0}</div><div className="stat-label">Project Groups</div></div>
          <div className="stat-card"><div className="stat-number">{stats?.totalTheses || 0}</div><div className="stat-label">Master's Theses</div></div>
          <div className="stat-card"><div className="stat-number">{stats?.totalSupervisors || 0}</div><div className="stat-label">Supervisors</div></div>
          <div className="stat-card"><div className="stat-number">{stats?.totalCoordinators || 0}</div><div className="stat-label">Coordinators</div></div>
          <div className="stat-card"><div className="stat-number">{stats?.totalStudents || 0}</div><div className="stat-label">Students</div></div>
          <div className="stat-card"><div className="stat-number">{stats?.pendingGroups || 0}</div><div className="stat-label">Pending Groups</div></div>
          <div className="stat-card"><div className="stat-number">{stats?.activeGroups || 0}</div><div className="stat-label">Active Groups</div></div>
          <div className="stat-card"><div className="stat-number">{stats?.completedGroups || 0}</div><div className="stat-label">Completed Groups</div></div>
        </div>
      </div>
    </div>
  );
}

export default MaintainerDashboard;
