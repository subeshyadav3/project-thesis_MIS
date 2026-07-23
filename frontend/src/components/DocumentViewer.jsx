import React, { useState } from 'react';

function DocumentViewer({ fileUrl, fileName, onClose }) {
  const [previewError, setPreviewError] = useState(false);
  const fullUrl = fileUrl.startsWith('http') ? fileUrl : fileUrl;
  const ext = fileUrl.match(/\.(\w+)$/)?.[1]?.toLowerCase() || fileName?.match(/\.(\w+)$/)?.[1]?.toLowerCase() || '';
  const isPreviewable = ['pdf'].includes(ext);

  const handleDownload = (e) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = fullUrl;
    a.download = fileName || `document.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenNewTab = (e) => {
    e.stopPropagation();
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{
        maxWidth: 900, width: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
      }}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'var(--color-primary-container)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-on-primary-container)' }}>
                {isPreviewable ? 'picture_as_pdf' : 'description'}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {fileName || `Document.${ext}`}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                {ext.toUpperCase()} · {isPreviewable ? 'Preview available' : 'Preview not available'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary" onClick={handleDownload} title="Download" style={{ padding: '6px 10px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
            </button>
            <button className="btn btn-secondary" onClick={handleOpenNewTab} title="Open in new tab" style={{ padding: '6px 10px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>
            </button>
            <button className="btn btn-secondary" onClick={onClose} title="Close" style={{ padding: '6px 10px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 16, minHeight: 300, background: 'var(--color-surface-container-lowest)' }}>
          {isPreviewable && !previewError ? (
            <iframe
              src={fullUrl}
              title={fileName}
              style={{ width: '100%', height: '100%', minHeight: 500, border: 'none', borderRadius: 8 }}
              onError={() => setPreviewError(true)}
            />
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 12, padding: 48, textAlign: 'center',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: 'var(--color-surface-container)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--color-outline)' }}>
                  {ext === 'zip' ? 'folder_zip' : 'description'}
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: 16 }}>Cannot preview this file</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-on-surface-variant)', maxWidth: 320 }}>
                {ext.toUpperCase()} files cannot be previewed in the browser. Please download or open in a new tab.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary" onClick={handleDownload} style={{ gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
                  Download File
                </button>
                <button className="btn btn-outline" onClick={handleOpenNewTab} style={{ gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>
                  Open in Browser
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentViewer;
