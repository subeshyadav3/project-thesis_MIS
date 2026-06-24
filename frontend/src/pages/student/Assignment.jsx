import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

function StudentAssignment() {
  const [assignment, setAssignment] = useState(null);
  const [assignmentType, setAssignmentType] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setLoading(true);
    api.get('/students/my-group')
      .then(({ data }) => {
        setAssignment(data);
        setAssignmentType('group');
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        u.studentType = 'bachelor';
        localStorage.setItem('user', JSON.stringify(u));
      })
      .catch(() => {
        api.get('/students/my-thesis')
          .then(({ data }) => {
            setAssignment(data);
            setAssignmentType('thesis');
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            u.studentType = 'master';
            localStorage.setItem('user', JSON.stringify(u));
          })
          .catch(() => {
            setAssignment(null);
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            u.studentType = 'unassigned';
            localStorage.setItem('user', JSON.stringify(u));
          })
          .finally(() => setLoading(false));
      })
      .finally(() => setLoading(false));
  }, []);

  const safeMembers = (a) => (a?.members || []).filter(m => m.student);

  if (loading) {
    return (
      <PageLayout title="My Assignment" user={user}>
        <div className="loading-state"><span className="material-symbols-outlined">progress_activity</span><p>Loading...</p></div>
      </PageLayout>
    );
  }

  if (!assignment) {
    return (
      <PageLayout title="My Assignment" subtitle="You are not assigned to any project or thesis yet" user={user}>
        <div className="empty-state" style={{ padding: 40 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }}>school</span>
          <h3>No Assignment</h3>
          <p>You have not been assigned to any bachelor project group or master's thesis yet. Please check back later or contact your coordinator.</p>
        </div>
      </PageLayout>
    );
  }

  const isGroup = assignmentType === 'group';
  const name = isGroup ? assignment.name : `${assignment.student?.firstName} ${assignment.student?.lastName}`;
  const title = isGroup ? assignment.projectTitle : assignment.title;

  return (
    <PageLayout title={title} subtitle={name} user={user}>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
        <div className="card" style={{ flex: 1, minWidth: 280, marginBottom: 0 }}>
          <div className="card-header">
            <h3>{isGroup ? 'Project Details' : 'Thesis Details'}</h3>
            <span className={`badge badge-${assignment.status?.toLowerCase() || 'pending'}`}>
              <span className="dot" />{assignment.status}
            </span>
          </div>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">{isGroup ? 'Project Title' : 'Thesis Title'}</span>
              <span style={{ fontWeight: 600 }}>{title}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{isGroup ? 'Group Name' : 'Student'}</span>
              <span>{name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Type</span>
              <span className={`badge badge-active`}><span className="dot" />{isGroup ? 'Bachelor Project' : "Master's Thesis"}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Supervisor</span>
              <span>{assignment.supervisor ? `${assignment.supervisor.firstName} ${assignment.supervisor.lastName}` : <span className="badge badge-pending"><span className="dot" />Unassigned</span>}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Academic Year</span>
              <span>{assignment.academicYear?.year || '—'}</span>
            </div>
          </div>
        </div>

        {isGroup && (
          <div className="card" style={{ flex: 1, minWidth: 280, marginBottom: 0 }}>
            <div className="card-header"><h3>Group Members ({safeMembers(assignment).length})</h3></div>
            {safeMembers(assignment).length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}><p>No members</p></div>
            ) : (
              <table className="detail-table">
                <thead><tr><th>Student</th><th>Roll</th><th>Email</th></tr></thead>
                <tbody>
                  {safeMembers(assignment).map((m, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{m.student?.firstName} {m.student?.lastName}</td>
                      <td style={{ color: 'var(--color-on-surface-variant)' }}>{m.rollNumber}</td>
                      <td style={{ fontSize: 13, wordBreak: 'break-all', color: 'var(--color-on-surface-variant)' }}>{m.student?.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {!isGroup && (
          <div className="card" style={{ flex: 1, minWidth: 280, marginBottom: 0 }}>
            <div className="card-header"><h3>Student Info</h3></div>
            <div className="detail-grid">
              <div className="detail-item"><span className="detail-label">Name</span><span style={{ fontWeight: 600 }}>{assignment.student?.firstName} {assignment.student?.lastName}</span></div>
              <div className="detail-item"><span className="detail-label">Email</span><span>{assignment.student?.email || '—'}</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-header"><h3>Evaluations</h3></div>
        {(!assignment.evaluations || assignment.evaluations.length === 0) ? (
          <div className="empty-state" style={{ padding: 24 }}><p>No evaluations submitted yet.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['PROPOSAL', 'MID_TERM', 'FINAL'].map(stage => {
              const stageEvals = (assignment.evaluations || []).filter(e => e.stage === stage);
              const hasMarks = stageEvals.some(e => e.marks !== null);
              const totalMarks = stageEvals.reduce((s, e) => s + (e.marks || 0), 0);
              const comments = stageEvals.filter(e => e.comment);
              return (
                <div key={stage} style={{
                  padding: 14, borderRadius: 8, background: hasMarks ? 'rgba(22,163,74,0.05)' : 'var(--color-surface-container-low)',
                  border: `1px solid ${hasMarks ? 'var(--color-success)' : 'var(--color-outline-variant)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{stage.replace('_', ' ')}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge badge-${hasMarks ? 'completed' : 'pending'}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                        {hasMarks ? 'Evaluated' : 'Pending'}
                      </span>
                      {hasMarks && <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{totalMarks}</span>}
                    </div>
                  </div>
                  {comments.map(c => (
                    <p key={c.id} style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-on-surface-variant)' }}>
                      "{c.comment}" — {c.submittedBy?.firstName} {c.submittedBy?.lastName}
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default StudentAssignment;
