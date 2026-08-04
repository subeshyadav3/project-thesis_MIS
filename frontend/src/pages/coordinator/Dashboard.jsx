import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Icon } from '../../components/ui';
import PageLayout from '../../components/PageLayout';
import api from '../../services/api';

const STATUS_COLORS = { pending: '#f97316', active: '#4f46e5', completed: '#16a34a' };

function CoordinatorDashboard() {
  const [stats, setStats] = useState(null);
  const [program, setProgram] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isMaster = program?.degreeType === 'MASTER';

  useEffect(() => {
    api.get('/stats').then(({ data }) => setStats(data)).catch(() => {});
    api.get('/auth/me').then(({ data }) => setProgram(data.program || null)).catch(() => {});
  }, []);

  const degreeLabel = isMaster ? "Master's" : 'Bachelor';

  const statCards = isMaster
    ? [
        { icon: 'library_books', value: stats?.totalTheses || 0, label: "Master's Theses" },
        { icon: 'pending_actions', value: stats?.pendingTheses || 0, label: 'Pending' },
        { icon: 'check_circle', value: stats?.activeTheses || 0, label: 'Active' },
        { icon: 'done_all', value: stats?.completedTheses || 0, label: 'Completed' },
      ]
    : [
        { icon: 'groups', value: stats?.totalGroups || 0, label: 'Total Groups' },
        { icon: 'pending_actions', value: stats?.pendingGroups || 0, label: 'Pending' },
        { icon: 'check_circle', value: stats?.activeGroups || 0, label: 'Active' },
        { icon: 'done_all', value: stats?.completedGroups || 0, label: 'Completed' },
      ];

  const pending = isMaster ? (stats?.pendingTheses || 0) : (stats?.pendingGroups || 0);
  const active = isMaster ? (stats?.activeTheses || 0) : (stats?.activeGroups || 0);
  const completed = isMaster ? (stats?.completedTheses || 0) : (stats?.completedGroups || 0);

  const chartData = [
    { name: 'Pending', value: pending, color: STATUS_COLORS.pending },
    { name: 'Active', value: active, color: STATUS_COLORS.active },
    { name: 'Completed', value: completed, color: STATUS_COLORS.completed },
  ].filter((d) => d.value > 0);

  const actions = isMaster
    ? [
        { icon: 'library_books', title: 'Review Pending Theses', desc: pending + ' awaiting approval', to: '/coordinator/master' },
        { icon: 'grading', title: 'Manage Evaluations', desc: 'Assign & review defenses', to: '/coordinator/evaluations' },
        { icon: 'person', title: 'Assign Examiners', desc: 'Allocate examiners for defenses', to: '/coordinator/examiners' },
        { icon: 'campaign', title: 'Post Announcement', desc: 'Notify students & staff', to: '/coordinator/announcements' },
      ]
    : [
        { icon: 'groups', title: 'Review Pending Groups', desc: pending + ' awaiting approval', to: '/coordinator/bachelor' },
        { icon: 'supervisor_account', title: 'Assign Supervisors', desc: 'Allocate supervisors to groups', to: '/coordinator/supervisors' },
        { icon: 'person', title: 'Assign Examiners', desc: 'Allocate examiners for defenses', to: '/coordinator/examiners' },
        { icon: 'grading', title: 'Manage Evaluations', desc: 'Assign & review defenses', to: '/coordinator/evaluations' },
      ];

  if (!stats) {
    return (
      <PageLayout title="Dashboard" subtitle={degreeLabel + ' Program Overview'} user={user}>
        <div className="stats-grid">
          {statCards.map((_, i) => (
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
    <PageLayout title="Dashboard" subtitle={degreeLabel + ' Program Overview'} user={user}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'stretch' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header"><h3>Program Status Distribution</h3></div>
          <div style={{ flex: 1, minHeight: 220 }}>
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={52} outerRadius={82} paddingAngle={2} strokeWidth={0}>
                    {chartData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--color-surface-container-lowest)', border: '1px solid var(--color-outline-variant)', borderRadius: 8, color: 'var(--color-on-surface)', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>No data yet</p></div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap', padding: '10px 0 4px' }}>
            {chartData.map((d) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-on-surface)' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                {d.name} <b>{d.value}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Action Required</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {actions.map((a) => (
              <Link
                key={a.title}
                to={a.to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  border: '1px solid var(--color-outline-variant)', borderRadius: 'var(--border-radius-md)',
                  background: 'var(--color-surface-container-lowest)', textDecoration: 'none',
                  transition: 'border-color .15s, transform .15s, box-shadow .15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-outline-variant)'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 'var(--border-radius-md)', flexShrink: 0, background: 'var(--color-primary-container)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={a.icon} className="material-symbols-outlined" style={{ fontSize: 20 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-on-surface)' }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>{a.desc}</div>
                </div>
                <Icon name="chevron_right" className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-outline)' }} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default CoordinatorDashboard;
