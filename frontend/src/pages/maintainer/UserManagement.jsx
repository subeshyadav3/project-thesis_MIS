import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '../../components/ui';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import Pagination from '../../components/Pagination';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatYearSemester } from '../../utils/romanNumerals';
import UsersBulkUploadModal from '../../components/UsersBulkUploadModal';

const COORDINATOR_ALLOWED_ROLES = ['SUPERVISOR', 'EXTERNAL_EXAMINER', 'STUDENT'];
const PAGE_SIZES = [10, 25, 50, 100];

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'STUDENT', degreeType: 'BACHELOR', programId: '', rollNumber: '', designation: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ role: '', degreeType: '', departmentId: '', programId: '', batch: '' });
  const [programs, setPrograms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', confirmLabel: 'Confirm', onConfirm: () => {}, danger: false });
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isCoordinator = user.role === 'COORDINATOR';
  const isMaintainer = user.role === 'MAINTAINER';
  const isMasterCoordinator = isCoordinator && user.program?.degreeType === 'MASTER';
  const toast = useToast();

  const allowedRoles = isCoordinator ? COORDINATOR_ALLOWED_ROLES : ['MAINTAINER', 'COORDINATOR', 'SUPERVISOR', 'EXTERNAL_EXAMINER', 'STUDENT'];

  const loadUsers = () => {
    setLoading(true);
    api.get('/users').then(({ data }) => setUsers(data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => {
    loadUsers();
    api.get('/departments/programs').then(({ data }) => setPrograms(data)).catch(() => {});
    api.get('/departments').then(({ data }) => setDepartments(data)).catch(() => {});
  }, []);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filters]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (payload.role !== 'STUDENT') {
        delete payload.degreeType;
        delete payload.programId;
        delete payload.rollNumber;
      } else {
        if (!payload.programId) delete payload.programId;
        if (!payload.rollNumber) delete payload.rollNumber;
      }
      if (['STUDENT'].includes(payload.role)) {
        delete payload.designation;
      }
      if (editUser) {
        await api.put(`/users/${editUser.id}`, payload);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', payload);
        toast.success('User created successfully');
      }
      setShowModal(false);
      setEditUser(null);
      setForm({ email: '', password: '', firstName: '', lastName: '', role: 'STUDENT', degreeType: 'BACHELOR', programId: '', rollNumber: '', designation: '' });
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'An error occurred');
    }
  };

  const handleDelete = (user) => {
    const targetUser = users.find(u => u.id === user.id);
    if (!targetUser) return;

    let warningMessage = `Are you sure you want to delete ${targetUser.firstName} ${targetUser.lastName} (${targetUser.role.toLowerCase()})? This action cannot be undone.`;
    
    setConfirmDialog({
      open: true,
      title: `Delete ${targetUser.firstName} ${targetUser.lastName}`,
      message: warningMessage,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/users/${user.id}`);
          toast.success('User deleted successfully');
          loadUsers();
        } catch (err) {
          const details = err.response?.data?.details;
          let errorMsg = err.response?.data?.error || 'Error deleting user';
          if (details) {
            const links = [];
            if (details.groups) links.push(`${details.groups} group(s)`);
            if (details.theses) links.push(`${details.theses} thesis(es)`);
            if (details.supervisedGroups) links.push(`${details.supervisedGroups} supervised group(s)`);
            if (details.supervisedTheses) links.push(`${details.supervisedTheses} supervised thesis(es)`);
            if (details.examinerAssignments) links.push(`${details.examinerAssignments} examiner assignment(s)`);
            if (links.length) errorMsg += ` — Still has: ${links.join(', ')}. Remove assignments first.`;
          }
          toast.error(errorMsg);
        }
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({
      email: u.email,
      password: '',
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      degreeType: u.degreeType || (u.role === 'STUDENT' ? 'BACHELOR' : ''),
      programId: u.programId || '',
      rollNumber: u.rollNumber || '',
      designation: u.designation || '',
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditUser(null);
    setForm({ email: '', password: '', firstName: '', lastName: '', role: 'STUDENT', degreeType: 'BACHELOR', programId: '', rollNumber: '', designation: '' });
    setShowModal(true);
  };

  const extractBatch = (roll) => roll?.match(/^(\d{2,3})/)?.[1] || '';

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (!`${u.firstName} ${u.lastName} ${u.email} ${u.role} ${u.rollNumber || ''}`.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filters.role && u.role !== filters.role) return false;
      if (filters.degreeType && u.degreeType !== filters.degreeType) return false;
      if (filters.departmentId && u.departmentId !== parseInt(filters.departmentId)) return false;
      if (filters.programId && u.programId !== parseInt(filters.programId)) return false;
      if (filters.batch && extractBatch(u.rollNumber) !== filters.batch) return false;
      return true;
    });
  }, [users, searchTerm, filters]);

  const uniqueBatches = useMemo(() =>
    [...new Set(users.map(u => extractBatch(u.rollNumber)).filter(Boolean))].sort(),
    [users]
  );

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const getBadge = (role) => {
    switch (role) {
      case 'MAINTAINER': return 'active';
      case 'COORDINATOR': return 'pending';
      case 'SUPERVISOR': return 'completed';
      default: return 'inactive';
    }
  };

  const FilterDropdown = ({ name, value, onChange, label, options, allLabel }) => (
    <div className="filter-item">
      <label>{label}</label>
      <select value={value} onChange={e => onChange(name, e.target.value)}>
        <option value="">{allLabel || `All ${label}s`}</option>
        {options.map((o, i) => (
          <option key={i} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const actions = (
    <>
      <button className="btn btn-secondary btn-sm" onClick={() => setShowBulkUpload(true)}>
        <Icon name="upload_file" className="material-symbols-outlined" />
        Bulk Add
      </button>
      <button className="btn btn-primary btn-sm" onClick={openCreate}>
        <Icon name="add" className="material-symbols-outlined" />
        Add User
      </button>
    </>
  );

  const showField = (field) => {
    if (!editUser) return true;
    if (field === 'degreeType') return editUser.role === 'STUDENT';
    if (field === 'programId') return editUser.role === 'STUDENT';
    if (field === 'rollNumber') return editUser.role === 'STUDENT';
    return true;
  };

  return (
    <PageLayout user={user} actions={actions}>
      <div className="page-header">
        <h1>
          <Icon name="groups" className="material-symbols-outlined" />
          {isCoordinator ? 'Manage Users' : 'System Users'}
        </h1>
        <p>Create, edit, and manage {isCoordinator ? 'program ' : ''}users</p>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <div className="search-input-wrapper">
              <Icon name="search" className="material-symbols-outlined" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="table-toolbar-right">
            <span className="font-label text-xs font-semibold text-on-surface-variant">{filteredUsers.length} users</span>
          </div>
        </div>

        <div className="filter-bar">
          <FilterDropdown
            name="role" label="Role" value={filters.role}
            onChange={handleFilterChange}
            options={allowedRoles.map(r => ({ value: r, label: r.replace('_', ' ') }))}
            allLabel="All Roles"
          />
          {/* Degree type filter appears when a role is selected or always for non-students */}
          {(!filters.role || filters.role === 'STUDENT') && (
            <FilterDropdown
              name="degreeType" label="Degree" value={filters.degreeType}
              onChange={handleFilterChange}
              options={[
                { value: 'BACHELOR', label: 'Bachelor' },
                { value: 'MASTER', label: 'Master' },
              ]}
              allLabel="All Degrees"
            />
          )}
          {isMaintainer && (
            <>
              <FilterDropdown
                name="departmentId" label="Dept" value={filters.departmentId}
                onChange={handleFilterChange}
                options={departments.map(d => ({ value: String(d.id), label: d.code }))}
                allLabel="All Depts"
              />
              <FilterDropdown
                name="programId" label="Program" value={filters.programId}
                onChange={handleFilterChange}
                options={programs.map(p => ({ value: String(p.id), label: `${p.code} (${p.degreeType === 'BACHELOR' ? 'B' : 'M'})` }))}
                allLabel="All Programs"
              />
            </>
          )}
          <FilterDropdown
            name="batch" label="Batch" value={filters.batch}
            onChange={handleFilterChange}
            options={uniqueBatches.map(b => ({ value: b, label: b.startsWith('0') ? `20${b.replace(/^0+/, '')}` : b }))}
            allLabel="All Batches"
          />
        </div>

        {loading ? (
          <div className="loading-state">
            <Icon name="progress_activity" className="material-symbols-outlined" />
            <p>Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <Icon name="groups" className="material-symbols-outlined" />
            <h3>No users found</h3>
            <p>{searchTerm ? 'Try adjusting your search criteria.' : 'Create your first user to get started.'}</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email / Roll</th>
                  <th>Role</th>
                  <th>Degree / Program</th>
                  <th>Year/Sem</th>
                  <th>Batch</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="default-badge">
                          {u.firstName?.charAt(0)}{u.lastName?.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 500 }}>{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>{u.rollNumber || u.email}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${getBadge(u.role)}`}>
                        <span className="dot" />
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {u.role === 'STUDENT' ? (
                        <>{u.degreeType} · {u.program?.code}</>
                      ) : (
                        <>
                          <span style={{ color: 'var(--color-on-surface-variant)' }}>—</span>
                          {['COORDINATOR', 'SUPERVISOR', 'EXTERNAL_EXAMINER'].includes(u.role) && u.designation && (
                            <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', display: 'block' }}>
                              {u.designation}
                            </span>
                          )}
                          {u.role === 'COORDINATOR' && u.program && (
                            <span style={{ fontSize: 11, color: 'var(--color-primary)', display: 'block' }}>
                              {u.program.name} ({u.program.code})
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {u.role === 'STUDENT' && u.currentYear ? (
                        <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                          {formatYearSemester(u.currentYear, u.currentSemester)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-on-surface-variant)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                      {extractBatch(u.rollNumber) ? (
                        <span className="badge badge-info" style={{ fontSize: 10 }}>
                          {extractBatch(u.rollNumber).startsWith('0') ? `20${extractBatch(u.rollNumber).replace(/^0+/, '')}` : extractBatch(u.rollNumber)}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`badge ${u.active ? 'badge-active' : 'badge-pending'}`}>
                        <span className="dot" />{u.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="icon-btn" title="Edit User" onClick={() => openEdit(u)}>
                          <Icon name="edit" className="material-symbols-outlined" />
                        </button>
                        <button className="icon-btn danger" title="Delete User" onClick={() => handleDelete(u)}>
                          <Icon name="delete" className="material-symbols-outlined" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-footer">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                pageSizeOptions={PAGE_SIZES}
                totalItems={filteredUsers.length}
              />
            </div>
          </>
        )}
      </div>

      <UsersBulkUploadModal
        open={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onSuccess={loadUsers}
        title="Bulk Upload Users"
      />

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <Icon name={editUser ? 'edit' : 'person_add'} className="material-symbols-outlined" />
              </div>
              <div className="modal-header-text">
                <h2>{editUser ? 'Edit User' : 'Create User'}</h2>
                <p>{editUser ? 'Update user details and permissions' : 'Add a new user to the system'}</p>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>First Name</label>
                  <input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} required placeholder="First name" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Last Name</label>
                  <input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} required placeholder="Last name" />
                </div>
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={form.role === 'STUDENT' ? (form.rollNumber ? `${form.rollNumber.toLowerCase()}@pcampus.edu.np` : '') : form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  required
                  disabled={form.role === 'STUDENT'}
                  placeholder={form.role === 'STUDENT' ? 'auto-generated from roll number' : 'e.g. ram.yadav@pcampus.edu.np'}
                  pattern={form.role === 'STUDENT' ? undefined : '[a-zA-Z0-9._%+-]+@pcampus\\.edu\\.np'}
                  title={form.role === 'STUDENT' ? 'Student email is auto-generated from the roll number' : 'Email must end with @pcampus.edu.np (e.g. ram.yadav@pcampus.edu.np)'}
                />
                <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>
                  {form.role === 'STUDENT'
                    ? 'Auto-generated as {rollNumber}@pcampus.edu.np (typed email is ignored)'
                    : 'Must end with @pcampus.edu.np (e.g. ram.yadav@pcampus.edu.np)'}
                </span>
              </div>
              <div className="form-group">
                <label>Password {editUser && '(leave blank to keep)'}</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editUser} placeholder={editUser ? 'Enter new password (optional)' : 'Enter password'} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  {allowedRoles.map(r => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              {['COORDINATOR', 'SUPERVISOR', 'EXTERNAL_EXAMINER'].includes(form.role) && (
                <>
                  <div className="form-group">
                    <label>Designation</label>
                    <select value={form.designation} onChange={e => setForm({...form, designation: e.target.value})}>
                      <option value="">Select designation...</option>
                      <option value="Asst. Prof.">Asst. Prof.</option>
                      <option value="Asst. Prof. Dr.">Asst. Prof. Dr.</option>
                      <option value="Assoc. Prof.">Assoc. Prof.</option>
                      <option value="Assoc. Prof. Dr.">Assoc. Prof. Dr.</option>
                      <option value="Prof.">Prof.</option>
                      <option value="Prof. Dr.">Prof. Dr.</option>
                    </select>
                  </div>
                  {form.role === 'COORDINATOR' && (
                    <div className="form-group">
                      <label>Program (Coordinator for)</label>
                      <select value={form.programId} onChange={e => setForm({...form, programId: e.target.value})}>
                        <option value="">Select program...</option>
                        {programs.filter(p => editUser ? true : true).map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.code}) — {p.degreeType}</option>
                        ))}
                      </select>
                    </div>
                  )}

                </>
              )}
              {form.role === 'STUDENT' && (
                <>
                  <div className="form-group">
                    <label>Degree Type</label>
                    <select value={form.degreeType} onChange={e => setForm({...form, degreeType: e.target.value})}>
                      <option value="BACHELOR">Bachelor</option>
                      <option value="MASTER">Master</option>
                    </select>
                  </div>
                  <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Roll Number</label>
                      <input value={form.rollNumber} onChange={e => setForm({...form, rollNumber: e.target.value})} placeholder="e.g. 080BCT001" />
                      <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>
                        Batch & year/semester auto-assigned from roll number
                      </span>
                    </div>
                  </div>
                </>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  <Icon name="close" className="material-symbols-outlined" />
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Icon name={editUser ? 'save' : 'add'} className="material-symbols-outlined" />
                  {editUser ? 'Update' : 'Create'}
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
        confirmLabel={confirmDialog.confirmLabel}
        danger={confirmDialog.danger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />
    </PageLayout>
  );
}

export default UserManagement;
