import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

function Evaluations() {
  const toast = useToast();
  const [groups, setGroups] = useState([]);
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('bachelor');
  const [showForward, setShowForward] = useState(false);
  const [showDefenseModal, setShowDefenseModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [defenseMarks, setDefenseMarks] = useState({
    PROPOSAL_DEFENSE: '',
    MIDTERM_DEFENSE: '',
    FINAL_DEFENSE: '',
  });
  const [defenseComments, setDefenseComments] = useState({
    PROPOSAL_DEFENSE: '',
    MIDTERM_DEFENSE: '',
    FINAL_DEFENSE: '',
  });
  const [saving, setSaving] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/groups').then(({ data }) => setGroups(data)),
      api.get('/theses').then(({ data }) => setTheses(data)),
    ]).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const parseEvaluations = (evals = []) => {
    const breakdown = {
      SUPERVISOR: { marks: null, comment: '' },
      PROPOSAL_DEFENSE: { marks: null, comment: '' },
      MIDTERM_DEFENSE: { marks: null, comment: '' },
      FINAL_DEFENSE: { marks: null, comment: '' },
      EXTERNAL_EXAMINER: { marks: null, comment: '' },
    };

    evals.forEach(e => {
      if (e.evaluationType && breakdown[e.evaluationType]) {
        const existing = breakdown[e.evaluationType];
        if (!existing.createdAt || new Date(e.createdAt) > new Date(existing.createdAt)) {
          breakdown[e.evaluationType] = {
            marks: e.marks,
            comment: e.comment || '',
            createdAt: e.createdAt,
          };
        }
      }
    });

    const total = Object.values(breakdown).reduce((sum, item) => sum + (item.marks || 0), 0);
    return { breakdown, total };
  };

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
    const { breakdown } = parseEvaluations(item.evaluations);
    setDefenseMarks({
      PROPOSAL_DEFENSE: breakdown.PROPOSAL_DEFENSE.marks !== null ? breakdown.PROPOSAL_DEFENSE.marks.toString() : '',
      MIDTERM_DEFENSE: breakdown.MIDTERM_DEFENSE.marks !== null ? breakdown.MIDTERM_DEFENSE.marks.toString() : '',
      FINAL_DEFENSE: breakdown.FINAL_DEFENSE.marks !== null ? breakdown.FINAL_DEFENSE.marks.toString() : '',
    });
    setDefenseComments({
      PROPOSAL_DEFENSE: breakdown.PROPOSAL_DEFENSE.comment,
      MIDTERM_DEFENSE: breakdown.MIDTERM_DEFENSE.comment,
      FINAL_DEFENSE: breakdown.FINAL_DEFENSE.comment,
    });
    setShowDefenseModal(true);
  };

  const handleSaveDefenseMarks = async () => {
    // Validate marks are within limits (0 to 5)
    for (const key of ['PROPOSAL_DEFENSE', 'MIDTERM_DEFENSE', 'FINAL_DEFENSE']) {
      const valStr = defenseMarks[key];
      if (valStr !== '') {
        const val = parseFloat(valStr);
        if (isNaN(val) || val < 0 || val > 5) {
          toast.warning('Defense marks must be between 0 and 5');
          return;
        }
      }
    }

    setSaving(true);
    try {
      const promises = [];
      const payloadBase = viewMode === 'bachelor' ? { groupId: selectedItem.id } : { thesisId: selectedItem.id };

      // Proposal Defense
      promises.push(api.post('/evaluations', {
        ...payloadBase,
        stage: 'PROPOSAL',
        evaluationType: 'PROPOSAL_DEFENSE',
        marks: defenseMarks.PROPOSAL_DEFENSE !== '' ? parseFloat(defenseMarks.PROPOSAL_DEFENSE) : null,
        comment: defenseComments.PROPOSAL_DEFENSE,
      }));

      // Midterm Defense
      promises.push(api.post('/evaluations', {
        ...payloadBase,
        stage: 'MID_TERM',
        evaluationType: 'MIDTERM_DEFENSE',
        marks: defenseMarks.MIDTERM_DEFENSE !== '' ? parseFloat(defenseMarks.MIDTERM_DEFENSE) : null,
        comment: defenseComments.MIDTERM_DEFENSE,
      }));

      // Final Defense
      promises.push(api.post('/evaluations', {
        ...payloadBase,
        stage: 'FINAL',
        evaluationType: 'FINAL_DEFENSE',
        marks: defenseMarks.FINAL_DEFENSE !== '' ? parseFloat(defenseMarks.FINAL_DEFENSE) : null,
        comment: defenseComments.FINAL_DEFENSE,
      }));

      await Promise.all(promises);
      toast.success('Defense marks updated successfully');
      setShowDefenseModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save defense marks');
    } finally {
      setSaving(false);
    }
  };

  const processItems = (list) => {
    return list.map(item => {
      const { breakdown, total } = parseEvaluations(item.evaluations);
      return {
        ...item,
        breakdown,
        total,
        name: viewMode === 'bachelor' ? item.name : `${item.student?.firstName} ${item.student?.lastName}`,
        project: viewMode === 'bachelor' ? item.projectTitle : item.title,
        members: viewMode === 'bachelor'
          ? item.members?.map(m => `${m.student.firstName} ${m.student.lastName}`).join(', ')
          : `${item.student?.firstName} ${item.student?.lastName}`,
        supervisorName: item.supervisor ? `${item.supervisor.firstName} ${item.supervisor.lastName}` : 'N/A',
      };
    });
  };

  const items = viewMode === 'bachelor' ? processItems(groups) : processItems(theses);
  const completedCount = items.filter(i => i.status === 'COMPLETED').length;
  const pendingCount = items.filter(i => i.status !== 'COMPLETED').length;

  const actions = (
    <button className="btn btn-success" onClick={() => setShowForward(true)}>
      <span className="material-symbols-outlined">forward</span>
      Forward to Exam Dept
    </button>
  );

  return (
    <PageLayout title="Evaluations" user={user} actions={actions}>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">checklist</span></div>
          <div className="stat-number">{items.length}</div>
          <div className="stat-label">Total {viewMode === 'bachelor' ? 'Projects' : 'Theses'}</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">check_circle</span></div>
          <div className="stat-number">{completedCount}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">pending_actions</span></div>
          <div className="stat-number">{pendingCount}</div>
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
        ) : items.length === 0 ? (
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
                  <th style={{ textAlign: 'center' }}>External (10)</th>
                  <th style={{ textAlign: 'center' }}>Total (50)</th>
                  <th style={{ width: 140, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>{item.project}</td>
                    <td>{item.supervisorName}</td>
                    <td style={{ textAlign: 'center', fontWeight: 500 }}>
                      {item.breakdown.SUPERVISOR.marks !== null ? item.breakdown.SUPERVISOR.marks : '—'}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 500 }}>
                      {item.breakdown.PROPOSAL_DEFENSE.marks !== null ? item.breakdown.PROPOSAL_DEFENSE.marks : '—'}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 500 }}>
                      {item.breakdown.MIDTERM_DEFENSE.marks !== null ? item.breakdown.MIDTERM_DEFENSE.marks : '—'}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 500 }}>
                      {item.breakdown.FINAL_DEFENSE.marks !== null ? item.breakdown.FINAL_DEFENSE.marks : '—'}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 500 }}>
                      {item.breakdown.EXTERNAL_EXAMINER.marks !== null ? item.breakdown.EXTERNAL_EXAMINER.marks : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-primary)' }}>
                        {item.total.toFixed(1)}
                      </span>
                      <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 12 }}> / 50</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => handleOpenDefenseModal(item)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_note</span>
                        Edit Def Marks
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Defense Marks Entry/Edit Modal */}
      {showDefenseModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDefenseModal(false)}>
          <div className="modal" style={{ maxWidth: 650, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon primary">
                <span className="material-symbols-outlined">edit_note</span>
              </div>
              <div className="modal-header-text">
                <h2>Defense Evaluations</h2>
                <p>Manage proposal, mid-term, and final defense marks for <strong>{selectedItem.name}</strong></p>
              </div>
            </div>

            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '10px 0' }}>
              <div className="detail-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, padding: 12, borderRadius: 8, background: 'var(--color-surface-container-low)' }}>
                <div>
                  <span className="detail-label">Project Title</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{selectedItem.project}</span>
                </div>
                <div>
                  <span className="detail-label">Supervisor</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{selectedItem.supervisorName}</span>
                </div>
              </div>

              {/* Proposal Defense */}
              <div className="card" style={{ padding: 12, marginBottom: 12, border: '1px solid var(--color-outline-variant)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ margin: 0 }}>Proposal Defense</h4>
                  <span className="badge" style={{ background: 'var(--color-secondary-container)' }}>Max Marks: 5</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div className="form-group" style={{ width: 100, marginBottom: 0 }}>
                    <label style={{ fontSize: 11 }}>Marks</label>
                    <input
                      type="number"
                      value={defenseMarks.PROPOSAL_DEFENSE}
                      onChange={e => setDefenseMarks({ ...defenseMarks, PROPOSAL_DEFENSE: e.target.value })}
                      placeholder="0-5"
                      min="0"
                      max="5"
                      step="0.5"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label style={{ fontSize: 11 }}>Comments</label>
                    <input
                      type="text"
                      value={defenseComments.PROPOSAL_DEFENSE}
                      onChange={e => setDefenseComments({ ...defenseComments, PROPOSAL_DEFENSE: e.target.value })}
                      placeholder="Enter proposal defense comments..."
                    />
                  </div>
                </div>
              </div>

              {/* Mid-Term Defense */}
              <div className="card" style={{ padding: 12, marginBottom: 12, border: '1px solid var(--color-outline-variant)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ margin: 0 }}>Mid-Term Defense</h4>
                  <span className="badge" style={{ background: 'var(--color-secondary-container)' }}>Max Marks: 5</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div className="form-group" style={{ width: 100, marginBottom: 0 }}>
                    <label style={{ fontSize: 11 }}>Marks</label>
                    <input
                      type="number"
                      value={defenseMarks.MIDTERM_DEFENSE}
                      onChange={e => setDefenseMarks({ ...defenseMarks, MIDTERM_DEFENSE: e.target.value })}
                      placeholder="0-5"
                      min="0"
                      max="5"
                      step="0.5"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label style={{ fontSize: 11 }}>Comments</label>
                    <input
                      type="text"
                      value={defenseComments.MIDTERM_DEFENSE}
                      onChange={e => setDefenseComments({ ...defenseComments, MIDTERM_DEFENSE: e.target.value })}
                      placeholder="Enter mid-term defense comments..."
                    />
                  </div>
                </div>
              </div>

              {/* Final Defense */}
              <div className="card" style={{ padding: 12, marginBottom: 12, border: '1px solid var(--color-outline-variant)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ margin: 0 }}>Final Defense</h4>
                  <span className="badge" style={{ background: 'var(--color-secondary-container)' }}>Max Marks: 5</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div className="form-group" style={{ width: 100, marginBottom: 0 }}>
                    <label style={{ fontSize: 11 }}>Marks</label>
                    <input
                      type="number"
                      value={defenseMarks.FINAL_DEFENSE}
                      onChange={e => setDefenseMarks({ ...defenseMarks, FINAL_DEFENSE: e.target.value })}
                      placeholder="0-5"
                      min="0"
                      max="5"
                      step="0.5"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label style={{ fontSize: 11 }}>Comments</label>
                    <input
                      type="text"
                      value={defenseComments.FINAL_DEFENSE}
                      onChange={e => setDefenseComments({ ...defenseComments, FINAL_DEFENSE: e.target.value })}
                      placeholder="Enter final defense comments..."
                    />
                  </div>
                </div>
              </div>

              {/* Read Only Status of Supervisor & Examiner */}
              <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div style={{ padding: 12, background: 'var(--color-surface-container-low)', borderRadius: 8, border: '1px solid var(--color-outline-variant)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Supervisor Mark</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: 'var(--color-primary)' }}>
                    {selectedItem.breakdown.SUPERVISOR.marks !== null ? selectedItem.breakdown.SUPERVISOR.marks : '—'}
                    <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-on-surface-variant)' }}> / 25</span>
                  </div>
                  {selectedItem.breakdown.SUPERVISOR.comment && (
                    <div style={{ fontSize: 11, fontStyle: 'italic', marginTop: 4, color: 'var(--color-on-surface-variant)' }}>
                      "{selectedItem.breakdown.SUPERVISOR.comment}"
                    </div>
                  )}
                </div>
                <div style={{ padding: 12, background: 'var(--color-surface-container-low)', borderRadius: 8, border: '1px solid var(--color-outline-variant)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>External Examiner Mark</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: 'var(--color-primary)' }}>
                    {selectedItem.breakdown.EXTERNAL_EXAMINER.marks !== null ? selectedItem.breakdown.EXTERNAL_EXAMINER.marks : '—'}
                    <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-on-surface-variant)' }}> / 10</span>
                  </div>
                  {selectedItem.breakdown.EXTERNAL_EXAMINER.comment && (
                    <div style={{ fontSize: 11, fontStyle: 'italic', marginTop: 4, color: 'var(--color-on-surface-variant)' }}>
                      "{selectedItem.breakdown.EXTERNAL_EXAMINER.comment}"
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowDefenseModal(false)} disabled={saving}>
                <span className="material-symbols-outlined">close</span>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveDefenseMarks} disabled={saving}>
                <span className="material-symbols-outlined">{saving ? 'progress_activity' : 'check'}</span>
                {saving ? 'Saving...' : 'Save Marks'}
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

export default Evaluations;
