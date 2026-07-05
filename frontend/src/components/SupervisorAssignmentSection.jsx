import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

function SupervisorAssignmentSection({ type, id, currentSupervisor, onRefresh, disabled = false }) {
  const [supervisors, setSupervisors] = useState([]);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedSupId, setSelectedSupId] = useState('');
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!disabled) {
      api.get('/users/role/supervisor').then(({ data }) => setSupervisors(data)).catch(() => {});
    }
  }, [disabled]);

  const handleAssign = async () => {
    if (!selectedSupId) {
      toast.warning('Please select a supervisor');
      return;
    }
    setLoading(true);
    try {
      const endpoint = type === 'group' ? `/groups/${id}/supervisor` : `/theses/${id}/supervisor`;
      await api.put(endpoint, { supervisorId: selectedSupId });
      toast.success('Supervisor assigned successfully');
      setShowAssign(false);
      setSelectedSupId('');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign supervisor');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentSupervisor) return;
    if (!window.confirm(`Remove ${currentSupervisor.firstName} ${currentSupervisor.lastName} as supervisor?`)) return;
    setRemoving(true);
    try {
      const endpoint = type === 'group' ? `/groups/${id}/supervisor` : `/theses/${id}/supervisor`;
      await api.put(endpoint, { supervisorId: null });
      toast.success('Supervisor removed');
      setShowAssign(true);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove supervisor');
    } finally {
      setRemoving(false);
    }
  };

  const availableSupervisors = supervisors.filter(s => !currentSupervisor || s.id !== currentSupervisor.id);

  return (
    <div className="card" style={{ opacity: disabled ? 0.7 : 1 }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>supervisor_account</span>
          </div>
          <div>
            <h3 style={{ margin: 0 }}>Supervisor</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
              {disabled ? 'Project is completed' : currentSupervisor ? 'Change the assigned supervisor' : 'Assign a supervisor'}
            </p>
          </div>
        </div>
        {!showAssign && !disabled && !currentSupervisor && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowAssign(true)}>
            <span className="material-symbols-outlined">person_add</span>
            Assign Supervisor
          </button>
        )}
      </div>

      {showAssign && (
        <div style={{ padding: 16, borderBottom: '1px solid var(--color-outline-variant)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
              <label style={{ fontSize: 12 }}>Select Supervisor</label>
              <select value={selectedSupId} onChange={e => setSelectedSupId(e.target.value)}>
                <option value="">— Choose a supervisor —</option>
                {availableSupervisors.map(s => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.email})</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleAssign} disabled={loading || !selectedSupId}>
              <span className="material-symbols-outlined">{loading ? 'progress_activity' : 'check'}</span>
              {loading ? 'Assigning...' : 'Assign'}
            </button>
            <button className="btn btn-outline" onClick={() => { setShowAssign(false); setSelectedSupId(''); }}>
              Cancel
            </button>
          </div>
          {availableSupervisors.length === 0 && currentSupervisor && (
            <p style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 8 }}>
              No other supervisors available.
            </p>
          )}
        </div>
      )}

      <div style={{ padding: 16 }}>
        {currentSupervisor ? (
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
              {currentSupervisor.firstName?.[0]}{currentSupervisor.lastName?.[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {currentSupervisor.firstName} {currentSupervisor.lastName}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                {currentSupervisor.email}
              </div>
            </div>
            <div style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4,
              background: currentSupervisor.active ? 'var(--color-success-container)' : 'var(--color-error-container)',
              color: currentSupervisor.active ? 'var(--color-on-success-container)' : 'var(--color-on-error-container)',
            }}>
              {currentSupervisor.active ? 'Active' : 'Inactive'}
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
              {disabled ? 'No supervisor assigned.' : 'No supervisor assigned yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SupervisorAssignmentSection;
