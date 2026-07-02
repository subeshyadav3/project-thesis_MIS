import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'STUDENT' });
  const [searchTerm, setSearchTerm] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const toast = useToast();

  const loadUsers = () => {
    setLoading(true);
    api.get('/users').then(({ data }) => setUsers(data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { loadUsers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editUser) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.put(`/users/${editUser.id}`, payload);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', form);
        toast.success('User created successfully');
      }
      setShowModal(false);
      setEditUser(null);
      setForm({ email: '', password: '', firstName: '', lastName: '', role: 'STUDENT' });
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
    setForm({ email: u.email, password: '', firstName: u.firstName, lastName: u.lastName, role: u.role });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditUser(null);
    setForm({ email: '', password: '', firstName: '', lastName: '', role: 'STUDENT' });
    setShowModal(true);
  };

  const filteredUsers = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBadge = (role) => {
    switch (role) {
      case 'MAINTAINER': return 'active';
      case 'COORDINATOR': return 'pending';
      case 'SUPERVISOR': return 'completed';
      default: return 'inactive';
    }
  };

  const actions = (
    <button className="btn btn-primary btn-sm" onClick={openCreate}>
      <span className="material-symbols-outlined">add</span>
      Add User
    </button>
  );

  return (
    <PageLayout title="Users" user={user} actions={actions}>
      <div className="page-header">
        <h1>
          <span className="material-symbols-outlined">groups</span>
          System Users
        </h1>
        <p>Create, edit, and manage system users</p>
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
                  <th>Email</th>
                  <th>Role</th>
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
                      <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>{u.email}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${getBadge(u.role)}`}>
                        <span className="dot" />
                        {u.role.replace('_', ' ')}
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
              <div className="form-group">
                <label>First Name</label>
                <input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} required placeholder="Enter first name" />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} required placeholder="Enter last name" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required placeholder="Enter email address" />
              </div>
              <div className="form-group">
                <label>Password {editUser && '(leave blank to keep)'}</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editUser} placeholder={editUser ? 'Enter new password (optional)' : 'Enter password'} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="MAINTAINER">Maintainer</option>
                  <option value="COORDINATOR">Coordinator</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>
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
