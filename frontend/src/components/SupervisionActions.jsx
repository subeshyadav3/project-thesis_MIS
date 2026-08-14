import React, { useState } from 'react';
import { Icon } from './ui';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

function SupervisionActions({ item, type, onDone }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const status = item.supervisorAssignmentStatus;

  if (status === 'ACCEPTED') {
    return <span className="badge badge-completed"><span className="dot" />Accepted</span>;
  }
  if (status === 'REJECTED') {
    return <span className="badge badge-error">Declined</span>;
  }
  if (status !== 'PENDING') {
    return null;
  }

  const base = type === 'thesis' ? 'theses' : 'groups';

  const accept = async () => {
    setBusy(true);
    try {
      await api.put(`/supervisors/${base}/${item.id}/accept-supervision`);
      toast.success('Supervision accepted');
      onDone && onDone();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to accept supervision');
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for declining');
      return;
    }
    setBusy(true);
    try {
      await api.put(`/supervisors/${base}/${item.id}/reject-supervision`, { reason: reason.trim() });
      toast.success('Supervision declined — coordinator has been notified');
      setRejecting(false);
      setReason('');
      onDone && onDone();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to decline supervision');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="badge badge-warning"><span className="dot" />Pending</span>
      <button className="btn btn-sm btn-primary" onClick={accept} disabled={busy}>
        <Icon name="check" className="material-symbols-outlined" style={{ fontSize: 15 }} /> Accept
      </button>
      <button className="btn btn-sm btn-outline" onClick={() => setRejecting(true)} disabled={busy}>
        <Icon name="close" className="material-symbols-outlined" style={{ fontSize: 15 }} /> Decline
      </button>

      {rejecting && (
        <div className="modal-overlay" onClick={() => setRejecting(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div className="modal-header-icon danger">
                <Icon name="block" className="material-symbols-outlined" />
              </div>
              <div className="modal-header-text">
                <h2>Decline Supervision</h2>
                <p>You will be removed as supervisor and the coordinator will be notified with your reason.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setRejecting(false)} aria-label="Close">
                <Icon name="close" className="material-symbols-outlined" />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Reason for declining <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Already supervising the maximum number of students; workload; area of expertise..."
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setRejecting(false)} disabled={busy}>Cancel</button>
              <button className="btn btn-danger" onClick={reject} disabled={busy}>
                <Icon name="block" className="material-symbols-outlined" /> {busy ? 'Sending...' : 'Decline Supervision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SupervisionActions;