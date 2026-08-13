import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import SupervisionActions from '../../components/SupervisionActions';

function statusColor(s) {
  if (s === 'COMPLETED') return 'var(--color-success)';
  if (s === 'ACTIVE') return 'var(--color-primary)';
  return 'var(--color-warning)';
}

function SupervisorDashboard() {
  const [groups, setGroups] = useState([]);
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      api.get('/supervisors/groups').then(({ data }) => setGroups(data)).catch(() => []),
      api.get('/supervisors/theses').then(({ data }) => setTheses(data)).catch(() => []),
    ]).catch((err) => {
      toast.error(err.response?.data?.error || 'Failed to load assignments');
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const allItems = [...groups, ...theses];
  const totalAssigned = allItems.length;
  const completedCount = allItems.filter((i) => i.status === 'COMPLETED').length;
  const pendingCount = allItems.filter((i) => i.status === 'ACTIVE' || i.status === 'PENDING').length;
  const pendingSupervision = allItems.filter((i) => i.supervisorAssignmentStatus === 'PENDING');

  // Items that likely need supervisor attention
  const actionItems = allItems
    .filter((i) => i.status === 'PENDING' || i.status === 'ACTIVE')
    .slice(0, 6);

  const title = (i) => i.title || i.topic || i.groupTitle || (i.groups && i.groups[0]?.title) || 'Assignment';

  return (
    <PageLayout title="Supervisor Dashboard" subtitle="Overview of your assignments" user={user}>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card bento-card">
          <div className="stat-icon"><Icon name="assignment_ind" className="material-symbols-outlined" /></div>
          <div className="stat-number">{totalAssigned}</div>
          <div className="stat-label">Total Assigned</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><Icon name="pending_actions" className="material-symbols-outlined" /></div>
          <div className="stat-number">{pendingCount}</div>
          <div className="stat-label">Pending Evaluations</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><Icon name="check_circle" className="material-symbols-outlined" /></div>
          <div className="stat-number">{completedCount}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
        {/* Pending supervision acceptance */}
        {pendingSupervision.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3>Pending Assignments</h3>
              <span className="badge badge-warning">{pendingSupervision.length} awaiting response</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px 16px' }}>
              {pendingSupervision.map((item) => {
                const isThesis = !!item.studentId;
                const itemTitle = isThesis ? item.title : (item.projectTitle || item.name);
                const studentName = isThesis
                  ? (item.student ? `${item.student.firstName} ${item.student.lastName}` : 'A student')
                  : (item.members?.[0]?.student ? `${item.members[0].student.firstName} ${item.members[0].student.lastName}` : 'A student');
                return (
                  <div key={`${isThesis ? 't' : 'g'}-${item.id}`} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                    padding: '11px 14px', border: '1px solid var(--color-outline-variant)', borderRadius: 'var(--border-radius-md)',
                    background: 'var(--color-surface-container-lowest)',
                  }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{itemTitle}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>
                        {isThesis ? 'Master Thesis' : 'Bachelor Project'} · Student: {studentName}
                      </div>
                    </div>
                    <SupervisionActions item={item} type={isThesis ? 'thesis' : 'group'} onDone={loadAll} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action required */}
        <div className="card">
          <div className="card-header">
            <h3>Action Required</h3>
            {pendingCount > 0 && (
              <span className="badge" style={{ background: 'var(--color-warning-container)', color: 'var(--color-on-warning-container)' }}>
                {pendingCount} pending
              </span>
            )}
          </div>
          {loading ? (
            <div className="loading-state" style={{ padding: 20 }}>
              <Icon name="progress_activity" className="material-symbols-outlined spin" />
            </div>
          ) : actionItems.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <Icon name="check" className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--color-success)', marginBottom: 6 }} />
              <p>Nothing requires your attention</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {actionItems.map((item) => {
                const s = item.status || 'PENDING';
                const to = (item.degreeType === 'MASTER' || item.thesisType === 'master')
                  ? '/supervisor/master' : '/supervisor/bachelor';
                return (
                  <Link
                    key={item.id}
                    to={to}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
                      border: '1px solid var(--color-outline-variant)', borderRadius: 'var(--border-radius-md)',
                      background: 'var(--color-surface-container-lowest)', textDecoration: 'none',
                      transition: 'border-color .15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-outline-variant)')}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(s), flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {title(item)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>
                        {s === 'PENDING' ? 'Awaiting your review' : 'Evaluation in progress'}
                      </div>
                    </div>
                    <span className="badge" style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)', fontSize: 10 }}>
                      {s}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default SupervisorDashboard;
