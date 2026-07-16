import React, { useState, useEffect } from 'react';
import ConfirmDialog from './ConfirmDialog';

/**
 * Shared PDF popup component for coordinator, supervisor, and external examiner.
 * Shows editable fields + live preview + download with confirm.
 */
export default function EvaluationPdfPreview({ type, id, componentName, onClose }) {
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const endpoint = type === 'group'
      ? `/api/print/preview/group/${id}`
      : `/api/print/preview/thesis/${id}`;
    fetch(endpoint, { credentials: 'include' })
      .then(r => r.text())
      .then(html => setPreviewHtml(html))
      .catch(() => setPreviewHtml('<p style="color:red;padding:20px;">Failed to load preview</p>'))
      .finally(() => setLoading(false));
  }, [type, id]);

  const handleDownload = () => {
    setConfirmOpen(true);
  };

  const confirmDownload = () => {
    setConfirmOpen(false);
    setDownloading(true);
    const endpoint = type === 'group'
      ? `/api/print/group/${id}`
      : `/api/print/thesis/${id}`;
    const a = document.createElement('a');
    a.href = endpoint;
    a.download = `evaluation_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setDownloading(false), 1000);
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
        <div
          className="modal"
          style={{ maxWidth: 1100, width: '95%', height: '85vh', display: 'flex', flexDirection: 'column' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header">
            <div className="modal-header-icon info">
              <span className="material-symbols-outlined">picture_as_pdf</span>
            </div>
            <div className="modal-header-text">
              <h2>Evaluation PDF Preview</h2>
              <p>Review the evaluation sheet before downloading</p>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: 16, padding: '0 16px' }}>
            {/* Preview iframe */}
            <div style={{ flex: 1, border: '1px solid var(--color-outline-variant)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32, animation: 'spin 1s linear infinite' }}>progress_activity</span>
                  <span style={{ marginLeft: 8 }}>Loading preview...</span>
                </div>
              ) : (
                <iframe
                  srcDoc={previewHtml}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="PDF Preview"
                />
              )}
            </div>
          </div>

          <div className="modal-actions" style={{ padding: '12px 16px' }}>
            <button className="btn btn-outline" onClick={onClose}>
              <span className="material-symbols-outlined">close</span>
              Close
            </button>
            <button
              className="btn btn-primary"
              onClick={handleDownload}
              disabled={downloading || loading}
            >
              <span className="material-symbols-outlined">
                {downloading ? 'progress_activity' : 'download'}
              </span>
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Download Evaluation PDF"
        message="Are you sure you want to download this evaluation sheet as PDF?"
        onConfirm={confirmDownload}
        onCancel={() => setConfirmOpen(false)}
        confirmLabel="Download"
      />
    </>
  );
}
