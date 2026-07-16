import React, { useState, useEffect, useMemo } from 'react';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import ErrorBoundary from '../../components/ErrorBoundary';
import ConfirmDialog from '../../components/ConfirmDialog';
import SearchInput from '../../components/SearchInput';
import { TableSkeleton } from '../../components/Skeleton';

function ExternalEvaluationsList() {
  const [groups, setGroups] = useState([]);
  const [theses, setTheses] = useState([]);
  const [activeTab, setActiveTab] = useState('groups');
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: '', onConfirm: null });
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

  const finalizeEvaluation = async (componentId, payload) => {
    try {
      await api.put(`/evaluations/${componentId}/complete`, payload);
      toast.success('Evaluation finalized');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to complete'); }
    finally { setCompleting(null); }
  };

  const handleCompleteGroup = async (id) => {
    setCompleting(id);
    try {
      const { data } = await api.get(`/evaluations/group/${id}`);
      const extComp = (data.components || []).find(c => c.evaluatorRole === 'EXTERNAL_EXAMINER');
      if (!extComp) { toast.error('No examiner component found'); setCompleting(null); return; }
      const evaluation = (data.evaluations || []).find(e => e.componentId === extComp.id);
      if (!evaluation || evaluation.marks === null || evaluation.marks === undefined) {
        setCompleting(null);
        setConfirmDialog({
          open: true,
          message: 'No marks submitted yet. Complete without marks?',
          onConfirm: () => {
            setConfirmDialog({ open: false, message: '', onConfirm: null });
            setCompleting(extComp.id);
            finalizeEvaluation(extComp.id, { groupId: id });
          }
        });
        return;
      }
      await finalizeEvaluation(extComp.id, { groupId: id });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to complete'); setCompleting(null); }
  };

  const handleCompleteThesis = async (id) => {
    setCompleting(id);
    try {
      const { data } = await api.get(`/evaluations/thesis/${id}`);
      const extComps = (data.components || []).filter(c => c.evaluatorRole === 'EXTERNAL_EXAMINER');
      if (!extComps.length) { toast.error('No examiner component found'); setCompleting(null); return; }
      const allHaveMarks = extComps.every(comp => {
        const e = (data.evaluations || []).find(ev => ev.componentId === comp.id);
        return e && e.marks !== null && e.marks !== undefined;
      });
      if (!allHaveMarks) {
        setCompleting(null);
        setConfirmDialog({
          open: true,
          message: 'Some criteria have no marks. Complete without marks?',
          onConfirm: () => {
            setConfirmDialog({ open: false, message: '', onConfirm: null });
            extComps.forEach(comp => {
              finalizeEvaluation(comp.id, { thesisId: id });
            });
          }
        });
        return;
      }
      for (const comp of extComps) {
        await finalizeEvaluation(comp.id, { thesisId: id });
      }
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to complete'); setCompleting(null); }
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
      const extComps = (t.evaluationComponents || []).filter(c => c.evaluatorRole === 'EXTERNAL_EXAMINER');
      const statuses = extComps.map(c => t.evaluations?.find(e => e.componentId === c.id)?.status || 'DRAFT');
      const allCompleted = statuses.length > 0 && statuses.every(s => s === 'COMPLETED');
      const hasMarks = extComps.some(c => t.evaluations?.find(e => e.componentId === c.id)?.marks != null);
      const evalStatus = allCompleted ? 'COMPLETED' : 'DRAFT';
      return { ...t, evalStatus, hasMarks };
    });
  }, [theses]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groupsWithStatus;
    const q = searchQuery.toLowerCase();
    return groupsWithStatus.filter(g =>
      g.name?.toLowerCase().includes(q) ||
      g.projectTitle?.toLowerCase().includes(q) ||
      (g.members || []).some(m =>
        `${m.student?.firstName} ${m.student?.lastName}`.toLowerCase().includes(q)
      )
    );
  }, [groupsWithStatus, searchQuery]);

  const filteredTheses = useMemo(() => {
    if (!searchQuery) return thesesWithStatus;
    const q = searchQuery.toLowerCase();
    return thesesWithStatus.filter(t =>
      t.title?.toLowerCase().includes(q) ||
      `${t.student?.firstName} ${t.student?.lastName}`.toLowerCase().includes(q) ||
      `${t.supervisor?.firstName} ${t.supervisor?.lastName}`.toLowerCase().includes(q)
    );
  }, [thesesWithStatus, searchQuery]);

  return (
    <ErrorBoundary>
    <PageLayout title="Assigned Evaluations" subtitle="Projects and theses assigned for evaluation" user={user}>
      {loading ? (
        <TableSkeleton rows={5} cols={6} />
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

          <div style={{ marginBottom: 16 }}>
            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by name, title, or member..." />
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
                    {filteredGroups.map(g => (
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
                    {filteredTheses.map(t => (
                      <tr key={t.id} onClick={() => navigate(`/external/evaluate/thesis/${t.id}`)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: 500 }}>{t.student?.firstName} {t.student?.lastName}</td>
                        <td style={{ color: 'var(--color-on-surface-variant)' }}>{t.title}</td>
                        <td><span className={`badge badge-${t.status?.toLowerCase() || 'pending'}`}><span className="dot" />{t.status}</span></td>
                        <td>
                          <span className={`badge ${t.evalStatus === 'COMPLETED' ? 'badge-success' : ''}`} style={{ fontSize: 11 }}>
                            {t.evalStatus === 'COMPLETED' ? 'Completed' : t.hasMarks ? 'Draft' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>{t.supervisor ? `${t.supervisor.designation ? t.supervisor.designation + ' ' : ''}${t.supervisor.firstName} ${t.supervisor.lastName}` : '—'}</td>
                        <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/external/evaluate/thesis/${t.id}`)}>
                              <span className="material-symbols-outlined">grading</span> Evaluate
                            </button>
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
      <ConfirmDialog
        open={confirmDialog.open}
        title="Confirm"
        message={confirmDialog.message}
        onConfirm={() => {
          const fn = confirmDialog.onConfirm;
          setConfirmDialog({ open: false, message: '', onConfirm: null });
          fn?.();
        }}
        onCancel={() => setConfirmDialog({ open: false, message: '', onConfirm: null })}
      />
    </PageLayout>
    </ErrorBoundary>
  );
}

export default ExternalEvaluationsList;
