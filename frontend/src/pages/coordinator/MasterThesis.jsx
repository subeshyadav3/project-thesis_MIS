import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import Pagination from '../../components/Pagination';
import ErrorBoundary from '../../components/ErrorBoundary';
import ConfirmDialog from '../../components/ConfirmDialog';
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
  const [editExamId, setEditExamId] = useState('');
  const [editSupSearch, setEditSupSearch] = useState('');
  const [editExamSearch, setEditExamSearch] = useState('');
  const [editSupOpen, setEditSupOpen] = useState(false);
  const [editExamOpen, setEditExamOpen] = useState(false);
  const editSupRef = useRef(null);
  const editExamRef = useRef(null);
  const [examSearch, setExamSearch] = useState('');
  const [examOpen, setExamOpen] = useState(false);
  const examRef = useRef(null);
  // Student search dropdown
  const [createStudentSearch, setCreateStudentSearch] = useState('');
  const [createStudentOpen, setCreateStudentOpen] = useState(false);
  const createStudentRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
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
    const handleEditExamOutside = (e) => {
      if (editExamRef.current && !editExamRef.current.contains(e.target)) {
        setEditExamOpen(false);
      }
    };
    if (editExamOpen) document.addEventListener('mousedown', handleEditExamOutside);
    return () => document.removeEventListener('mousedown', handleEditExamOutside);
  }, [editExamOpen]);

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

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedYear) { toast.warning('Select file and academic year'); return; }
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('academicYearId', selectedYear);
    try {
      await api.post('/theses/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Theses imported successfully');
      setShowUpload(false);
      setSelectedFile(null);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Upload failed'); }
  };

