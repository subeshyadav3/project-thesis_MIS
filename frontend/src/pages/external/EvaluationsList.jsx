import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

function ExternalEvaluationsList() {
  const [groups, setGroups] = useState([]);
  const [theses, setTheses] = useState([]);
  const [activeTab, setActiveTab] = useState('groups');
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/external-examiners/groups').then(({ data }) => setGroups(data)).catch(() => {}),
      api.get('/external-examiners/theses').then(({ data }) => setTheses(data)).catch(() => {}),
    ]).catch((err) => { toast.error(err.response?.data?.error || 'Failed to load data'); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout title="Assigned Evaluations" subtitle="Projects and theses assigned for evaluation" user={user}>
      {loading ? (
        <div className="loading-state"><span className="material-symbols-outlined">progress_activity</span></div>
      ) : (
        <>
          <div className="tabs" style={{ marginBottom: 24 }}>
            <div className={`tab ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => setActiveTab('groups')}>
              <span className="material-symbols-outlined">school</span> Bachelor Projects ({groups.length})
            </div>
            <div className={`tab ${activeTab === 'theses' ? 'active' : ''}`} onClick={() => setActiveTab('theses')}>
              <span className="material-symbols-outlined">library_books</span> Master's Theses ({theses.length})
            </div>
          </div>

          {activeTab === 'groups' ? (
            groups.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48 }}>school</span>
                <p>No bachelor projects assigned for evaluation.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Group</th>
                      <th>Project Title</th>
                      <th>Status</th>
                      <th>Members</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(g => (
                      <tr key={g.id}>
                        <td><div className="default-badge">{g.name?.slice(0, 2).toUpperCase()}</div><span style={{ fontWeight: 500 }}>{g.name}</span></td>
                        <td style={{ color: 'var(--color-on-surface-variant)' }}>{g.projectTitle}</td>
                        <td><span className={`badge badge-${g.status?.toLowerCase() || 'pending'}`}><span className="dot" />{g.status}</span></td>
                        <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>
                          {(g.members || []).filter(m => m.student).map(m => `${m.student.firstName} ${m.student.lastName}`).join(', ') || '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/external/evaluate/group/${g.id}`)}>
                            <span className="material-symbols-outlined">grading</span> Evaluate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            theses.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48 }}>library_books</span>
                <p>No master's theses assigned for evaluation.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Thesis Title</th>
                      <th>Status</th>
                      <th>Supervisor</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {theses.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 500 }}>{t.student?.firstName} {t.student?.lastName}</td>
                        <td style={{ color: 'var(--color-on-surface-variant)' }}>{t.title}</td>
                        <td><span className={`badge badge-${t.status?.toLowerCase() || 'pending'}`}><span className="dot" />{t.status}</span></td>
                        <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>{t.supervisor ? `${t.supervisor.firstName} ${t.supervisor.lastName}` : '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/external/evaluate/thesis/${t.id}`)}>
                            <span className="material-symbols-outlined">grading</span> Evaluate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </PageLayout>
  );
}

export default ExternalEvaluationsList;
