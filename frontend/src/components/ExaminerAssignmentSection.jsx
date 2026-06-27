import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

/**
 * Coordinator-only: assign / remove internal examiners to a group or thesis.
 *
 * @param {string} type - 'group' | 'thesis'
 * @param {number} id
 * @param {Array} currentAssignments - examinerAssignments from the parent item
 * @param {Function} onRefresh - callback to reload parent data
 */
function ExaminerAssignmentSection({ type, id, currentAssignments = [], onRefresh }) {
  const [examiners, setExaminers] = useState([]);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedExaminerId, setSelectedExaminerId] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get('/users/role/external_examiner').then(({ data }) => setExaminers(data)).catch(() => {});
  }, []);

  const assignedIds = (currentAssignments || []).map(a => a.externalExaminerId);

  const handleAssign = async () => {
    if (!selectedExaminerId) {
      toast.warning('Please select an examiner');
      return;
    }
    setLoading(true);
    try {
      await api.post('/examiner-assignments/' + type, {
        externalExaminerId: selectedExaminerId,
        [type === 'group' ? 'groupId' : 'thesisId']: id,
      });
      toast.success('Examiner assigned successfully');
      setShowAssign(false);
      setSelectedExaminerId('');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign examiner');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (assignmentId) => {
    if (!window.confirm('Remove this examiner assignment?')) return;
    try {
      await api.delete(`/examiner-assignments/${assignmentId}`);
      toast.success('Examiner removed');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove');
    }
  };

  const availableExaminers = examiners.filter(e => !assignedIds.includes(e.id));

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--color-tertiary-container)', color: 'var(--color-on-tertiary-container)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person_apron</span>
          </div>
          <div>
            <h3 style={{ margin: 0 }}>Internal Examiner Assignment</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
              Assign an internal examiner to evaluate the 10-mark component
            </p>
          </div>
        </div>
        {availableExaminers.length > 0 && !showAssign && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowAssign(true)}>
            <span className="material-symbols-outlined">person_add</span>
            Assign Examiner
          </button>
        )}
      </div>

      {showAssign && (
        <div style={{ padding: 16, borderBottom: '1px solid var(--color-outline-variant)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
              <label style={{ fontSize: 12 }}>Select Examiner</label>
              <select value={selectedExaminerId} onChange={e => setSelectedExaminerId(e.target.value)}>
                <option value="">— Choose an examiner —</option>
                {availableExaminers.map(e => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.email})</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleAssign} disabled={loading || !selectedExaminerId}>
              <span className="material-symbols-outlined">{loading ? 'progress_activity' : 'check'}</span>
              {loading ? 'Assigning...' : 'Assign'}
            </button>
            <button className="btn btn-outline" onClick={() => { setShowAssign(false); setSelectedExaminerId(''); }}>
              Cancel
            </button>
          </div>
          {availableExaminers.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 8 }}>
              All examiners are already assigned to this {type === 'group' ? 'project' : 'thesis'}.
            </p>
          )}
        </div>
      )}

      <div style={{ padding: 16 }}>
        {(currentAssignments || []).length === 0 ? (
          <div className="empty-state" style={{ padding: '16px 0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--color-outline)' }}>person_off</span>
            <p style={{ fontSize: 13, marginTop: 8 }}>No internal examiner assigned yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(currentAssignments || []).map(a => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 8,
                background: 'var(--color-surface-container-low)',
                border: '1px solid var(--color-outline-variant)',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14, flexShrink: 0,
                }}>
                  {a.externalExaminer?.firstName?.[0]}{a.externalExaminer?.lastName?.[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {a.externalExaminer?.firstName} {a.externalExaminer?.lastName}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                    {a.externalExaminer?.email}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', textAlign: 'right' }}>
                  Assigned<br/>
                  {new Date(a.createdAt).toLocaleDateString()}
                </div>
                <button className="btn btn-sm btn-danger-outline" onClick={() => handleRemove(a.id)} title="Remove assignment">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExaminerAssignmentSection;
