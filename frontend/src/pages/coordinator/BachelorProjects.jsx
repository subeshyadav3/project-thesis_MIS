import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import Pagination from '../../components/Pagination';

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
  const [selectedProjectType, setSelectedProjectType] = useState('MINOR');
  const [uploadProjectType, setUploadProjectType] = useState('MINOR');
  const [createForm, setCreateForm] = useState({ name: '', projectTitle: '', projectType: 'MINOR', academicYearId: '', supervisorId: '', examinerId: '', students: [{ firstName: '', lastName: '', rollNumber: '', studentId: '' }] });
  const [examiners, setExaminers] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [supervisorFilter, setSupervisorFilter] = useState('ALL');
  const [createSupSearch, setCreateSupSearch] = useState('');
  const [createSupOpen, setCreateSupOpen] = useState(false);
  const createSupRef = useRef(null);
  const [examSearch, setExamSearch] = useState('');
  const [examOpen, setExamOpen] = useState(false);
  const examRef = useRef(null);
  const [editSupId, setEditSupId] = useState('');
  const [editExamId, setEditExamId] = useState('');
  const [editSupSearch, setEditSupSearch] = useState('');
  const [editExamSearch, setEditExamSearch] = useState('');
  const [editSupOpen, setEditSupOpen] = useState(false);
  const [editExamOpen, setEditExamOpen] = useState(false);
  const editSupRef = useRef(null);
  const editExamRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingStudentIdx, setEditingStudentIdx] = useState(null);
  const [newStudentSearch, setNewStudentSearch] = useState('');
  const [newStudentOpen, setNewStudentOpen] = useState(false);
  const newStudentRef = useRef(null);
  const [programs, setPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    setLoading(true);
    Promise.all([
      api.get('/groups', { signal }).then(({ data }) => setGroups(data)),
      api.get('/users/role/supervisor?all=true', { signal }).then(({ data }) => { setSupervisors(data); setAllSupervisors(data); }),
      api.get('/users/role/external_examiner?all=true', { signal }).then(({ data }) => setExaminers(data)),
      api.get('/departments/academic-years', { signal }).then(({ data }) => setAcademicYears(data)),
      api.get('/users/role/STUDENT?all=true&degreeType=BACHELOR', { signal }).then(({ data }) => setAllStudents(data)),
      api.get('/departments/programs', { signal }).then(({ data }) => setPrograms(data)),
    ]).catch((err) => { if (err.name !== 'CanceledError') console.error(err); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);
  
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
      if (newStudentRef.current && !newStudentRef.current.contains(e.target)) {
        setNewStudentOpen(false);
      }
    };
    if (newStudentOpen) document.addEventListener('mousedown', handleStudentOutside);
    return () => document.removeEventListener('mousedown', handleStudentOutside);
  }, [newStudentOpen]);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedYear) { toast.warning('Select file and academic year'); return; }
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('academicYearId', selectedYear);
    formData.append('projectType', uploadProjectType);
    try {
      await api.post('/groups/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Groups imported successfully');
      setShowUpload(false);
      setSelectedFile(null);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Upload failed'); }
  };

  const handleComplete = async (id) => {
    try {
      await api.put(`/groups/${id}/status`, { status: 'COMPLETED' });
      toast.success('Group marked as completed');
      setShowDetail(null);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Status update failed'); }
  };

  const handleEditSave = async (groupId) => {
    try {
      const promises = [];
      if (editSupId !== undefined) {
        const currentSup = showDetail?.supervisorId?.toString();
        if (editSupId !== currentSup) {
          promises.push(api.put(`/groups/${groupId}/supervisor`, { supervisorId: parseInt(editSupId) || null }));
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
            promises.push(api.post('/examiner-assignments/group', { groupId, externalExaminerId: parseInt(editExamId) }));
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

  const handleCreate = async (e) => {
    e.preventDefault();
    const students = createForm.students.filter(s => s.studentId);
    try {
      const payload = {
        ...createForm,
        students: students.map(s => ({ studentId: s.studentId, rollNumber: s.rollNumber })),
        programId: selectedProgramId || undefined,
      };
      const { data: group } = await api.post('/groups', payload);
      if (createForm.examinerId) {
        await api.post('/examiner-assignments/group', { groupId: group.id, externalExaminerId: parseInt(createForm.examinerId) });
      }
      toast.success('Group created successfully');
      setShowCreate(false);
      setCreateForm({ name: '', projectTitle: '', projectType: 'MINOR', academicYearId: '', supervisorId: '', examinerId: '', students: [{ firstName: '', lastName: '', rollNumber: '', studentId: '' }] });
      setSelectedProgramId('');
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Create failed'); }
  };

  const addStudentField = () => {
    if (createForm.students.length >= 4) return;
    setCreateForm({ ...createForm, students: [...createForm.students, { firstName: '', lastName: '', rollNumber: '', studentId: '' }] });
  };

  const removeStudentField = (idx) => {
    setCreateForm({ ...createForm, students: createForm.students.filter((_, i) => i !== idx) });
  };

const updateStudent = (idx, field, value) => {
  const updated = [...createForm.students];
  updated[idx] = { ...updated[idx], [field]: value };
  setCreateForm({ ...createForm, students: updated });
};

const startEditStudent = (idx) => {
  setEditingStudentIdx(idx);
  setNewStudentSearch('');
  setNewStudentOpen(true);
};

const selectStudent = (idx, student) => {
  const updated = [...createForm.students];
  updated[idx] = { firstName: student.firstName, lastName: student.lastName, rollNumber: student.rollNumber || '', studentId: Number(student.id) };
  setCreateForm({ ...createForm, students: updated });
  setEditingStudentIdx(null);
  setNewStudentSearch('');
  setNewStudentOpen(false);
};

const clearStudent = (idx) => {
  const updated = [...createForm.students];
  updated[idx] = { firstName: '', lastName: '', rollNumber: '', studentId: '' };
  setCreateForm({ ...createForm, students: updated });
  setEditingStudentIdx(null);
};

const getMatchedStudent = (roll) => {
  if (!roll) return null;
  return allStudents.find(s => s.rollNumber && s.rollNumber.toLowerCase() === roll.toLowerCase());
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
      const matchesType = typeFilter === 'ALL' || g.projectType === typeFilter;
      const matchesYear = yearFilter === 'ALL' || g.academicYearId?.toString() === yearFilter;
      const matchesSupervisor = supervisorFilter === 'ALL'
        ? true
        : supervisorFilter === 'NONE'
          ? !g.supervisor
          : g.supervisor?.id?.toString() === supervisorFilter;
      return matchesSearch && matchesStatus && matchesType && matchesYear && matchesSupervisor;
    });
  }, [groups, searchTerm, statusFilter, typeFilter, yearFilter, supervisorFilter]);

  const sortedGroups = useMemo(() => {
    return [...filteredGroups].sort((a, b) => {
      const statusOrder = { ACTIVE: 0, COMPLETED: 1 };
      return (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
    });
  }, [filteredGroups]);

  const totalPages = Math.ceil(sortedGroups.length / PAGE_SIZE);
  const paginatedGroups = sortedGroups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const pendingCount = groups.filter(g => !g.supervisor).length;
  const assignedCount = groups.filter(g => g.supervisor).length;
  const minorCount = groups.filter(g => g.projectType === 'MINOR').length;
  const majorCount = groups.filter(g => g.projectType === 'MAJOR').length;

  const openDetail = (g, mode) => {
    setShowDetail(g);
    setDetailMode(mode || 'view');
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

  const typeOptions = [
    { value: 'MINOR', label: 'Minor' },
    { value: 'MAJOR', label: 'Major' },
  ];

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
    <PageLayout title="Bachelor Projects" user={user} actions={actions}>
      {showDetail && (
        <div className="modal-overlay" onClick={() => { setShowDetail(null); setDetailMode('view'); }}>
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
                  <span className="detail-label">Type</span>
                  <span className={`badge badge-${showDetail.projectType === 'MAJOR' ? 'warning' : 'info'}`}>
                    <span className="dot" />
                    {showDetail.projectType === 'MAJOR' ? 'Major' : 'Minor'}
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
              <button className="btn btn-outline" onClick={() => { setShowDetail(null); setDetailMode('view'); }}>                <span className="material-symbols-outlined">close</span>
                Close
              </button>
              {detailMode === 'edit' && (
                <button className="btn btn-primary" onClick={() => handleEditSave(showDetail.id)}>
                  <span className="material-symbols-outlined">save</span>
                  Save Changes
                </button>
              )}
              {showDetail.status !== 'COMPLETED' && detailMode !== 'edit' && (
                <button className="btn btn-success" onClick={() => handleComplete(showDetail.id)}>
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
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">star</span></div>
          <div className="stat-number">{minorCount}</div>
          <div className="stat-label">Minor</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">stars</span></div>
          <div className="stat-number">{majorCount}</div>
          <div className="stat-label">Major</div>
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
          <FilterDropdown label="Type" value={typeFilter} onChange={setTypeFilter} options={typeOptions} allLabel="All Types" />
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
                  <th>Type</th>
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
                        <button className="btn btn-sm btn-outline-primary" onClick={() => { openDetail(g, 'edit'); setEditSupId(g.supervisorId ? g.supervisorId.toString() : ''); setEditExamId(g.examinerAssignments?.[0]?.externalExaminerId?.toString() || ''); setEditSupSearch(''); setEditExamSearch(''); }}>
                          <span className="material-symbols-outlined">edit</span>
                          Edit
                        </button>
                        {g.status !== 'COMPLETED' && (
                          <>

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
                <label>Project Type</label>
                <select value={uploadProjectType} onChange={e => setUploadProjectType(e.target.value)}>
                  <option value="MINOR">Minor Project</option>
                  <option value="MAJOR">Major Project</option>
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
              <div className="form-group">
                <label>Project Type</label>
                <select value={createForm.projectType} onChange={e => setCreateForm({...createForm, projectType: e.target.value})}>
                  <option value="MINOR">Minor Project</option>
                  <option value="MAJOR">Major Project</option>
                </select>
              </div>
              <div className="form-group">
                <label>Program</label>
                <select value={selectedProgramId} onChange={e => setSelectedProgramId(e.target.value)} required>
                  <option value="">Select program...</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
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
{createForm.students.map((st, idx) => {
  const selectedStudent = allStudents.find(s => s.id === st.studentId);
  const isEditing = editingStudentIdx === idx;
  return (
    <div key={idx} className="student-row">
      <div className="student-row-fields">
        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
          <label style={{ fontSize: 11 }}>Student {idx + 1}</label>
          <div className="sup-dropdown-trigger" ref={isEditing ? newStudentRef : undefined}>
            <div className="sup-search-wrapper" onClick={() => startEditStudent(idx)}>
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder={st.studentId ? `${st.firstName} ${st.lastName} (${st.rollNumber || 'no roll'})` : 'Click to select student...'}
                value={isEditing ? newStudentSearch : (st.studentId ? `${st.firstName} ${st.lastName}` : '')}
                onChange={e => { setNewStudentSearch(e.target.value); setNewStudentOpen(true); if (editingStudentIdx !== idx) setEditingStudentIdx(idx); }}
                onFocus={() => { if (editingStudentIdx !== idx) setEditingStudentIdx(idx); }}
                readOnly={!!st.studentId && !isEditing}
              />
              {st.studentId && isEditing && (
                <button className="sup-clear" onClick={(e) => { e.stopPropagation(); clearStudent(idx); setEditingStudentIdx(null); }}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
              <span className="material-symbols-outlined sup-dropdown-arrow">{isEditing && newStudentOpen ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
            </div>
            {isEditing && newStudentOpen && (
              <div className="sup-dropdown">
                {allStudents.length === 0 ? (
                  <div className="sup-dropdown-empty">Loading students...</div>
                ) : (() => {
                  const filteredStudents = allStudents.filter(s => {
                    if (String(st.studentId) === String(s.id)) return false;
                    if (selectedProgramId && String(s.programId) !== String(selectedProgramId)) return false;
                    const q = newStudentSearch.toLowerCase().trim();
                    if (!q) return true;
                    return `${s.firstName} ${s.lastName} ${s.email || ''}`.toLowerCase().includes(q);
                  });
                  if (filteredStudents.length === 0) {
                    return <div className="sup-dropdown-empty">No students found</div>;
                  }
                  return filteredStudents.map(s => {
                    const isSelected = String(st.studentId) === String(s.id);
                    return (
                      <div
                        key={s.id}
                        className={`sup-dropdown-item ${isSelected ? 'sup-dropdown-item-selected' : ''}`}
                        onClick={() => selectStudent(idx, s)}
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
      </div>
      {createForm.students.length > 1 && (
        <button type="button" className="btn btn-xs btn-ghost" onClick={() => removeStudentField(idx)} style={{ color: 'var(--color-error)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
        </button>
      )}
    </div>
  );
})}
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
