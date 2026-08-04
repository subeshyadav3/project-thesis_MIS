import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '../../components/ui';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import ErrorBoundary from '../../components/ErrorBoundary';
import ConfirmDialog from '../../components/ConfirmDialog';
import SearchInput from '../../components/SearchInput';
import { TableSkeleton } from '../../components/Skeleton';

function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });
  const [yearForm, setYearForm] = useState({ year: '', semester: '', departmentId: '' });
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null, danger: false });

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    setLoading(true);
    Promise.all([
      api.get('/departments', { signal }).then(({ data }) => setDepartments(data)),
      api.get('/departments/academic-years', { signal }).then(({ data }) => setAcademicYears(data)),
    ]).catch((err) => {
      if (err.name !== 'CanceledError') toast.error('Failed to load data');
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const filteredDepartments = useMemo(() =>
    departments.filter(d =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [departments, searchQuery]
  );

  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!deptForm.name.trim() || !deptForm.code.trim()) {
      toast.error('Department name and code are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/departments', deptForm);
      toast.success('Department created successfully');
      setShowDeptModal(false);
      setDeptForm({ name: '', code: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error creating department');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateYear = async (e) => {
    e.preventDefault();
    if (!yearForm.year.trim() || !yearForm.semester.trim() || !yearForm.departmentId) {
      toast.error('All academic year fields are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/departments/academic-years', yearForm);
      toast.success('Academic year created successfully');
      setShowYearModal(false);
      setYearForm({ year: '', semester: '', departmentId: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error creating academic year');
    } finally {
      setSaving(false);
    }
  };

  const actions = (
    <>
      <button className="btn btn-secondary btn-sm" onClick={() => setShowYearModal(true)}>
        <Icon name="calendar_month" className="material-symbols-outlined" />
        Add Academic Year
      </button>
      <button className="btn btn-primary btn-sm" onClick={() => setShowDeptModal(true)}>
        <Icon name="add" className="material-symbols-outlined" />
        Add Department
      </button>
    </>
  );

  return (
    <ErrorBoundary>
      <PageLayout title="Departments" user={user} actions={actions}>
      <div className="page-header">
        <h1>
          <Icon name="account_balance" className="material-symbols-outlined" />
          Departments & Academic Years
        </h1>
        <p>Manage departments and their academic year configurations</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card bento-card">
          <div className="stat-icon">
            <Icon name="account_balance" className="material-symbols-outlined" />
          </div>
          <div className="stat-number">{departments.length}</div>
          <div className="stat-label">Departments</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon">
            <Icon name="calendar_month" className="material-symbols-outlined" />
          </div>
          <div className="stat-number">{academicYears.length}</div>
          <div className="stat-label">Academic Years</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Departments</h3>
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search departments..." style={{ width: 240 }} />
        </div>
        {loading ? (
          <TableSkeleton rows={5} cols={3} />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Academic Years</th>
              </tr>
            </thead>
            <tbody>
              {filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', padding: 40 }}>
                    {searchQuery ? 'No departments match your search.' : 'No departments found. Create one to get started.'}
                  </td>
                </tr>
              ) : (
                filteredDepartments.map(d => (
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
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Academic Years</h3>
        </div>
        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : (
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
        )}
      </div>

      {showDeptModal && (
        <div className="modal-overlay" onClick={() => setShowDeptModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <Icon name="add_business" className="material-symbols-outlined" />
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
                  <Icon name="close" className="material-symbols-outlined" />
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Icon name={saving ? 'progress_activity' : 'add'} className="material-symbols-outlined" />
                  {saving ? 'Creating...' : 'Create'}
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
                <Icon name="calendar_month" className="material-symbols-outlined" />
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
                  <Icon name="close" className="material-symbols-outlined" />
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Icon name={saving ? 'progress_activity' : 'add'} className="material-symbols-outlined" />
                  {saving ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog open={confirmDialog.open} title={confirmDialog.title} message={confirmDialog.message} danger={confirmDialog.danger} onConfirm={() => { confirmDialog.onConfirm?.(); setConfirmDialog({ ...confirmDialog, open: false }); }} onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })} />
      </PageLayout>
    </ErrorBoundary>
  );
}

export default DepartmentManagement;