const handleComplete = async (id) => {
    try {
      await api.put(`/theses/${id}/status`, { status: 'COMPLETED' });
      toast.success('Thesis marked as completed');
      setShowDetail(null);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Status update failed'); }
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
      if (editSupId !== undefined) {
        const currentSup = showDetail?.supervisorId?.toString();
        if (editSupId !== currentSup) {
          promises.push(api.put(`/theses/${thesisId}/supervisor`, { supervisorId: parseInt(editSupId) || null }));
        }
      }
      if (editExamId !== undefined) {
        const currentExam = showDetail?.examinerAssignments?.[0]?.externalExaminerId?.toString();
        if (editExamId !== currentExam) {
          if (editExamId) {
            if (currentExam) {
              const assignmentId = showDetail?.examinerAssignments?.[0]?.id;
              if (assignmentId) {
                promises.push(api.delete(`/examiner-assignments/${assignmentId}`));
              }
            }
            promises.push(api.post('/examiner-assignments/thesis', { thesisId, externalExaminerId: parseInt(editExamId) }));
          } else if (currentExam) {
            const assignmentId = showDetail?.examinerAssignments?.[0]?.id;
            if (assignmentId) {
              promises.push(api.delete(`/examiner-assignments/${assignmentId}`));
            }
          }
        }
      }
      await Promise.all(promises);
      toast.success('Changes saved successfully');
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
      const statusOrder = { ACTIVE: 0, COMPLETED: 1 };
      return (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
    });
  }, [filteredTheses]);

  const totalPages = Math.ceil(sortedTheses.length / PAGE_SIZE);
  const paginatedTheses = sortedTheses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const pendingCount = theses.filter(t => !t.supervisor).length;
  const assignedCount = theses.filter(t => t.supervisor).length;

  const openDetail = (t, mode) => {
    setShowDetail(t);
    setDetailMode(mode || 'view');
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
    { value: 'ACTIVE', label: 'Active' },
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
      label: `${s.firstName} ${s.lastName}`,
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
                <div className="detail-item">
                  <span className="detail-label">Supervisor</span>
                  <span>{showDetail.supervisor
                    ? `${showDetail.supervisor.firstName} ${showDetail.supervisor.lastName}`
                    : <span className="badge badge-pending"><span className="dot" />Unassigned</span>
                  }</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className={`badge badge-${showDetail.status?.toLowerCase() || 'pending'}`}>
                    <span className="dot" />
                    {showDetail.status || 'PENDING'}
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
                  <div className="form-group" ref={editSupRef} style={{ flex: 1, minWidth: 250 }}>
                    <label>Supervisor</label>
                    <div className="sup-dropdown-trigger">
                      <div className="sup-search-wrapper" onClick={() => setEditSupOpen(true)}>
                        <span className="material-symbols-outlined">search</span>
                        <input
                          type="text"
                          placeholder={editSupId ? allSupervisors.find(s => s.id.toString() === editSupId)?.firstName + ' ' + allSupervisors.find(s => s.id.toString() === editSupId)?.lastName || 'Search supervisor...' : 'No supervisor'}
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
                          {allSupervisors.filter(s => `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(editSupSearch.toLowerCase())).length === 0 ? (
                            <div className="sup-dropdown-empty">No supervisors found</div>
                          ) : (
                            allSupervisors.filter(s => `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(editSupSearch.toLowerCase())).map(s => {
                              const selected = editSupId === s.id.toString();
                              return (
                                <div
                                  key={s.id}
                                  className={`sup-dropdown-item ${selected ? 'sup-dropdown-item-selected' : ''}`}
                                  onClick={() => { setEditSupId(s.id.toString()); setEditSupSearch(''); setEditSupOpen(false); }}
                                >
                                  <div className="sup-dropdown-item-avatar">{s.firstName?.[0]}{s.lastName?.[0]}</div>
                                  <div className="sup-dropdown-item-info">
                                    <div className="sup-dropdown-item-name">{s.firstName} {s.lastName}</div>
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
                  <div className="form-group" ref={editExamRef} style={{ flex: 1, minWidth: 250 }}>
                    <label>Internal Examiner</label>
                    <div className="sup-dropdown-trigger">
                      <div className="sup-search-wrapper" onClick={() => setEditExamOpen(true)}>
                        <span className="material-symbols-outlined">search</span>
                        <input
                          type="text"
                          placeholder={editExamId ? examiners.find(e => e.id.toString() === editExamId)?.firstName + ' ' + examiners.find(e => e.id.toString() === editExamId)?.lastName || 'Search examiner...' : 'No examiner'}
                          value={editExamSearch}
                          onChange={e => { setEditExamSearch(e.target.value); setEditExamOpen(true); }}
                          onFocus={() => setEditExamOpen(true)}
                        />
                        {editExamId && (
                          <button className="sup-clear" onClick={(e) => { e.stopPropagation(); setEditExamId(''); setEditExamSearch(''); }}>
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        )}
                        <span className="material-symbols-outlined sup-dropdown-arrow">{editExamOpen ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
                      </div>
                      {editExamOpen && (
                        <div className="sup-dropdown">
                          {examiners.filter(e => `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(editExamSearch.toLowerCase())).length === 0 ? (
                            <div className="sup-dropdown-empty">No examiners found</div>
                          ) : (
                            examiners.filter(e => `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(editExamSearch.toLowerCase())).map(e => {
                              const selected = editExamId === e.id.toString();
                              return (
                                <div
                                  key={e.id}
                                  className={`sup-dropdown-item ${selected ? 'sup-dropdown-item-selected' : ''}`}
                                  onClick={() => { setEditExamId(e.id.toString()); setEditExamSearch(''); setEditExamOpen(false); }}
                                >
                                  <div className="sup-dropdown-item-avatar">{e.firstName?.[0]}{e.lastName?.[0]}</div>
                                  <div className="sup-dropdown-item-info">
                                    <div className="sup-dropdown-item-name">{e.firstName} {e.lastName}</div>
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
              {showDetail.status !== 'COMPLETED' && detailMode !== 'edit' && (
                <button className="btn btn-success" onClick={() => confirmComplete(showDetail.id)}>
                  <span className="material-symbols-outlined">check_circle</span>
                  Mark Complete
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
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Thesis Title</th>
                  <th>Supervisor</th>
                  <th>Status</th>
                  <th>Year</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTheses.map(t => (
                  <tr key={t.id} onClick={() => navigate(`/coordinator/project/thesis/${t.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="default-badge">
                          {t.student?.firstName?.charAt(0)}{t.student?.lastName?.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 500 }}>
                          {t.student?.firstName} {t.student?.lastName}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-on-surface-variant)' }}>{t.title}</td>
                    <td>
                      {t.supervisor ? (
                        <span style={{ fontWeight: 500, color: 'var(--color-primary)' }}>
                          {t.supervisor.firstName} {t.supervisor.lastName}
                        </span>
                      ) : (
                        <span className="badge badge-pending">
                          <span className="dot" />
                          Unassigned
                        </span>
                      )}
                    </td>
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
                        <button className="btn btn-sm btn-outline" onClick={() => openDetail(t, 'view')}>
                          <span className="material-symbols-outlined">visibility</span>
                          View
                        </button>
                        {t.status !== 'COMPLETED' && (
                          <button className="btn btn-sm btn-outline-primary" onClick={() => { openDetail(t, 'edit'); setEditSupId(t.supervisorId ? t.supervisorId.toString() : ''); setEditExamId(t.examinerAssignments?.[0]?.externalExaminerId?.toString() || ''); setEditSupSearch(''); setEditExamSearch(''); }}>
                            <span className="material-symbols-outlined">edit</span>
                            Edit
                          </button>
                        )}
                        {t.status === 'COMPLETED' && (
                          <button className="btn btn-sm btn-outline" onClick={() => {
                            const a = document.createElement('a');
                            a.href = `/api/print/thesis/${t.id}`;
                            a.download = `evaluation_${t.id}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}>
                            <span className="material-symbols-outlined">download</span>
                            PDF
                          </button>
                        )}
                        {t.status !== 'COMPLETED' && (
                          <button className="btn btn-sm btn-success" onClick={(e) => { e.stopPropagation(); confirmComplete(t.id); }}>
                            <span className="material-symbols-outlined">check_circle</span>
                            Complete
                          </button>
                        )}
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
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <span className="material-symbols-outlined">upload_file</span>
              </div>
              <div className="modal-header-text">
                <h2>Upload Excel</h2>
                <p>Import theses from an Excel spreadsheet</p>
              </div>
            </div>
            <form onSubmit={handleFileUpload}>
              <div className="form-group">
                <label>Academic Year</label>
                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} required>
                  <option value="">Select academic year...</option>
                  {academicYears.map(y => <option key={y.id} value={y.id}>{y.year}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Excel File (.xlsx)</label>
                <input type="file" accept=".xlsx" onChange={e => setSelectedFile(e.target.files[0])} required />
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginBottom: 8 }}>
                Required columns: Project Title, Student Name, Roll Number
              </p>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowUpload(false)}>
                  <span className="material-symbols-outlined">close</span>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <span className="material-symbols-outlined">upload</span>
                  Upload
                </button>
              </div>
            </form>
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
                                <div className="sup-dropdown-item-name">{s.firstName} {s.lastName}</div>
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
                      placeholder={createForm.supervisorId ? allSupervisors.find(s => s.id.toString() === createForm.supervisorId)?.firstName + ' ' + allSupervisors.find(s => s.id.toString() === createForm.supervisorId)?.lastName || 'Search supervisor...' : 'Search supervisor...'}
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
                      {allSupervisors.filter(s => `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(createSupSearch.toLowerCase())).length === 0 ? (
                        <div className="sup-dropdown-empty">No supervisors found</div>
                      ) : (
                        allSupervisors.filter(s => `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(createSupSearch.toLowerCase())).map(s => {
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
                                <div className="sup-dropdown-item-name">{s.firstName} {s.lastName}</div>
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
                      placeholder={createForm.examinerId ? examiners.find(e => e.id.toString() === createForm.examinerId)?.firstName + ' ' + examiners.find(e => e.id.toString() === createForm.examinerId)?.lastName || 'Search examiner...' : 'Search examiner...'}
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
                      {examiners.filter(e => `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(examSearch.toLowerCase())).length === 0 ? (
                        <div className="sup-dropdown-empty">No examiners found</div>
                      ) : (
                        examiners.filter(e => `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(examSearch.toLowerCase())).map(e => {
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
                                <div className="sup-dropdown-item-name">{e.firstName} {e.lastName}</div>
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
