import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '../../components/ui';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import SearchInput from '../../components/SearchInput';
import ErrorBoundary from '../../components/ErrorBoundary';

const ASSIGN_LABELS = {
  PENDING: { label: 'Awaiting acceptance', cls: 'warning' },
  ACCEPTED: { label: 'Accepted', cls: 'completed' },
  REJECTED: { label: 'Declined — reassign', cls: 'danger' },
};

function SupervisorAssignments() {
  const [items, setItems] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [assignFor, setAssignFor] = useState({}); // itemId -> supervisorId being selected
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isMaster = user.program?.degreeType === 'MASTER';
  const itemType = isMaster ? 'thesis' : 'group';

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get(isMaster ? '/theses' : '/groups').then(({ data }) => {
        setItems(data);
        const initial = {};
        data.forEach(t => { initial[t.id] = t.supervisorId ? String(t.supervisorId) : ''; });
        setAssignFor(initial);
      }).catch(() => { toast.error('Failed to load items'); setItems([]); }),
      api.get('/users/role/supervisor?all=true').then(({ data }) => setSupervisors(data)).catch(() => setSupervisors([])),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [isMaster]);

  const filtered = useMemo(() => {
    return items.filter(t => {
      const studentName = isMaster
        ? `${t.student?.firstName || ''} ${t.student?.lastName || ''}`
        : (t.members || []).map(m => `${m.student?.firstName || ''} ${m.student?.lastName || ''}`).join(' ');
      const title = isMaster ? t.title : (t.projectTitle || t.name);
      const matchesSearch = !searchTerm || `${studentName} ${title}`.toLowerCase().includes(searchTerm.toLowerCase());
      const st = t.supervisorAssignmentStatus || 'NONE';
      const matchesStatus = statusFilter === 'ALL' || st === statusFilter || (statusFilter === 'UNASSIGNED' && !t.supervisorId);
      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, statusFilter, isMaster]);

  const handleAssign = async (item) => {
    const supervisorId = assignFor[item.id];
    if (!supervisorId) { toast.warning('Select a supervisor first'); return; }
    setSavingId(item.id);
    try {
      await api.put(`${isMaster ? '/theses' : '/groups'}/${item.id}/supervisor`, { supervisorId: Number(supervisorId) });
      toast.success('Supervisor assigned');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign');
    } finally {
      setSavingId(null);
    }
  };

  const statusOptions = [
    { value: 'UNASSIGNED', label: 'Unassigned' },
    { value: 'PENDING', label: 'Awaiting acceptance' },
    { value: 'ACCEPTED', label: 'Accepted' },
    { value: 'REJECTED', label: 'Declined' },
  ];

  const countBy = (key) => {
    if (key === 'UNASSIGNED') return items.filter(t => !t.supervisorId).length;
    return items.filter(t => t.supervisorAssignmentStatus === key).length;
  };

  return (
    <ErrorBoundary>
      <PageLayout
        title="Supervisor Assignments"
        subtitle={isMaster ? "Assign supervisors to master theses" : "Assign supervisors to bachelor projects"}
        user={user}
      >
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card bento-card">
            <div className="stat-icon"><Icon name="library_books" className="material-symbols-outlined" /></div>
            <div className="stat-number">{items.length}</div>
            <div className="stat-label">Total {isMaster ? 'Theses' : 'Projects'}</div>
          </div>
          <div className="stat-card bento-card">
            <div className="stat-icon" style={{ background: 'var(--color-error-container)', color: 'var(--color-on-error-container)' }}><Icon name="person_off" className="material-symbols-outlined" /></div>
            <div className="stat-number">{countBy('UNASSIGNED')}</div>
            <div className="stat-label">Unassigned</div>
          </div>
          <div className="stat-card bento-card">
            <div className="stat-icon" style={{ background: 'var(--color-warning-container)', color: 'var(--color-on-warning-container)' }}><Icon name="schedule" className="material-symbols-outlined" /></div>
            <div className="stat-number">{countBy('PENDING')}</div>
            <div className="stat-label">Awaiting Acceptance</div>
          </div>
          <div className="stat-card bento-card">
            <div className="stat-icon" style={{ background: 'var(--color-error-container)', color: 'var(--color-on-error-container)' }}><Icon name="block" className="material-symbols-outlined" /></div>
            <div className="stat-number">{countBy('REJECTED')}</div>
            <div className="stat-label">Declined</div>
          </div>
        </div>

        <div className="card">
          <div className="table-container">
            <div className="table-toolbar">
              <div className="table-toolbar-left">
                <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder={isMaster ? 'Search student or thesis title...' : 'Search members or project title...'} />
              </div>
              <div className="table-toolbar-right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="ALL">All Assignments</option>
                  {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="loading-state"><Icon name="progress_activity" className="material-symbols-outlined spin" /><p>Loading...</p></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <Icon name="supervisor_account" className="material-symbols-outlined" />
                <h3>No items</h3>
                <p>No {isMaster ? 'theses' : 'projects'} match your filters.</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Student(s)</th>
                    <th>{isMaster ? 'Thesis Title' : 'Project Title'}</th>
                    <th>Supervisor</th>
                    <th>Assignment Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const st = t.supervisorAssignmentStatus || 'NONE';
                    const ass = ASSIGN_LABELS[st] || { label: t.supervisorId ? 'Assigned' : 'Unassigned', cls: t.supervisorId ? 'info' : 'pending' };
                    const studentName = isMaster
                      ? (t.student ? `${t.student.firstName} ${t.student.lastName} (${t.student.rollNumber || ''})` : '—')
                      : (t.members || []).map(m => `${m.student?.firstName || ''} ${m.student?.lastName || ''}`).join(', ') || '—';
                    const title = isMaster ? t.title : (t.projectTitle || t.name);
                    const showAssign = st === 'PENDING' || st === 'REJECTED' || !t.supervisorId;
                    return (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 500 }}>{studentName}</td>
                        <td style={{ color: 'var(--color-on-surface-variant)' }}>{title}</td>
                        <td>
                          {t.supervisor ? (
                            <span style={{ fontSize: 13 }}>{t.supervisor.firstName} {t.supervisor.lastName}</span>
                          ) : (
                            <span className="badge badge-pending">Unassigned</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge badge-${ass.cls}`}><span className="dot" />{ass.label}</span>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {showAssign && (
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                              <select
                                value={assignFor[t.id] || ''}
                                onChange={e => setAssignFor(prev => ({ ...prev, [t.id]: e.target.value }))}
                                style={{ maxWidth: 200 }}
                              >
                                <option value="">Select supervisor...</option>
                                {supervisors.map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.firstName} {s.lastName}{s.role === 'COORDINATOR' ? ' (Coordinator)' : ''}
                                  </option>
                                ))}
                              </select>
                              <button className="btn btn-sm btn-primary" disabled={savingId === t.id} onClick={() => handleAssign(t)}>
                                <Icon name="supervisor_account" className="material-symbols-outlined" />
                                {savingId === t.id ? '...' : st === 'REJECTED' ? 'Reassign' : 'Assign'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </PageLayout>
    </ErrorBoundary>
  );
}

export default SupervisorAssignments;