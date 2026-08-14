import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Icon } from '../../components/ui';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import Pagination from '../../components/Pagination';
import ErrorBoundary from '../../components/ErrorBoundary';
import ConfirmDialog from '../../components/ConfirmDialog';
import EvaluationPdfPreview from '../../components/EvaluationPdfPreview';
import SearchInput from '../../components/SearchInput';
import SupervisionActions from '../../components/SupervisionActions';
import { TableSkeleton } from '../../components/Skeleton';

const PAGE_SIZE = 10;

function SupervisorBachelorProjects() {
  const toast = useToast();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(null);
  const [pdfPreviewItem, setPdfPreviewItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState({ open: false });
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadData = useCallback(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    setLoading(true);
    api.get('/supervisors/groups', { signal })
      .then(({ data }) => setGroups(data))
      .catch((err) => { if (err.name !== 'CanceledError') toast.error(err.response?.data?.error || 'Failed to load data'); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const searchStr = (
        g.name + ' ' +
        g.projectTitle + ' ' +
        (g.members || []).map(m => `${m.student?.firstName || ''} ${m.student?.lastName || ''}`).join(' ')
      ).toLowerCase();
      const matchesSearch = !searchTerm || searchStr.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [groups, searchTerm, statusFilter]);

  const sortedGroups = useMemo(() => {
    return [...filteredGroups].sort((a, b) => {
      if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
      if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;
      return a.id - b.id;
    });
  }, [filteredGroups]);

  const totalPages = Math.ceil(sortedGroups.length / PAGE_SIZE);
  const paginatedGroups = sortedGroups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const completedCount = groups.filter(g => g.status === 'COMPLETED').length;
  const activeCount = groups.filter(g => g.status !== 'COMPLETED').length;
  const safeMembers = (g) => (g.members || []).filter(m => m.student);

  const statusOptions = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'OVERDUE', label: 'Overdue' },
    { value: 'COMPLETED', label: 'Completed' },
  ];

  const FilterDropdown = ({ value, onChange, label, options, allLabel }) => (
    <div className="filter-item">
      <label>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="ALL">{allLabel || `All ${label}s`}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <>
    <ErrorBoundary><PageLayout title="Bachelor Projects" subtitle="Your assigned project groups" user={user}>
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <Icon name="school" className="material-symbols-outlined" />
              </div>
              <div className="modal-header-text">
                <h2>{showDetail.name}</h2>
                <p>{showDetail.projectTitle}</p>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className={`badge badge-${showDetail.status?.toLowerCase() || 'pending'}`}>
                    <span className="dot" />
                    {showDetail.status || 'PENDING'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Type</span>
                  <span className={`badge badge-${showDetail.projectType === 'MAJOR' ? 'warning' : 'info'}`}>
                    <span className="dot" />
                    {showDetail.projectType === 'MAJOR' ? 'Major' : 'Minor'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Batch</span>
                  <span>{showDetail.batch || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Created</span>
                  <span>{showDetail.createdAt ? new Date(showDetail.createdAt).toLocaleDateString() : '—'}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4 className="detail-section-title">Members</h4>
              <table className="detail-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll Number</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {safeMembers(showDetail).length === 0 ? (
                    <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', padding: 16 }}>No members</td></tr>
                  ) : (
                    safeMembers(showDetail).map((m, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                              {m.student?.firstName?.[0] || ''}{m.student?.lastName?.[0] || ''}
                            </div>
                            {m.student?.firstName || ''} {m.student?.lastName || ''}
                          </div>
                        </td>
                        <td>{m.rollNumber || '—'}</td>
                        <td style={{ wordBreak: 'break-all' }}>{m.student?.email || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowDetail(null)}>
                <Icon name="close" className="material-symbols-outlined" />
                Close
              </button>
              <button className="btn btn-outline" onClick={() => { setPdfPreviewItem(showDetail); setShowDetail(null); }}>
                <Icon name="picture_as_pdf" className="material-symbols-outlined" />
                PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card bento-card">
          <div className="stat-icon"><Icon name="groups" className="material-symbols-outlined" /></div>
          <div className="stat-number">{groups.length}</div>
          <div className="stat-label">Total Groups</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><Icon name="pending_actions" className="material-symbols-outlined" /></div>
          <div className="stat-number">{activeCount}</div>
          <div className="stat-label">Active / Pending</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><Icon name="check_circle" className="material-symbols-outlined" /></div>
          <div className="stat-number">{completedCount}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      {groups.filter(g => g.supervisorAssignmentStatus === 'PENDING').length > 0 && (
        <div className="card" style={{ marginBottom: 24, border: '1px solid var(--color-warning-border, #f59e0b)', background: 'var(--color-warning-container-low, #fffbeb)', padding: 18, borderRadius: 'var(--border-radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="assignment_ind" className="material-symbols-outlined" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#92400e' }}>
                  Pending Supervision Requests ({groups.filter(g => g.supervisorAssignmentStatus === 'PENDING').length})
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: '#b45309' }}>
                  A coordinator has assigned you as project supervisor for the following group(s). Please review and accept or decline.
                </p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {groups.filter(g => g.supervisorAssignmentStatus === 'PENDING').map(g => (
              <div key={g.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
                padding: '14px 16px', background: '#ffffff', borderRadius: 'var(--border-radius-md)', border: '1px solid #fde68a',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{g.name}: {g.projectTitle}</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span><strong>Members:</strong> {(g.members || []).map(m => `${m.student?.firstName || ''} ${m.student?.lastName || ''}`).filter(Boolean).join(', ') || '—'}</span>
                    {g.batch && <span><strong>Batch:</strong> {g.batch}</span>}
                  </div>
                </div>
                <SupervisionActions item={g} type="group" onDone={loadData} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search groups, members, titles..." />
          </div>
          <div className="table-toolbar-right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="font-label text-xs font-semibold text-on-surface-variant">{sortedGroups.length} groups</span>
          </div>
        </div>

        <div className="filter-bar">
          <FilterDropdown label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} allLabel="All Statuses" />
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : sortedGroups.length === 0 ? (
          <div className="empty-state">
            <Icon name="school" className="material-symbols-outlined" />
            <h3>No groups assigned</h3>
            <p>{searchTerm || statusFilter !== 'ALL' ? 'Try adjusting your filters or search.' : "You haven't been assigned any bachelor project groups yet."}</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Project Title</th>
                  <th>Type</th>
                  <th>Members</th>
                  <th>Status</th>
                  <th>Batch</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedGroups.map(g => (
                  <tr key={g.id} onClick={() => navigate(`/supervisor/project/group/${g.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="default-badge">{g.name?.slice(0, 2).toUpperCase()}</div>
                        <span style={{ fontWeight: 500 }}>{g.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-on-surface-variant)' }}>{g.projectTitle}</td>
                    <td>
                      <span className={`badge badge-${g.projectType === 'MAJOR' ? 'warning' : 'info'}`} style={{ fontSize: 11 }}>
                        <span className="dot" />
                        {g.projectType === 'MAJOR' ? 'Major' : 'Minor'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>
                        {safeMembers(g).map(m => `${m.student?.firstName || ''} ${m.student?.lastName || ''}`).join(', ') || '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${g.status?.toLowerCase() || 'pending'}`}>
                        <span className="dot" />
                        {g.status || 'PENDING'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>
                      {g.batch || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {g.supervisorAssignmentStatus === 'PENDING' && (
                          <SupervisionActions item={g} type="group" onDone={loadData} />
                        )}
                        <button className="btn btn-sm btn-outline" onClick={() => setShowDetail(g)}>
                          <Icon name="visibility" className="material-symbols-outlined" />
                          View
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); setPdfPreviewItem(g); }}>
                          <Icon name="picture_as_pdf" className="material-symbols-outlined" />
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-footer">
              <span className="font-label text-xs text-on-surface-variant table-footer-info">
                {sortedGroups.length > 0
                  ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, sortedGroups.length)} of ${sortedGroups.length}`
                  : '0 results'}
              </span>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </>
        )}
      </div>
    </PageLayout></ErrorBoundary>
      {pdfPreviewItem && (
        <EvaluationPdfPreview type="group" id={pdfPreviewItem.id} onClose={() => setPdfPreviewItem(null)} onSave={loadData} />
      )}
    </>
  );
}

export default SupervisorBachelorProjects;
