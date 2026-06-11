import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'STUDENT' });
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadUsers = () => api.get('/users').then(({ data }) => setUsers(data)).catch(() => {});
  useEffect(() => { loadUsers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editUser) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.put(`/users/${editUser.id}`, payload);
      } else {
        await api.post('/users', form);
      }
      setShowModal(false);
      setEditUser(null);
      setForm({ email: '', password: '', firstName: '', lastName: '', role: 'STUDENT' });
      loadUsers();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try { await api.delete(`/users/${id}`); loadUsers(); } catch (err) { alert('Error deleting user'); }
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({ email: u.email, password: '', firstName: u.firstName, lastName: u.lastName, role: u.role });
    setShowModal(true);
  };

  return (
    <div className="app-layout">
      <Sidebar user={user} />
      <div className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h1>User Management</h1><p>Create, edit, and manage system users</p></div>
          <button className="btn btn-primary" onClick={() => { setEditUser(null); setForm({ email: '', password: '', firstName: '', lastName: '', role: 'STUDENT' }); setShowModal(true); }}>Add User</button>
        </div>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.firstName} {u.lastName}</td>
                <td>{u.email}</td>
                <td><span className={`badge badge-${u.role.toLowerCase()}`}>{u.role}</span></td>
                <td><button className="btn btn-sm btn-outline" onClick={() => openEdit(u)}>Edit</button> <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h2>{editUser ? 'Edit User' : 'Create User'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group"><label>First Name</label><input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} required /></div>
                <div className="form-group"><label>Last Name</label><input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} required /></div>
                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
                <div className="form-group"><label>Password {editUser && '(leave blank to keep)'}</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editUser} /></div>
                <div className="form-group"><label>Role</label><select value={form.role} onChange={e => setForm({...form, role: e.target.value})}><option value="MAINTAINER">Maintainer</option><option value="COORDINATOR">Coordinator</option><option value="SUPERVISOR">Supervisor</option><option value="STUDENT">Student</option></select></div>
                <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editUser ? 'Update' : 'Create'}</button></div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagement;
