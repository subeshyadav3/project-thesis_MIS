import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/ui';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import ErrorBoundary from '../../components/ErrorBoundary';
import SearchInput from '../../components/SearchInput';
import { TableSkeleton } from '../../components/Skeleton';

const ACTION_LABEL = {
  UPLOAD: 'Uploaded',
  VIEW: 'Viewed / Downloaded',
  DELETE_DOCUMENT: 'Deleted',
};

const ACTION_BADGE = {
  UPLOAD: 'badge-success',
  VIEW: 'badge-info',
  DELETE_DOCUMENT: 'badge-error',
};

function FileAudit() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const toast = useToast();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api.get('/files-audit', { params: { limit: 200 }, signal: controller.signal })
      .then(({ data }) => setEntries(data))
      .catch((err) => { if (err.name !== 'CanceledError') toast.error(err.response?.data?.error || 'Failed to load file audit log'); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const filtered = searchQuery
    ? entries.filter(e => {
        const q = searchQuery.toLowerCase();
        const name = e.performedBy ? `${e.performedBy.firstName} ${e.performedBy.lastName}`.toLowerCase() : '';
        const itemTitle = e.item?.title || e.item?.projectTitle || '';
        return name.includes(q) || itemTitle.toLowerCase().includes(q) || (e.details || '').toLowerCase().includes(q);
      })
    : entries;

  return (
    <ErrorBoundary>
      <PageLayout title="File Activity Log" subtitle="Document uploads, views and deletions with metadata" user={user}>
        <div style={{ marginBottom: 16 }}>
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by user, document, or item..." />
        </div>
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>User</th>
                  <th>Item</th>
                  <th>Document</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-on-surface-variant)' }}>No document activity recorded yet.</td></tr>
                ) : filtered.map(e => (
                  <tr key={e.id}>
                    <td><span className={`badge ${ACTION_BADGE[e.action] || 'badge-pending'}`} style={{ fontSize: 11 }}>{ACTION_LABEL[e.action] || e.action}</span></td>
                    <td style={{ fontWeight: 500 }}>
                      {e.performedBy ? `${e.performedBy.firstName} ${e.performedBy.lastName}` : '—'}
                      {e.performedBy?.role && <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>{e.performedBy.role.replace(/_/g, ' ').toLowerCase()}</div>}
                    </td>
                    <td>
                      {e.item ? (
                        <>
                          <div style={{ fontWeight: 500 }}>{e.item.title || e.item.projectTitle || e.item.name || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>{e.item.kind === 'thesis' ? 'Thesis' : 'Bachelor Project'}</div>
                        </>
                      ) : <span style={{ color: 'var(--color-on-surface-variant)' }}>—</span>}
                    </td>
                    <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>
                      {e.document ? (
                        <>
                          <div>{e.document.stage} · {e.document.documentType}</div>
                          <div style={{ fontSize: 11 }}>status: {e.document.status}</div>
                        </>
                      ) : '—'}
                    </td>
                    <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageLayout>
    </ErrorBoundary>
  );
}

export default FileAudit;
