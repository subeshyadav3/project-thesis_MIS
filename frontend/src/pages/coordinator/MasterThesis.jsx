import React, { useState, useEffect, useMemo, useRef } from 'react';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

const PAGE_SIZE = 10;

function MasterThesis() {
  const toast = useToast();
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [supervisorFilter, setSupervisorFilter] = useState('ALL');
  const [assignSup, setAssignSup] = useState('');
  const [supSearch, setSupSearch] = useState('');
  const [supDropdownOpen, setSupDropdownOpen] = useState(false);
  const supRef = useRef(null);
  const [createSupSearch, setCreateSupSearch] = useState('');
  const [createSupOpen, setCreateSupOpen] = useState(false);
  const createSupRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/theses').then(({ data }) => setTheses(data)),
      api.get('/users/role/supervisor').then(({ data }) => { setSupervisors(data); setAllSupervisors(data); }),
      api.get('/departments/academic-years').then(({ data }) => setAcademicYears(data)),
      api.get('/users').then(({ data }) => setStudents(data.filter(u => u.role === 'STUDENT'))),
    ]).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (supRef.current && !supRef.current.contains(e.target)) {
        setSupDropdownOpen(false);
      }
    };
    if (supDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [supDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (createSupRef.current && !createSupRef.current.contains(e.target)) {
        setCreateSupOpen(false);
      }
    };
    if (createSupOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [createSupOpen]);

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

  const handleAssign = async (thesisId, supervisorId) => {
    if (!supervisorId) { toast.warning('Select a supervisor'); return; }
    try {
      await api.put(`/theses/${thesisId}/supervisor`, { supervisorId });
      toast.success('Supervisor assigned successfully');
      setShowDetail(null);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Assignment failed'); }
  };

  const handleComplete = async (id) => {
    try {
      await api.put(`/theses/${id}/status`, { status: 'COMPLETED' });
      toast.success('Thesis marked as completed');
      setShowDetail(null);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Status update failed'); }
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

  const filteredTheses = useMemo(() => {
    return theses.filter(t => {
      const searchStr = (
        t.title + ' ' +
        (t.student ? `${t.student.firstName} ${t.student.lastName} ${t.student.email}` : '') + ' ' +
        (t.supervisor ? `${t.supervisor.firstName} ${t.supervisor.lastName}` : '')
      ).toLowerCase();
      const matchesSearch = !searchTerm || searchStr.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchesYear = yearFilter === 'ALL' || t.academicYearId?.toString() === yearFilter;
      const matchesSupervisor = supervisorFilter === 'ALL'
        ? true
        : supervisorFilter === 'NONE'
          ? !t.supervisor
          : t.supervisor?.id?.toString() === supervisorFilter;
      return matchesSearch && matchesStatus && matchesYear && matchesSupervisor;
    });
  }, [theses, searchTerm, statusFilter, yearFilter, supervisorFilter]);

  const sortedTheses = useMemo(() => {
    return [...filteredTheses].sort((a, b) => {
      if (a.supervisor && !b.supervisor) return -1;
      if (!a.supervisor && b.supervisor) return 1;
      return 0;
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
    setDetailMode(mode);
    setAssignSup(t.supervisorId ? t.supervisorId.toString() : '');
    setSupSearch('');
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

  const filteredSupOptions = allSupervisors.filter(s =>
    `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(supSearch.toLowerCase())
  );

  return (
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
                  <span className="detail-label">Status</span>
                  <span className={`badge badge-${showDetail.status?.toLowerCase() || 'pending'}`}>
                    <span className="dot" />
                    {showDetail.status || 'PENDING'}
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
              <div className="detail-section" ref={supRef}>
                <h4 className="detail-section-title">Supervisor</h4>
                <div className="sup-dropdown-trigger">
                  <div className="sup-search-wrapper" onClick={() => setSupDropdownOpen(true)}>
                    <span className="material-symbols-outlined">search</span>
                    <input
                      type="text"
                      placeholder={assignSup ? allSupervisors.find(s => s.id.toString() === assignSup)?.firstName + ' ' + allSupervisors.find(s => s.id.toString() === assignSup)?.lastName || 'Search supervisor...' : 'Search supervisor...'}
                      value={supSearch}
                      onChange={e => { setSupSearch(e.target.value); setSupDropdownOpen(true); }}
                      onFocus={() => setSupDropdownOpen(true)}
                    />
                    {assignSup && (
                      <button className="sup-clear" onClick={(e) => { e.stopPropagation(); setAssignSup(''); setSupSearch(''); }}>
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    )}
                    <span className="material-symbols-outlined sup-dropdown-arrow">{supDropdownOpen ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
                  </div>
                  {supDropdownOpen && (
                    <div className="sup-dropdown">
                      {filteredSupOptions.length === 0 ? (
                        <div className="sup-dropdown-empty">No supervisors found</div>
                      ) : (
                        filteredSupOptions.map(s => {
                          const selected = assignSup === s.id.toString();
                          return (
                            <div
                              key={s.id}
                              className={`sup-dropdown-item ${selected ? 'sup-dropdown-item-selected' : ''}`}
                              onClick={() => { setAssignSup(s.id.toString()); setSupSearch(''); setSupDropdownOpen(false); }}
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
            )}

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowDetail(null)}>
                <span className="material-symbols-outlined">close</span>
                Close
              </button>
              {showDetail.status !== 'COMPLETED' && (
                <button className="btn btn-success" onClick={() => handleComplete(showDetail.id)}>
                  <span className="material-symbols-outlined">check_circle</span>
                  Mark Complete
                </button>
              )}
              {detailMode === 'edit' && (
                <button className="btn btn-primary" onClick={() => handleAssign(showDetail.id, assignSup)}>
                  <span className="material-symbols-outlined">save</span>
                  Update Supervisor
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
            <div className="search-input-wrapper">
              <span className="material-symbols-outlined">search</span>
              <input type="text" placeholder="Search theses, students, supervisors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
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
          <div className="loading-state">
            <span className="material-symbols-outlined">progress_activity</span>
            <p>Loading theses...</p>
          </div>
        ) : sortedTheses.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">library_books</span>
            <h3>No theses found</h3>
            <p>{searchTerm || statusFilter !== 'ALL' || yearFilter !== 'ALL' || supervisorFilter !== 'ALL' ? 'Try adjusting your filters or search.' : 'Upload an Excel file or create a thesis to get started.'}</p>
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
                  <tr key={t.id} className="clickable-row" onClick={() => openDetail(t, 'view')}>
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
                          <>
                            <button className="btn btn-sm btn-outline-primary" onClick={() => openDetail(t, 'edit')}>
                              <span className="material-symbols-outlined">edit</span>
                              Edit
                            </button>
                            <button className="btn btn-sm btn-success" onClick={(e) => { e.stopPropagation(); handleComplete(t.id); }}>
                              <span className="material-symbols-outlined">check_circle</span>
                              Complete
                            </button>
                          </>
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
              {totalPages > 1 && (
                <div className="pagination">
                  <button className="btn btn-xs btn-outline" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
                    <span className="material-symbols-outlined">first_page</span>
                  </button>
                  <button className="btn btn-xs btn-outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '...' ? (
                        <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
                      ) : (
                        <button
                          key={p}
                          className={`btn btn-xs ${p === currentPage ? 'pagination-active' : 'btn-outline'}`}
                          onClick={() => setCurrentPage(p)}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button className="btn btn-xs btn-outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                  <button className="btn btn-xs btn-outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>
                    <span className="material-symbols-outlined">last_page</span>
                  </button>
                </div>
              )}
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
                <select value={createForm.studentId} onChange={e => setCreateForm({...createForm, studentId: e.target.value})} required>
                  <option value="">Select a student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.email})</option>)}
                </select>
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
    </PageLayout>
  );
}

export default MasterThesis;
