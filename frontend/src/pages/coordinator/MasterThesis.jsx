import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';

function MasterThesis() {
  const [theses, setTheses] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [showAssign, setShowAssign] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [createForm, setCreateForm] = useState({ title: '', studentId: '', academicYearId: '' });
  const [assignSup, setAssignSup] = useState('');
  const [students, setStudents] = useState([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadData = () => {
    api.get('/theses').then(({ data }) => setTheses(data)).catch(() => {});
    api.get('/users/role/supervisor').then(({ data }) => setSupervisors(data)).catch(() => {});
    api.get('/departments/academic-years').then(({ data }) => setAcademicYears(data)).catch(() => {});
    api.get('/users').then(({ data }) => setStudents(data.filter(u => u.role === 'STUDENT'))).catch(() => {});
  };
  useEffect(() => { loadData(); }, []);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedYear) { alert('Select file and academic year'); return; }
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('academicYearId', selectedYear);
    try {
      await api.post('/theses/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert('Theses imported successfully');
      setShowUpload(false);
      setSelectedFile(null);
      loadData();
    } catch (err) { alert(err.response?.data?.error || 'Upload failed'); }
  };

  const handleAssign = async (thesisId) => {
    if (!assignSup) { alert('Select a supervisor'); return; }
    try {
      await api.put(`/theses/${thesisId}/supervisor`, { supervisorId: assignSup });
      alert('Supervisor assigned');
      setShowAssign(null);
      setAssignSup('');
      loadData();
    } catch (err) { alert(err.response?.data?.error || 'Assignment failed'); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/theses', createForm);
      setShowCreate(false);
      setCreateForm({ title: '', studentId: '', academicYearId: '' });
      loadData();
    } catch (err) { alert(err.response?.data?.error || 'Create failed'); }
  };

  return (
    <div className="app-layout">
      <Sidebar user={user} />
      <div className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h1>Master's Thesis</h1><p>Manage individual thesis records</p></div>
          <div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>Upload Excel</button>
            <button className="btn btn-primary btn-sm" style={{ marginLeft: 8 }} onClick={() => setShowCreate(true)}>Add Thesis</button>
          </div>
        </div>
        <table>
          <thead><tr><th>Student</th><th>Title</th><th>Supervisor</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {theses.map(t => (
              <tr key={t.id}>
                <td>{t.student?.firstName} {t.student?.lastName}</td>
                <td>{t.title}</td>
                <td>{t.supervisor ? `${t.supervisor.firstName} ${t.supervisor.lastName}` : <span style={{ color: '#e65100' }}>Unassigned</span>}</td>
                <td><span className={`badge badge-${t.status?.toLowerCase()}`}>{t.status}</span></td>
                <td>
                  {!t.supervisor && <button className="btn btn-sm btn-outline" onClick={() => { setShowAssign(t.id); setAssignSup(''); }}>Assign</button>}
                  {t.supervisor && <span style={{ fontSize: 12, color: '#888' }}>Assigned</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {showAssign && <div className="modal-overlay" onClick={() => setShowAssign(null)}><div className="modal" onClick={e => e.stopPropagation()}><h2>Assign Supervisor</h2><div className="form-group"><select value={assignSup} onChange={e => setAssignSup(e.target.value)}><option value="">Select...</option>{supervisors.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}</select></div><div className="modal-actions"><button className="btn btn-outline" onClick={() => setShowAssign(null)}>Cancel</button><button className="btn btn-primary" onClick={() => handleAssign(showAssign)}>Assign</button></div></div></div>}
        {showUpload && <div className="modal-overlay" onClick={() => setShowUpload(false)}><div className="modal" onClick={e => e.stopPropagation()}><h2>Upload Excel</h2><form onSubmit={handleFileUpload}><div className="form-group"><label>Academic Year</label><select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} required><option value="">Select...</option>{academicYears.map(y => <option key={y.id} value={y.id}>{y.year} - {y.semester}</option>)}</select></div><div className="form-group"><label>Excel File (.xlsx)</label><input type="file" accept=".xlsx" onChange={e => setSelectedFile(e.target.files[0])} required /></div><div className="form-group"><small>Columns: Project Title, Member Names, Roll Numbers</small></div><div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setShowUpload(false)}>Cancel</button><button type="submit" className="btn btn-primary">Upload</button></div></form></div></div>}
        {showCreate && <div className="modal-overlay" onClick={() => setShowCreate(false)}><div className="modal" onClick={e => e.stopPropagation()}><h2>Create Thesis</h2><form onSubmit={handleCreate}><div className="form-group"><label>Title</label><input value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} required /></div><div className="form-group"><label>Student</label><select value={createForm.studentId} onChange={e => setCreateForm({...createForm, studentId: e.target.value})} required><option value="">Select...</option>{students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.email})</option>)}</select></div><div className="form-group"><label>Academic Year</label><select value={createForm.academicYearId} onChange={e => setCreateForm({...createForm, academicYearId: e.target.value})} required><option value="">Select...</option>{academicYears.map(y => <option key={y.id} value={y.id}>{y.year} - {y.semester}</option>)}</select></div><div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div></form></div></div>}
      </div>
    </div>
  );
}

export default MasterThesis;
