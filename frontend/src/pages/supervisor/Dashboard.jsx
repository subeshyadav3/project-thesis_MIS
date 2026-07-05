import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

function SupervisorDashboard() {
  const [groups, setGroups] = useState([]);
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/supervisors/groups').then(({ data }) => setGroups(data)),
      api.get('/supervisors/theses').then(({ data }) => setTheses(data)),
    ]).catch((err) => {
      toast.error(err.response?.data?.error || 'Failed to load assignments');
    }).finally(() => setLoading(false));
  }, []);

  const allItems = [...groups, ...theses];
  const totalAssigned = allItems.length;
  const completedCount = allItems.filter(i => i.status === 'COMPLETED').length;
  const pendingCount = allItems.filter(i => i.status === 'ACTIVE' || i.status === 'PENDING').length;

  return (
    <PageLayout title="Supervisor Dashboard" subtitle="Overview of your assignments" user={user}>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">assignment_ind</span></div>
          <div className="stat-number">{totalAssigned}</div>
          <div className="stat-label">Total Assigned</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">pending_actions</span></div>
          <div className="stat-number">{pendingCount}</div>
          <div className="stat-label">Pending Evaluations</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">check_circle</span></div>
          <div className="stat-number">{completedCount}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>
    </PageLayout>
  );
}

export default SupervisorDashboard;