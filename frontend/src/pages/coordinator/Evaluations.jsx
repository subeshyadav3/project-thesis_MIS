import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

function Evaluations() {
  const toast = useToast();
  const [groups, setGroups] = useState([]);
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('bachelor');
  const [showForward, setShowForward] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/groups').then(({ data }) => setGroups(data)),
      api.get('/theses').then(({ data }) => setTheses(data)),
    ]).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { loadData(); }, []);

  const calcTotal = (evaluations = []) => {
    return evaluations.reduce((sum, e) => sum + (e.marks || 0), 0);
  };

  const handleForward = async () => {
    try {
      await api.post('/forward', { departmentName: 'Computer Science' });
      toast.success('Results forwarded to Exam Department successfully');
      setShowForward(false);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      const cleanMsg = typeof msg === 'string' && msg.length > 120 ? msg.slice(0, 120) + '...' : msg;
      toast.error(cleanMsg || 'Failed to forward results. Server error occurred.');
    }
  };

  const items = viewMode === 'bachelor'
    ? groups.map(g => ({ id: g.id, name: g.name, project: g.projectTitle, members: g.members?.map(m => `${m.student.firstName} ${m.student.lastName}`).join(', '), supervisor: g.supervisor ? `${g.supervisor.firstName} ${g.supervisor.lastName}` : 'N/A', evaluations: g.evaluations, total: calcTotal(g.evaluations), status: g.status }))
    : theses.map(t => ({ id: t.id, name: `${t.student?.firstName} ${t.student?.lastName}`, project: t.title, members: `${t.student?.firstName} ${t.student?.lastName}`, supervisor: t.supervisor ? `${t.supervisor.firstName} ${t.supervisor.lastName}` : 'N/A', evaluations: t.evaluations, total: calcTotal(t.evaluations), status: t.status }));

  const completedCount = items.filter(i => i.status === 'COMPLETED').length;
  const pendingCount = items.filter(i => i.status !== 'COMPLETED').length;

  const actions = (
    <button className="btn btn-success" onClick={() => setShowForward(true)}>
      <span className="material-symbols-outlined">forward</span>
      Forward to Exam Dept
    </button>
  );

  return (
    <PageLayout title="Evaluations" user={user} actions={actions}>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">checklist</span></div>
          <div className="stat-number">{items.length}</div>
          <div className="stat-label">Total {viewMode === 'bachelor' ? 'Projects' : 'Theses'}</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">check_circle</span></div>
          <div className="stat-number">{completedCount}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">pending_actions</span></div>
          <div className="stat-number">{pendingCount}</div>
          <div className="stat-label">Pending</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="tabs" style={{ margin: 0, borderBottom: 'none' }}>
            <div className={`tab ${viewMode === 'bachelor' ? 'active' : ''}`} onClick={() => setViewMode('bachelor')}>
              <span className="material-symbols-outlined">school</span>
              Bachelor Projects
            </div>
            <div className={`tab ${viewMode === 'master' ? 'active' : ''}`} onClick={() => setViewMode('master')}>
              <span className="material-symbols-outlined">library_books</span>
              Master's Thesis
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <span className="material-symbols-outlined">progress_activity</span>
            <p>Loading evaluations...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">grading</span>
            <h3>No evaluations found</h3>
            <p>No {viewMode === 'bachelor' ? 'projects' : 'theses'} have been evaluated yet.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{viewMode === 'bachelor' ? 'Group' : 'Student'}</th>
                <th>Project / Thesis</th>
                <th>Members</th>
                <th>Supervisor</th>
                <th>Total Marks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td style={{ color: 'var(--color-on-surface-variant)' }}>{item.project}</td>
                  <td style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>{item.members}</td>
                  <td>{item.supervisor}</td>
                  <td>
                    <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-primary)' }}>
                      {item.total}
                    </span>
                    <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}> / 50</span>
                  </td>
                  <td>
                    <span className={`badge badge-${item.status?.toLowerCase() || 'pending'}`}>
                      <span className="dot" />
                      {item.status || 'PENDING'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForward && (
        <div className="modal-overlay" onClick={() => setShowForward(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon success">
                <span className="material-symbols-outlined">forward</span>
              </div>
              <div className="modal-header-text">
                <h2>Forward Results</h2>
                <p>This will send all completed evaluations to the Examination Department. This action cannot be undone.</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowForward(false)}>
                <span className="material-symbols-outlined">close</span>
                Cancel
              </button>
              <button className="btn btn-success" onClick={handleForward}>
                <span className="material-symbols-outlined">check</span>
                Confirm Forward
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default Evaluations;
