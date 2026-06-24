import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import api from '../../services/api';

function StudentTheses() {
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setLoading(true);
    api.get('/students/theses')
      .then(({ data }) => {
        setTheses(data);
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        u.studentType = 'master';
        localStorage.setItem('user', JSON.stringify(u));
      })
      .catch(() => setTheses([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageLayout title="My Theses" user={user}>
        <div className="loading-state"><span className="material-symbols-outlined">progress_activity</span><p>Loading...</p></div>
      </PageLayout>
    );
  }

  if (theses.length === 0) {
    return (
      <PageLayout title="My Theses" user={user}>
        <div className="empty-state" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, margin: '0 auto 16px', background: 'var(--color-surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--color-outline)' }}>library_books</span>
          </div>
          <h3>No Theses</h3>
          <p style={{ color: 'var(--color-on-surface-variant)', marginTop: 8 }}>You have no master's theses assigned.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="My Theses" subtitle={`${theses.length} thesis${theses.length > 1 ? 'es' : ''}`} user={user}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {theses.map(t => (
          <Link key={t.id} to={`/student/thesis/${t.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card" style={{
              cursor: 'pointer', transition: 'all 0.15s', marginBottom: 0,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div className="card-header" style={{ border: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: t.status === 'COMPLETED' ? 'var(--color-success-container)' : t.status === 'ACTIVE' ? 'var(--color-primary-container)' : 'var(--color-surface-container)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-outlined" style={{
                      color: t.status === 'COMPLETED' ? 'var(--color-on-success-container)' : t.status === 'ACTIVE' ? 'var(--color-on-primary-container)' : 'var(--color-on-surface)',
                      fontSize: 20,
                      fontVariationSettings: "'FILL' 1",
                    }}>
                      {t.status === 'COMPLETED' ? 'checklist' : 'library_books'}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 2 }}>
                      {t.academicYear?.year || '—'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`badge badge-${t.status?.toLowerCase() === 'active' ? 'active' : t.status?.toLowerCase() === 'completed' ? 'completed' : 'pending'}`}>
                    <span className="dot" />{t.status}
                  </span>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-on-surface-variant)' }}>chevron_right</span>
                </div>
              </div>
              <div style={{ padding: '4px 16px 12px', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                {t.supervisor && <span>Supervisor: {t.supervisor.firstName} {t.supervisor.lastName}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </PageLayout>
  );
}

export default StudentTheses;
