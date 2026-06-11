import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';

function Evaluations() {
  const [groups, setGroups] = useState([]);
  const [theses, setTheses] = useState([]);
  const [viewMode, setViewMode] = useState('bachelor');
  const [showForward, setShowForward] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadData = () => {
    api.get('/groups').then(({ data }) => setGroups(data)).catch(() => {});
    api.get('/theses').then(({ data }) => setTheses(data)).catch(() => {});
  };
  useEffect(() => { loadData(); }, []);

  const calcTotal = (evaluations = []) => {
    return evaluations.reduce((sum, e) => sum + (e.marks || 0), 0);
  };

  const handleForward = async () => {
    try {
      await api.post('/forward', { departmentName: 'Computer Science' });
      alert('Results forwarded to Exam Department successfully');
      setShowForward(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Forwarding failed');
    }
  };

  const items = viewMode === 'bachelor'
    ? groups.map(g => ({ id: g.id, name: g.name, project: g.projectTitle, members: g.members?.map(m => `${m.student.firstName} ${m.student.lastName}`).join(', '), supervisor: g.supervisor ? `${g.supervisor.firstName} ${g.supervisor.lastName}` : 'N/A', evaluations: g.evaluations, total: calcTotal(g.evaluations), status: g.status }))
    : theses.map(t => ({ id: t.id, name: `${t.student?.firstName} ${t.student?.lastName}`, project: t.title, members: `${t.student?.firstName} ${t.student?.lastName}`, supervisor: t.supervisor ? `${t.supervisor.firstName} ${t.supervisor.lastName}` : 'N/A', evaluations: t.evaluations, total: calcTotal(t.evaluations), status: t.status }));

  return (
    <div className="app-layout">
      <Sidebar user={user} />
      <div className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h1>Evaluations</h1><p>View final marks and forward results</p></div>
          <button className="btn btn-success" onClick={() => setShowForward(true)}>Forward to Exam Dept</button>
        </div>
        <div className="tabs">
          <div className={`tab ${viewMode === 'bachelor' ? 'active' : ''}`} onClick={() => setViewMode('bachelor')}>Bachelor Projects</div>
          <div className={`tab ${viewMode === 'master' ? 'active' : ''}`} onClick={() => setViewMode('master')}>Master's Thesis</div>
        </div>
        <table>
          <thead><tr><th>{viewMode === 'bachelor' ? 'Group' : 'Student'}</th><th>Project / Thesis</th><th>Members</th><th>Supervisor</th><th>Total Marks</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.project}</td>
                <td style={{ fontSize: 12 }}>{item.members}</td>
                <td>{item.supervisor}</td>
                <td><strong>{item.total}</strong> / 50</td>
                <td><span className={`badge badge-${item.status?.toLowerCase()}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {showForward && <div className="modal-overlay" onClick={() => setShowForward(false)}><div className="modal" onClick={e => e.stopPropagation()}><h2>Forward Results</h2><p>This will send all completed evaluations to the Examination Department. Continue?</p><div className="modal-actions"><button className="btn btn-outline" onClick={() => setShowForward(false)}>Cancel</button><button className="btn btn-success" onClick={handleForward}>Confirm Forward</button></div></div></div>}
      </div>
    </div>
  );
}

export default Evaluations;
