import React from 'react';

function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
      <div className="modal-header">
        <h3>{title || 'Confirm'}</h3>
      </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
