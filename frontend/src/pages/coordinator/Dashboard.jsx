import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Icon } from '../../components/ui';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

const STATUS_COLORS = { pending: '#f97316', active: '#4f46e5', completed: '#16a34a' };

function CoordinatorDashboard() {
  const [stats, setStats] = useState(null);
  const [program, setProgram] = useState(null);
  const [lateProposals, setLateProposals] = useState([]);
  const [mySupervisedTheses, setMySupervisedTheses] = useState([]);
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState(null);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isMaster = program?.degreeType === 'MASTER';

  const loadLate = () => {
    if (isMaster) {
      api.get('/proposals/pending').then(({ data }) => setLateProposals(data)).catch(() => setLateProposals([]));
    } else {
      setLateProposals([]);
    }
  };

  useEffect(() => {
    api.get('/stats').then(({ data }) => setStats(data)).catch(() => {});
    api.get('/auth/me').then(({ data }) => setProgram(data.program || null)).catch(() => {});
    api.get('/supervisors/theses').then(({ data }) => setMySupervisedTheses(data)).catch(() => setMySupervisedTheses([]));
  }, []);

  useEffect(() => { loadLate(); }, [isMaster]);

  const approveLate = async (proposal) => {
    setBusyId(proposal.id);
    try {
      await api.put(`/proposals/${proposal.id}/approve`);
      toast.success('Late proposal approved — now visible to evaluators');
      loadLate();
      api.get('/stats').then(({ data }) => setStats(data)).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve');
    } finally {
      setBusyId(null);
    }
  };

  const rejectLate = async (proposal) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setBusyId(proposal.id);
    try {
      await api.put(`/proposals/${proposal.id}/reject`, { reason: rejectReason.trim() });
      toast.success('Proposal rejected — student notified');
      setRejecting(null);
      setRejectReason('');
      loadLate();
      api.get('/stats').then(({ data }) => setStats(data)).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject');
    } finally {
      setBusyId(null);
    }
  };

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

  if (isMaster) {
    statCards.push(
      { icon: 'supervisor_account', value: stats?.supervisorAssignmentPending || 0, label: 'Supervisor Pending', warning: (stats?.supervisorAssignmentPending || 0) > 0 },
      { icon: 'fact_check', value: stats?.pendingLateProposals || 0, label: 'Late Proposals', warning: (stats?.pendingLateProposals || 0) > 0 },
    );
  }

  const pending = isMaster ? (stats?.pendingTheses || 0) : (stats?.pendingGroups || 0);
  const active = isMaster ? (stats?.activeTheses || 0) : (stats?.activeGroups || 0);
  const completed = isMaster ? (stats?.completedTheses || 0) : (stats?.completedGroups || 0);

  const chartData = [
    { name: 'Pending', value: pending, color: STATUS_COLORS.pending },
    { name: 'Active', value: active, color: STATUS_COLORS.active },
    { name: 'Completed', value: completed, color: STATUS_COLORS.completed },
  ].filter((d) => d.value > 0);

  const assignmentChartData = isMaster
    ? [
        { name: 'Accepted', value: stats?.supervisorAssignmentAccepted || 0, color: '#16a34a' },
        { name: 'Pending', value: stats?.supervisorAssignmentPending || 0, color: '#f97316' },
        { name: 'Declined', value: stats?.supervisorAssignmentRejected || 0, color: '#dc2626' },
      ].filter((d) => d.value > 0)
    : [];

  const actions = isMaster
    ? [
        { icon: 'library_books', title: 'Review Pending Theses', desc: pending + ' awaiting approval', to: '/coordinator/master' },
        { icon: 'grading', title: 'Manage Evaluations', desc: 'Assign & review defenses', to: '/coordinator/evaluations' },
        { icon: 'person', title: 'Assign Examiners', desc: 'Allocate examiners for defenses', to: '/coordinator/examiners' },
        { icon: 'campaign', title: 'Post Announcement', desc: 'Notify students & open thesis forms', to: '/coordinator/announcements' },
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
            <div className="stat-icon" style={card.warning ? { background: 'var(--color-warning-container)', color: 'var(--color-on-warning-container)' } : undefined}>
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

        {isMaster && assignmentChartData.length > 0 && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header"><h3>Supervisor Assignments</h3></div>
            <div style={{ flex: 1, minHeight: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={assignmentChartData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={42} outerRadius={72} paddingAngle={2} strokeWidth={0}>
                    {assignmentChartData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--color-surface-container-lowest)', border: '1px solid var(--color-outline-variant)', borderRadius: 8, color: 'var(--color-on-surface)', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', padding: '6px 0 4px' }}>
              {assignmentChartData.map((d) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                  {d.name} <b>{d.value}</b>
                </div>
              ))}
            </div>
          </div>
        )}

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

      {mySupervisedTheses.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>My Supervised Thesis Assignments ({mySupervisedTheses.length})</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Theses where you are assigned as supervisor</p>
            </div>
            <Link to="/supervisor/thesis" className="btn btn-sm btn-outline">Go to Supervisor Portal →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, padding: '0 16px 16px' }}>
            {mySupervisedTheses.slice(0, 4).map(t => (
              <div key={t.id} style={{
                padding: '14px 16px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-outline-variant)',
                background: 'var(--color-surface-container-lowest)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-on-surface)' }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>
                    Student: <strong>{t.student?.firstName} {t.student?.lastName}</strong> ({t.student?.rollNumber || '—'})
                  </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`badge badge-${t.status?.toLowerCase() || 'pending'}`} style={{ fontSize: 11 }}>{t.status}</span>
                  <Link to={`/supervisor/project/thesis/${t.id}`} style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>Manage Thesis →</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isMaster && lateProposals.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <h3>Late Proposals Awaiting Approval ({lateProposals.length})</h3>
            <span className="badge badge-warning">Submitted after the form deadline</span>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Student</th><th>Thesis Title</th><th>Submitted</th><th>PDF</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
              </thead>
              <tbody>
                {lateProposals.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.submittedBy?.firstName} {p.submittedBy?.lastName}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>{p.submittedBy?.rollNumber || ''} {p.submittedBy?.program?.code ? `· ${p.submittedBy.program.code}` : ''}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{p.thesis?.title || '—'}</td>
                    <td style={{ fontSize: 13 }}>{new Date(p.createdAt).toLocaleString()}</td>
                    <td>
                      {p.documentUrl ? (
                        <a href={p.documentUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline">
                          <Icon name="picture_as_pdf" className="material-symbols-outlined" /> View
                        </a>
                      ) : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-sm btn-primary" disabled={busyId === p.id} onClick={() => approveLate(p)}>
                          <Icon name="check_circle" className="material-symbols-outlined" /> Approve
                        </button>
                        <button className="btn btn-sm btn-outline" disabled={busyId === p.id} onClick={() => { setRejecting(p); setRejectReason(''); }}>
                          <Icon name="close" className="material-symbols-outlined" /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rejecting && (
        <div className="modal-overlay" onClick={() => setRejecting(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div className="modal-header-icon danger"><Icon name="block" className="material-symbols-outlined" /></div>
              <div className="modal-header-text">
                <h2>Reject Late Proposal</h2>
                <p>{rejecting.thesis?.title || 'Thesis'} — the student will be notified with your reason.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setRejecting(null)} aria-label="Close">
                <Icon name="close" className="material-symbols-outlined" />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reason <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <textarea className="form-input" rows={4} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why the late proposal cannot be accepted..." />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setRejecting(null)} disabled={busyId === rejecting.id}>Cancel</button>
              <button className="btn btn-danger" onClick={() => rejectLate(rejecting)} disabled={busyId === rejecting.id}>
                <Icon name="block" className="material-symbols-outlined" /> {busyId === rejecting.id ? 'Rejecting...' : 'Reject Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default CoordinatorDashboard;
