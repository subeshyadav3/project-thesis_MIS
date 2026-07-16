import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import Pagination from '../../components/Pagination';
import ErrorBoundary from '../../components/ErrorBoundary';
import ConfirmDialog from '../../components/ConfirmDialog';
import EvaluationPdfPreview from '../../components/EvaluationPdfPreview';
import SearchInput from '../../components/SearchInput';
import { TableSkeleton } from '../../components/Skeleton';

const PAGE_SIZE = 10;

function SupervisorMasterThesis() {
  const toast = useToast();
  const navigate = useNavigate();
  const [theses, setTheses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(null);
  const [pdfPreviewItem, setPdfPreviewItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState({ open: false });
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadData = useCallback(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    setLoading(true);
    Promise.all([
      api.get('/supervisors/theses', { signal }).then(({ data }) => setTheses(data)),
      api.get('/departments/academic-years', { signal }).then(({ data }) => setAcademicYears(data)),
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
      const matchesYear = yearFilter === 'ALL' || t.academicYearId?.toString() === yearFilter;
      return matchesSearch && matchesStatus && matchesYear;
    });
  }, [theses, searchTerm, statusFilter, yearFilter]);

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

  const formatAcademicYear = (ay) => {
    if (!ay) return '';
    return ay.year || '';
  };

  const statusOptions = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'COMPLETED', label: 'Completed' },
  ];

  const yearOptions = academicYears.map(y => ({
    value: y.id.toString(),
    label: `${y.year}`,
  }));

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
                <span className="material-symbols-outlined">library_books</span>
              </div>
              <div className="modal-header-text">
                <h2>{showDetail.student?.firstName} {showDetail.student?.lastName}</h2>
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
                  <span>{formatAcademicYear(showDetail.academicYear) || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <span style={{ wordBreak: 'break-all' }}>{showDetail.student?.email || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Created</span>
                  <span>{showDetail.createdAt ? new Date(showDetail.createdAt).toLocaleDateString() : '—'}</span>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowDetail(null)}>
                <span className="material-symbols-outlined">close</span>
                Close
              </button>
              <button className="btn btn-outline" onClick={() => { setPdfPreviewItem(showDetail); setShowDetail(null); }}>
                <span className="material-symbols-outlined">picture_as_pdf</span>
                PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">library_books</span></div>
          <div className="stat-number">{theses.length}</div>
          <div className="stat-label">Total Theses</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">pending_actions</span></div>
          <div className="stat-number">{activeCount}</div>
          <div className="stat-label">Active / Pending</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">check_circle</span></div>
          <div className="stat-number">{completedCount}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search by student name, title..." />
          </div>
          <div className="table-toolbar-right">
            <span className="font-label text-xs font-semibold text-on-surface-variant">{sortedTheses.length} theses</span>
          </div>
        </div>

        <div className="filter-bar">
          <FilterDropdown label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} allLabel="All Statuses" />
          <FilterDropdown label="Year" value={yearFilter} onChange={setYearFilter} options={yearOptions} allLabel="All Years" />
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : sortedTheses.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">library_books</span>
            <h3>No theses assigned</h3>
            <p>{searchTerm || statusFilter !== 'ALL' || yearFilter !== 'ALL' ? 'Try adjusting your filters or search.' : "You haven't been assigned any master's theses yet."}</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Student</th>
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
                    <td style={{ color: 'var(--color-on-surface-variant)' }}>{t.title}</td>
                    <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13, wordBreak: 'break-all' }}>{t.student?.email || '—'}</td>
                    <td>
                      <span className={`badge badge-${t.status?.toLowerCase() || 'pending'}`}>
                        <span className="dot" />
                        {t.status || 'PENDING'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>
                      {formatAcademicYear(t.academicYear) || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => setShowDetail(t)}>
                          <span className="material-symbols-outlined">visibility</span>
                          View
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); setPdfPreviewItem(t); }}>
                          <span className="material-symbols-outlined">picture_as_pdf</span>
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