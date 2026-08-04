import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/ui';
import PageLayout from '../../components/PageLayout';
import api from '../../services/api';

function CoordinatorDashboard() {
  const [stats, setStats] = useState(null);
  const [program, setProgram] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isMaster = program?.degreeType === 'MASTER';

  useEffect(() => {
    api.get('/stats').then(({ data }) => setStats(data)).catch(() => {});
    // Use the existing /auth/me endpoint which already includes program info for coordinators
    api.get('/auth/me').then(({ data }) => setProgram(data.program || null)).catch(() => {});
  }, []);

  const degreeLabel = isMaster ? "Master's" : 'Bachelor';

  const bachelorCards = [
    { icon: 'groups', value: stats?.totalGroups || 0, label: 'Total Groups' },
    { icon: 'star', value: stats?.minorGroups || 0, label: 'Minor Projects' },
    { icon: 'stars', value: stats?.majorGroups || 0, label: 'Major Projects' },
    { icon: 'pending_actions', value: stats?.pendingGroups || 0, label: 'Pending' },
    { icon: 'check_circle', value: stats?.activeGroups || 0, label: 'Active' },
    { icon: 'done_all', value: stats?.completedGroups || 0, label: 'Completed' },
  ];

  const masterCards = [
    { icon: 'library_books', value: stats?.totalTheses || 0, label: "Master's Theses" },
    { icon: 'pending_actions', value: stats?.pendingTheses || 0, label: 'Pending Theses' },
    { icon: 'check_circle', value: stats?.activeTheses || 0, label: 'Active' },
    { icon: 'done_all', value: stats?.completedTheses || 0, label: 'Completed' },
  ];

  const statCards = isMaster ? masterCards : bachelorCards;

  if (!stats) {
    return (
      <PageLayout title="Dashboard" subtitle={`${degreeLabel} Program Overview`} user={user}>
        <div className="stats-grid">
          {(isMaster ? masterCards : bachelorCards).map((_, i) => (
            <div key={i} className="stat-card bento-card">
              <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 'var(--border-radius-md)', marginBottom: 16 }} />
              <div className="skeleton" style={{ width: 64, height: 32, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: 90, height: 14 }} />
            </div>
          ))}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Dashboard" subtitle={`${degreeLabel} Program Overview`} user={user}>
      <div className="stats-grid">
        {statCards.map((card, i) => (
          <div key={i} className="stat-card bento-card">
            <div className="stat-icon">
              <Icon name={card.icon} className="material-symbols-outlined" />
            </div>
            <div className="stat-number">{card.value}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}

export default CoordinatorDashboard;
