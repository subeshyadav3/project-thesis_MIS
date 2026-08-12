import React, { useState, useEffect } from 'react';
import { Icon } from './ui';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

function CrossProgramReviewModal({ thesisId, onClose, onDecision }) {
  const [thesis, setThesis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get(`/theses/${thesisId}`)
      .then(({ data }) => { if (active) setThesis(data); })
      .catch(err => { if (active) setError(err.response?.data?.error || 'Could not load thesis details'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [thesisId]);

  const decide = async (action) => {
    if (busy) return;
    setBusy(action);
    try {
      await api.put(`/theses/${thesisId}/${action === 'approve' ? 'approve' : 'reject'}-cross-program`);
      toast.success(action === 'approve' ? 'Cross-program thesis approved' : 'Cross-program thesis rejected');
      onDecision?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
      setBusy(null);
      setConfirmReject(false);
    }
  };

  const isPending = thesis && !!thesis.crossProgramRequestedById;
  const pendingFlag = isPending ? 'Pending Approval' : 'Approved';
  const pendingStyle = isPending ? {
    background: 'var(--color-warning-container)', color: 'var(--color-on-warning-container)',
  } : {
    background: 'var(--color-success-container)', color: 'var(--color-on-success-container)',
  };

  const Row = ({ label, children }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--color-outline-variant)' }}>
      <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{children}</span>
    </div>
  );

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
          <div className="modal-header">
            <div className="modal-header-icon" style={{ background: thesis && thesis.crossProgramRequestedById ? 'var(--color-warning-container)' : 'var(--color-success-container)', color: thesis && thesis.crossProgramRequestedById ? 'var(--color-on-warning-container)' : 'var(--color-on-success-container)' }}>
              <Icon name="swap_horiz" className="material-symbols-outlined" />
            </div>
            <div className="modal-header-text">
              <h2>Cross-Program Thesis Review</h2>
              <p>Requested thesis details — review before approving or rejecting.</p>
            </div>
          </div>

          {loading ? (
            <div className="loading-state" style={{ padding: 24 }}>
              <Icon name="progress_activity" className="material-symbols-outlined spin" />
              <p>Loading thesis details...</p>
            </div>
          ) : error ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <Icon name="error_outline" className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--color-error)' }} />
              <p>{error}</p>
              <p style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>It may have already been approved or rejected, or the thesis belongs to another program.</p>
            </div>
          ) : thesis ? (
            <>
              <div style={{ padding: '0 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: 16, lineHeight: 1.4 }}>{thesis.title}</h3>
                  <span className="badge" style={{ ...pendingStyle, flexShrink: 0 }}>{pendingFlag}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginBottom: 8 }}>
                  Created {new Date(thesis.createdAt).toLocaleDateString()} · Batch {thesis.batch || '—'}
                </div>

                <Row label="Student">
                  {thesis.student ? `${thesis.student.firstName} ${thesis.student.lastName}${thesis.student.rollNumber ? ` (${thesis.student.rollNumber})` : ''}` : '—'}
                </Row>
                <Row label="Requested By">
                  {thesis.crossProgramRequestedBy ? `${thesis.crossProgramRequestedBy.firstName} ${thesis.crossProgramRequestedBy.lastName}` : '—'}
                </Row>
                <Row label="Supervisor">
                  {thesis.supervisor ? `${thesis.supervisor.firstName} ${thesis.supervisor.lastName}` : 'Not assigned yet'}
                </Row>
                <Row label="Project Type">Master Thesis</Row>
                <Row label="Status">
                  <span className="badge" style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)', fontSize: 10 }}>{thesis.status}</span>
                </Row>
              </div>

              <div className="modal-actions" style={{ borderTop: '1px solid var(--color-outline-variant)', marginTop: 16 }}>
                {isPending && (
                  <button className="btn btn-danger" onClick={() => setConfirmReject(true)} disabled={busy}>
                    <Icon name="close" className="material-symbols-outlined" />
                    {busy === 'reject' ? 'Rejecting...' : 'Reject'}
                  </button>
                )}
                {isPending && (
                  <button className="btn btn-primary" onClick={() => decide('approve')} disabled={busy}>
                    <Icon name="check" className="material-symbols-outlined" />
                    {busy === 'approve' ? 'Approving...' : 'Approve'}
                  </button>
                )}
                <button className="btn btn-outline" onClick={onClose}>Close</button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmReject}
        title="Reject cross-program thesis?"
        message="Rejecting will delete this thesis and notify the requesting coordinator. This cannot be undone."
        onConfirm={() => decide('reject')}
        onCancel={() => { setConfirmReject(false); setBusy(null); }}
        confirmLabel="Reject"
        danger
      />
    </>
  );
}

export default CrossProgramReviewModal;