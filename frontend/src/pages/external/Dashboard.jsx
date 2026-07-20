import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

function ExternalDashboard() {
  const [groups, setGroups] = useState([]);
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/external-examiners/groups').then(({ data }) => setGroups(data)),
      api.get('/external-examiners/theses').then(({ data }) => setTheses(data)),
    ]).catch((err) => {
      toast.error(err.response?.data?.error || 'Failed to load assignments');
    }).finally(() => setLoading(false));
  }, []);

  const totalAssigned = groups.length + theses.length;
  const evaluatedCount = [...groups, ...theses].filter(i => i.evaluations?.length > 0).length;

  return (
    <PageLayout title="External Examiner Dashboard" subtitle="Overview of projects and theses assigned for evaluation" user={user}>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">assignment_ind</span></div>
          <div className="stat-number">{totalAssigned}</div>
          <div className="stat-label">Total Assigned</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">pending_actions</span></div>
          <div className="stat-number">{totalAssigned - evaluatedCount}</div>
          <div className="stat-label">Pending Evaluation</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">check_circle</span></div>
          <div className="stat-number">{evaluatedCount}</div>
          <div className="stat-label">Evaluated</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 280 }}>
          <div className="card-header">
            <h3>Bachelor Projects</h3>
            <span className="badge" style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}>{groups.length}</span>
          </div>
          <div style={{ padding: '16px 0' }}>
            {loading ? (
              <div className="loading-state" style={{ padding: 20 }}>
                <span className="material-symbols-outlined">progress_activity</span>
              </div>
            ) : groups.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--color-outline)' }}>school</span>
                <p style={{ fontSize: 14 }}>No projects assigned</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {groups.slice(0, 5).map(g => (
                  <Link key={g.id} to={`/external/evaluate/group/${g.id}`} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 16px', borderRadius: 8, textDecoration: 'none',
                    background: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)',
                    border: '1px solid var(--color-outline-variant)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{g.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>{g.projectTitle}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge badge-${g.status?.toLowerCase() || 'pending'}`} style={{ fontSize: 11, padding: '2px 8px' }}>
                        <span className="dot" />{g.status || 'PENDING'}
                      </span>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-on-surface-variant)' }}>chevron_right</span>
                    </div>
                  </Link>
                ))}
                {groups.length > 5 && (
                  <Link to="/external/evaluations" style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none', textAlign: 'center', padding: 8
                  }}>View all {groups.length} projects →</Link>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 280 }}>
          <div className="card-header">
            <h3>Master's Theses</h3>
            <span className="badge" style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}>{theses.length}</span>
          </div>
          <div style={{ padding: '16px 0' }}>
            {loading ? (
              <div className="loading-state" style={{ padding: 20 }}>
                <span className="material-symbols-outlined">progress_activity</span>
              </div>
            ) : theses.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--color-outline)' }}>library_books</span>
                <p style={{ fontSize: 14 }}>No theses assigned</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {theses.slice(0, 5).map(t => (
                  <Link key={t.id} to={`/external/evaluate/thesis/${t.id}`} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 16px', borderRadius: 8, textDecoration: 'none',
                    background: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)',
                    border: '1px solid var(--color-outline-variant)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{t.student?.firstName} {t.student?.lastName}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>{t.title}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge badge-${t.status?.toLowerCase() || 'pending'}`} style={{ fontSize: 11, padding: '2px 8px' }}>
                        <span className="dot" />{t.status || 'PENDING'}
                      </span>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-on-surface-variant)' }}>chevron_right</span>
                    </div>
                  </Link>
                ))}
                {theses.length > 5 && (
                  <Link to="/external/evaluations" style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none', textAlign: 'center', padding: 8
                  }}>View all {theses.length} theses →</Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default ExternalDashboard;
