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
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(null);
  const [pdfPreviewItem, setPdfPreviewItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState({ open: false });
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkPreview, setBulkPreview] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) { toast.warning('Select a file'); return; }
    setBulkLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const { data } = await api.post('/theses/bulk-import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBulkPreview(data);
    } catch (err) { toast.error(err.response?.data?.error || 'Upload failed'); }
    finally { setBulkLoading(false); }
  };

  const handleBulkConfirm = async () => {
    if (!bulkPreview?.preview) return;
    setBulkLoading(true);
    try {
      const rows = bulkPreview.preview.map(p => ({
        row: p.row, name: p.name, roll: p.roll, title: p.title,
        batch: p.batch, cluster: p.cluster, programId: p.programId,
        studentMatch: p.studentMatch, supervisorMatch: p.supervisorMatch, supervisorWillCreate: p.supervisorWillCreate,
        externalMidTermMatch: p.externalMidTermMatch, externalMidTermWillCreate: p.externalMidTermWillCreate,
        externalFinalMatch: p.externalFinalMatch, externalFinalWillCreate: p.externalFinalWillCreate,
      }));
      await api.post('/theses/bulk-import/confirm', { rows });
      toast.success(`${bulkPreview.stats.matched} theses imported`);
      setShowUpload(false);
      setBulkPreview(null);
      setSelectedFile(null);
      setBulkYearId('');
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Import failed'); }
    finally { setBulkLoading(false); }
  };

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
                  <span>{showDetail.batch || '—'}</span>
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
          <div className="table-toolbar-right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowUpload(true)}>
              <span className="material-symbols-outlined">upload_file</span>
              Upload Excel
            </button>
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
            <span className="material-symbols-outlined">library_books</span>
            <h3>No theses assigned</h3>
            <p>{searchTerm || statusFilter !== 'ALL' ? 'Try adjusting your filters or search.' : "You haven't been assigned any master's theses yet."}</p>
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
                      {t.batch ? `Batch ${t.batch}` : '—'}
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

      {showUpload && (
        <div className="modal-overlay" onClick={() => { setShowUpload(false); setBulkPreview(null); }}>
          <div className="modal" style={{ maxWidth: 900, width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <span className="material-symbols-outlined">upload_file</span>
              </div>
              <div className="modal-header-text">
                <h2>{bulkPreview ? 'Preview Import' : 'Bulk Import Theses'}</h2>
                <p>{bulkPreview ? `Found ${bulkPreview.stats.total} rows — ${bulkPreview.stats.matched} matched, ${bulkPreview.stats.unmatched} unmatched` : 'Upload Excel with Name, Roll, Title, Supervisor, External_mid_term, External_final, Cluster, Batch'}</p>
              </div>
            </div>
            {!bulkPreview ? (
              <form onSubmit={handleFileUpload}>
                <div className="form-group">
                  <label>Excel File (.xlsx)</label>
                  <input type="file" accept=".xlsx,.xls" onChange={e => setSelectedFile(e.target.files[0])} required />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowUpload(false)}>
                    <span className="material-symbols-outlined">close</span>Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={bulkLoading}>
                    <span className="material-symbols-outlined">{bulkLoading ? 'progress_activity' : 'upload'}</span>
                    {bulkLoading ? 'Analyzing...' : 'Preview'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ maxHeight: 400, overflow: 'auto', marginBottom: 16 }}>
                  <table style={{ width: '100%', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>#</th><th>Name</th><th>Roll</th><th>Title</th><th>Student</th><th>Supervisor</th><th>Ext (Mid)</th><th>Ext (Final)</th><th>Cluster</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.preview.map(p => (
                        <tr key={p.row} style={{ background: p.warnings.length ? 'var(--color-error-container)' : 'transparent' }}>
                          <td>{p.row}</td>
                          <td>{p.name}</td>
                          <td style={{ fontSize: 11 }}>{p.roll}</td>
                          <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</td>
                          <td>{p.studentMatch ? <span style={{ color: 'var(--color-success)' }}>{p.studentMatch.name}</span> : <span style={{ color: 'var(--color-error)' }}>?</span>}</td>
                          <td>{p.supervisorMatch ? <span style={{ color: 'var(--color-success)' }}>{p.supervisorMatch.name}</span> : p.supervisorWillCreate ? <span style={{ color: 'var(--color-warning)' }}>Will create: {p.supervisorWillCreate.name}</span> : <span style={{ color: 'var(--color-error)' }}>?</span>}</td>
                          <td>{p.externalMidTermMatch ? <span style={{ color: 'var(--color-success)' }}>{p.externalMidTermMatch.name}</span> : p.externalMidTermWillCreate ? <span style={{ color: 'var(--color-warning)' }}>Will create: {p.externalMidTermWillCreate.name}</span> : <span style={{ color: 'var(--color-error)' }}>?</span>}</td>
                          <td>{p.externalFinalMatch ? <span style={{ color: 'var(--color-success)' }}>{p.externalFinalMatch.name}</span> : p.externalFinalWillCreate ? <span style={{ color: 'var(--color-warning)' }}>Will create: {p.externalFinalWillCreate.name}</span> : <span style={{ color: 'var(--color-error)' }}>?</span>}</td>
                          <td>{p.cluster || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setBulkPreview(null)}>
                    <span className="material-symbols-outlined">arrow_back</span>Back
                  </button>
                  <button className="btn btn-primary" onClick={handleBulkConfirm} disabled={bulkLoading || bulkPreview.stats.matched === 0}>
                    <span className="material-symbols-outlined">{bulkLoading ? 'progress_activity' : 'check'}</span>
                    {bulkLoading ? 'Importing...' : `Import ${bulkPreview.stats.matched} theses`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default SupervisorMasterThesis;