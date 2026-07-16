import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

const COORDINATOR_ALLOWED_ROLES = ['SUPERVISOR', 'EXTERNAL_EXAMINER', 'STUDENT'];

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'STUDENT', degreeType: 'BACHELOR', programId: '', rollNumber: '', designation: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ degreeType: '', departmentId: '', programId: '', year: '' });
  const [programs, setPrograms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkJson, setBulkJson] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isCoordinator = user.role === 'COORDINATOR';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (!payload.programId) delete payload.programId;
      if (!payload.rollNumber) delete payload.rollNumber;
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted successfully');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error deleting user');
    }
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({ email: u.email, password: '', firstName: u.firstName, lastName: u.lastName, role: u.role, degreeType: u.degreeType || 'BACHELOR', programId: u.programId || '', rollNumber: u.rollNumber || '', designation: u.designation || '' });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditUser(null);
    setForm({ email: '', password: '', firstName: '', lastName: '', role: 'STUDENT', degreeType: 'BACHELOR', programId: '', rollNumber: '', designation: '' });
    setShowModal(true);
  };

  const extractYear = (roll) => roll?.match(/^(\d{3})/)?.[1] || '';

  const filteredUsers = users.filter(u => {
    if (!`${u.firstName} ${u.lastName} ${u.email} ${u.role} ${u.rollNumber || ''}`.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filters.degreeType && u.degreeType !== filters.degreeType) return false;
    if (filters.departmentId && u.departmentId !== parseInt(filters.departmentId)) return false;
    if (filters.programId && u.programId !== parseInt(filters.programId)) return false;
    if (filters.year && extractYear(u.rollNumber) !== filters.year) return false;
    return true;
  });

  const uniqueYears = [...new Set(users.map(u => extractYear(u.rollNumber)).filter(Boolean))].sort();

  const getBadge = (role) => {
    switch (role) {
      case 'MAINTAINER': return 'active';
      case 'COORDINATOR': return 'pending';
      case 'SUPERVISOR': return 'completed';
      default: return 'inactive';
    }
  };

  const actions = (
    <>
      {!isCoordinator && (
        <button className="btn btn-outline btn-sm" onClick={() => setShowBulk(true)}>
          <span className="material-symbols-outlined">upload_file</span>
          Bulk Import
        </button>
      )}
      <button className="btn btn-primary btn-sm" onClick={openCreate}>
        <span className="material-symbols-outlined">add</span>
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
    <PageLayout title={isCoordinator ? 'Manage Users' : 'Users'} user={user} actions={actions}>
      <div className="page-header">
        <h1>
          <span className="material-symbols-outlined">groups</span>
          {isCoordinator ? 'Manage Users' : 'System Users'}
        </h1>
        <p>Create, edit, and manage {isCoordinator ? 'program ' : ''}users</p>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <div className="search-input-wrapper">
              <span className="material-symbols-outlined">search</span>
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

        {loading ? (
          <div className="loading-state">
            <span className="material-symbols-outlined">progress_activity</span>
            <p>Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">groups</span>
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
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
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
                        <>                        {u.degreeType} · {u.program?.code}</>
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
                    <td>
                      <span className={`badge ${u.active ? 'badge-active' : 'badge-pending'}`}>
                        <span className="dot" />{u.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="icon-btn" title="Edit User" onClick={() => openEdit(u)}>
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button className="icon-btn danger" title="Delete User" onClick={() => handleDelete(u.id)}>
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-footer">
              <span className="font-label text-xs text-on-surface-variant">Showing {filteredUsers.length} of {users.length} users</span>
            </div>
          </>
        )}
      </div>

      {showBulk && (
        <div className="modal-overlay" onClick={() => setShowBulk(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <span className="material-symbols-outlined">upload_file</span>
              </div>
              <div className="modal-header-text">
                <h2>Bulk Import Users</h2>
                <p>Paste a JSON array of users to create them in bulk</p>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', margin: 0 }}>
                Expected format: [{"{"}"email": "...", "password": "...", "firstName": "...", "lastName": "...", "role": "...", "designation": "...", "programId": ..., "canSupervise": true/false{"}"}]
              </p>
            </div>
            <div className="form-group">
              <textarea
                className="form-input"
                rows={10}
                value={bulkJson}
                onChange={e => setBulkJson(e.target.value)}
                placeholder='[&#10;  {"email": "coord.bct@example.com", "password": "pass123", "firstName": "Ram", "lastName": "Prasad", "role": "COORDINATOR", "designation": "Asst. Prof.", "programId": 1, "canSupervise": false}&#10;]'
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowBulk(false)}>
                <span className="material-symbols-outlined">close</span>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={async () => {
                try {
                  const users = JSON.parse(bulkJson);
                  if (!Array.isArray(users)) throw new Error('Must be an array');
                  const { data } = await api.post('/users/bulk', { users });
                  toast.success(data.message);
                  setShowBulk(false);
                  setBulkJson('');
                  loadUsers();
                } catch (err) {
                  toast.error(err.response?.data?.error || err.message || 'Invalid JSON');
                }
              }}>
                <span className="material-symbols-outlined">upload</span>
                Import
              </button>
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <span className="material-symbols-outlined">{editUser ? 'edit' : 'person_add'}</span>
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
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required placeholder="email@example.com" />
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
                      <label>Program</label>
                      <select value={form.programId} onChange={e => setForm({...form, programId: e.target.value})}>
                        <option value="">Select program...</option>
                        {programs.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Roll Number</label>
                      <input value={form.rollNumber} onChange={e => setForm({...form, rollNumber: e.target.value})} placeholder="e.g. 080BCT001" />
                    </div>
                  </div>
                </>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  <span className="material-symbols-outlined">close</span>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <span className="material-symbols-outlined">{editUser ? 'save' : 'add'}</span>
                  {editUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default UserManagement;
