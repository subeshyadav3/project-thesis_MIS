import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';

function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });
  const [yearForm, setYearForm] = useState({ year: '', semester: '', departmentId: '' });
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadData = () => {
    api.get('/departments').then(({ data }) => setDepartments(data)).catch(() => {});
    api.get('/departments/academic-years').then(({ data }) => setAcademicYears(data)).catch(() => {});
  };
  useEffect(() => { loadData(); }, []);

  const handleCreateDept = async (e) => {
    e.preventDefault();
    try { await api.post('/departments', deptForm); setShowDeptModal(false); setDeptForm({ name: '', code: '' }); loadData(); } catch (err) { alert(err.response?.data?.error); }
  };

  const handleCreateYear = async (e) => {
    e.preventDefault();
    try { await api.post('/departments/academic-years', yearForm); setShowYearModal(false); setYearForm({ year: '', semester: '', departmentId: '' }); loadData(); } catch (err) { alert(err.response?.data?.error); }
  };

  return (
    <div className="app-layout">
      <Sidebar user={user} />
      <div className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h1>Department & Academic Year Management</h1></div>
          <div><button className="btn btn-primary btn-sm" onClick={() => setShowDeptModal(true)}>Add Department</button> <button className="btn btn-primary btn-sm" onClick={() => setShowYearModal(true)}>Add Academic Year</button></div>
        </div>
        <div className="card"><h3>Departments</h3>
          <table><thead><tr><th>Name</th><th>Code</th><th>Academic Years</th></tr></thead>
            <tbody>{departments.map(d => <tr key={d.id}><td>{d.name}</td><td>{d.code}</td><td>{d.academicYears?.length || 0}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="card"><h3>Academic Years</h3>
          <table><thead><tr><th>Year</th><th>Semester</th><th>Department</th><th>Active</th></tr></thead>
            <tbody>{academicYears.map(y => <tr key={y.id}><td>{y.year}</td><td>{y.semester}</td><td>{y.department?.name || 'N/A'}</td><td>{y.isActive ? 'Yes' : 'No'}</td></tr>)}</tbody>
          </table>
        </div>
        {showDeptModal && <div className="modal-overlay" onClick={() => setShowDeptModal(false)}><div className="modal" onClick={e => e.stopPropagation()}><h2>Add Department</h2><form onSubmit={handleCreateDept}><div className="form-group"><label>Name</label><input value={deptForm.name} onChange={e => setDeptForm({...deptForm, name: e.target.value})} required /></div><div className="form-group"><label>Code</label><input value={deptForm.code} onChange={e => setDeptForm({...deptForm, code: e.target.value})} required /></div><div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setShowDeptModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div></form></div></div>}
        {showYearModal && <div className="modal-overlay" onClick={() => setShowYearModal(false)}><div className="modal" onClick={e => e.stopPropagation()}><h2>Add Academic Year</h2><form onSubmit={handleCreateYear}><div className="form-group"><label>Year</label><input value={yearForm.year} onChange={e => setYearForm({...yearForm, year: e.target.value})} required placeholder="e.g. 2025-2026" /></div><div className="form-group"><label>Semester</label><input value={yearForm.semester} onChange={e => setYearForm({...yearForm, semester: e.target.value})} required placeholder="e.g. Fall" /></div><div className="form-group"><label>Department</label><select value={yearForm.departmentId} onChange={e => setYearForm({...yearForm, departmentId: e.target.value})} required><option value="">Select...</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div><div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setShowYearModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div></form></div></div>}
      </div>
    </div>
  );
}

export default DepartmentManagement;
