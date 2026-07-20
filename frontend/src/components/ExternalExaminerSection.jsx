import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

function ExternalExaminerSection({ type, id, currentExaminer, label, onRefresh, disabled = false }) {
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

  const endpointKey = type === 'midterm' ? 'external-midterm' : 'external-final';

  const handleAssign = async () => {
    if (!selectedExaminerId) {
      toast.warning('Please select an examiner');
      return;
    }
    setLoading(true);
    try {
      await api.put(`/theses/${id}/${endpointKey}`, { externalExaminerId: parseInt(selectedExaminerId) });
      toast.success(`External (${label}) assigned successfully`);
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
    if (!currentExaminer) return;
    if (!window.confirm(`Remove ${currentExaminer.firstName} ${currentExaminer.lastName} as ${label}?`)) return;
    setRemoving(true);
    try {
      await api.put(`/theses/${id}/${endpointKey}`, { externalExaminerId: null });
      toast.success(`External (${label}) removed`);
      setShowAssign(true);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove examiner');
    } finally {
      setRemoving(false);
    }
  };

  const availableExaminers = examiners.filter(e => !currentExaminer || e.id !== currentExaminer.id);

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
            <h3 style={{ margin: 0 }}>External ({label})</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
              {disabled ? 'Project is completed' : currentExaminer ? `Change the assigned ${label} examiner` : `Assign an external examiner (${label})`}
            </p>
          </div>
        </div>
        {!currentExaminer && !showAssign && !disabled && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowAssign(true)}>
            <span className="material-symbols-outlined">person_add</span>
            Assign {label}
          </button>
        )}
      </div>

      {showAssign && (
        <div style={{ padding: 16, borderBottom: '1px solid var(--color-outline-variant)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
              <label style={{ fontSize: 12 }}>Select {label} Examiner</label>
              <select value={selectedExaminerId} onChange={e => setSelectedExaminerId(e.target.value)}>
                <option value="">— Choose an examiner —</option>
                {availableExaminers.map(e => (
                  <option key={e.id} value={e.id}>{e.designation ? e.designation + ' ' : ''}{e.firstName} {e.lastName} ({e.email})</option>
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
          {availableExaminers.length === 0 && currentExaminer && (
            <p style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 8 }}>
              No other examiners available.
            </p>
          )}
        </div>
      )}

      <div style={{ padding: 16 }}>
        {currentExaminer ? (
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
              {currentExaminer.firstName?.[0]}{currentExaminer.lastName?.[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {currentExaminer.designation ? currentExaminer.designation + ' ' : ''}{currentExaminer.firstName} {currentExaminer.lastName}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                {currentExaminer.email}
              </div>
            </div>
            <div style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4,
              background: currentExaminer.active ? 'var(--color-success-container)' : 'var(--color-error-container)',
              color: currentExaminer.active ? 'var(--color-on-success-container)' : 'var(--color-on-error-container)',
            }}>
              {currentExaminer.active ? 'Active' : 'Inactive'}
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
              {disabled ? 'No examiner assigned.' : `No external (${label}) examiner assigned yet.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExternalExaminerSection;
