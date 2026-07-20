import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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

function MasterThesis() {
  const toast = useToast();
  const navigate = useNavigate();
  const [theses, setTheses] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [allSupervisors, setAllSupervisors] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [detailMode, setDetailMode] = useState('view');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [createForm, setCreateForm] = useState({ title: '', studentId: '', academicYearId: '', supervisorId: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null, danger: false });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [supervisorFilter, setSupervisorFilter] = useState('ALL');
  const [createSupSearch, setCreateSupSearch] = useState('');
  const [createSupOpen, setCreateSupOpen] = useState(false);
  const createSupRef = useRef(null);
  const [examiners, setExaminers] = useState([]);
  const [editSupId, setEditSupId] = useState('');
  const [editMidTermExamId, setEditMidTermExamId] = useState('');
  const [editFinalExamId, setEditFinalExamId] = useState('');
  const [editSupSearch, setEditSupSearch] = useState('');
  const [editMidTermExamSearch, setEditMidTermExamSearch] = useState('');
  const [editFinalExamSearch, setEditFinalExamSearch] = useState('');
  const [editSupOpen, setEditSupOpen] = useState(false);
  const [editMidTermExamOpen, setEditMidTermExamOpen] = useState(false);
  const [editFinalExamOpen, setEditFinalExamOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const editSupRef = useRef(null);
  const editMidTermExamRef = useRef(null);
  const editFinalExamRef = useRef(null);
  const [examSearch, setExamSearch] = useState('');
  const [examOpen, setExamOpen] = useState(false);
  const examRef = useRef(null);
  // Student search dropdown
  const [createStudentSearch, setCreateStudentSearch] = useState('');
  const [createStudentOpen, setCreateStudentOpen] = useState(false);
  const createStudentRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfPreviewItem, setPdfPreviewItem] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkYearId, setBulkYearId] = useState('');
  const [selectedTheses, setSelectedTheses] = useState([]);
  const [bulkSupervisorId, setBulkSupervisorId] = useState('');
  const selectAllRef = useRef(null);
  const [actionMenuRow, setActionMenuRow] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadData = useCallback(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    setLoading(true);
    Promise.all([
      api.get('/theses', { signal }).then(({ data }) => setTheses(data)),
      api.get('/users/role/supervisor?all=true', { signal }).then(({ data }) => { setSupervisors(data); setAllSupervisors(data); }),
      api.get('/users/role/external_examiner?all=true', { signal }).then(({ data }) => setExaminers(data)),
      api.get('/departments/academic-years', { signal }).then(({ data }) => setAcademicYears(data)),
      api.get('/users/role/STUDENT?all=true&degreeType=MASTER', { signal }).then(({ data }) => setStudents(data)),
      api.get('/assignment-requests', { signal }).then(({ data }) => setPendingRequests(data.filter(r => r.status === 'PENDING'))).catch(() => setPendingRequests([])),
    ]).catch((err) => { if (err.name !== 'CanceledError') toast.error(err.response?.data?.error || 'Failed to load data'); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

useEffect(() => {
    const handleClickOutside = (e) => {
      if (createSupRef.current && !createSupRef.current.contains(e.target)) {
        setCreateSupOpen(false);
      }
    };
    if (createSupOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [createSupOpen]);

  useEffect(() => {
    const handleEditSupOutside = (e) => {
      if (editSupRef.current && !editSupRef.current.contains(e.target)) {
        setEditSupOpen(false);
      }
    };
    if (editSupOpen) document.addEventListener('mousedown', handleEditSupOutside);
    return () => document.removeEventListener('mousedown', handleEditSupOutside);
  }, [editSupOpen]);

  useEffect(() => {
    const handleEditMidTermExamOutside = (e) => {
      if (editMidTermExamRef.current && !editMidTermExamRef.current.contains(e.target)) {
        setEditMidTermExamOpen(false);
      }
    };
    if (editMidTermExamOpen) document.addEventListener('mousedown', handleEditMidTermExamOutside);
    return () => document.removeEventListener('mousedown', handleEditMidTermExamOutside);
  }, [editMidTermExamOpen]);

  useEffect(() => {
    const handleEditFinalExamOutside = (e) => {
      if (editFinalExamRef.current && !editFinalExamRef.current.contains(e.target)) {
        setEditFinalExamOpen(false);
      }
    };
    if (editFinalExamOpen) document.addEventListener('mousedown', handleEditFinalExamOutside);
    return () => document.removeEventListener('mousedown', handleEditFinalExamOutside);
  }, [editFinalExamOpen]);

  useEffect(() => {
    const handleExamOutside = (e) => {
      if (examRef.current && !examRef.current.contains(e.target)) {
        setExamOpen(false);
      }
    };
    if (examOpen) document.addEventListener('mousedown', handleExamOutside);
    return () => document.removeEventListener('mousedown', handleExamOutside);
  }, [examOpen]);

  useEffect(() => {
    const handleStudentOutside = (e) => {
      if (createStudentRef.current && !createStudentRef.current.contains(e.target)) {
        setCreateStudentOpen(false);
      }
    };
    if (createStudentOpen) document.addEventListener('mousedown', handleStudentOutside);
    return () => document.removeEventListener('mousedown', handleStudentOutside);
  }, [createStudentOpen]);

  // Close action menu on outside click — use 'click' not 'mousedown'
  // so React's synthetic onClick on menu items fires first (bubbles up),
  // then the native click listener fires (batches both state updates together).
  useEffect(() => {
    const handleClick = () => setActionMenuRow(null);
    if (actionMenuRow) {
      document.addEventListener('click', handleClick);
    }
    return () => document.removeEventListener('click', handleClick);
  }, [actionMenuRow]);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) { toast.warning('Select a file'); return; }
    if (!bulkYearId) { toast.warning('Select an academic year'); return; }
    setBulkLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('academicYearId', bulkYearId);
      const { data } = await api.post('/theses/bulk-import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBulkPreview(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkConfirm = async () => {
    if (!bulkPreview?.preview) return;
    setBulkLoading(true);
    try {
      const rows = bulkPreview.preview.map(p => ({
        row: p.row,
        name: p.name,
        roll: p.roll,
        title: p.title,
        batch: p.batch,
        cluster: p.cluster,
        programId: p.programId,
        studentMatch: p.studentMatch,
        supervisorMatch: p.supervisorMatch,
        externalMidTermMatch: p.externalMidTermMatch,
        externalFinalMatch: p.externalFinalMatch,
      }));
      await api.post('/theses/bulk-import/confirm', { rows, academicYearId: parseInt(bulkYearId) });
      toast.success(`${bulkPreview.stats.matched} theses imported`);
      setShowUpload(false);
      setBulkPreview(null);
      setSelectedFile(null);
      setBulkYearId('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setBulkLoading(false);
    }
  };

const handleComplete = async (id) => {
    try {
      await api.put(`/theses/${id}/status`, { status: 'COMPLETED' });
      toast.success('Thesis marked as completed');
      setShowDetail(null);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Status update failed'); }
  };

  const confirmDeleteThesis = (id) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Thesis',
      message: 'Are you sure you want to delete this pending thesis? This cannot be undone.',
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        handleDeleteThesis(id);
      },
      danger: true,
    });
  };

  const handleDeleteThesis = async (id) => {
    try {
      await api.delete(`/theses/${id}`);
      toast.success('Thesis deleted');
      setShowDetail(null);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
  };

  const toggleSelectAll = () => {
    const allIds = paginatedTheses.map(t => t.id);
    const allSelected = allIds.every(id => selectedTheses.includes(id));
    if (allSelected) {
      setSelectedTheses(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedTheses(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  const toggleSelectThesis = (id) => {
    setSelectedTheses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const confirmComplete = (id) => {
    setConfirmDialog({
      open: true,
      title: 'Mark Thesis Complete',
      message: 'Are you sure you want to mark this thesis as completed? This action will change the thesis status.',
      onConfirm: () => { handleComplete(id); setConfirmDialog(prev => ({ ...prev, open: false })); },
      danger: false
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/theses', createForm);
      toast.success('Thesis created successfully');
      setShowCreate(false);
      setCreateForm({ title: '', studentId: '', academicYearId: '', supervisorId: '' });
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Create failed'); }
  };

  const handleEditSave = async (thesisId) => {
    try {
      const promises = [];
      if (editTitle !== undefined && editTitle !== showDetail.title) {
        promises.push(api.put(`/theses/${thesisId}`, { title: editTitle }));
      }
      if (editDescription !== undefined && editDescription !== (showDetail.description || '')) {
        promises.push(api.put(`/theses/${thesisId}`, { description: editDescription }));
      }
      if (editSupId !== undefined) {
        const currentSup = showDetail?.supervisorId?.toString();
        if (editSupId !== currentSup) {
          if (!editSupId) {
            promises.push(api.put(`/theses/${thesisId}/supervisor`, { supervisorId: null }));
          } else {
            promises.push(
              api.post('/assignment-requests', { thesisId, supervisorId: parseInt(editSupId) })
                .then(res => {
                  if (res.data?.crossProgram) {
                    setPendingRequests(prev => [...prev, res.data.request]);
                  }
                  return res;
                })
            );
          }
        }
      }
      if (editMidTermExamId !== undefined) {
        const currentMidTerm = showDetail?.externalMidTerm?.id?.toString();
        if (editMidTermExamId !== currentMidTerm) {
          promises.push(api.put(`/theses/${thesisId}/external-midterm`, { externalExaminerId: editMidTermExamId ? parseInt(editMidTermExamId) : null }));
        }
      }
      if (editFinalExamId !== undefined) {
        const currentFinal = showDetail?.externalFinal?.id?.toString();
        if (editFinalExamId !== currentFinal) {
          promises.push(api.put(`/theses/${thesisId}/external-final`, { externalExaminerId: editFinalExamId ? parseInt(editFinalExamId) : null }));
        }
      }
      const results = await Promise.all(promises);
      const hasCrossProgram = results.some(r => r?.data?.crossProgram);
      if (hasCrossProgram) {
        toast.info('Cross-program supervisor request sent for approval.');
      } else {
        toast.success('Changes saved successfully');
      }
      setShowDetail(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    }
  };

  const filteredTheses = useMemo(() => {
    return theses.filter(t => {
      const matchesSearch = !searchQuery || t.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchesYear = yearFilter === 'ALL' || t.academicYearId?.toString() === yearFilter;
      const matchesSupervisor = supervisorFilter === 'ALL'
        ? true
        : supervisorFilter === 'NONE'
          ? !t.supervisor
          : t.supervisor?.id?.toString() === supervisorFilter;
      return matchesSearch && matchesStatus && matchesYear && matchesSupervisor;
    });
  }, [theses, searchQuery, statusFilter, yearFilter, supervisorFilter]);

  const sortedTheses = useMemo(() => {
    return [...filteredTheses].sort((a, b) => {
      const statusOrder = { PENDING: 0, ACTIVE: 1, OVERDUE: 1, COMPLETED: 2 };
      return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
    });
  }, [filteredTheses]);

  const totalPages = Math.ceil(sortedTheses.length / PAGE_SIZE);
  const paginatedTheses = sortedTheses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Select all on current page — must be AFTER paginatedTheses is defined (no TDZ issue)
  useEffect(() => {
    if (selectAllRef.current) {
      const allIds = paginatedTheses.map(t => t.id);
      const selectedOnPage = selectedTheses.filter(id => allIds.includes(id)).length;
      selectAllRef.current.indeterminate = selectedOnPage > 0 && selectedOnPage < allIds.length;
    }
  }, [selectedTheses, paginatedTheses]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const pendingCount = theses.filter(t => !t.supervisor).length;
  const assignedCount = theses.filter(t => t.supervisor).length;

  const openDetail = (t, mode) => {
    setShowDetail(t);
    setDetailMode(mode || 'view');
    if (mode === 'edit') {
      setEditTitle(t.title || '');
      setEditDescription(t.description || '');
      setEditSupId(t.supervisorId ? t.supervisorId.toString() : '');
      setEditMidTermExamId(t.externalMidTerm?.id?.toString() || '');
      setEditFinalExamId(t.externalFinal?.id?.toString() || '');
      setEditSupSearch('');
      setEditMidTermExamSearch('');
      setEditFinalExamSearch('');
    }
  };

  const formatAcademicYear = (ay) => {
    if (!ay) return '';
    return ay.year || '';
  };

  const actions = (
    <>
      <button className="btn btn-secondary btn-sm" onClick={() => setShowUpload(true)}>
        <span className="material-symbols-outlined">upload_file</span>
        Upload Excel
      </button>
      <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
        <span className="material-symbols-outlined">add</span>
        Add Thesis
      </button>
      <button className="btn btn-outline btn-sm" onClick={async () => {
        try {
          const { data } = await api.post('/theses/export', {}, { responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([data]));
          const a = document.createElement('a'); a.href = url; a.download = 'theses.xlsx'; a.click();
          window.URL.revokeObjectURL(url);
          toast.success('Theses exported');
        } catch (err) {
          toast.error('Export failed');
        }
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span> Export
      </button>
    </>
  );

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

  const statusOptions = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'OVERDUE', label: 'Overdue' },
    { value: 'COMPLETED', label: 'Completed' },
  ];

  const yearOptions = academicYears.map(y => ({
    value: y.id.toString(),
    label: `${y.year}`,
  }));

  const supervisorOptions = [
    { value: 'NONE', label: 'Unassigned' },
    ...supervisors.map(s => ({
      value: s.id.toString(),
      label: `${s.designation ? s.designation + ' ' : ''}${s.firstName} ${s.lastName}`,
    })),
  ];

return (
    <ErrorBoundary>
    <PageLayout title="Master's Thesis" user={user} actions={actions}>
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
                  <span className="detail-label">Created</span>
                  <span>{showDetail.createdAt ? new Date(showDetail.createdAt).toLocaleDateString() : '—'}</span>
                </div>
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="detail-label">Description</span>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{showDetail.description || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Supervisor</span>
                  <span>
                    {showDetail.supervisor ? (
                      <>
                        {showDetail.supervisor.firstName} {showDetail.supervisor.lastName}
                        {pendingRequests.some(r => r.thesisId === showDetail.id && r.status === 'PENDING') && (
                          <span className="badge badge-warning" style={{ marginLeft: 8, fontSize: 10 }}>
                            <span className="dot" />Pending Approval
                          </span>
                        )}
                      </>
                    ) : pendingRequests.some(r => r.thesisId === showDetail.id && r.status === 'PENDING') ? (
                      <span className="badge badge-warning" style={{ fontSize: 10 }}>
                        <span className="dot" />Pending Approval
                      </span>
                    ) : (
                      <span className="badge badge-pending" style={{ fontSize: 10 }}>
                        <span className="dot" />Unassigned
                      </span>
                    )}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className={`badge badge-${showDetail.status?.toLowerCase() || 'pending'}`}>
                    <span className="dot" />
                    {showDetail.status || 'PENDING'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">External (Mid-Term)</span>
                  <span>
                    {showDetail.externalMidTerm ? (
                      <>{showDetail.externalMidTerm.firstName} {showDetail.externalMidTerm.lastName}</>
                    ) : (
                      <span className="badge badge-pending" style={{ fontSize: 10 }}>
                        <span className="dot" />Not Assigned
                      </span>
                    )}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">External (Final)</span>
                  <span>
                    {showDetail.externalFinal ? (
                      <>{showDetail.externalFinal.firstName} {showDetail.externalFinal.lastName}</>
                    ) : (
                      <span className="badge badge-pending" style={{ fontSize: 10 }}>
                        <span className="dot" />Not Assigned
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4 className="detail-section-title">Student</h4>
              <table className="detail-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="default-badge" style={{ width: 28, height: 28, fontSize: 11 }}>
                          {showDetail.student?.firstName?.[0] || ''}{showDetail.student?.lastName?.[0] || ''}
                        </div>
                        {showDetail.student?.firstName || ''} {showDetail.student?.lastName || ''}
                      </div>
                    </td>
                    <td>{showDetail.student?.email || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {detailMode === 'edit' && (
              <div className="detail-section">
                <h4 className="detail-section-title">Edit Assignments</h4>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: 300 }}>
                    <label>Thesis Title</label>
                    <input className="form-input" type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 300 }}>
                    <label>Description</label>
                    <textarea className="form-input" rows={3} value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Thesis description..." />
                  </div>
                  <div className="form-group" ref={editSupRef} style={{ flex: 1, minWidth: 250 }}>
                    <label>Supervisor</label>
                    <div className="sup-dropdown-trigger">
                      <div className="sup-search-wrapper" onClick={() => setEditSupOpen(true)}>
                        <span className="material-symbols-outlined">search</span>
                        <input
                          type="text"
                          placeholder={editSupId ? ((found) => found ? `${found.designation ? found.designation + ' ' : ''}${found.firstName} ${found.lastName}` : 'Search supervisor...')(allSupervisors.find(s => s.id.toString() === editSupId)) : 'No supervisor'}
                          value={editSupSearch}
                          onChange={e => { setEditSupSearch(e.target.value); setEditSupOpen(true); }}
                          onFocus={() => setEditSupOpen(true)}
                        />
                        {editSupId && (
                          <button className="sup-clear" onClick={(e) => { e.stopPropagation(); setEditSupId(''); setEditSupSearch(''); }}>
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        )}
                        <span className="material-symbols-outlined sup-dropdown-arrow">{editSupOpen ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
                      </div>
                      {editSupOpen && (
                        <div className="sup-dropdown">
                          {allSupervisors.filter(s => `${s.designation ? s.designation + ' ' : ''}${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(editSupSearch.toLowerCase())).length === 0 ? (
                            <div className="sup-dropdown-empty">No supervisors found</div>
                          ) : (
                            allSupervisors.filter(s => `${s.designation ? s.designation + ' ' : ''}${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(editSupSearch.toLowerCase())).map(s => {
                              const selected = editSupId === s.id.toString();
                              return (
                                <div
                                  key={s.id}
                                  className={`sup-dropdown-item ${selected ? 'sup-dropdown-item-selected' : ''}`}
                                  onClick={() => { setEditSupId(s.id.toString()); setEditSupSearch(''); setEditSupOpen(false); }}
                                >
                                  <div className="sup-dropdown-item-avatar">{s.firstName?.[0]}{s.lastName?.[0]}</div>
                                  <div className="sup-dropdown-item-info">
                                    <div className="sup-dropdown-item-name">{s.designation ? s.designation + ' ' : ''}{s.firstName} {s.lastName}</div>
                                    <div className="sup-dropdown-item-email">{s.email}</div>
                                  </div>
                                  <div style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: s.active ? 'var(--color-success-container)' : 'var(--color-error-container)', color: s.active ? 'var(--color-on-success-container)' : 'var(--color-on-error-container)' }}>
                                    {s.active ? 'Active' : 'Inactive'}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="form-group" ref={editMidTermExamRef} style={{ flex: 1, minWidth: 250 }}>
                    <label>External Examiner (Mid-Term)</label>
                    <div className="sup-dropdown-trigger">
                      <div className="sup-search-wrapper" onClick={() => setEditMidTermExamOpen(true)}>
                        <span className="material-symbols-outlined">search</span>
                        <input
                          type="text"
                          placeholder={editMidTermExamId ? ((found) => found ? `${found.designation ? found.designation + ' ' : ''}${found.firstName} ${found.lastName}` : 'Search examiner...')(examiners.find(e => e.id.toString() === editMidTermExamId)) : 'No mid-term examiner'}
                          value={editMidTermExamSearch}
                          onChange={e => { setEditMidTermExamSearch(e.target.value); setEditMidTermExamOpen(true); }}
                          onFocus={() => setEditMidTermExamOpen(true)}
                        />
                        {editMidTermExamId && (
                          <button className="sup-clear" onClick={(e) => { e.stopPropagation(); setEditMidTermExamId(''); setEditMidTermExamSearch(''); }}>
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        )}
                        <span className="material-symbols-outlined sup-dropdown-arrow">{editMidTermExamOpen ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
                      </div>
                      {editMidTermExamOpen && (
                        <div className="sup-dropdown">
                          {examiners.filter(e => `${e.designation ? e.designation + ' ' : ''}${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(editMidTermExamSearch.toLowerCase())).length === 0 ? (
                            <div className="sup-dropdown-empty">No examiners found</div>
                          ) : (
                            examiners.filter(e => `${e.designation ? e.designation + ' ' : ''}${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(editMidTermExamSearch.toLowerCase())).map(e => {
                              const selected = editMidTermExamId === e.id.toString();
                              return (
                                <div
                                  key={e.id}
                                  className={`sup-dropdown-item ${selected ? 'sup-dropdown-item-selected' : ''}`}
                                  onClick={() => { setEditMidTermExamId(e.id.toString()); setEditMidTermExamSearch(''); setEditMidTermExamOpen(false); }}
                                >
                                  <div className="sup-dropdown-item-avatar">{e.firstName?.[0]}{e.lastName?.[0]}</div>
                                  <div className="sup-dropdown-item-info">
                                    <div className="sup-dropdown-item-name">{e.designation ? e.designation + ' ' : ''}{e.firstName} {e.lastName}</div>
                                    <div className="sup-dropdown-item-email">{e.email}</div>
                                  </div>
                                  <div style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: e.active ? 'var(--color-success-container)' : 'var(--color-error-container)', color: e.active ? 'var(--color-on-success-container)' : 'var(--color-on-error-container)' }}>
                                    {e.active ? 'Active' : 'Inactive'}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="form-group" ref={editFinalExamRef} style={{ flex: 1, minWidth: 250 }}>
                    <label>External Examiner (Final)</label>
                    <div className="sup-dropdown-trigger">
                      <div className="sup-search-wrapper" onClick={() => setEditFinalExamOpen(true)}>
                        <span className="material-symbols-outlined">search</span>
                        <input
                          type="text"
                          placeholder={editFinalExamId ? ((found) => found ? `${found.designation ? found.designation + ' ' : ''}${found.firstName} ${found.lastName}` : 'Search examiner...')(examiners.find(e => e.id.toString() === editFinalExamId)) : 'No final examiner'}
                          value={editFinalExamSearch}
                          onChange={e => { setEditFinalExamSearch(e.target.value); setEditFinalExamOpen(true); }}
                          onFocus={() => setEditFinalExamOpen(true)}
                        />
                        {editFinalExamId && (
                          <button className="sup-clear" onClick={(e) => { e.stopPropagation(); setEditFinalExamId(''); setEditFinalExamSearch(''); }}>
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        )}
                        <span className="material-symbols-outlined sup-dropdown-arrow">{editFinalExamOpen ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
                      </div>
                      {editFinalExamOpen && (
                        <div className="sup-dropdown">
                          {examiners.filter(e => `${e.designation ? e.designation + ' ' : ''}${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(editFinalExamSearch.toLowerCase())).length === 0 ? (
                            <div className="sup-dropdown-empty">No examiners found</div>
                          ) : (
                            examiners.filter(e => `${e.designation ? e.designation + ' ' : ''}${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(editFinalExamSearch.toLowerCase())).map(e => {
                              const selected = editFinalExamId === e.id.toString();
                              return (
                                <div
                                  key={e.id}
                                  className={`sup-dropdown-item ${selected ? 'sup-dropdown-item-selected' : ''}`}
                                  onClick={() => { setEditFinalExamId(e.id.toString()); setEditFinalExamSearch(''); setEditFinalExamOpen(false); }}
                                >
                                  <div className="sup-dropdown-item-avatar">{e.firstName?.[0]}{e.lastName?.[0]}</div>
                                  <div className="sup-dropdown-item-info">
                                    <div className="sup-dropdown-item-name">{e.designation ? e.designation + ' ' : ''}{e.firstName} {e.lastName}</div>
                                    <div className="sup-dropdown-item-email">{e.email}</div>
                                  </div>
                                  <div style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: e.active ? 'var(--color-success-container)' : 'var(--color-error-container)', color: e.active ? 'var(--color-on-success-container)' : 'var(--color-on-error-container)' }}>
                                    {e.active ? 'Active' : 'Inactive'}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => { setShowDetail(null); setDetailMode('view'); }}>
                <span className="material-symbols-outlined">close</span>
                Close
              </button>
              {detailMode === 'edit' && (
                <button className="btn btn-primary" onClick={() => handleEditSave(showDetail.id)}>
                  <span className="material-symbols-outlined">save</span>
                  Save Changes
                </button>
              )}
              {showDetail.status === 'ACTIVE' && detailMode !== 'edit' && (
                <button className="btn btn-success" onClick={() => confirmComplete(showDetail.id)}>
                  <span className="material-symbols-outlined">check_circle</span>
                  Mark Complete
                </button>
              )}
              {detailMode !== 'edit' && (
                <button className="btn btn-danger" onClick={() => confirmDeleteThesis(showDetail.id)}>
                  <span className="material-symbols-outlined">delete</span>
                  Delete
                </button>
              )}
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
          <div className="stat-icon"><span className="material-symbols-outlined">check_circle</span></div>
          <div className="stat-number">{assignedCount}</div>
          <div className="stat-label">Assigned</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">person_add</span></div>
          <div className="stat-number">{pendingCount}</div>
          <div className="stat-label">Needs Supervisor</div>
        </div>
      </div>

      {selectedTheses.length > 1 && (
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Bulk Actions ({selectedTheses.length} theses)</span>
            <select className="form-input" style={{ width: 200 }} value={bulkSupervisorId} onChange={e => setBulkSupervisorId(e.target.value)}>
              <option value="">Select supervisor...</option>
              {supervisors.map(s => <option key={s.id} value={s.id}>{s.designation ? s.designation + ' ' : ''}{s.firstName} {s.lastName}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={async () => {
              if (!bulkSupervisorId) return toast.warning('Select a supervisor');
              try {
                for (const id of selectedTheses) {
                  await api.post('/assignment-requests', { thesisId: id, supervisorId: parseInt(bulkSupervisorId) });
                }
                toast.success(`Assigned supervisor to ${selectedTheses.length} theses`);
                setSelectedTheses([]);
                loadData();
              } catch (err) { toast.error(err.response?.data?.error || 'Bulk assign failed'); }
            }}>Assign Supervisor</button>
            <button className="btn btn-sm btn-success" onClick={async () => {
              const pending = selectedTheses.filter(id => {
                const t = theses.find(th => th.id === id);
                return t && (t.status === 'PENDING' || t.status === 'ACTIVE');
              });
              if (pending.length === 0) return toast.warning('No pending/active theses selected');
              try {
                await Promise.all(pending.map(id => api.put(`/theses/${id}/status`, { status: 'ACTIVE' })));
                toast.success(`Activated ${pending.length} theses`);
                setSelectedTheses([]);
                loadData();
              } catch (err) { toast.error(err.response?.data?.error || 'Bulk activate failed'); }
            }}>
              <span className="material-symbols-outlined">play_arrow</span>
              Make Active
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => {
              const pending = selectedTheses.filter(id => {
                const t = theses.find(th => th.id === id);
                return t && t.status === 'PENDING';
              });
              if (pending.length === 0) return toast.warning('No pending theses selected');
              setConfirmDialog({
                open: true,
                title: 'Delete Theses',
                message: `Are you sure you want to delete ${pending.length} pending theses? This cannot be undone.`,
                onConfirm: async () => {
                  try {
                    await Promise.all(pending.map(id => api.delete(`/theses/${id}`)));
                    toast.success(`Deleted ${pending.length} theses`);
                    setSelectedTheses([]);
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                    loadData();
                  } catch (err) { toast.error(err.response?.data?.error || 'Bulk delete failed'); }
                },
                danger: true,
              });
            }}>
              <span className="material-symbols-outlined">delete</span>
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search theses, students, supervisors..." />
          </div>
          <div className="table-toolbar-right">
            <span className="font-label text-xs font-semibold text-on-surface-variant">{sortedTheses.length} theses</span>
          </div>
        </div>

        <div className="filter-bar">
          <FilterDropdown label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} allLabel="All Statuses" />
          <FilterDropdown label="Year" value={yearFilter} onChange={setYearFilter} options={yearOptions} allLabel="All Years" />
          <FilterDropdown label="Supervisor" value={supervisorFilter} onChange={setSupervisorFilter} options={supervisorOptions} allLabel="All Supervisors" />
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : sortedTheses.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">library_books</span>
            <h3>No theses found</h3>
            <p>{searchQuery || statusFilter !== 'ALL' || yearFilter !== 'ALL' || supervisorFilter !== 'ALL' ? 'Try adjusting your filters or search.' : 'Upload an Excel file or create a thesis to get started.'}</p>
          </div>
        ) : (
          <>
            <table style={{ tableLayout: 'fixed', minWidth: 0 }}>
              <colgroup>
                <col style={{ width: 32 }} />
                <col />
                <col />
                <col />
                <col style={{ width: 95 }} />
                <col style={{ width: 60 }} />
                <col style={{ width: 155 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" ref={selectAllRef} onChange={toggleSelectAll} />
                  </th>
                  <th style={{ width: '25%' }}>Student</th>
                  <th>Thesis Title</th>
                  <th style={{ width: '22%' }}>Supervisor</th>
                  <th style={{ width: 65 }}>Status</th>
                  <th style={{ width: 50 }}>Year</th>
                  <th style={{ textAlign: 'right', width: 90 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTheses.map(t => (
                  <tr key={t.id} onClick={() => navigate(`/coordinator/project/thesis/${t.id}`)} style={{ cursor: 'pointer' }}>
                    <td onClick={e => e.stopPropagation()} style={{ width: 32, padding: '6px 10px' }}>
                      <input type="checkbox" checked={selectedTheses.includes(t.id)} onChange={() => toggleSelectThesis(t.id)} />
                    </td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '6px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="default-badge" style={{ width: 24, height: 24, fontSize: 9 }}>
                          {t.student?.firstName?.charAt(0)}{t.student?.lastName?.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 500, fontSize: 13 }}>
                          {t.student?.firstName} {t.student?.lastName}
                        </span>
                      </div>
                    </td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '6px 10px', color: 'var(--color-on-surface-variant)', fontSize: 13 }}>{t.title}</td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '6px 10px' }}>
                      {t.supervisor ? (
                        <span style={{ fontWeight: 500, color: 'var(--color-primary)', fontSize: 12 }}>
                          {t.supervisor.firstName} {t.supervisor.lastName}
                        </span>
                      ) : pendingRequests.some(r => r.thesisId === t.id && r.status === 'PENDING') ? (
                        <span className="badge badge-warning" style={{ fontSize: 10 }}>
                          <span className="dot" />
                          Pending
                        </span>
                      ) : (
                        <span className="badge badge-pending" style={{ fontSize: 10 }}>
                          <span className="dot" />
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td style={{ width: '1%', whiteSpace: 'nowrap', padding: '6px 10px' }}>
                      <span className={`badge badge-${t.status?.toLowerCase() || 'pending'}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                        <span className="dot" />
                        {t.status || 'PENDING'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap', padding: '6px 10px', color: 'var(--color-on-surface-variant)' }}>
                      {formatAcademicYear(t.academicYear) || '—'}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '6px 10px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button className="icon-btn-sm" title="View" aria-label="View thesis details" onClick={() => openDetail(t, 'view')}>
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                        <div style={{ position: 'relative' }}>
                          <button className="icon-btn-sm" title="More actions" aria-label="More actions" onClick={(e) => { e.stopPropagation(); setActionMenuRow(actionMenuRow === t.id ? null : t.id); }}>
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>
                          {actionMenuRow === t.id && (
                            <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 50, background: 'var(--color-surface-container-lowest)', border: '1px solid var(--color-outline)', borderRadius: 'var(--border-radius-md)', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 140, padding: 4 }} onClick={e => { e.stopPropagation(); setActionMenuRow(null); }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', borderRadius: 4, fontSize: 13, opacity: t.status === 'COMPLETED' ? 0.55 : 1 }} onClick={() => { openDetail(t, 'edit'); setEditSupId(t.supervisorId ? t.supervisorId.toString() : ''); setEditMidTermExamId(t.externalMidTerm?.id?.toString() || ''); setEditFinalExamId(t.externalFinal?.id?.toString() || ''); setEditSupSearch(''); setEditMidTermExamSearch(''); setEditFinalExamSearch(''); }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-container-low)'; if (t.status === 'COMPLETED') e.currentTarget.style.opacity = '0.8'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; if (t.status === 'COMPLETED') e.currentTarget.style.opacity = '0.55'; }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                                  Edit
                                </div>
                              {t.status === 'ACTIVE' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', borderRadius: 4, fontSize: 13, color: 'var(--color-success)' }} onClick={() => { confirmComplete(t.id); }} onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-container-low)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                                  Complete
                                </div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', borderRadius: 4, fontSize: 13 }} onClick={() => setPdfPreviewItem(t)} onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-container-low)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>picture_as_pdf</span>
                                PDF Preview
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', borderRadius: 4, fontSize: 13, color: t.status === 'COMPLETED' ? 'var(--color-on-surface-variant)' : 'var(--color-error)', opacity: t.status === 'COMPLETED' ? 0.55 : 1 }} onClick={() => { confirmDeleteThesis(t.id); }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-container-low)'; if (t.status === 'COMPLETED') e.currentTarget.style.opacity = '0.8'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; if (t.status === 'COMPLETED') e.currentTarget.style.opacity = '0.55'; }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                                Delete
                              </div>
                            </div>
                          )}
                        </div>
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
                  <label>Academic Year</label>
                  <select value={bulkYearId} onChange={e => setBulkYearId(e.target.value)} required>
                    <option value="">Select year...</option>
                    {academicYears.map(y => <option key={y.id} value={y.id}>{y.year} {y.semester}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Excel File (.xlsx)</label>
                  <input type="file" accept=".xlsx,.xls" onChange={e => setSelectedFile(e.target.files[0])} required />
                  <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>Columns: Name, Roll, Title, Supervisor, External_mid_term, External_final, Cluster, Batch</span>
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
                        <th>#</th>
                        <th>Name</th>
                        <th>Roll</th>
                        <th>Title</th>
                        <th>Student</th>
                        <th>Supervisor</th>
                        <th>Ext (Mid)</th>
                        <th>Ext (Final)</th>
                        <th>Cluster</th>
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
                          <td>{p.supervisorMatch ? <span style={{ color: 'var(--color-success)' }}>{p.supervisorMatch.name}</span> : <span style={{ color: 'var(--color-error)' }}>?</span>}</td>
                          <td>{p.externalMidTermMatch ? <span style={{ color: 'var(--color-success)' }}>{p.externalMidTermMatch.name}</span> : <span style={{ color: 'var(--color-error)' }}>?</span>}</td>
                          <td>{p.externalFinalMatch ? <span style={{ color: 'var(--color-success)' }}>{p.externalFinalMatch.name}</span> : <span style={{ color: 'var(--color-error)' }}>?</span>}</td>
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

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <span className="material-symbols-outlined">add</span>
              </div>
              <div className="modal-header-text">
                <h2>Create Thesis</h2>
                <p>Add a new master's thesis record</p>
              </div>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Thesis Title</label>
                <input value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} required placeholder="Enter thesis title" />
              </div>
              <div className="form-group">
                <label>Student</label>
                <div className="sup-dropdown-trigger" ref={createStudentRef}>
                  <div className="sup-search-wrapper" onClick={() => setCreateStudentOpen(true)}>
                    <span className="material-symbols-outlined">search</span>
                    <input
                      type="text"
                      placeholder={createForm.studentId ? students.find(s => String(s.id) === String(createForm.studentId))?.firstName + ' ' + students.find(s => String(s.id) === String(createForm.studentId))?.lastName || 'Search student...' : 'Search student...'}
                      value={createStudentSearch}
                      onChange={e => { setCreateStudentSearch(e.target.value); setCreateStudentOpen(true); }}
                      onFocus={() => setCreateStudentOpen(true)}
                    />
                    {createForm.studentId && (
                      <button className="sup-clear" onClick={e => { e.stopPropagation(); setCreateForm({...createForm, studentId: ''}); setCreateStudentSearch(''); }}>
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    )}
                    <span className="material-symbols-outlined sup-dropdown-arrow">{createStudentOpen ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
                  </div>
                  {createStudentOpen && (
                    <div className="sup-dropdown">
                      {students.length === 0 ? (
                        <div className="sup-dropdown-empty">Loading students...</div>
                      ) : (() => {
                        const filteredStudents = students.filter(s => {
                          if (String(createForm.studentId) === String(s.id)) return false;
                          const q = createStudentSearch.toLowerCase().trim();
                          if (!q) return true;
                          return `${s.firstName} ${s.lastName} ${s.email || ''}`.toLowerCase().includes(q);
                        });
                        if (filteredStudents.length === 0) {
                          return <div className="sup-dropdown-empty">No students found</div>;
                        }
                        return filteredStudents.map(s => {
                          const isSelected = String(createForm.studentId) === String(s.id);
                          return (
                            <div
                              key={s.id}
                              className={`sup-dropdown-item ${isSelected ? 'sup-dropdown-item-selected' : ''}`}
                              onClick={() => {
                                setCreateForm({...createForm, studentId: Number(s.id)});
                                setCreateStudentSearch('');
                                setCreateStudentOpen(false);
                              }}
                            >
                              <div className="sup-dropdown-item-avatar">{s.firstName?.[0]}{s.lastName?.[0]}</div>
                              <div className="sup-dropdown-item-info">
                                <div className="sup-dropdown-item-name">{s.designation ? s.designation + ' ' : ''}{s.firstName} {s.lastName}</div>
                                <div className="sup-dropdown-item-email">{s.email || ''}</div>
                              </div>
                              {isSelected && (
                                <span className="material-symbols-outlined sup-dropdown-item-check">check_circle</span>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Academic Year</label>
                <select value={createForm.academicYearId} onChange={e => setCreateForm({...createForm, academicYearId: e.target.value})} required>
                  <option value="">Select academic year...</option>
                  {academicYears.map(y => <option key={y.id} value={y.id}>{y.year}</option>)}
                </select>
              </div>
              <div className="form-group" ref={createSupRef}>
                <label>Supervisor <span style={{ fontWeight: 400, color: 'var(--color-on-surface-variant)' }}>(optional)</span></label>
                <div className="sup-dropdown-trigger">
                  <div className="sup-search-wrapper" onClick={() => setCreateSupOpen(true)}>
                    <span className="material-symbols-outlined">search</span>
                    <input
                      type="text"
                      placeholder={createForm.supervisorId ? ((found) => found ? `${found.designation ? found.designation + ' ' : ''}${found.firstName} ${found.lastName}` : 'Search supervisor...')(allSupervisors.find(s => s.id.toString() === createForm.supervisorId)) : 'Search supervisor...'}
                      value={createSupSearch}
                      onChange={e => { setCreateSupSearch(e.target.value); setCreateSupOpen(true); }}
                      onFocus={() => setCreateSupOpen(true)}
                    />
                    {createForm.supervisorId && (
                      <button className="sup-clear" onClick={(e) => { e.stopPropagation(); setCreateForm({...createForm, supervisorId: ''}); setCreateSupSearch(''); }}>
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    )}
                    <span className="material-symbols-outlined sup-dropdown-arrow">{createSupOpen ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
                  </div>
                  {createSupOpen && (
                    <div className="sup-dropdown">
                      {allSupervisors.filter(s => `${s.designation ? s.designation + ' ' : ''}${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(createSupSearch.toLowerCase())).length === 0 ? (
                        <div className="sup-dropdown-empty">No supervisors found</div>
                      ) : (
                        allSupervisors.filter(s => `${s.designation ? s.designation + ' ' : ''}${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(createSupSearch.toLowerCase())).map(s => {
                          const selected = createForm.supervisorId === s.id.toString();
                          return (
                            <div
                              key={s.id}
                              className={`sup-dropdown-item ${selected ? 'sup-dropdown-item-selected' : ''}`}
                              onClick={() => { setCreateForm({...createForm, supervisorId: s.id.toString()}); setCreateSupSearch(''); setCreateSupOpen(false); }}
                            >
                              <div className="sup-dropdown-item-avatar">
                                {s.firstName?.[0]}{s.lastName?.[0]}
                              </div>
                              <div className="sup-dropdown-item-info">
                                <div className="sup-dropdown-item-name">{s.designation ? s.designation + ' ' : ''}{s.firstName} {s.lastName}</div>
                                <div className="sup-dropdown-item-email">{s.email}</div>
                              </div>
                              {selected && (
                                <span className="material-symbols-outlined sup-dropdown-item-check">check_circle</span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group" ref={examRef}>
                <label>Internal Examiner <span style={{ fontWeight: 400, color: 'var(--color-on-surface-variant)' }}>(optional)</span></label>
                <div className="sup-dropdown-trigger">
                  <div className="sup-search-wrapper" onClick={() => setExamOpen(true)}>
                    <span className="material-symbols-outlined">search</span>
                    <input
                      type="text"
                      placeholder={createForm.examinerId ? ((found) => found ? `${found.designation ? found.designation + ' ' : ''}${found.firstName} ${found.lastName}` : 'Search examiner...')(examiners.find(e => e.id.toString() === createForm.examinerId)) : 'Search examiner...'}
                      value={examSearch}
                      onChange={e => { setExamSearch(e.target.value); setExamOpen(true); }}
                      onFocus={() => setExamOpen(true)}
                    />
                    {createForm.examinerId && (
                      <button className="sup-clear" onClick={(e) => { e.stopPropagation(); setCreateForm({...createForm, examinerId: ''}); setExamSearch(''); }}>
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    )}
                    <span className="material-symbols-outlined sup-dropdown-arrow">{examOpen ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
                  </div>
                  {examOpen && (
                    <div className="sup-dropdown">
                      {examiners.filter(e => `${e.designation ? e.designation + ' ' : ''}${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(examSearch.toLowerCase())).length === 0 ? (
                        <div className="sup-dropdown-empty">No examiners found</div>
                      ) : (
                        examiners.filter(e => `${e.designation ? e.designation + ' ' : ''}${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(examSearch.toLowerCase())).map(e => {
                          const selected = createForm.examinerId === e.id.toString();
                          return (
                            <div
                              key={e.id}
                              className={`sup-dropdown-item ${selected ? 'sup-dropdown-item-selected' : ''}`}
                              onClick={() => { setCreateForm({...createForm, examinerId: e.id.toString()}); setExamSearch(''); setExamOpen(false); }}
                            >
                              <div className="sup-dropdown-item-avatar">
                                {e.firstName?.[0]}{e.lastName?.[0]}
                              </div>
                              <div className="sup-dropdown-item-info">
                                <div className="sup-dropdown-item-name">{e.designation ? e.designation + ' ' : ''}{e.firstName} {e.lastName}</div>
                                <div className="sup-dropdown-item-email">{e.email}</div>
                              </div>
                              {selected && (
                                <span className="material-symbols-outlined sup-dropdown-item-check">check_circle</span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>
                  <span className="material-symbols-outlined">close</span>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <span className="material-symbols-outlined">add</span>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
            {pdfPreviewItem && (
        <EvaluationPdfPreview
          type="thesis"
          id={pdfPreviewItem.id}
          onClose={() => setPdfPreviewItem(null)}
          onSave={loadData}
        />
      )}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        confirmLabel="Confirm"
        danger={confirmDialog.danger}
      />
    </PageLayout>
    </ErrorBoundary>
  );
}

export default MasterThesis;
