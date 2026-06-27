import React, { useState, useEffect, useMemo } from 'react';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

const ROLE_LABEL = {
  SUPERVISOR: 'Supervisor',
  COORDINATOR: 'Coordinator',
  EXTERNAL_EXAMINER: 'Internal Examiner',
};

function Evaluations() {
  const toast = useToast();
  const [groups, setGroups] = useState([]);
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('bachelor');
  const [showForward, setShowForward] = useState(false);
  const [showDefenseModal, setShowDefenseModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/groups').then(({ data }) => setGroups(data)),
      api.get('/theses').then(({ data }) => setTheses(data)),
    ]).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  // The 5 components coordinator can edit (defense types)
  const coordinatorComponentTypes = useMemo(
    () => ['PROPOSAL_DEFENSE', 'MIDTERM_DEFENSE', 'FINAL_DEFENSE'],
    []
  );

  const handleForward = async () => {
    try {
      await api.post('/forward', { departmentName: 'Computer Science' });
      toast.success('Results forwarded to Exam Department successfully');
      setShowForward(false);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      const cleanMsg = typeof msg === 'string' && msg.length > 120 ? msg.slice(0, 120) + '...' : msg;
      toast.error(cleanMsg || 'Failed to forward results. Server error occurred.');
    }
  };

  const handleOpenDefenseModal = (item) => {
    setSelectedItem(item);
    setShowDefenseModal(true);
  };

  const handleOpenSummaryModal = (item) => {
    setSelectedItem(item);
    setShowSummaryModal(true);
  };

  // Per-component save. Calls /evaluations/marks with componentId.
  const saveComponentMarks = async (component, marks, comment) => {
    const payload = {
      componentId: component.id,
      marks: marks === '' || marks === null || marks === undefined ? null : parseFloat(marks),
      comment: comment || null,
    };
    if (viewMode === 'bachelor') payload.groupId = selectedItem.id;
    else payload.thesisId = selectedItem.id;
    const { data } = await api.post('/evaluations/marks', payload);
    return data;
  };

  const handleSaveComponent = async (component, marks, comment) => {
    // Validate
    if (marks !== '' && marks !== null && marks !== undefined) {
      const val = parseFloat(marks);
      if (Number.isNaN(val) || val < 0 || val > component.maxMarks) {
        toast.warning(`Marks must be between 0 and ${component.maxMarks}`);
        return false;
      }
    }
    setSaving(true);
    try {
      await saveComponentMarks(component, marks, comment);
      toast.success(`${component.name} marks updated`);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to save ${component.name} marks`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAllDefenses = async () => {
    // Save all 3 defense components in sequence
    const components = (selectedItem.evaluationComponents || []).filter(c =>
      coordinatorComponentTypes.includes(c.evaluationType)
    );
    setSaving(true);
    let ok = 0;
    for (const c of components) {
      try {
        const marks = document.getElementById(`marks-${c.id}`)?.value ?? '';
        const comment = document.getElementById(`comment-${c.id}`)?.value ?? '';
        const val = marks === '' ? null : parseFloat(marks);
        if (val !== null && (Number.isNaN(val) || val < 0 || val > c.maxMarks)) {
          toast.warning(`${c.name}: marks must be between 0 and ${c.maxMarks}`);
          continue;
        }
        await saveComponentMarks(c, marks, comment);
        ok += 1;
      } catch (err) {
        toast.error(`${c.name}: ${err.response?.data?.error || 'Save failed'}`);
      }
    }
    setSaving(false);
    toast.success(`Saved ${ok}/${components.length} defense components`);
    setShowDefenseModal(false);
    loadData();
  };

  // ── Helpers for row rendering ─────────────────────────────────
  const findBreakdown = (item) => {
    const components = item.evaluationComponents || [];
    const evaluations = item.evaluations || [];
    return components.map(c => {
      const e = evaluations.find(ev => ev.componentId === c.id);
      return { component: c, evaluation: e };
    });
  };

  const getMarksByType = (item, type) => {
    const match = findBreakdown(item).find(b => b.component.evaluationType === type);
    return match?.evaluation?.marks ?? null;
  };

  const totalMarks = (item) => findBreakdown(item)
    .reduce((sum, b) => sum + (b.evaluation?.marks ?? 0), 0);

  const completedCount = (item) => findBreakdown(item)
    .filter(b => b.evaluation?.marks !== null && b.evaluation?.marks !== undefined).length;

  const items = viewMode === 'bachelor' ? groups : theses;
  const processedItems = items.map(item => ({
    ...item,
    name: viewMode === 'bachelor' ? item.name : `${item.student?.firstName} ${item.student?.lastName}`,
    project: viewMode === 'bachelor' ? item.projectTitle : item.title,
    members: viewMode === 'bachelor'
      ? item.members?.map(m => `${m.student?.firstName} ${m.student?.lastName}`).join(', ')
      : `${item.student?.firstName} ${item.student?.lastName}`,
    supervisorName: item.supervisor ? `${item.supervisor.firstName} ${item.supervisor.lastName}` : 'N/A',
  }));

  const total = processedItems.length;
  const completed = processedItems.filter(i => {
    const c = completedCount(i);
    return c === (i.evaluationComponents || []).length && c > 0;
  }).length;
  const pending = total - completed;
  const partial = processedItems.filter(i => {
    const c = completedCount(i);
    return c > 0 && c < (i.evaluationComponents || []).length;
  }).length;

  const actions = (
    <button className="btn btn-success" onClick={() => setShowForward(true)}>
      <span className="material-symbols-outlined">forward</span>
      Forward to Exam Dept
    </button>
  );

  return (
    <PageLayout title="Evaluations" user={user} actions={actions}>
      {/* Evaluation scheme explainer */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>info</span>
          <h3 style={{ margin: 0, fontSize: 15 }}>Minor Project Evaluation Scheme (50 marks)</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {[
            { name: 'Supervisor', marks: 25, role: 'SUPERVISOR' },
            { name: 'Proposal Defense', marks: 5, role: 'COORDINATOR' },
            { name: 'Mid-Term Defense', marks: 5, role: 'COORDINATOR' },
            { name: 'Final Defense', marks: 5, role: 'COORDINATOR' },
            { name: 'Internal Examiner', marks: 10, role: 'EXTERNAL_EXAMINER' },
          ].map(c => (
            <div key={c.name} style={{
              padding: 10, borderRadius: 8,
              background: 'var(--color-surface-container-low)',
              border: '1px solid var(--color-outline-variant)'
            }}>
              <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{c.name}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary)', marginTop: 2 }}>{c.marks} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-on-surface-variant)' }}>marks</span></div>
              <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>
                Evaluated by <strong style={{ color: 'var(--color-on-surface)' }}>{ROLE_LABEL[c.role]}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">checklist</span></div>
          <div className="stat-number">{total}</div>
          <div className="stat-label">Total {viewMode === 'bachelor' ? 'Projects' : 'Theses'}</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">check_circle</span></div>
          <div className="stat-number">{completed}</div>
          <div className="stat-label">Fully Evaluated</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">progress_activity</span></div>
          <div className="stat-number">{partial}</div>
          <div className="stat-label">Partially Evaluated</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">pending_actions</span></div>
          <div className="stat-number">{pending}</div>
          <div className="stat-label">Pending</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="tabs" style={{ margin: 0, borderBottom: 'none' }}>
            <div className={`tab ${viewMode === 'bachelor' ? 'active' : ''}`} onClick={() => setViewMode('bachelor')}>
              <span className="material-symbols-outlined">school</span>
              Bachelor Projects
            </div>
            <div className={`tab ${viewMode === 'master' ? 'active' : ''}`} onClick={() => setViewMode('master')}>
              <span className="material-symbols-outlined">library_books</span>
              Master's Thesis
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <span className="material-symbols-outlined">progress_activity</span>
            <p>Loading evaluations...</p>
          </div>
        ) : processedItems.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">grading</span>
            <h3>No evaluations found</h3>
            <p>No {viewMode === 'bachelor' ? 'projects' : 'theses'} have been registered yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: 1000 }}>
              <thead>
                <tr>
                  <th style={{ width: 150 }}>{viewMode === 'bachelor' ? 'Group' : 'Student'}</th>
                  <th style={{ width: 220 }}>Project / Thesis</th>
                  <th style={{ width: 140 }}>Supervisor</th>
                  <th style={{ textAlign: 'center' }}>Supervisor (25)</th>
                  <th style={{ textAlign: 'center' }}>Proposal (5)</th>
                  <th style={{ textAlign: 'center' }}>Mid-Term (5)</th>
                  <th style={{ textAlign: 'center' }}>Final Def (5)</th>
                  <th style={{ textAlign: 'center' }}>Internal (10)</th>
                  <th style={{ textAlign: 'center' }}>Progress</th>
                  <th style={{ textAlign: 'center' }}>Total (50)</th>
                  <th style={{ width: 200, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {processedItems.map(item => {
                  const breakdown = findBreakdown(item);
                  const byType = (type) => breakdown.find(b => b.component.evaluationType === type);
                  const sup = byType('SUPERVISOR')?.evaluation;
                  const prop = byType('PROPOSAL_DEFENSE')?.evaluation;
                  const mid = byType('MIDTERM_DEFENSE')?.evaluation;
                  const fin = byType('FINAL_DEFENSE')?.evaluation;
                  const intEx = byType('EXTERNAL_EXAMINER')?.evaluation;
                  const done = breakdown.filter(b => b.evaluation?.marks !== null && b.evaluation?.marks !== undefined).length;
                  const tot = breakdown.length;
                  const total = totalMarks(item);
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.name}</td>
                      <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>{item.project}</td>
                      <td>{item.supervisorName}</td>
                      <td style={{ textAlign: 'center' }}>
                        <ComponentCell evaluation={sup} maxMarks={25} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <ComponentCell evaluation={prop} maxMarks={5} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <ComponentCell evaluation={mid} maxMarks={5} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <ComponentCell evaluation={fin} maxMarks={5} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <ComponentCell evaluation={intEx} maxMarks={10} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>{done} / {tot}</div>
                        <div style={{ width: 70, height: 4, background: 'var(--color-outline-variant)', borderRadius: 2, margin: '4px auto 0', overflow: 'hidden' }}>
                          <div style={{ width: `${tot ? (done / tot) * 100 : 0}%`, height: '100%', background: done === tot ? 'var(--color-success)' : 'var(--color-primary)' }} />
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-primary)' }}>
                          {total.toFixed(1)}
                        </span>
                        <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 12 }}> / 50</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => handleOpenSummaryModal(item)} title="View all 5 components">
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                          </button>
                          <button className="btn btn-primary btn-sm" onClick={() => handleOpenDefenseModal(item)} title="Enter defense marks">
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_note</span>
                            Defenses
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Defense Marks Entry Modal (coordinator edits 3 components) */}
      {showDefenseModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDefenseModal(false)}>
          <div className="modal" style={{ maxWidth: 720, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon primary">
                <span className="material-symbols-outlined">edit_note</span>
              </div>
              <div className="modal-header-text">
                <h2>Defense Marks</h2>
                <p>
                  Enter marks for the 3 defense components of <strong>{selectedItem.name}</strong>.
                  You evaluate these as <strong>Coordinator</strong>.
                </p>
              </div>
            </div>

            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <div style={{ padding: 10, borderRadius: 8, background: 'var(--color-surface-container-low)', marginBottom: 14, fontSize: 13 }}>
                <strong>{selectedItem.project}</strong><br />
                <span style={{ color: 'var(--color-on-surface-variant)' }}>Supervisor: {selectedItem.supervisorName}</span>
              </div>

              {(selectedItem.evaluationComponents || [])
                .filter(c => coordinatorComponentTypes.includes(c.evaluationType))
                .map(c => {
                  const evalRec = (selectedItem.evaluations || []).find(e => e.componentId === c.id);
                  return (
                    <div key={c.id} className="card" style={{ padding: 12, marginBottom: 10, border: '1px solid var(--color-outline-variant)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div>
                          <h4 style={{ margin: 0 }}>{c.name}</h4>
                          <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>
                            {ROLE_LABEL[c.evaluatorRole]} evaluates this
                          </span>
                        </div>
                        <span className="badge" style={{ background: 'var(--color-secondary-container)', color: 'var(--color-on-secondary-container)' }}>
                          Max: {c.maxMarks}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div className="form-group" style={{ width: 110, marginBottom: 0 }}>
                          <label style={{ fontSize: 11 }}>Marks (out of {c.maxMarks})</label>
                          <input
                            id={`marks-${c.id}`}
                            type="number"
                            defaultValue={evalRec?.marks ?? ''}
                            min="0"
                            max={c.maxMarks}
                            step="0.5"
                            placeholder={`0–${c.maxMarks}`}
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                          <label style={{ fontSize: 11 }}>Comments</label>
                          <input
                            id={`comment-${c.id}`}
                            type="text"
                            defaultValue={evalRec?.comment ?? ''}
                            placeholder={`Enter ${c.name.toLowerCase()} comments...`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* Read-only summary of supervisor + internal examiner marks */}
              <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                {(selectedItem.evaluationComponents || [])
                  .filter(c => c.evaluationType === 'SUPERVISOR' || c.evaluationType === 'EXTERNAL_EXAMINER')
                  .map(c => {
                    const e = (selectedItem.evaluations || []).find(ev => ev.componentId === c.id);
                    return (
                      <div key={c.id} style={{ padding: 12, background: 'var(--color-surface-container-low)', borderRadius: 8, border: '1px solid var(--color-outline-variant)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>
                          {c.name} · by {ROLE_LABEL[c.evaluatorRole]}
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: e?.marks !== null && e?.marks !== undefined ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}>
                          {e?.marks !== null && e?.marks !== undefined ? e.marks : '—'}
                          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-on-surface-variant)' }}> / {c.maxMarks}</span>
                        </div>
                        {e?.comment && (
                          <div style={{ fontSize: 11, fontStyle: 'italic', marginTop: 4, color: 'var(--color-on-surface-variant)' }}>
                            "{e.comment}"
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowDefenseModal(false)} disabled={saving}>
                <span className="material-symbols-outlined">close</span>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveAllDefenses} disabled={saving}>
                <span className="material-symbols-outlined">{saving ? 'progress_activity' : 'check'}</span>
                {saving ? 'Saving...' : 'Save All Defenses'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Read-only summary modal showing all 5 components */}
      {showSummaryModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowSummaryModal(false)}>
          <div className="modal" style={{ maxWidth: 600, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <span className="material-symbols-outlined">fact_check</span>
              </div>
              <div className="modal-header-text">
                <h2>Evaluation Summary</h2>
                <p>{selectedItem.project}</p>
              </div>
            </div>

            <div className="modal-body">
              {(selectedItem.evaluationComponents || []).map(c => {
                const e = (selectedItem.evaluations || []).find(ev => ev.componentId === c.id);
                const status = e?.marks !== null && e?.marks !== undefined ? 'done' : 'pending';
                return (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                    borderRadius: 8, marginBottom: 8,
                    background: status === 'done' ? 'var(--color-surface-container-low)' : 'transparent',
                    border: '1px solid var(--color-outline-variant)'
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: status === 'done' ? 'var(--color-success-container)' : 'var(--color-surface-container)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: status === 'done' ? 'var(--color-on-success-container)' : 'var(--color-on-surface-variant)',
                      flexShrink: 0,
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                        {status === 'done' ? 'check_circle' : 'pending'}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>
                        Evaluated by {ROLE_LABEL[c.evaluatorRole]} · Max {c.maxMarks} marks
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: status === 'done' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}>
                        {e?.marks !== null && e?.marks !== undefined ? e.marks : '—'}
                        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-on-surface-variant)' }}> / {c.maxMarks}</span>
                      </div>
                      {e?.submittedBy && (
                        <div style={{ fontSize: 10, color: 'var(--color-on-surface-variant)' }}>
                          {e.submittedBy.firstName} {e.submittedBy.lastName}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div style={{
                marginTop: 14, padding: 14, borderRadius: 10,
                background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Grand Total</span>
                  <span style={{ fontSize: 28, fontWeight: 800 }}>
                    {totalMarks(selectedItem).toFixed(1)}
                    <span style={{ fontSize: 14, fontWeight: 400 }}> / 50</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowSummaryModal(false)}>
                <span className="material-symbols-outlined">close</span>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showForward && (
        <div className="modal-overlay" onClick={() => setShowForward(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon success">
                <span className="material-symbols-outlined">forward</span>
              </div>
              <div className="modal-header-text">
                <h2>Forward Results</h2>
                <p>This will send all completed evaluations to the Examination Department. This action cannot be undone.</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowForward(false)}>
                <span className="material-symbols-outlined">close</span>
                Cancel
              </button>
              <button className="btn btn-success" onClick={handleForward}>
                <span className="material-symbols-outlined">check</span>
                Confirm Forward
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

function ComponentCell({ evaluation, maxMarks }) {
  if (!evaluation || evaluation.marks === null || evaluation.marks === undefined) {
    return <span style={{ color: 'var(--color-on-surface-variant)' }}>—</span>;
  }
  const pct = (evaluation.marks / maxMarks) * 100;
  const color = pct >= 75 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-primary)' : 'var(--color-warning)';
  return (
    <span style={{ fontWeight: 600, color }}>
      {Number(evaluation.marks).toFixed(1)}
      <span style={{ color: 'var(--color-on-surface-variant)', fontWeight: 400, fontSize: 11 }}> / {maxMarks}</span>
    </span>
  );
}

export default Evaluations;
