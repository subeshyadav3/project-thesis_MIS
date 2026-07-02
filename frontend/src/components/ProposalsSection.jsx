import React, { useState } from 'react';
import { downloadFile } from '../utils/download';
import DocumentViewer from './DocumentViewer';

const STAGE_LABEL = {
  PROPOSAL: 'Proposal',
  MID_TERM: 'Mid-Term',
  FINAL: 'Final',
};

const STAGE_ICON = {
  PROPOSAL: 'description',
  MID_TERM: 'schedule',
  FINAL: 'flag',
};

/**
 * Displays submitted proposal documents grouped by stage, with version history.
 * Works for any role viewing a group or thesis detail.
 *
 * @param {Array} proposals - list of Proposal records (newest first)
 */
function ProposalsSection({ proposals = [], title = 'Submitted Documents' }) {
  const [viewerDoc, setViewerDoc] = useState(null);

  // Group proposals by stage, keep newest first within each stage
  const stages = ['PROPOSAL', 'MID_TERM', 'FINAL'];
  const byStage = stages.reduce((acc, stage) => {
    acc[stage] = (proposals || []).filter(p => p.stage === stage);
    return acc;
  }, {});

  const hasAny = Object.values(byStage).some(arr => arr.length > 0);

  if (!hasAny) {
    return (
      <div className="card">
        <div className="card-header"><h3>{title}</h3></div>
        <div className="empty-state" style={{ padding: '24px 16px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--color-outline)' }}>folder_off</span>
          <h3 style={{ fontSize: 14, margin: '8px 0 4px' }}>No documents submitted yet</h3>
          <p style={{ fontSize: 13 }}>Documents uploaded by the student will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>{title}</h3>
        <span className="badge" style={{ background: 'var(--color-surface-container)', color: 'var(--color-on-surface-variant)' }}>
          {proposals.length} document{proposals.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
        {stages.map(stage => {
          const docs = byStage[stage];
          if (!docs || docs.length === 0) return null;
          const stageLabel = STAGE_LABEL[stage];
          return (
            <div key={stage} style={{
              borderRadius: 10,
              border: '1px solid var(--color-outline-variant)',
              overflow: 'hidden',
            }}>
              {/* Stage header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px',
                background: 'var(--color-surface-container-low)',
                borderBottom: '1px solid var(--color-outline-variant)',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-primary)' }}>
                  {STAGE_ICON[stage]}
                </span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{stageLabel} Stage</span>
                <span className="badge badge-sm" style={{
                  background: 'var(--color-primary-container)',
                  color: 'var(--color-on-primary-container)',
                  fontSize: 10,
                }}>
                  {docs.length} version{docs.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Version list */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {docs.map((doc, idx) => {
                  const ext = doc.documentUrl?.match(/\.(\w+)$/)?.[1] || 'pdf';
                  const fileName = `${stageLabel}_v${docs.length - idx}.${ext}`;
                  const isLatest = idx === 0;
                  return (
                    <div key={doc.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderBottom: idx < docs.length - 1 ? '1px solid var(--color-surface-container-low)' : 'none',
                      background: isLatest ? 'var(--color-primary-container)' : 'transparent',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: isLatest ? 'var(--color-primary)' : 'var(--color-surface-container)',
                          color: isLatest ? '#fff' : 'var(--color-on-surface-variant)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>description</span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: isLatest ? 600 : 500, fontSize: 13, color: isLatest ? 'var(--color-on-primary-container)' : 'var(--color-on-surface)' }}>
                              {fileName}
                            </span>
                            {isLatest && (
                              <span className="badge badge-sm" style={{
                                background: 'var(--color-success-container)',
                                color: 'var(--color-on-success-container)',
                                fontSize: 9,
                                padding: '2px 6px',
                              }}>LATEST</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', marginTop: 2 }}>
                            {doc.submittedBy ? `${doc.submittedBy.firstName} ${doc.submittedBy.lastName}` : 'Student'}
                            {' · '}{new Date(doc.createdAt).toLocaleDateString()} {new Date(doc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button className="btn btn-sm btn-outline-primary" style={{ padding: '4px 8px', fontSize: 12 }}
                          onClick={() => setViewerDoc({ url: doc.documentUrl, name: fileName })}
                          title="Preview">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                        </button>
                        <button className="btn btn-sm btn-outline" style={{ padding: '4px 8px', fontSize: 12 }}
                          onClick={() => downloadFile(doc.documentUrl, fileName)}
                          title="Download">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                        </button>
                        <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer"
                          className="btn btn-sm btn-outline" style={{ padding: '4px 8px', fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                          title="Open in new tab">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {viewerDoc && (
        <DocumentViewer fileUrl={viewerDoc.url} fileName={viewerDoc.name} onClose={() => setViewerDoc(null)} />
      )}
    </div>
  );
}

export default ProposalsSection;
