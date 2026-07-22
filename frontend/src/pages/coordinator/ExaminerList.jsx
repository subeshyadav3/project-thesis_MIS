import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import Pagination from '../../components/Pagination';
import ErrorBoundary from '../../components/ErrorBoundary';
import ConfirmDialog from '../../components/ConfirmDialog';
import SearchInput from '../../components/SearchInput';
import { TableSkeleton } from '../../components/Skeleton';
import MasterThesisBulkUploadModal from '../../components/MasterThesisBulkUploadModal';
import UsersBulkUploadModal from '../../components/UsersBulkUploadModal';

const PAGE_SIZE = 10;

function ExaminerList() {
  const toast = useToast();
  const navigate = useNavigate();
  const [examiners, setExaminers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null, danger: false });
  const [showDetail, setShowDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showExaminerUpload, setShowExaminerUpload] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [createForm, setCreateForm] = useState({ firstName: '', lastName: '', email: '', password: Math.random().toString(36).slice(2, 10), designation: '' });
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', password: '', designation: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isBachelorCoordinator = user.program?.degreeType === 'BACHELOR';
  const isMasterCoordinator = user.program?.degreeType === 'MASTER';

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    setLoading(true);
    const promises = [
      api.get('/users/role/external_examiner?all=true', { signal }).then(({ data }) => setExaminers(data)),
      api.get('/groups', { signal }).then(({ data }) => setGroups(data)),
    ];
    // Only fetch theses for Master coordinators
    if (isMasterCoordinator) {
      promises.push(api.get('/theses', { signal }).then(({ data }) => setTheses(data)));
      promises.push(api.get('/departments/academic-years', { signal }).then(({ data }) => setAcademicYears(data)));
    }
    Promise.all(promises).catch((err) => { if (err.name !== 'CanceledError') console.error(err); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [isMasterCoordinator]);

  const loadData = () => {
    const controller = new AbortController();
    const signal = controller.signal;
    setLoading(true);
    const promises = [
      api.get('/users/role/external_examiner?all=true', { signal }).then(({ data }) => setExaminers(data)),
      api.get('/groups', { signal }).then(({ data }) => setGroups(data)),
    ];
    if (isMasterCoordinator) {
      promises.push(api.get('/theses', { signal }).then(({ data }) => setTheses(data)));
      promises.push(api.get('/departments/academic-years', { signal }).then(({ data }) => setAcademicYears(data)));
    }
    Promise.all(promises).catch((err) => { if (err.name !== 'CanceledError') toast.error('Failed to refresh data'); }).finally(() => setLoading(false));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.firstName.trim() || !createForm.lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }
    try {
      await api.post('/users', { ...createForm, role: 'EXTERNAL_EXAMINER' });
      toast.success('Internal Examiner created successfully');
      setShowCreate(false);
      setCreateForm({ firstName: '', lastName: '', email: '', password: Math.random().toString(36).slice(2, 10), designation: '' });
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Create failed'); }
  };

  const handleDelete = async (id) => {
    setConfirmDialog({
      open: true,
      title: 'Remove Internal Examiner',
      message: 'Remove this examiner? Their assignments will also be cleared.',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/users/${id}`);
          toast.success('Internal Examiner removed');
          loadData();
        } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
        setConfirmDialog(prev => ({ ...prev, open: false }));
      },
    });
  };

  const handleEditExaminer = async (e) => {
    e.preventDefault();
    const needsDeactivate = editForm.active !== showEdit.active && !editForm.active;
    if (needsDeactivate) {
      const nonCompletedGroups = (showEdit.assignedGroups || []).filter(g => g.status !== 'COMPLETED').length;
      const nonCompletedTheses = (showEdit.assignedTheses || []).filter(t => t.status !== 'COMPLETED').length;
      if (nonCompletedGroups + nonCompletedTheses > 0) {
        toast.error('Cannot mark as inactive: this examiner still has active non-completed projects/theses. All assigned work must be completed first.');
        return;
      }
    }
    try {
      const payload = { firstName: editForm.firstName, lastName: editForm.lastName, email: editForm.email, designation: editForm.designation };
      if (editForm.password) payload.password = editForm.password;
      await api.put(`/users/${showEdit.id}`, payload);
      if (editForm.active !== showEdit.active) {
        await api.put(`/users/${showEdit.id}/toggle-active`);
      }
      toast.success('Examiner updated successfully');
      setShowEdit(null);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Update failed'); }
  };

  const openEdit = (ex) => {
    setEditForm({ firstName: ex.firstName, lastName: ex.lastName, email: ex.email, password: '', active: ex.active, designation: ex.designation || '' });
    setShowEdit(ex);
  };

  const enriched = useMemo(() => {
    return examiners.map(e => {
      const assignedGroups = groups.filter(g => (g.examinerAssignments || []).some(a => a.externalExaminerId === e.id));
      const assignedTheses = isMasterCoordinator ? theses.filter(t => (t.examinerAssignments || []).some(a => a.externalExaminerId === e.id)) : [];
      return {
        ...e,
        assignedGroups,
        assignedTheses,
        groupCount: assignedGroups.length,
        thesisCount: assignedTheses.length,
        totalCount: assignedGroups.length + assignedTheses.length,
      };
    });
  }, [examiners, groups, theses, isMasterCoordinator]);

  const filteredExaminers = useMemo(() => {
    if (!searchQuery) return enriched;
    const q = searchQuery.toLowerCase();
    return enriched.filter(s =>
      `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(q)
    );
  }, [enriched, searchQuery]);

  const totalPages = Math.ceil(filteredExaminers.length / PAGE_SIZE);
  const paginated = filteredExaminers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(1); }, [totalPages, currentPage]);

  const totalAssigned = groups.reduce((s, g) => s + (g.examinerAssignments?.length || 0), 0)
    + (isMasterCoordinator ? theses.reduce((s, t) => s + (t.examinerAssignments?.length || 0), 0) : 0);
  const unassignedGroups = groups.filter(g => !g.examinerAssignments?.length).length;
  const unassignedTheses = isMasterCoordinator ? theses.filter(t => !t.examinerAssignments?.length).length : 0;

  const actions = (
    <>
      {isMasterCoordinator && (
        <button className="btn btn-secondary btn-sm" onClick={() => setShowUpload(true)}>
          <span className="material-symbols-outlined">upload_file</span>
          Upload Examiner Assignments
        </button>
      )}
      
      <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
        <span className="material-symbols-outlined">add</span>
        Add Examiner
      </button>
    </>
  );

  return (
    <ErrorBoundary><PageLayout title="Internal Examiners" subtitle="Manage internal examiners and their assignments" user={user} actions={actions}>
      <MasterThesisBulkUploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={loadData}
        title="Bulk Upload Theses (External Examiners)"
      />
      
      {/* ── CREATE MODAL ── */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <span className="material-symbols-outlined">person_add</span>
              </div>
              <div className="modal-header-text">
                <h2>Add Internal Examiner</h2>
                <p>Register a new internal examiner</p>
              </div>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>First Name</label>
                <input value={createForm.firstName} onChange={e => setCreateForm({...createForm, firstName: e.target.value})} required placeholder="Enter first name" />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input value={createForm.lastName} onChange={e => setCreateForm({...createForm, lastName: e.target.value})} required placeholder="Enter last name" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})} required placeholder="e.g. name@ioe.edu.np" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})} required placeholder="Default: subesh" />
              </div>
              <div className="form-group">
                <label>Designation</label>
                <select value={createForm.designation} onChange={e => setCreateForm({...createForm, designation: e.target.value})}>
                  <option value="">Select designation...</option>
                  <option value="Asst. Prof.">Asst. Prof.</option>
                  <option value="Asst. Prof. Dr.">Asst. Prof. Dr.</option>
                  <option value="Assoc. Prof.">Assoc. Prof.</option>
                  <option value="Assoc. Prof. Dr.">Assoc. Prof. Dr.</option>
                  <option value="Prof.">Prof.</option>
                  <option value="Prof. Dr.">Prof. Dr.</option>
                </select>
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

      {/* ── DETAIL MODAL ── */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <span className="material-symbols-outlined">person</span>
              </div>
              <div className="modal-header-text">
                <h2>{showDetail.firstName} {showDetail.lastName}</h2>
                <p>{showDetail.email}</p>
              </div>
            </div>
            <div className="detail-section">
              <h4 className="detail-section-title">Assigned Projects ({showDetail.groupCount})</h4>
              {showDetail.assignedGroups.length === 0 ? (
                <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 14, padding: '8px 0' }}>No bachelor projects assigned.</p>
              ) : (
                <table className="detail-table">
                  <thead>
                    <tr><th>Group</th><th>Project</th><th>Members</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {showDetail.assignedGroups.map(g => (
                      <tr key={g.id} className="clickable-row" onClick={() => navigate(`/coordinator/project/group/${g.id}`)}>
                        <td style={{ fontWeight: 500 }}>{g.name}</td>
                        <td style={{ color: 'var(--color-on-surface-variant)' }}>{g.projectTitle}</td>
                        <td style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>
                          {(g.members || []).filter(m => m.student).map(m => `${m.student.firstName} ${m.student.lastName}`).join(', ') || '—'}
                        </td>
                        <td>
                          <span className={`badge badge-${g.status?.toLowerCase() || 'pending'}`}><span className="dot" />{g.status || 'PENDING'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {isMasterCoordinator && (
              <div className="detail-section">
                <h4 className="detail-section-title">Assigned Theses ({showDetail.thesisCount})</h4>
                {showDetail.assignedTheses.length === 0 ? (
                  <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 14, padding: '8px 0' }}>No master theses assigned.</p>
                ) : (
                  <table className="detail-table">
                    <thead>
                      <tr><th>Student</th><th>Thesis Title</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {showDetail.assignedTheses.map(t => (
                        <tr key={t.id} className="clickable-row" onClick={() => navigate(`/coordinator/project/thesis/${t.id}`)}>
                          <td style={{ fontWeight: 500 }}>{t.student?.firstName} {t.student?.lastName}</td>
                          <td style={{ color: 'var(--color-on-surface-variant)' }}>{t.title}</td>
                          <td>
                            <span className={`badge badge-${t.status?.toLowerCase() || 'pending'}`}><span className="dot" />{t.status || 'PENDING'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={() => { handleDelete(showDetail.id); setShowDetail(null); }}>
                <span className="material-symbols-outlined">delete</span>
                Remove Examiner
              </button>
              <button className="btn btn-outline" onClick={() => setShowDetail(null)}>
                <span className="material-symbols-outlined">close</span>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {showEdit && (
        <div className="modal-overlay" onClick={() => setShowEdit(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon warning">
                <span className="material-symbols-outlined">edit</span>
              </div>
              <div className="modal-header-text">
                <h2>Edit Examiner</h2>
                <p>{showEdit.firstName} {showEdit.lastName}</p>
              </div>
            </div>
            <form onSubmit={handleEditExaminer}>
              <div className="form-group">
                <label>First Name</label>
                <input value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} required placeholder="Enter first name" />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})} required placeholder="Enter last name" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} required placeholder="e.g. name@ioe.edu.np" />
              </div>
              <div className="form-group">
                <label>Reset Password <span style={{ fontWeight: 400, color: 'var(--color-on-surface-variant)' }}>(leave blank to keep current)</span></label>
                <input type="password" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} placeholder="New password" />
              </div>
              <div className="form-group">
                <label>Designation</label>
                <select value={editForm.designation} onChange={e => setEditForm({...editForm, designation: e.target.value})}>
                  <option value="">Select designation...</option>
                  <option value="Asst. Prof.">Asst. Prof.</option>
                  <option value="Asst. Prof. Dr.">Asst. Prof. Dr.</option>
                  <option value="Assoc. Prof.">Assoc. Prof.</option>
                  <option value="Assoc. Prof. Dr.">Assoc. Prof. Dr.</option>
                  <option value="Prof.">Prof.</option>
                  <option value="Prof. Dr.">Prof. Dr.</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: editForm.active ? 'var(--color-success)' : 'var(--color-error)' }}>
                    {editForm.active ? 'Active' : 'Inactive'}
                  </span>
                  <button type="button" className="btn btn-sm" style={{ background: editForm.active ? 'var(--color-error-container)' : 'var(--color-success-container)', color: editForm.active ? 'var(--color-on-error-container)' : 'var(--color-on-success-container)' }} onClick={() => setEditForm({ ...editForm, active: !editForm.active })}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{editForm.active ? 'cancel' : 'check_circle'}</span>
                    {editForm.active ? 'Mark as Inactive' : 'Mark as Active'}
                  </button>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowEdit(null)}>
                  <span className="material-symbols-outlined">close</span>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <span className="material-symbols-outlined">save</span>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">person</span></div>
          <div className="stat-number">{examiners.length}</div>
          <div className="stat-label">Total Examiners</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">assignment_ind</span></div>
          <div className="stat-number">{totalAssigned}</div>
          <div className="stat-label">Total Assignments</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">school</span></div>
          <div className="stat-number">{unassignedGroups}</div>
          <div className="stat-label">Projects Unassigned</div>
        </div>
        {isMasterCoordinator && (
          <div className="stat-card bento-card">
            <div className="stat-icon"><span className="material-symbols-outlined">library_books</span></div>
            <div className="stat-number">{unassignedTheses}</div>
            <div className="stat-label">Theses Unassigned</div>
          </div>
        )}
      </div>

      <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search examiners..." style={{ maxWidth: 320, marginBottom: 12 }} />
      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left" />
          <div className="table-toolbar-right">
            <span className="font-label text-xs font-semibold text-on-surface-variant">{filteredExaminers.length} examiners</span>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : filteredExaminers.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">person</span>
            <h3>No examiners found</h3>
            <p>{searchQuery ? 'Try adjusting your search.' : 'No internal examiners have been registered yet.'}</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                  <tr>
                    <th>Examiner</th>
                    <th>Designation</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Bachelor Projects</th>
                    {isMasterCoordinator && <th>Master Theses</th>}
                    <th>Total</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
              </thead>
              <tbody>
                {paginated.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="default-badge">{s.firstName?.[0]}{s.lastName?.[0]}</div>
                        <span style={{ fontWeight: 500 }}>{s.firstName} {s.lastName}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>{s.designation || '—'}</td>
                    <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>{s.email}</td>
                    <td>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: s.active ? 'var(--color-success)' : 'var(--color-outline-variant)', verticalAlign: 'middle' }}>
                        {s.active ? 'check_circle' : 'cancel'}
                      </span>
                    </td>
                    <td><span className="stat-chip">{s.groupCount}</span></td>
                    {isMasterCoordinator && <td><span className="stat-chip">{s.thesisCount}</span></td>}
                    <td><span className="stat-chip stat-chip-primary">{s.totalCount}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => setShowDetail(s)}>
                          <span className="material-symbols-outlined">visibility</span>
                          View
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(s)}>
                          <span className="material-symbols-outlined">edit</span>
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-footer">
              <span className="font-label text-xs text-on-surface-variant table-footer-info">
                {filteredExaminers.length > 0
                  ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredExaminers.length)} of ${filteredExaminers.length}`
                  : '0 results'}
              </span>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </>
        )}
      </div>
      <ConfirmDialog open={confirmDialog.open} title={confirmDialog.title} message={confirmDialog.message} danger={confirmDialog.danger} onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))} />
    </PageLayout>
    </ErrorBoundary>
  );
}

export default ExaminerList;
