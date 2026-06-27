import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });
  const [yearForm, setYearForm] = useState({ year: '', semester: '', departmentId: '' });
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const toast = useToast();

  const loadData = () => {
    api.get('/departments').then(({ data }) => setDepartments(data)).catch(() => {});
    api.get('/departments/academic-years').then(({ data }) => setAcademicYears(data)).catch(() => {});
  };
  useEffect(() => { loadData(); }, []);

  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      await api.post('/departments', deptForm);
      toast.success('Department created successfully');
      setShowDeptModal(false);
      setDeptForm({ name: '', code: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error creating department');
    }
  };

  const handleCreateYear = async (e) => {
    e.preventDefault();
    try {
      await api.post('/departments/academic-years', yearForm);
      toast.success('Academic year created successfully');
      setShowYearModal(false);
      setYearForm({ year: '', semester: '', departmentId: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error creating academic year');
    }
  };

  const actions = (
    <>
      <button className="btn btn-secondary btn-sm" onClick={() => setShowYearModal(true)}>
        <span className="material-symbols-outlined">calendar_month</span>
        Add Academic Year
      </button>
      <button className="btn btn-primary btn-sm" onClick={() => setShowDeptModal(true)}>
        <span className="material-symbols-outlined">add</span>
        Add Department
      </button>
    </>
  );

  return (
    <PageLayout title="Departments" user={user} actions={actions}>
      <div className="page-header">
        <h1>
          <span className="material-symbols-outlined">account_balance</span>
          Departments & Academic Years
        </h1>
        <p>Manage departments and their academic year configurations</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card bento-card">
          <div className="stat-icon">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <div className="stat-number">{departments.length}</div>
          <div className="stat-label">Departments</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon">
            <span className="material-symbols-outlined">calendar_month</span>
          </div>
          <div className="stat-number">{academicYears.length}</div>
          <div className="stat-label">Academic Years</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Departments</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Academic Years</th>
            </tr>
          </thead>
          <tbody>
            {departments.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', padding: 40 }}>
                  No departments found. Create one to get started.
                </td>
              </tr>
            ) : (
              departments.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 500 }}>{d.name}</td>
                  <td>
                    <span className="badge badge-inactive">
                      <span className="dot" />
                      {d.code}
                    </span>
                  </td>
                  <td style={{ color: 'var(--color-on-surface-variant)' }}>{d.academicYears?.length || 0} years</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Academic Years</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>Semester</th>
              <th>Department</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {academicYears.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', padding: 40 }}>
                  No academic years found.
                </td>
              </tr>
            ) : (
              academicYears.map(y => (
                <tr key={y.id}>
                  <td style={{ fontWeight: 500 }}>{y.year}</td>
                  <td>{y.semester}</td>
                  <td style={{ color: 'var(--color-on-surface-variant)' }}>{y.department?.name || 'N/A'}</td>
                  <td>
                    <span className={`badge badge-${y.isActive ? 'active' : 'inactive'}`}>
                      <span className="dot" />
                      {y.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showDeptModal && (
        <div className="modal-overlay" onClick={() => setShowDeptModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <span className="material-symbols-outlined">add_business</span>
              </div>
              <div className="modal-header-text">
                <h2>Add Department</h2>
                <p>Create a new academic department</p>
              </div>
            </div>
            <form onSubmit={handleCreateDept}>
              <div className="form-group">
                <label>Name</label>
                <input value={deptForm.name} onChange={e => setDeptForm({...deptForm, name: e.target.value})} required placeholder="e.g. Computer Science" />
              </div>
              <div className="form-group">
                <label>Code</label>
                <input value={deptForm.code} onChange={e => setDeptForm({...deptForm, code: e.target.value})} required placeholder="e.g. CS" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowDeptModal(false)}>
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

      {showYearModal && (
        <div className="modal-overlay" onClick={() => setShowYearModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <span className="material-symbols-outlined">calendar_month</span>
              </div>
              <div className="modal-header-text">
                <h2>Add Academic Year</h2>
                <p>Add a new academic year to a department</p>
              </div>
            </div>
            <form onSubmit={handleCreateYear}>
              <div className="form-group">
                <label>Year</label>
                <input value={yearForm.year} onChange={e => setYearForm({...yearForm, year: e.target.value})} required placeholder="e.g. 2025-2026" />
              </div>
              <div className="form-group">
                <label>Semester</label>
                <input value={yearForm.semester} onChange={e => setYearForm({...yearForm, semester: e.target.value})} required placeholder="e.g. Fall" />
              </div>
              <div className="form-group">
                <label>Department</label>
                <select value={yearForm.departmentId} onChange={e => setYearForm({...yearForm, departmentId: e.target.value})} required>
                  <option value="">Select a department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowYearModal(false)}>
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

export default DepartmentManagement;
