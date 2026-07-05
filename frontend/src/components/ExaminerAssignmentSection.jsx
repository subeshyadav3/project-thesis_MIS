import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

function ExaminerAssignmentSection({ type, id, currentAssignments = [], onRefresh, disabled = false }) {
  const [examiners, setExaminers] = useState([]);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedExaminerId, setSelectedExaminerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!disabled) {
      api.get('/users/role/external_examiner').then(({ data }) => setExaminers(data)).catch(() => {});
    }
  }, [disabled]);

  const firstAssignment = (currentAssignments || [])[0];
  const examinerUser = firstAssignment?.externalExaminer;

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

  const handleRemove = async () => {
    if (!firstAssignment) return;
    if (!window.confirm(`Remove ${examinerUser.firstName} ${examinerUser.lastName} as internal examiner?`)) return;
    setRemoving(true);
    try {
      await api.delete(`/examiner-assignments/${firstAssignment.id}`);
      toast.success('Examiner removed');
      setShowAssign(true);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove examiner');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="card" style={{ opacity: disabled ? 0.7 : 1 }}>
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
            <h3 style={{ margin: 0 }}>Internal Examiner</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
              {disabled ? 'Project is completed' : 'Assign an internal examiner to evaluate'}
            </p>
          </div>
        </div>
        {!firstAssignment && !showAssign && !disabled && (
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
                {examiners.filter(e => !firstAssignment || e.id !== firstAssignment.externalExaminerId).map(e => (
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
        </div>
      )}

      <div style={{ padding: 16 }}>
        {firstAssignment ? (
          <div style={{
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
              {examinerUser?.firstName?.[0]}{examinerUser?.lastName?.[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {examinerUser?.firstName} {examinerUser?.lastName}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                {examinerUser?.email}
              </div>
            </div>
            <div style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4,
              background: examinerUser?.active ? 'var(--color-success-container)' : 'var(--color-error-container)',
              color: examinerUser?.active ? 'var(--color-on-success-container)' : 'var(--color-on-error-container)',
            }}>
              {examinerUser?.active ? 'Active' : 'Inactive'}
            </div>
            {!disabled && (
              <button className="btn btn-sm btn-outline" onClick={handleRemove} disabled={removing} style={{ color: 'var(--color-error)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{removing ? 'progress_activity' : 'close'}</span>
                Remove
              </button>
            )}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '16px 0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--color-outline)' }}>person_off</span>
            <p style={{ fontSize: 13, marginTop: 8 }}>
              {disabled ? 'No examiner assigned.' : 'No internal examiner assigned yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExaminerAssignmentSection;
