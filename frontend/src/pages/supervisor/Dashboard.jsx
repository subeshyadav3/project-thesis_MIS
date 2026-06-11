import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';

function SupervisorDashboard() {
  const [groups, setGroups] = useState([]);
  const [theses, setTheses] = useState([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    api.get('/supervisors/groups').then(({ data }) => setGroups(data)).catch(() => {});
    api.get('/supervisors/theses').then(({ data }) => setTheses(data)).catch(() => {});
  }, []);

  return (
    <div className="app-layout">
      <Sidebar user={user} />
      <div className="main-content">
        <div className="page-header"><h1>Supervisor Dashboard</h1><p>Your assigned projects and theses</p></div>
        <div className="card"><h3>Bachelor Project Groups ({groups.length})</h3>
          {groups.length === 0 ? <p style={{ color: '#888', fontSize: 14 }}>No groups assigned yet.</p> :
          <table><thead><tr><th>Group</th><th>Project Title</th><th>Members</th><th>Status</th></tr></thead>
            <tbody>{groups.map(g => <tr key={g.id}><td><Link to={`/supervisor/project/group/${g.id}`} style={{ color: '#1a237e', fontWeight: 500 }}>{g.name}</Link></td><td>{g.projectTitle}</td><td style={{ fontSize: 12 }}>{g.members?.map(m => `${m.student.firstName} ${m.student.lastName}`).join(', ')}</td><td><span className={`badge badge-${g.status?.toLowerCase()}`}>{g.status}</span></td></tr>)}</tbody>
          </table>}
        </div>
        <div className="card"><h3>Master's Theses ({theses.length})</h3>
          {theses.length === 0 ? <p style={{ color: '#888', fontSize: 14 }}>No theses assigned yet.</p> :
          <table><thead><tr><th>Student</th><th>Thesis Title</th><th>Status</th></tr></thead>
            <tbody>{theses.map(t => <tr key={t.id}><td><Link to={`/supervisor/project/thesis/${t.id}`} style={{ color: '#1a237e', fontWeight: 500 }}>{t.student?.firstName} {t.student?.lastName}</Link></td><td>{t.title}</td><td><span className={`badge badge-${t.status?.toLowerCase()}`}>{t.status}</span></td></tr>)}</tbody>
          </table>}
        </div>
      </div>
    </div>
  );
}

export default SupervisorDashboard;
