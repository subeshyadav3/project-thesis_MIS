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

function SupervisorMasterThesis() {
  const toast = useToast();
  const navigate = useNavigate();
  const [theses, setTheses] = useState([]);
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
    Promise.all([
      api.get('/supervisors/theses', { signal }).then(({ data }) => setTheses(data)),

    ]).catch((err) => { if (err.name !== 'CanceledError') toast.error(err.response?.data?.error || 'Failed to load data'); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredTheses = useMemo(() => {
    return theses.filter(t => {
      const studentName = `${t.student?.firstName || ''} ${t.student?.lastName || ''}`;
      const searchStr = (studentName + ' ' + (t.title || '')).toLowerCase();
      const matchesSearch = !searchTerm || searchStr.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [theses, searchTerm, statusFilter]);

  const sortedTheses = useMemo(() => {
    return [...filteredTheses].sort((a, b) => {
      if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
      if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;
      return a.id - b.id;
    });
  }, [filteredTheses]);

  const totalPages = Math.ceil(sortedTheses.length / PAGE_SIZE);
  const paginatedTheses = sortedTheses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const completedCount = theses.filter(t => t.status === 'COMPLETED').length;
  const activeCount = theses.filter(t => t.status !== 'COMPLETED').length;

  const formatBatch = (t) => {
    return t?.batch || '—';
  };

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
    <ErrorBoundary><PageLayout title="Master's Thesis" subtitle="Your assigned theses" user={user}>
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <Icon name="library_books" className="material-symbols-outlined" />
              </div>
              <div className="modal-header-text">
                <h2>{showDetail.student?.firstName} {showDetail.student?.lastName}{showDetail.student?.rollNumber ? ` (${showDetail.student.rollNumber})` : ''}</h2>
                <p>{showDetail.title}</p>
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
                  <span className="badge badge-info">
                    <span className="dot" />
                    Thesis
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Academic Year</span>
                  <span>{showDetail.batch || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <span style={{ wordBreak: 'break-all' }}>{showDetail.student?.email || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Roll Number</span>
                  <span>{showDetail.student?.rollNumber || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Created</span>
                  <span>{showDetail.createdAt ? new Date(showDetail.createdAt).toLocaleDateString() : '—'}</span>
                </div>
              </div>
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
          <div className="stat-icon"><Icon name="library_books" className="material-symbols-outlined" /></div>
          <div className="stat-number">{theses.length}</div>
          <div className="stat-label">Total Theses</div>
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

      {theses.filter(t => t.supervisorAssignmentStatus === 'PENDING').length > 0 && (
        <div className="card" style={{ marginBottom: 24, border: '1px solid var(--color-warning-border, #f59e0b)', background: 'var(--color-warning-container-low, #fffbeb)', padding: 18, borderRadius: 'var(--border-radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="assignment_ind" className="material-symbols-outlined" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#92400e' }}>
                  Pending Supervision Requests ({theses.filter(t => t.supervisorAssignmentStatus === 'PENDING').length})
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: '#b45309' }}>
                  A coordinator has assigned you as thesis supervisor for the following student(s). Please review and accept or decline.
                </p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {theses.filter(t => t.supervisorAssignmentStatus === 'PENDING').map(t => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
                padding: '14px 16px', background: '#ffffff', borderRadius: 'var(--border-radius-md)', border: '1px solid #fde68a',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{t.title}</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span><strong>Student:</strong> {t.student?.firstName} {t.student?.lastName} ({t.student?.rollNumber || '—'})</span>
                    {t.cluster && <span><strong>Cluster:</strong> {t.cluster}</span>}
                    {t.batch && <span><strong>Batch:</strong> {t.batch}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <SupervisionActions item={t} type="thesis" onDone={loadData} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search by student name, title..." />
          </div>
          <div className="table-toolbar-right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="font-label text-xs font-semibold text-on-surface-variant">{sortedTheses.length} theses</span>
          </div>
        </div>

        <div className="filter-bar">
          <FilterDropdown label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} allLabel="All Statuses" />
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : sortedTheses.length === 0 ? (
          <div className="empty-state">
            <Icon name="library_books" className="material-symbols-outlined" />
            <h3>No theses assigned</h3>
            <p>{searchTerm || statusFilter !== 'ALL' ? 'Try adjusting your filters or search.' : "You haven't been assigned any master's theses yet."}</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll</th>
                  <th>Thesis Title</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Year</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTheses.map(t => (
                  <tr key={t.id} onClick={() => navigate(`/supervisor/project/thesis/${t.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="default-badge">
                          {t.student?.firstName?.[0] || ''}{t.student?.lastName?.[0] || ''}
                        </div>
                        <span style={{ fontWeight: 500 }}>{t.student?.firstName} {t.student?.lastName}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>{t.student?.rollNumber || '—'}</td>
                    <td style={{ color: 'var(--color-on-surface-variant)' }}>{t.title}</td>
                    <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13, wordBreak: 'break-all' }}>{t.student?.email || '—'}</td>
                    <td>
                      <span className={`badge badge-${t.status?.toLowerCase() || 'pending'}`}>
                        <span className="dot" />
                        {t.status || 'PENDING'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>
                      {t.batch ? `Batch ${t.batch}` : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {t.supervisorAssignmentStatus === 'PENDING' && (
                          <SupervisionActions item={t} type="thesis" onDone={loadData} />
                        )}
                        <button className="btn btn-sm btn-outline" onClick={() => setShowDetail(t)}>
                          <Icon name="visibility" className="material-symbols-outlined" />
                          View
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); setPdfPreviewItem(t); }}>
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
                {sortedTheses.length > 0
                  ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, sortedTheses.length)} of ${sortedTheses.length}`
                  : '0 results'}
              </span>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </>
        )}
      </div>
    </PageLayout></ErrorBoundary>
      {pdfPreviewItem && (
        <EvaluationPdfPreview type="thesis" id={pdfPreviewItem.id} onClose={() => setPdfPreviewItem(null)} onSave={loadData} initialScope="supervisor" />
      )}

    </>
  );
}

export default SupervisorMasterThesis;