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

function BachelorProjects() {
  const toast = useToast();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [allSupervisors, setAllSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [detailMode, setDetailMode] = useState('view');
  const [selectedFile, setSelectedFile] = useState(null);
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const [createForm, setCreateForm] = useState({ name: '', projectTitle: '', projectType: 'MINOR', status: 'ACTIVE', startDate: todayStr, endDate: '', supervisorId: '', examinerId: '', batch: '', students: [{ firstName: '', lastName: '', rollNumber: '', studentId: '' }] });
  const [examiners, setExaminers] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
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
  const [editStatus, setEditStatus] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const editSupRef = useRef(null);
  const editExamRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingStudentIdx, setEditingStudentIdx] = useState(null);
  const [newStudentSearch, setNewStudentSearch] = useState('');
  const [newStudentOpen, setNewStudentOpen] = useState(false);
  const newStudentRef = useRef(null);
  const [programs, setPrograms] = useState([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const selectAllRef = useRef(null);
  const [bulkSupervisorId, setBulkSupervisorId] = useState('');
  const [pdfPreviewItem, setPdfPreviewItem] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null, danger: false });
  const [actionMenuRow, setActionMenuRow] = useState(null);

  const loadData = useCallback(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    setLoading(true);
    Promise.all([
      api.get('/groups', { signal }).then(({ data }) => setGroups(data)),
      api.get('/users/role/supervisor?all=true', { signal }).then(({ data }) => { setSupervisors(data); setAllSupervisors(data); }),
      api.get('/users/role/external_examiner?all=true', { signal }).then(({ data }) => setExaminers(data)),
      api.get(`/users/role/STUDENT?all=true&degreeType=BACHELOR${user.program?.id ? '&programId=' + user.program.id : ''}`, { signal }).then(({ data }) => setAllStudents(data)),
    ]).catch((err) => { if (err.name !== 'CanceledError') console.error(err); }).finally(() => setLoading(false));
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
      if (newStudentRef.current && !newStudentRef.current.contains(e.target)) {
        setNewStudentOpen(false);
      }
    };
    if (newStudentOpen) document.addEventListener('mousedown', handleStudentOutside);
    return () => document.removeEventListener('mousedown', handleStudentOutside);
  }, [newStudentOpen]);

  useEffect(() => {
    const handleClick = () => setActionMenuRow(null);
    if (actionMenuRow) {
      document.addEventListener('click', handleClick);
    }
    return () => document.removeEventListener('click', handleClick);
  }, [actionMenuRow]);

  const updateGroupStatus = async (groupId, newStatus) => {
    setUpdatingStatus(groupId);
    try {
      await api.put(`/groups/${groupId}/status`, { status: newStatus });
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, status: newStatus } : g));
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Status update failed');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const downloadEvalPdf = async (group) => {
    try {
      const { data } = await api.get(`/print/group/${group.id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluation_${group.name || group.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download PDF');
    }
  };

  const resetUploadModal = () => {
    setSelectedFile(null);
    setBulkPreview(null);
    setBulkLoading(false);
    setShowUpload(false);
  };

  const handleBulkPreview = async (e) => {
    e.preventDefault();
    if (!selectedFile) { toast.warning('Select a file'); return; }
    setBulkLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const { data } = await api.post('/groups/bulk-import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
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
        groupName: p.groupName,
        projectTitle: p.projectTitle,
        projectType: p.projectType,
        members: p.members,
        rolls: p.rolls,
        batch: p.batch,
        programId: p.programId,
        studentMatches: p.studentMatches,
        supervisorMatch: p.supervisorMatch,
        supervisorWillCreate: p.supervisorWillCreate,
        examinerMatch: p.examinerMatch,
        examinerWillCreate: p.examinerWillCreate,
      }));
      await api.post('/groups/bulk-import/confirm', { rows });
      toast.success(`${bulkPreview.stats.matched} groups imported`);
      resetUploadModal();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const confirmComplete = (id) => {
    setConfirmDialog({
      open: true,
      title: 'Mark as Complete',
      message: 'Are you sure you want to mark this group as completed?',
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        handleComplete(id);
      },
      danger: false,
    });
  };

  const handleComplete = async (id) => {
    try {
      await api.put(`/groups/${id}/status`, { status: 'COMPLETED' });
      toast.success('Group marked as completed');
      setShowDetail(null);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Status update failed'); }
  };

  const confirmDeleteGroup = (id) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Group',
      message: 'Are you sure you want to delete this pending group? This cannot be undone.',
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        handleDeleteGroup(id);
      },
      danger: true,
    });
  };

  const handleDeleteGroup = async (id) => {
    try {
      await api.delete(`/groups/${id}`);
      toast.success('Group deleted');
      setShowDetail(null);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
  };

  const handleEditSave = async (groupId) => {
    try {
      const promises = [];
      if (editTitle !== undefined && editTitle !== showDetail.projectTitle) {
        promises.push(api.put(`/groups/${groupId}`, { projectTitle: editTitle }));
      }
      if (editDescription !== undefined && editDescription !== (showDetail.description || '')) {
        promises.push(api.put(`/groups/${groupId}`, { description: editDescription }));
      }
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
      if (editStatus && editStatus !== showDetail.status) {
        promises.push(api.put(`/groups/${groupId}/status`, { status: editStatus }));
      }
      if (editStartDate !== undefined) {
        const current = showDetail.startDate ? new Date(showDetail.startDate).toISOString().split('T')[0] : '';
        if (editStartDate !== current) {
          promises.push(api.put(`/groups/${groupId}`, { startDate: editStartDate || null }));
        }
      }
      if (editEndDate !== undefined) {
        const current = showDetail.endDate ? new Date(showDetail.endDate).toISOString().split('T')[0] : '';
        if (editEndDate !== current) {
          promises.push(api.put(`/groups/${groupId}`, { endDate: editEndDate || null }));
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
    if (!createForm.name.trim() || !createForm.projectTitle.trim()) {
      toast.warning('Group name and project title are required');
      return;
    }
    const students = createForm.students.filter(s => s.studentId);
    try {
      const payload = {
        name: createForm.name,
        projectTitle: createForm.projectTitle,
        projectType: createForm.projectType,
        status: createForm.status,
        startDate: createForm.startDate || null,
        batch: createForm.batch,
        supervisorId: createForm.supervisorId,
        programId: user.program?.id,
        students: students.map(s => ({ studentId: s.studentId, rollNumber: s.rollNumber })),
      };
      const { data: group } = await api.post('/groups', payload);
      if (createForm.examinerId) {
        await api.post('/examiner-assignments/group', { groupId: group.id, externalExaminerId: parseInt(createForm.examinerId) });
      }
      toast.success('Group created successfully');
      setShowCreate(false);
      setCreateForm({ name: '', projectTitle: '', projectType: 'MINOR', status: 'ACTIVE', startDate: todayStr, endDate: '', supervisorId: '', examinerId: '', batch: '', students: [{ firstName: '', lastName: '', rollNumber: '', studentId: '' }] });
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
    const q = searchQuery.toLowerCase().trim();
    if (!q) return groups;
    return groups.filter(g =>
      g.name.toLowerCase().includes(q) || (g.projectTitle || '').toLowerCase().includes(q)
    );
  }, [groups, searchQuery]);

  const filteredByAdvanced = useMemo(() => {
    return filteredGroups.filter(g => {
      const searchStr = (
        g.name + ' ' +
        g.projectTitle + ' ' +
        (g.supervisor ? `${g.supervisor.designation ? g.supervisor.designation + ' ' : ''}${g.supervisor.firstName} ${g.supervisor.lastName}` : '') + ' ' +
        (g.members || []).map(m => `${m.student?.firstName || ''} ${m.student?.lastName || ''}`).join(' ')
      ).toLowerCase();
      const matchesSearch = !searchTerm || searchStr.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || g.projectType === typeFilter;
      const matchesSupervisor = supervisorFilter === 'ALL'
        ? true
        : supervisorFilter === 'NONE'
          ? !g.supervisor
          : g.supervisor?.id?.toString() === supervisorFilter;
      return matchesSearch && matchesStatus && matchesType && matchesSupervisor;
    });
  }, [filteredGroups, searchTerm, statusFilter, typeFilter, supervisorFilter]);

  const sortedGroups = useMemo(() => {
    return [...filteredByAdvanced].sort((a, b) => {
      const statusOrder = { PENDING: 0, ACTIVE: 1, OVERDUE: 1, COMPLETED: 2 };
      return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
    });
  }, [filteredByAdvanced]);

  const totalPages = Math.ceil(sortedGroups.length / PAGE_SIZE);
  const paginatedGroups = sortedGroups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  useEffect(() => {
    if (selectAllRef.current) {
      const allIds = paginatedGroups.map(g => g.id);
      const selectedIds = selectedGroups.map(g => g.id);
      const selectedOnPage = selectedGroups.filter(g => allIds.includes(g.id)).length;
      selectAllRef.current.indeterminate = selectedOnPage > 0 && selectedOnPage < allIds.length;
    }
  }, [selectedGroups, paginatedGroups]);

  const toggleSelectAll = () => {
    const allIds = paginatedGroups.map(g => g.id);
    const allSelected = allIds.every(id => selectedGroups.some(g => g.id === id));
    if (allSelected) {
      setSelectedGroups(prev => prev.filter(g => !allIds.includes(g.id)));
    } else {
      const newGroups = paginatedGroups.filter(g => !selectedGroups.some(sg => sg.id === g.id));
      setSelectedGroups(prev => [...prev, ...newGroups]);
    }
  };

  const pendingCount = groups.filter(g => !g.supervisor).length;
  const assignedCount = groups.filter(g => g.supervisor).length;
  const minorCount = groups.filter(g => g.projectType === 'MINOR').length;
  const majorCount = groups.filter(g => g.projectType === 'MAJOR').length;

  const openDetail = (g, mode) => {
    setShowDetail(g);
    setDetailMode(mode || 'view');
    if (mode === 'edit') {
      setEditTitle(g.projectTitle || '');
      setEditDescription(g.description || '');
      setEditStatus(g.status || '');
      setEditStartDate(g.startDate ? new Date(g.startDate).toISOString().split('T')[0] : '');
      setEditEndDate(g.endDate ? new Date(g.endDate).toISOString().split('T')[0] : '');
    }
  };

  const safeMembers = (g) => (g.members || []).filter(m => m.student);

  const actions = (
    <>
      <button className="btn btn-secondary btn-sm" onClick={() => setShowUpload(true)}>
        <span className="material-symbols-outlined">upload_file</span>
        Bulk Upload
      </button>
      <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
        <span className="material-symbols-outlined">add</span>
        Add Group
      </button>
      <button className="btn btn-outline btn-sm" onClick={async () => {
        try {
          const { data } = await api.post('/groups/export', {}, { responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([data]));
          const a = document.createElement('a'); a.href = url; a.download = 'groups.xlsx'; a.click();
          window.URL.revokeObjectURL(url);
          toast.success('Groups exported');
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

  const typeOptions = [
    { value: 'MINOR', label: 'Minor' },
    { value: 'MAJOR', label: 'Major' },
  ];

  const statusOptions = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'OVERDUE', label: 'Overdue' },
    { value: 'COMPLETED', label: 'Completed' },
  ];

  const supervisorOptions = [
    { value: 'NONE', label: 'Unassigned' },
    ...supervisors.map(s => ({
      value: s.id.toString(),
      label: `${s.designation ? s.designation + ' ' : ''}${s.firstName} ${s.lastName}`,
    })),
  ];

  return (
    <ErrorBoundary>
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
              <div className="modal-header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {showDetail.status === 'PENDING' && detailMode === 'view' && (
                  <button className="btn btn-sm btn-primary" onClick={() => { setDetailMode('edit'); setEditTitle(showDetail.projectTitle || ''); setEditDescription(showDetail.description || ''); setEditStatus('ACTIVE'); }}>
                    <span className="material-symbols-outlined">play_arrow</span>
                    Make Active
                  </button>
                )}
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
                  <span className="detail-label">Batch</span>
                  <span>{showDetail.batch || '—'}</span>
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
                  <span>{showDetail.supervisor
                    ? `${showDetail.supervisor.designation ? showDetail.supervisor.designation + ' ' : ''}${showDetail.supervisor.firstName} ${showDetail.supervisor.lastName}`
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
                  <div className="form-group" style={{ flex: 1, minWidth: 300 }}>
                    <label>Project Title</label>
                    <input className="form-input" type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 300 }}>
                    <label>Description</label>
                    <textarea className="form-input" rows={3} value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Project description..." />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                    <label>Status</label>
                    <select className="form-input" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                      <option value="PENDING">Pending</option>
                      <option value="ACTIVE">Active</option>
                      <option value="OVERDUE">Overdue</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                    <label>Start Date</label>
                    <input type="date" className="form-input" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                    <label>End Date <span style={{ fontWeight: 400, color: 'var(--color-on-surface-variant)' }}>(optional)</span></label>
                    <input type="date" className="form-input" value={editEndDate} onChange={e => { setEditEndDate(e.target.value); }} />
                    {!editEndDate && <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>Not Added</span>}
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
                  <div className="form-group" ref={editExamRef} style={{ flex: 1, minWidth: 250 }}>
                    <label>Internal Examiner</label>
                    <div className="sup-dropdown-trigger">
                      <div className="sup-search-wrapper" onClick={() => setEditExamOpen(true)}>
                        <span className="material-symbols-outlined">search</span>
                        <input
                          type="text"
                          placeholder={editExamId ? ((found) => found ? `${found.designation ? found.designation + ' ' : ''}${found.firstName} ${found.lastName}` : 'Search examiner...')(examiners.find(e => e.id.toString() === editExamId)) : 'No examiner'}
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
                          {examiners.filter(e => `${e.designation ? e.designation + ' ' : ''}${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(editExamSearch.toLowerCase())).length === 0 ? (
                            <div className="sup-dropdown-empty">No examiners found</div>
                          ) : (
                            examiners.filter(e => `${e.designation ? e.designation + ' ' : ''}${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(editExamSearch.toLowerCase())).map(e => {
                              const selected = editExamId === e.id.toString();
                              return (
                                <div
                                  key={e.id}
                                  className={`sup-dropdown-item ${selected ? 'sup-dropdown-item-selected' : ''}`}
                                  onClick={() => { setEditExamId(e.id.toString()); setEditExamSearch(''); setEditExamOpen(false); }}
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
              <button className="btn btn-outline" onClick={() => { setShowDetail(null); setDetailMode('view'); }}>                <span className="material-symbols-outlined">close</span>
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
                <button className="btn btn-danger" onClick={() => confirmDeleteGroup(showDetail.id)}>
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

      {selectedGroups.length > 1 && (
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Bulk Actions ({selectedGroups.length} groups)</span>
            <select className="form-input" style={{ width: 200 }} value={bulkSupervisorId} onChange={e => setBulkSupervisorId(e.target.value)}>
              <option value="">Select supervisor...</option>
              {supervisors.map(s => <option key={s.id} value={s.id}>{s.designation ? s.designation + ' ' : ''}{s.firstName} {s.lastName}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={async () => {
              if (!bulkSupervisorId) return toast.warning('Select a supervisor');
              try {
                const ids = selectedGroups.map(g => g.id || g);
                await api.post('/groups/bulk-assign-supervisor', { groupIds: ids, supervisorId: parseInt(bulkSupervisorId) });
                toast.success(`Assigned supervisor to ${ids.length} groups`);
                setSelectedGroups([]);
                loadData();
              } catch (err) {
                toast.error(err.response?.data?.error || 'Bulk assign failed');
              }
            }}>Assign</button>
            <button className="btn btn-sm btn-success" onClick={async () => {
              const pending = selectedGroups.filter(g => g.status === 'PENDING');
              if (pending.length === 0) return toast.warning('No pending groups selected');
              try {
                await Promise.all(pending.map(g => api.put(`/groups/${g.id}/status`, { status: 'ACTIVE' })));
                toast.success(`Activated ${pending.length} groups`);
                setSelectedGroups([]);
                loadData();
              } catch (err) {
                toast.error(err.response?.data?.error || 'Bulk activate failed');
              }
            }}>
              <span className="material-symbols-outlined">play_arrow</span>
              Make Active
            </button>
            <input type="date" className="form-input" value={bulkEndDate} onChange={e => setBulkEndDate(e.target.value)} style={{ width: 140 }} title="Set end date for selected" />
            <button className="btn btn-sm btn-primary" onClick={async () => {
              if (!bulkEndDate) return toast.warning('Select an end date first');
              try {
                const ids = selectedGroups.map(g => g.id);
                await Promise.all(ids.map(id => api.put(`/groups/${id}`, { endDate: bulkEndDate })));
                toast.success(`End date set for ${ids.length} groups`);
                setSelectedGroups([]);
                setBulkEndDate('');
                loadData();
              } catch (err) { toast.error(err.response?.data?.error || 'Failed to set end date'); }
            }}>
              <span className="material-symbols-outlined">calendar_month</span>
              Set End Date
            </button>
            <button className="btn btn-sm btn-success" onClick={async () => {
              const active = selectedGroups.filter(g => g.status === 'ACTIVE' || g.status === 'PENDING');
              if (active.length === 0) return toast.warning('No active/pending groups selected');
              try {
                await Promise.all(active.map(g => api.put(`/groups/${g.id}/status`, { status: 'COMPLETED' })));
                toast.success(`Completed ${active.length} groups`);
                setSelectedGroups([]);
                loadData();
              } catch (err) {
                toast.error(err.response?.data?.error || 'Bulk complete failed');
              }
            }}>
              <span className="material-symbols-outlined">check_circle</span>
              Mark Complete
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => {
              const pending = selectedGroups.filter(g => g.status === 'PENDING');
              if (pending.length === 0) return toast.warning('No pending groups selected');
              setConfirmDialog({
                open: true,
                title: 'Delete Groups',
                message: `Are you sure you want to delete ${pending.length} pending groups? This cannot be undone.`,
                onConfirm: async () => {
                  try {
                    await Promise.all(pending.map(g => api.delete(`/groups/${g.id}`)));
                    toast.success(`Deleted ${pending.length} groups`);
                    setSelectedGroups([]);
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                    loadData();
                  } catch (err) {
                    toast.error(err.response?.data?.error || 'Bulk delete failed');
                  }
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
            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by group name or project title..." style={{ maxWidth: 320 }} />
          </div>
          <div className="table-toolbar-right">
            <span className="font-label text-xs font-semibold text-on-surface-variant">{sortedGroups.length} groups</span>
          </div>
        </div>

        <div className="filter-bar">
          <FilterDropdown label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} allLabel="All Statuses" />
          <FilterDropdown label="Type" value={typeFilter} onChange={setTypeFilter} options={typeOptions} allLabel="All Types" />
          <FilterDropdown label="Supervisor" value={supervisorFilter} onChange={setSupervisorFilter} options={supervisorOptions} allLabel="All Supervisors" />
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : sortedGroups.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">school</span>
            <h3>No groups found</h3>
            <p>{searchTerm || statusFilter !== 'ALL' || supervisorFilter !== 'ALL' ? 'Try adjusting your filters or search.' : 'Upload an Excel file or create a group to get started.'}</p>
          </div>
        ) : (
          <>
            <table style={{ tableLayout: 'fixed', minWidth: 0 }}>
              <colgroup>
                <col style={{ width: 32 }} />
                <col />
                <col />
                <col style={{ width: 65 }} />
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
                  <th>Group</th>
                  <th>Project Title</th>
                  <th>Type</th>
                  <th style={{ width: 60 }}>Members</th>
                  <th>Status</th>
                  <th style={{ width: 50 }}>Batch</th>
                  <th style={{ textAlign: 'right', width: 90 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                  {paginatedGroups.map(g => (
                  <tr key={g.id} onClick={() => navigate(`/coordinator/project/group/${g.id}`)} style={{ cursor: 'pointer' }}>
                    <td onClick={e => e.stopPropagation()} style={{ width: 32, padding: '6px 10px' }}>
                      <input type="checkbox" checked={selectedGroups.includes(g)} onChange={() => {
                        setSelectedGroups(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
                      }} />
                    </td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '6px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="default-badge" style={{ width: 28, height: 28, fontSize: 10 }}>{g.name?.slice(0, 2).toUpperCase()}</div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{g.name}</span>
                      </div>
                    </td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '6px 10px', color: 'var(--color-on-surface-variant)', fontSize: 13 }}>{g.projectTitle}</td>
                    <td style={{ width: '1%', whiteSpace: 'nowrap', padding: '6px 10px' }}>
                      <span className={`badge`} style={{ fontSize: 10, background: g.projectType === 'MAJOR' ? 'var(--color-warning-container)' : 'var(--color-tertiary-container)', color: g.projectType === 'MAJOR' ? 'var(--color-on-warning-container)' : 'var(--color-on-tertiary-container)', border: 'none' }}>
                        {g.projectType === 'MAJOR' ? 'Major' : 'Minor'}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      <span className="stat-chip" title={safeMembers(g).map(m => `${m.student?.firstName || ''} ${m.student?.lastName || ''}`).join('\n')}>
                        {safeMembers(g).length}
                      </span>
                    </td>
                    <td style={{ width: '1%', whiteSpace: 'nowrap', padding: '6px 10px' }} onClick={e => e.stopPropagation()}>
                      <select value={g.status || 'PENDING'}
                        onChange={e => updateGroupStatus(g.id, e.target.value)}
                        disabled={updatingStatus === g.id}
                        style={{ fontSize: 10, padding: '1px 4px', borderRadius: 4, border: '1px solid var(--color-outline)', background: 'transparent', cursor: 'pointer', color: g.status === 'COMPLETED' ? 'var(--color-success)' : g.status === 'OVERDUE' ? 'var(--color-error)' : g.status === 'ACTIVE' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="OVERDUE">OVERDUE</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap', padding: '6px 10px', color: 'var(--color-on-surface-variant)' }}>
                      {g.batch || '—'}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '6px 10px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button className="icon-btn-sm" title="View" aria-label="View group details" onClick={() => openDetail(g, 'view')}>
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                        <div style={{ position: 'relative' }}>
                          <button className="icon-btn-sm" title="More actions" aria-label="More actions" onClick={(e) => { e.stopPropagation(); setActionMenuRow(actionMenuRow === g.id ? null : g.id); }}>
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>
                          {actionMenuRow === g.id && (
                            <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 50, background: 'var(--color-surface-container-lowest)', border: '1px solid var(--color-outline)', borderRadius: 'var(--border-radius-md)', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 140, padding: 4 }} onClick={e => { e.stopPropagation(); setActionMenuRow(null); }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', borderRadius: 4, fontSize: 13, opacity: g.status === 'COMPLETED' ? 0.55 : 1 }} onClick={() => { openDetail(g, 'edit'); setEditSupId(g.supervisorId ? g.supervisorId.toString() : ''); setEditExamId(g.examinerAssignments?.[0]?.externalExaminerId?.toString() || ''); setEditSupSearch(''); setEditExamSearch(''); }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-container-low)'; if (g.status === 'COMPLETED') e.currentTarget.style.opacity = '0.8'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; if (g.status === 'COMPLETED') e.currentTarget.style.opacity = '0.55'; }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                                  Edit
                                </div>
                              {g.status === 'ACTIVE' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', borderRadius: 4, fontSize: 13, color: 'var(--color-success)' }} onClick={() => { confirmComplete(g.id); }} onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-container-low)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                                  Complete
                                </div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', borderRadius: 4, fontSize: 13 }} onClick={() => setPdfPreviewItem(g)} onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-container-low)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>picture_as_pdf</span>
                                PDF Preview
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', borderRadius: 4, fontSize: 13 }} onClick={() => downloadEvalPdf(g)} onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-container-low)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                                Export PDF
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', borderRadius: 4, fontSize: 13, color: g.status === 'COMPLETED' ? 'var(--color-on-surface-variant)' : 'var(--color-error)', opacity: g.status === 'COMPLETED' ? 0.55 : 1 }} onClick={() => { confirmDeleteGroup(g.id); }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-container-low)'; if (g.status === 'COMPLETED') e.currentTarget.style.opacity = '0.8'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; if (g.status === 'COMPLETED') e.currentTarget.style.opacity = '0.55'; }}>
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
        <div className="modal-overlay" onClick={resetUploadModal}>
          <div className="modal" style={{ maxWidth: 900, width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <span className="material-symbols-outlined">upload_file</span>
              </div>
              <div className="modal-header-text">
                <h2>{bulkPreview ? 'Preview Import' : 'Bulk Upload Groups'}</h2>
                <p>
                  {bulkPreview
                    ? `Found ${bulkPreview.stats.total} rows — ${bulkPreview.stats.matched} matched, ${bulkPreview.stats.unmatched} unmatched`
                    : 'Upload Excel with Group Name, Project Title, Members, Roll Numbers, Batch, Supervisor, External Examiner. Project type is auto-detected from batch (3rd year → Minor, 4th year → Major) — editable below.'}
                </p>
              </div>
            </div>

            {!bulkPreview ? (
              <form onSubmit={handleBulkPreview}>
                <div className="form-group">
                  <label>Excel File (.xlsx)</label>
                  <input type="file" accept=".xlsx,.xls" onChange={e => setSelectedFile(e.target.files[0])} required />
                  <a
                    href="/bachelor_upload_template.xlsx"
                    download
                    style={{ fontSize: 12, color: 'var(--color-primary)', marginTop: 4, display: 'inline-block' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>download</span>
                    {' '}Download blank template
                  </a>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>
                    Columns: Group Name, Project Title, Members, Roll Numbers, Batch, Supervisor, External Examiner
                  </span>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={resetUploadModal}>
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
                        <th>Group</th>
                        <th>Title</th>
                        <th>Members</th>
                        <th>Students</th>
                        <th>Supervisor</th>
                        <th>Examiner</th>
                        <th>Type</th>
                        <th>Batch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.preview.map(p => (
                        <tr key={p.row} style={{ background: p.warnings.length ? 'var(--color-error-container)' : 'transparent' }}>
                          <td>{p.row}</td>
                          <td style={{ fontWeight: 600 }}>{p.groupName}</td>
                          <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.projectTitle}</td>
                          <td>{p.members.join(', ') || '—'}</td>
                          <td>
                            {p.studentMatches.filter(Boolean).length > 0
                              ? <span style={{ color: 'var(--color-success)' }}>{p.studentMatches.filter(Boolean).length} matched</span>
                              : <span style={{ color: 'var(--color-error)' }}>?</span>
                            }
                            {p.studentMatches.filter(m => !m).length > 0 && (
                              <span style={{ color: 'var(--color-error)', marginLeft: 4 }}>({p.studentMatches.filter(m => !m).length} missing)</span>
                            )}
                          </td>
                          <td>{p.supervisorMatch ? <span style={{ color: 'var(--color-success)' }}>{p.supervisorMatch.name}</span> : p.supervisorWillCreate ? <span style={{ color: 'var(--color-warning)' }}>Will create: {p.supervisorWillCreate.name}</span> : <span style={{ color: 'var(--color-error)' }}>—</span>}</td>
                          <td>{p.examinerMatch ? <span style={{ color: 'var(--color-success)' }}>{p.examinerMatch.name}</span> : p.examinerWillCreate ? <span style={{ color: 'var(--color-warning)' }}>Will create: {p.examinerWillCreate.name}</span> : <span style={{ color: 'var(--color-error)' }}>—</span>}</td>
                          <td>
                            <select value={p.projectType || 'MINOR'}
                              onChange={e => {
                                const updated = [...bulkPreview.preview];
                                updated[p.row - 1] = { ...updated[p.row - 1], projectType: e.target.value };
                                setBulkPreview({ ...bulkPreview, preview: updated });
                              }}
                              style={{ fontSize: 11, padding: '2px 4px' }}
                            >
                              <option value="MINOR">Minor</option>
                              <option value="MAJOR">Major</option>
                            </select>
                          </td>
                          <td>{p.batch || '—'}</td>
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
                    {bulkLoading ? 'Importing...' : `Import ${bulkPreview.stats.matched} groups`}
                  </button>
                </div>
              </div>
            )}
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
                <label>Project Type</label>
                <select value={createForm.projectType} onChange={e => setCreateForm({...createForm, projectType: e.target.value})}>
                  <option value="MINOR">Minor Project</option>
                  <option value="MAJOR">Major Project</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={createForm.status} onChange={e => setCreateForm({...createForm, status: e.target.value})}>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                </select>
              </div>
              <div className="form-group">
                <label>Batch</label>
                <input value={createForm.batch} onChange={e => setCreateForm({...createForm, batch: e.target.value})} placeholder="e.g. 080" />
                <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>Auto-derived from student roll numbers</span>
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" value={createForm.startDate} onChange={e => setCreateForm({...createForm, startDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label>End Date <span style={{ fontWeight: 400, color: 'var(--color-on-surface-variant)' }}>(optional)</span></label>
                <input type="date" value={createForm.endDate} onChange={e => setCreateForm({...createForm, endDate: e.target.value})} />
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
                    if (user.program?.id && String(s.programId) !== String(user.program.id)) return false;
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
      {pdfPreviewItem && (
        <EvaluationPdfPreview
          type="group"
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
        onCancel={() => setConfirmDialog({ open: false, title: '', message: '', onConfirm: null, danger: false })}
        confirmLabel="Confirm"
        danger={confirmDialog.danger}
      />
    </ErrorBoundary>
  );
}

export default BachelorProjects;
