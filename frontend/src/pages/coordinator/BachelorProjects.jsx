import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

const PAGE_SIZE = 10;

function BachelorProjects() {
  const toast = useToast();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [allSupervisors, setAllSupervisors] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [detailMode, setDetailMode] = useState('view');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [createForm, setCreateForm] = useState({ name: '', projectTitle: '', academicYearId: '', supervisorId: '', students: [{ firstName: '', lastName: '', rollNumber: '' }] });
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
      api.get('/groups').then(({ data }) => setGroups(data)),
      api.get('/users/role/supervisor').then(({ data }) => { setSupervisors(data); setAllSupervisors(data); }),
      api.get('/departments/academic-years').then(({ data }) => setAcademicYears(data)),
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
      await api.post('/groups/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Groups imported successfully');
      setShowUpload(false);
      setSelectedFile(null);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Upload failed'); }
  };

  const handleAssign = async (groupId, supervisorId) => {
    if (!supervisorId) { toast.warning('Select a supervisor'); return; }
    try {
      await api.put(`/groups/${groupId}/supervisor`, { supervisorId });
      toast.success('Supervisor assigned successfully');
      setShowDetail(null);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Assignment failed'); }
  };

  const handleComplete = async (id) => {
    try {
      await api.put(`/groups/${id}/status`, { status: 'COMPLETED' });
      toast.success('Group marked as completed');
      setShowDetail(null);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Status update failed'); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const students = createForm.students.filter(s => s.firstName.trim() || s.rollNumber.trim());
    try {
      await api.post('/groups', { ...createForm, students });
      toast.success('Group created successfully');
      setShowCreate(false);
      setCreateForm({ name: '', projectTitle: '', academicYearId: '', supervisorId: '', students: [{ firstName: '', lastName: '', rollNumber: '' }] });
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Create failed'); }
  };

  const addStudentField = () => {
    if (createForm.students.length >= 4) return;
    setCreateForm({ ...createForm, students: [...createForm.students, { firstName: '', lastName: '', rollNumber: '' }] });
  };

  const removeStudentField = (idx) => {
    setCreateForm({ ...createForm, students: createForm.students.filter((_, i) => i !== idx) });
  };

  const updateStudent = (idx, field, value) => {
    const updated = [...createForm.students];
    updated[idx] = { ...updated[idx], [field]: value };
    setCreateForm({ ...createForm, students: updated });
  };

  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const searchStr = (
        g.name + ' ' +
        g.projectTitle + ' ' +
        (g.supervisor ? `${g.supervisor.firstName} ${g.supervisor.lastName}` : '') + ' ' +
        (g.members || []).map(m => `${m.student?.firstName || ''} ${m.student?.lastName || ''}`).join(' ')
      ).toLowerCase();
      const matchesSearch = !searchTerm || searchStr.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter;
      const matchesYear = yearFilter === 'ALL' || g.academicYearId?.toString() === yearFilter;
      const matchesSupervisor = supervisorFilter === 'ALL'
        ? true
        : supervisorFilter === 'NONE'
          ? !g.supervisor
          : g.supervisor?.id?.toString() === supervisorFilter;
      return matchesSearch && matchesStatus && matchesYear && matchesSupervisor;
    });
  }, [groups, searchTerm, statusFilter, yearFilter, supervisorFilter]);

  const sortedGroups = useMemo(() => {
    return [...filteredGroups].sort((a, b) => {
      if (a.supervisor && !b.supervisor) return -1;
      if (!a.supervisor && b.supervisor) return 1;
      return 0;
    });
  }, [filteredGroups]);

  const totalPages = Math.ceil(sortedGroups.length / PAGE_SIZE);
  const paginatedGroups = sortedGroups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const pendingCount = groups.filter(g => !g.supervisor).length;
  const assignedCount = groups.filter(g => g.supervisor).length;

  const openDetail = (g, mode) => {
    setShowDetail(g);
    setDetailMode(mode);
    setAssignSup(g.supervisorId ? g.supervisorId.toString() : '');
    setSupSearch('');
  };

  const safeMembers = (g) => (g.members || []).filter(m => m.student);

  const formatAcademicYear = (ay) => {
    if (!ay) return '';
    const year = ay.year || '';
    return year;
  };

  const actions = (
    <>
      <button className="btn btn-secondary btn-sm" onClick={() => setShowUpload(true)}>
        <span className="material-symbols-outlined">upload_file</span>
        Upload Excel
      </button>
      <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
        <span className="material-symbols-outlined">add</span>
        Add Group
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
    <PageLayout title="Bachelor Projects" user={user} actions={actions}>
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <span className="material-symbols-outlined">school</span>
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
                  <span className="detail-label">Academic Year</span>
                  <span>{formatAcademicYear(showDetail.academicYear) || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Created</span>
                  <span>{showDetail.createdAt ? new Date(showDetail.createdAt).toLocaleDateString() : '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Assigned</span>
                  <span>{showDetail.supervisor
                    ? `${showDetail.supervisor.firstName} ${showDetail.supervisor.lastName}`
                    : <span className="badge badge-pending"><span className="dot" />Unassigned</span>
                  }</span>
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
                            <div className="default-badge" style={{ width: 28, height: 28, fontSize: 11 }}>
                              {m.student?.firstName?.[0] || ''}{m.student?.lastName?.[0] || ''}
                            </div>
                            {m.student?.firstName || ''} {m.student?.lastName || ''}
                          </div>
                        </td>
                        <td>{m.rollNumber || '—'}</td>
                        <td>{m.student?.email || '—'}</td>
                      </tr>
                    ))
                  )}
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
          <div className="stat-icon"><span className="material-symbols-outlined">groups</span></div>
          <div className="stat-number">{groups.length}</div>
          <div className="stat-label">Total Groups</div>
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
              <input type="text" placeholder="Search groups, members, supervisors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="table-toolbar-right">
            <span className="font-label text-xs font-semibold text-on-surface-variant">{sortedGroups.length} groups</span>
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
            <p>Loading groups...</p>
          </div>
        ) : sortedGroups.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">school</span>
            <h3>No groups found</h3>
            <p>{searchTerm || statusFilter !== 'ALL' || yearFilter !== 'ALL' || supervisorFilter !== 'ALL' ? 'Try adjusting your filters or search.' : 'Upload an Excel file or create a group to get started.'}</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Project Title</th>
                  <th>Members</th>
                  <th>Supervisor</th>
                  <th>Status</th>
                  <th>Year</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedGroups.map(g => (
                  <tr key={g.id} onClick={() => navigate(`/coordinator/project/group/${g.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="default-badge">{g.name?.slice(0, 2).toUpperCase()}</div>
                        <span style={{ fontWeight: 500 }}>{g.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-on-surface-variant)' }}>{g.projectTitle}</td>
                    <td>
                      <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>
                        {safeMembers(g).map(m => `${m.student?.firstName || ''} ${m.student?.lastName || ''}`).join(', ') || '—'}
                      </span>
                    </td>
                    <td>
                      {g.supervisor ? (
                        <span style={{ fontWeight: 500, color: 'var(--color-primary)' }}>
                          {g.supervisor.firstName} {g.supervisor.lastName}
                        </span>
                      ) : (
                        <span className="badge badge-pending">
                          <span className="dot" />
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${g.status?.toLowerCase() || 'pending'}`}>
                        <span className="dot" />
                        {g.status || 'PENDING'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>
                      {formatAcademicYear(g.academicYear) || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => openDetail(g, 'view')}>
                          <span className="material-symbols-outlined">visibility</span>
                          View
                        </button>
                        {g.status !== 'COMPLETED' && (
                          <>
                            <button className="btn btn-sm btn-outline-primary" onClick={() => openDetail(g, 'edit')}>
                              <span className="material-symbols-outlined">edit</span>
                              Edit
                            </button>
                            <button className="btn btn-sm btn-success" onClick={(e) => { e.stopPropagation(); handleComplete(g.id); }}>
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
                {sortedGroups.length > 0
                  ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, sortedGroups.length)} of ${sortedGroups.length}`
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
                <p>Import groups from an Excel spreadsheet</p>
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
                Required columns: Group Name, Project Title, Member Names, Roll Numbers
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
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <span className="material-symbols-outlined">add</span>
              </div>
              <div className="modal-header-text">
                <h2>Create Group</h2>
                <p>Add a new project group with students</p>
              </div>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Group Name</label>
                <input value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} required placeholder="Enter group name" />
              </div>
              <div className="form-group">
                <label>Project Title</label>
                <input value={createForm.projectTitle} onChange={e => setCreateForm({...createForm, projectTitle: e.target.value})} required placeholder="Enter project title" />
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

              <div className="detail-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h4 className="detail-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Students (max 4)</h4>
                  {createForm.students.length < 4 && (
                    <button type="button" className="btn btn-xs btn-outline" onClick={addStudentField}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                      Add Student
                    </button>
                  )}
                </div>
                {createForm.students.map((st, idx) => (
                  <div key={idx} className="student-row">
                    <div className="student-row-fields">
                      <input
                        value={st.firstName}
                        onChange={e => updateStudent(idx, 'firstName', e.target.value)}
                        placeholder="First name"
                      />
                      <input
                        value={st.lastName}
                        onChange={e => updateStudent(idx, 'lastName', e.target.value)}
                        placeholder="Last name"
                      />
                      <input
                        value={st.rollNumber}
                        onChange={e => updateStudent(idx, 'rollNumber', e.target.value)}
                        placeholder="Roll no (e.g. 080BCT084)"
                      />
                    </div>
                    {createForm.students.length > 1 && (
                      <button type="button" className="btn btn-xs btn-ghost" onClick={() => removeStudentField(idx)} style={{ color: 'var(--color-error)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                      </button>
                    )}
                  </div>
                ))}
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

export default BachelorProjects;
