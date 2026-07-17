import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import PageLayout from '../../components/PageLayout';
import SearchInput from '../../components/SearchInput';
import { TableSkeleton } from '../../components/Skeleton';
import Pagination from '../../components/Pagination';
import { useToast } from '../../contexts/ToastContext';
import ErrorBoundary from '../../components/ErrorBoundary';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const limit = 50;
  const toast = useToast();

  const loadLogs = () => {
    setLoading(true);
    const params = { limit, offset: (page - 1) * limit };
    if (entityFilter) params.entity = entityFilter;
    if (actionFilter) params.action = actionFilter;
    api.get('/users/audit-logs', { params })
      .then(({ data }) => {
        if (data.success) {
          setLogs(data.data.logs);
          setTotal(data.data.total);
        }
      })
      .catch(err => toast.error('Failed to load audit logs'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const c = new AbortController();
    loadLogs();
    return () => c.abort();
  }, [page, entityFilter, actionFilter]);

  const actionColors = {
    CREATE: 'var(--color-success)',
    UPDATE: 'var(--color-primary)',
    DELETE: 'var(--color-error)',
    DEACTIVATE: 'var(--color-error)',
    ACTIVATE: 'var(--color-success)',
    UPLOAD: 'var(--color-tertiary)',
    LOGIN: 'var(--color-primary)',
    LOGIN_FAILED: 'var(--color-error)',
    LOGOUT: 'var(--color-secondary)',
    CHANGE_PASSWORD: 'var(--color-warning)',
    RESET_PASSWORD: 'var(--color-warning)',
    SUBMIT_MARKS: 'var(--color-success)',
    UPDATE_MARKS: 'var(--color-primary)',
    SUBMIT_FEEDBACK: 'var(--color-tertiary)',
    VIEW: 'var(--color-secondary)',
    FORWARD: 'var(--color-success)',
    ASSIGN_SUPERVISOR: 'var(--color-primary)',
    BULK_ASSIGN_SUPERVISOR: 'var(--color-secondary)',
    ASSIGN_EXAMINER: 'var(--color-primary)',
    REMOVE: 'var(--color-error)',
    UPDATE_STATUS: 'var(--color-warning)',
    ISSUE_RECOMMENDATION: 'var(--color-tertiary)',
    COMPLETE_EVALUATION: 'var(--color-success)',
  };

  return (
    <ErrorBoundary>
      <PageLayout title="Audit Log">
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <SearchInput value={entityFilter} onChange={setEntityFilter} placeholder="Filter by entity..." style={{ maxWidth: 240 }} />
            <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-outline)', background: 'var(--color-surface)', color: 'var(--color-on-surface)', fontSize: 13, maxWidth: 180 }}>
              <option value="">All actions</option>
              {Object.keys(actionColors).map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
            <span style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>{total} entries</span>
          </div>
          {loading ? (
            <TableSkeleton rows={8} cols={4} />
          ) : logs.length === 0 ? (
            <div className="empty-state"><span className="material-symbols-outlined" style={{ fontSize: 48 }}>history</span><p>No audit logs found</p></div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Details</th>
                    <th>Performed By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td><span className="badge" style={{ background: actionColors[log.action] || 'var(--color-surface-container)', color: '#fff' }}>{log.action}</span></td>
                      <td>{log.entity}{log.entityId ? ` #${log.entityId}` : ''}</td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details || '-'}</td>
                      <td>{log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : 'System'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
            <Pagination currentPage={page} totalPages={Math.ceil(total / limit)} onPageChange={setPage} />
          </div>
        </div>
      </PageLayout>
    </ErrorBoundary>
  );
}
