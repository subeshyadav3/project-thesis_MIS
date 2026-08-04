import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/ui';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import ErrorBoundary from '../../components/ErrorBoundary';
import api from '../../services/api';
import { getDeadlineInfo } from '../../utils/deadline';

function StudentProjects() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    api.get('/students/groups')
      .then(({ data }) => {
        setGroups(data);
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        u.studentType = 'bachelor';
        localStorage.setItem('user', JSON.stringify(u));
      })
      .catch(err => { toast.error(err.response?.data?.error || 'Failed to load projects'); setGroups([]); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <ErrorBoundary><PageLayout title="My Projects" user={user}>
        <div className="loading-state"><Icon name="progress_activity" className="material-symbols-outlined" /><p>Loading...</p></div>
      </PageLayout></ErrorBoundary>
    );
  }

  if (groups.length === 0) {
    return (
      <ErrorBoundary><PageLayout title="My Projects" user={user}>
        <div className="empty-state" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, margin: '0 auto 16px', background: 'var(--color-surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="group" className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--color-outline)' }} />
          </div>
          <h3>No Projects</h3>
          <p style={{ color: 'var(--color-on-surface-variant)', marginTop: 8 }}>You have not been assigned to any bachelor project groups yet.</p>
        </div>
      </PageLayout></ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary><PageLayout title="My Projects" subtitle={`${groups.length} project${groups.length > 1 ? 's' : ''} found`} user={user}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {groups.map(g => (
          <Link key={g.id} to={`/student/project/${g.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card hoverable-card" style={{
              marginBottom: 0,
            }}
            >
              <div className="card-header" style={{ border: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: g.status === 'COMPLETED' ? 'var(--color-success-container)' : g.status === 'ACTIVE' ? 'var(--color-primary-container)' : 'var(--color-surface-container)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={g.status === 'COMPLETED' ? 'checklist' : 'group'} className="material-symbols-outlined" style={{
                      color: g.status === 'COMPLETED' ? 'var(--color-on-success-container)' : g.status === 'ACTIVE' ? 'var(--color-on-primary-container)' : 'var(--color-on-surface)',
                      fontSize: 20,
                      fontVariationSettings: "'FILL' 1",
                    }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {g.projectTitle}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 2 }}>
                      {g.name} · {g.batch || '—'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`badge badge-${g.status?.toLowerCase() === 'active' ? 'active' : g.status?.toLowerCase() === 'completed' ? 'completed' : 'pending'}`}>
                    <span className="dot" />{g.status}
                  </span>
                  {g.announcement?.expirationDate && (() => {
                    const info = getDeadlineInfo(g.announcement.expirationDate);
                    if (!info) return null;
                    return g.announcement?.expirationDate ? (
                      <span className={`badge`} style={{
                        fontSize: 9, padding: '1px 6px', border: 'none',
                        background: info.expired ? 'var(--color-error-container)' : info.urgent ? 'var(--color-warning-container)' : 'var(--color-surface-container)',
                        color: info.expired ? 'var(--color-on-error-container)' : info.urgent ? 'var(--color-on-warning-container)' : 'var(--color-on-surface-variant)',
                      }}>
                        {info.label}
                      </span>
                    ) : null;
                  })()}
                  <Icon name="chevron_right" className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-on-surface-variant)' }} />
                </div>
              </div>
              <div style={{ padding: '4px 16px 12px', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                <span>{g.members?.length || 0} member{(g.members?.length || 0) !== 1 ? 's' : ''}</span>
                {g.supervisor && <span>Supervisor: {g.supervisor.firstName} {g.supervisor.lastName}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </PageLayout></ErrorBoundary>
  );
}

export default StudentProjects;
