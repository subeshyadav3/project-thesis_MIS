import React, { useState, useEffect, useMemo } from 'react';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

function ExternalEvaluationsList() {
  const [groups, setGroups] = useState([]);
  const [theses, setTheses] = useState([]);
  const [activeTab, setActiveTab] = useState('groups');
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    setLoading(true);
    Promise.all([
      api.get('/external-examiners/groups', { signal }).then(({ data }) => setGroups(data)).catch((err) => { if (err.name === 'CanceledError') return; }),
      api.get('/external-examiners/theses', { signal }).then(({ data }) => setTheses(data)).catch((err) => { if (err.name === 'CanceledError') return; }),
    ]).catch((err) => { if (err.name !== 'CanceledError') toast.error(err.response?.data?.error || 'Failed to load data'); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const handleCompleteGroup = async (id) => {
    setCompleting(id);
    try {
      const { data } = await api.get(`/evaluations/group/${id}`);
      const extComp = (data.components || []).find(c => c.evaluatorRole === 'EXTERNAL_EXAMINER');
      if (!extComp) { toast.error('No examiner component found'); return; }
      const evaluation = (data.evaluations || []).find(e => e.componentId === extComp.id);
      if (!evaluation || evaluation.marks === null || evaluation.marks === undefined) {
        const confirmed = window.confirm('No marks submitted yet. Complete without marks?');
        if (!confirmed) return;
      }
      await api.put(`/evaluations/${extComp.id}/complete`, { groupId: id });
      toast.success('Evaluation finalized');
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to complete'); }
    finally { setCompleting(null); }
  };

  const handleCompleteThesis = async (id) => {
    setCompleting(id);
    try {
      const { data } = await api.get(`/evaluations/thesis/${id}`);
      const extComp = (data.components || []).find(c => c.evaluatorRole === 'EXTERNAL_EXAMINER');
      if (!extComp) { toast.error('No examiner component found'); return; }
      const evaluation = (data.evaluations || []).find(e => e.componentId === extComp.id);
      if (!evaluation || evaluation.marks === null || evaluation.marks === undefined) {
        const confirmed = window.confirm('No marks submitted yet. Complete without marks?');
        if (!confirmed) return;
      }
      await api.put(`/evaluations/${extComp.id}/complete`, { thesisId: id });
      toast.success('Evaluation finalized');
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to complete'); }
    finally { setCompleting(null); }
  };

  const groupsWithStatus = useMemo(() => {
    return groups.map(g => {
      const comp = g.evaluationComponents?.find(c => c.evaluatorRole === 'EXTERNAL_EXAMINER');
      const evalRec = g.evaluations?.find(e => e.componentId === comp?.id);
      return { ...g, evalStatus: evalRec?.status || 'DRAFT', hasMarks: evalRec?.marks != null };
    });
  }, [groups]);

  const thesesWithStatus = useMemo(() => {
    return theses.map(t => {
      const comp = t.evaluationComponents?.find(c => c.evaluatorRole === 'EXTERNAL_EXAMINER');
      const evalRec = t.evaluations?.find(e => e.componentId === comp?.id);
      return { ...t, evalStatus: evalRec?.status || 'DRAFT', hasMarks: evalRec?.marks != null };
    });
  }, [theses]);

  return (
    <PageLayout title="Assigned Evaluations" subtitle="Projects and theses assigned for evaluation" user={user}>
      {loading ? (
        <div className="loading-state"><span className="material-symbols-outlined">progress_activity</span></div>
      ) : (
        <>
          <div className="tabs" style={{ marginBottom: 24 }}>
            <div className={`tab ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => setActiveTab('groups')}>
              <span className="material-symbols-outlined">school</span> Bachelor Projects ({groups.length})
            </div>
            <div className={`tab ${activeTab === 'theses' ? 'active' : ''}`} onClick={() => setActiveTab('theses')}>
              <span className="material-symbols-outlined">library_books</span> Master's Theses ({theses.length})
            </div>
          </div>

          {activeTab === 'groups' ? (
            groups.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48 }}>school</span>
                <p>No bachelor projects assigned for evaluation.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Group</th>
                      <th>Project Title</th>
                      <th>Status</th>
                      <th>Eval Status</th>
                      <th>Members</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupsWithStatus.map(g => (
                      <tr key={g.id} onClick={() => navigate(`/external/evaluate/group/${g.id}`)} style={{ cursor: 'pointer' }}>
                        <td><div className="default-badge">{g.name?.slice(0, 2).toUpperCase()}</div><span style={{ fontWeight: 500 }}>{g.name}</span></td>
                        <td style={{ color: 'var(--color-on-surface-variant)' }}>{g.projectTitle}</td>
                        <td><span className={`badge badge-${g.status?.toLowerCase() || 'pending'}`}><span className="dot" />{g.status}</span></td>
                        <td>
                          <span className={`badge ${g.evalStatus === 'COMPLETED' ? 'badge-success' : ''}`} style={{ fontSize: 11 }}>
                            {g.evalStatus === 'COMPLETED' ? 'Completed' : g.hasMarks ? 'Draft' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>
                          {(g.members || []).filter(m => m.student).map(m => `${m.student.firstName} ${m.student.lastName}`).join(', ') || '—'}
                        </td>
                        <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/external/evaluate/group/${g.id}`)}>
                              <span className="material-symbols-outlined">grading</span> Evaluate
                            </button>
                            {g.evalStatus !== 'COMPLETED' && (
                              <button className="btn btn-sm btn-success" onClick={() => handleCompleteGroup(g.id)} disabled={completing === g.id}>
                                <span className="material-symbols-outlined">{completing === g.id ? 'progress_activity' : 'check_circle'}</span>
                                {completing === g.id ? '...' : 'Complete'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            theses.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48 }}>library_books</span>
                <p>No master's theses assigned for evaluation.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Thesis Title</th>
                      <th>Status</th>
                      <th>Eval Status</th>
                      <th>Supervisor</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {thesesWithStatus.map(t => (
                      <tr key={t.id} onClick={() => navigate(`/external/evaluate/thesis/${t.id}`)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: 500 }}>{t.student?.firstName} {t.student?.lastName}</td>
                        <td style={{ color: 'var(--color-on-surface-variant)' }}>{t.title}</td>
                        <td><span className={`badge badge-${t.status?.toLowerCase() || 'pending'}`}><span className="dot" />{t.status}</span></td>
                        <td>
                          <span className={`badge ${t.evalStatus === 'COMPLETED' ? 'badge-success' : ''}`} style={{ fontSize: 11 }}>
                            {t.evalStatus === 'COMPLETED' ? 'Completed' : t.hasMarks ? 'Draft' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>{t.supervisor ? `${t.supervisor.firstName} ${t.supervisor.lastName}` : '—'}</td>
                        <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/external/evaluate/thesis/${t.id}`)}>
                              <span className="material-symbols-outlined">grading</span> Evaluate
                            </button>
                            {t.evalStatus !== 'COMPLETED' && (
                              <button className="btn btn-sm btn-success" onClick={() => handleCompleteThesis(t.id)} disabled={completing === t.id}>
                                <span className="material-symbols-outlined">{completing === t.id ? 'progress_activity' : 'check_circle'}</span>
                                {completing === t.id ? '...' : 'Complete'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </PageLayout>
  );
}

export default ExternalEvaluationsList;
