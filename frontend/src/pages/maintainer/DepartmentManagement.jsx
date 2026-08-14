import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [programs, setPrograms] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', coordinatorId: '' });

  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [progForm, setProgForm] = useState({ name: '', code: '', departmentId: '', degreeType: 'BACHELOR', cluster: '' });

  const [showYearModal, setShowYearModal] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [yearForm, setYearForm] = useState({ year: '', semester: '', departmentId: '', isActive: false });

  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null, danger: false });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const toast = useToast();

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/departments').then(({ data }) => setDepartments(data)),
      api.get('/departments/programs').then(({ data }) => setPrograms(data)),
      api.get('/departments/academic-years').then(({ data }) => setAcademicYears(data)),
      api.get('/users/role/COORDINATOR').then(({ data }) => setCoordinators(data)).catch(() => setCoordinators([])),
    ])
      .catch(() => toast.error('Failed to load department records'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredDepartments = useMemo(
    () =>
      departments.filter(
        (d) =>
          d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.code.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [departments, searchQuery]
  );

  // Department Handlers
  const handleSaveDept = async (e) => {
    e.preventDefault();
    if (!deptForm.name.trim() || !deptForm.code.trim()) {
      toast.error('Department name and code are required');
      return;
    }
    setSaving(true);
    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept.id}`, deptForm);
        toast.success('Department updated successfully');
      } else {
        await api.post('/departments', deptForm);
        toast.success('Department created successfully');
      }
      setShowDeptModal(false);
      setEditingDept(null);
      setDeptForm({ name: '', code: '', coordinatorId: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving department');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDept = (dept) => {
    setConfirmDialog({
      open: true,
      title: `Delete Department "${dept.name}"`,
      message: `Are you sure you want to delete ${dept.name} (${dept.code})? All associated programs and academic years must be reassigned first.`,
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/departments/${dept.id}`);
          toast.success('Department deleted successfully');
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to delete department');
        }
      },
    });
  };

  // Program Handlers
  const handleSaveProgram = async (e) => {
    e.preventDefault();
    if (!progForm.name.trim() || !progForm.code.trim() || !progForm.departmentId) {
      toast.error('Name, code, and department are required for a program');
      return;
    }
    setSaving(true);
    try {
      if (editingProgram) {
        await api.put(`/departments/programs/${editingProgram.id}`, progForm);
        toast.success('Program updated successfully');
      } else {
        await api.post('/departments/programs', progForm);
        toast.success('Program created successfully');
      }
      setShowProgramModal(false);
      setEditingProgram(null);
      setProgForm({ name: '', code: '', departmentId: '', degreeType: 'BACHELOR', cluster: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving program');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProgram = (prog) => {
    setConfirmDialog({
      open: true,
      title: `Delete Program "${prog.name}"`,
      message: `Are you sure you want to delete ${prog.name} (${prog.code})?`,
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/departments/programs/${prog.id}`);
          toast.success('Program deleted successfully');
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to delete program');
        }
      },
    });
  };

  // Academic Year Handlers
  const handleSaveYear = async (e) => {
    e.preventDefault();
    if (!yearForm.year.trim() || !yearForm.semester.trim() || !yearForm.departmentId) {
      toast.error('All academic year fields are required');
      return;
    }
    setSaving(true);
    try {
      if (editingYear) {
        await api.put(`/departments/academic-years/${editingYear.id}`, yearForm);
        toast.success('Academic year updated successfully');
      } else {
        await api.post('/departments/academic-years', yearForm);
        toast.success('Academic year created successfully');
      }
      setShowYearModal(false);
      setEditingYear(null);
      setYearForm({ year: '', semester: '', departmentId: '', isActive: false });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving academic year');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleYearActive = async (year) => {
    try {
      await api.put(`/departments/academic-years/${year.id}/toggle-active`);
      toast.success(`Academic year ${year.year} ${year.isActive ? 'deactivated' : 'activated'}`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to toggle academic year status');
    }
  };

  const handleDeleteYear = (year) => {
    setConfirmDialog({
      open: true,
      title: `Delete Academic Year "${year.year}"`,
      message: `Are you sure you want to delete ${year.year} (${year.semester})?`,
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/departments/academic-years/${year.id}`);
          toast.success('Academic year deleted successfully');
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to delete academic year');
        }
      },
    });
  };

  const actions = (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => {
          setEditingYear(null);
          setYearForm({ year: '', semester: '', departmentId: departments[0]?.id || '', isActive: true });
          setShowYearModal(true);
        }}
      >
        <Icon name="calendar_month" className="material-symbols-outlined" />
        Add Academic Year
      </button>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => {
          setEditingProgram(null);
          setProgForm({ name: '', code: '', departmentId: departments[0]?.id || '', degreeType: 'BACHELOR', cluster: '' });
          setShowProgramModal(true);
        }}
      >
        <Icon name="school" className="material-symbols-outlined" />
        Add Program
      </button>
      <button
        className="btn btn-primary btn-sm"
        onClick={() => {
          setEditingDept(null);
          setDeptForm({ name: '', code: '', coordinatorId: '' });
          setShowDeptModal(true);
        }}
      >
        <Icon name="add" className="material-symbols-outlined" />
        Add Department
      </button>
    </div>
  );

  return (
    <ErrorBoundary>
      <PageLayout title="Departments" user={user} actions={actions}>
        <div className="page-header">
          <h1>
            <Icon name="account_balance" className="material-symbols-outlined" />
            Departments
          </h1>
          <p>Configure campus academic faculties, affiliated degree programs, and active academic years</p>
        </div>

        {/* Top Summary Stats */}
        <div className="stats-grid" style={{ marginBottom: 32 }}>
          <div className="stat-card bento-card">
            <div className="stat-icon" style={{ background: 'var(--color-primary-container)', color: 'var(--color-primary)' }}>
              <Icon name="account_balance" className="material-symbols-outlined" />
            </div>
            <div className="stat-number">{departments.length}</div>
            <div className="stat-label">Departments</div>
          </div>
          <div className="stat-card bento-card">
            <div className="stat-icon" style={{ background: 'var(--color-secondary-container)', color: 'var(--color-secondary)' }}>
              <Icon name="school" className="material-symbols-outlined" />
            </div>
            <div className="stat-number">{programs.length}</div>
            <div className="stat-label">Degree Programs</div>
          </div>
          <div className="stat-card bento-card">
            <div className="stat-icon" style={{ background: 'var(--color-tertiary-container)', color: 'var(--color-tertiary)' }}>
              <Icon name="calendar_month" className="material-symbols-outlined" />
            </div>
            <div className="stat-number">{academicYears.length}</div>
            <div className="stat-label">Academic Batches</div>
          </div>
        </div>

        {/* 1. Departments Section */}
        <div className="card" style={{ marginBottom: 32 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="account_balance" className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }} />
              Departments
            </h3>
            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search departments..." style={{ width: 240 }} />
          </div>
          {loading ? (
            <TableSkeleton rows={4} cols={4} />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Department Name</th>
                    <th>Code</th>
                    <th>Head Coordinator</th>
                    <th>Programs & Years</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', padding: 32 }}>
                        {searchQuery ? 'No departments match your search.' : 'No departments found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((d) => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 600 }}>{d.name}</td>
                        <td>
                          <span className="badge badge-primary">
                            <span className="dot" />
                            {d.code}
                          </span>
                        </td>
                        <td>
                          {d.coordinator ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Icon name="person" className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-primary)' }} />
                              {d.coordinator.firstName} {d.coordinator.lastName}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>Unassigned</span>
                          )}
                        </td>
                        <td style={{ color: 'var(--color-on-surface-variant)' }}>
                          {d.programs?.length || 0} programs • {d.academicYears?.length || 0} batches
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 8 }}>
                            <button
                              className="btn btn-outline btn-xs"
                              title="Edit Department"
                              onClick={() => {
                                setEditingDept(d);
                                setDeptForm({ name: d.name, code: d.code, coordinatorId: d.coordinatorId || '' });
                                setShowDeptModal(true);
                              }}
                            >
                              <Icon name="edit" className="material-symbols-outlined" style={{ fontSize: 16 }} />
                              Edit
                            </button>
                            <button
                              className="btn btn-outline btn-xs btn-danger"
                              title="Delete Department"
                              onClick={() => handleDeleteDept(d)}
                            >
                              <Icon name="delete" className="material-symbols-outlined" style={{ fontSize: 16 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 2. Degree Programs Section */}
        <div className="card" style={{ marginBottom: 32 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="school" className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }} />
              Degree Programs
            </h3>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                setEditingProgram(null);
                setProgForm({ name: '', code: '', departmentId: departments[0]?.id || '', degreeType: 'BACHELOR', cluster: '' });
                setShowProgramModal(true);
              }}
            >
              <Icon name="add" className="material-symbols-outlined" />
              Add Program
            </button>
          </div>
          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Program Name</th>
                    <th>Code</th>
                    <th>Degree Level</th>
                    <th>Department</th>
                    <th>Default Cluster</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', padding: 32 }}>
                        No programs found.
                      </td>
                    </tr>
                  ) : (
                    programs.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                        <td>
                          <span className="badge badge-inactive" style={{ fontWeight: 600 }}>
                            {p.code}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${p.degreeType === 'MASTER' ? 'badge-primary' : 'badge-inactive'}`}>
                            {p.degreeType || 'BACHELOR'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-on-surface-variant)' }}>{p.department?.name || 'N/A'}</td>
                        <td>{p.cluster || '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 8 }}>
                            <button
                              className="btn btn-outline btn-xs"
                              title="Edit Program"
                              onClick={() => {
                                setEditingProgram(p);
                                setProgForm({
                                  name: p.name,
                                  code: p.code,
                                  departmentId: p.departmentId,
                                  degreeType: p.degreeType || 'BACHELOR',
                                  cluster: p.cluster || '',
                                });
                                setShowProgramModal(true);
                              }}
                            >
                              <Icon name="edit" className="material-symbols-outlined" style={{ fontSize: 16 }} />
                              Edit
                            </button>
                            <button
                              className="btn btn-outline btn-xs btn-danger"
                              title="Delete Program"
                              onClick={() => handleDeleteProgram(p)}
                            >
                              <Icon name="delete" className="material-symbols-outlined" style={{ fontSize: 16 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 3. Academic Batches Section */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="calendar_month" className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }} />
              Academic Years & Batches
            </h3>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                setEditingYear(null);
                setYearForm({ year: '', semester: '', departmentId: departments[0]?.id || '', isActive: true });
                setShowYearModal(true);
              }}
            >
              <Icon name="add" className="material-symbols-outlined" />
              Add Academic Year
            </button>
          </div>
          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Year / Batch</th>
                    <th>Semester</th>
                    <th>Department</th>
                    <th>Active Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {academicYears.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', padding: 32 }}>
                        No academic years configured.
                      </td>
                    </tr>
                  ) : (
                    academicYears.map((y) => (
                      <tr key={y.id}>
                        <td style={{ fontWeight: 600 }}>{y.year}</td>
                        <td>{y.semester}</td>
                        <td style={{ color: 'var(--color-on-surface-variant)' }}>{y.department?.name || 'N/A'}</td>
                        <td>
                          <button
                            className={`badge badge-${y.isActive ? 'active' : 'inactive'}`}
                            style={{ cursor: 'pointer', border: 'none' }}
                            onClick={() => handleToggleYearActive(y)}
                            title="Click to toggle active state"
                          >
                            <span className="dot" />
                            {y.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 8 }}>
                            <button
                              className="btn btn-outline btn-xs"
                              title="Edit Academic Year"
                              onClick={() => {
                                setEditingYear(y);
                                setYearForm({
                                  year: y.year,
                                  semester: y.semester,
                                  departmentId: y.departmentId,
                                  isActive: y.isActive,
                                });
                                setShowYearModal(true);
                              }}
                            >
                              <Icon name="edit" className="material-symbols-outlined" style={{ fontSize: 16 }} />
                              Edit
                            </button>
                            <button
                              className="btn btn-outline btn-xs btn-danger"
                              title="Delete Academic Year"
                              onClick={() => handleDeleteYear(y)}
                            >
                              <Icon name="delete" className="material-symbols-outlined" style={{ fontSize: 16 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Department Create/Edit */}
        {showDeptModal && (
          <div className="modal-overlay" onClick={() => setShowDeptModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-header-icon info">
                  <Icon name="account_balance" className="material-symbols-outlined" />
                </div>
                <div className="modal-header-text">
                  <h2>{editingDept ? 'Edit Department' : 'Add Department'}</h2>
                  <p>{editingDept ? 'Update department details and head coordinator' : 'Create a new campus department'}</p>
                </div>
              </div>
              <form onSubmit={handleSaveDept}>
                <div className="form-group">
                  <label>Department Name</label>
                  <input
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    required
                    placeholder="e.g. Electronics & Computer Engineering"
                  />
                </div>
                <div className="form-group">
                  <label>Department Code</label>
                  <input
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                    required
                    placeholder="e.g. DOECE"
                  />
                </div>
                <div className="form-group">
                  <label>Head Department Coordinator (Optional)</label>
                  <select
                    value={deptForm.coordinatorId}
                    onChange={(e) => setDeptForm({ ...deptForm, coordinatorId: e.target.value })}
                  >
                    <option value="">No Coordinator Assigned</option>
                    {coordinators.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowDeptModal(false)}>
                    <Icon name="close" className="material-symbols-outlined" />
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <Icon name={saving ? 'progress_activity' : 'save'} className="material-symbols-outlined" />
                    {saving ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Program Create/Edit */}
        {showProgramModal && (
          <div className="modal-overlay" onClick={() => setShowProgramModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-header-icon info">
                  <Icon name="school" className="material-symbols-outlined" />
                </div>
                <div className="modal-header-text">
                  <h2>{editingProgram ? 'Edit Program' : 'Add Degree Program'}</h2>
                  <p>Configure program code, degree level, and research cluster</p>
                </div>
              </div>
              <form onSubmit={handleSaveProgram}>
                <div className="form-group">
                  <label>Program Name</label>
                  <input
                    value={progForm.name}
                    onChange={(e) => setProgForm({ ...progForm, name: e.target.value })}
                    required
                    placeholder="e.g. Computer Engineering"
                  />
                </div>
                <div className="form-group">
                  <label>Program Code</label>
                  <input
                    value={progForm.code}
                    onChange={(e) => setProgForm({ ...progForm, code: e.target.value.toUpperCase() })}
                    required
                    placeholder="e.g. BCT or MSNCS"
                  />
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>Degree Type</label>
                    <select
                      value={progForm.degreeType}
                      onChange={(e) => setProgForm({ ...progForm, degreeType: e.target.value })}
                    >
                      <option value="BACHELOR">Bachelor</option>
                      <option value="MASTER">Master</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <select
                      value={progForm.departmentId}
                      onChange={(e) => setProgForm({ ...progForm, departmentId: e.target.value })}
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Research Cluster (Optional)</label>
                  <input
                    value={progForm.cluster}
                    onChange={(e) => setProgForm({ ...progForm, cluster: e.target.value })}
                    placeholder="e.g. AIML or Cluster 1"
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowProgramModal(false)}>
                    <Icon name="close" className="material-symbols-outlined" />
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <Icon name={saving ? 'progress_activity' : 'save'} className="material-symbols-outlined" />
                    {saving ? 'Saving...' : editingProgram ? 'Update Program' : 'Create Program'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Academic Year Create/Edit */}
        {showYearModal && (
          <div className="modal-overlay" onClick={() => setShowYearModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-header-icon info">
                  <Icon name="calendar_month" className="material-symbols-outlined" />
                </div>
                <div className="modal-header-text">
                  <h2>{editingYear ? 'Edit Academic Year' : 'Add Academic Year'}</h2>
                  <p>Configure batch year and semester</p>
                </div>
              </div>
              <form onSubmit={handleSaveYear}>
                <div className="form-group">
                  <label>Year / Batch</label>
                  <input
                    value={yearForm.year}
                    onChange={(e) => setYearForm({ ...yearForm, year: e.target.value })}
                    required
                    placeholder="e.g. 2080 or 080"
                  />
                </div>
                <div className="form-group">
                  <label>Semester / Term</label>
                  <input
                    value={yearForm.semester}
                    onChange={(e) => setYearForm({ ...yearForm, semester: e.target.value })}
                    required
                    placeholder="e.g. 7th Semester or Fall"
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select
                    value={yearForm.departmentId}
                    onChange={(e) => setYearForm({ ...yearForm, departmentId: e.target.value })}
                    required
                  >
                    <option value="">Select a department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <input
                    type="checkbox"
                    id="yearActiveCheck"
                    checked={yearForm.isActive}
                    onChange={(e) => setYearForm({ ...yearForm, isActive: e.target.checked })}
                    style={{ width: 'auto' }}
                  />
                  <label htmlFor="yearActiveCheck" style={{ margin: 0, cursor: 'pointer' }}>
                    Set as Active Academic Year
                  </label>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowYearModal(false)}>
                    <Icon name="close" className="material-symbols-outlined" />
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <Icon name={saving ? 'progress_activity' : 'save'} className="material-symbols-outlined" />
                    {saving ? 'Saving...' : editingYear ? 'Update Year' : 'Create Year'}
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
          danger={confirmDialog.danger}
          onConfirm={() => {
            confirmDialog.onConfirm?.();
            setConfirmDialog({ ...confirmDialog, open: false });
          }}
          onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })}
        />
      </PageLayout>
    </ErrorBoundary>
  );
}

export default DepartmentManagement;
