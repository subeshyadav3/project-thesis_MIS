import React, { useState, useEffect } from 'react';
import api from '../services/api';

const COMMENT_ROLE_COLORS = {
  SUPERVISOR: { bg: '#e8f5e9', color: '#2e7d32', label: 'Supervisor' },
  COORDINATOR: { bg: '#e3f2fd', color: '#1565c0', label: 'Coordinator' },
  EXTERNAL_EXAMINER: { bg: '#fff3e0', color: '#e65100', label: 'External' },
};

export default function ProposalCommentsViewer({ proposalId, legacyComment, legacyAuthor }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!proposalId) return;
    setLoading(true);
    api.get(`/proposals/${proposalId}/comments`)
      .then(({ data }) => setComments(data))
      .catch(() => {})
      .finally(() => { setLoading(false); setLoaded(true); });
  }, [proposalId]);

  // Show legacy comment as fallback ONLY if no new comments exist
  const showLegacy = loaded && comments.length === 0 && legacyComment;

  if (loading) return <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 8 }}>Loading feedback...</div>;
  if (comments.length === 0 && !showLegacy) return null;

  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {comments.length > 0 ? (
        comments.map(comment => {
          const c = COMMENT_ROLE_COLORS[comment.author?.role] || COMMENT_ROLE_COLORS.SUPERVISOR;
          return (
            <div key={comment.id} style={{
              padding: 12, borderRadius: 8,
              background: 'var(--color-surface-container-low)',
              border: '1px solid var(--color-outline-variant)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 4,
                  background: c.bg, color: c.color, fontWeight: 600,
                }}>
                  {comment.author?.firstName} {comment.author?.lastName} · {c.label}
                </span>
                <span style={{ fontSize: 10, color: 'var(--color-on-surface-variant)' }}>
                  {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{comment.content}</p>
            </div>
          );
        })
      ) : showLegacy ? (
        <div style={{
          padding: 12, borderRadius: 8,
          background: 'var(--color-tertiary-container)',
          border: '1px solid var(--color-outline-variant)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 4,
              background: (COMMENT_ROLE_COLORS[legacyAuthor?.role] || COMMENT_ROLE_COLORS.SUPERVISOR).bg,
              color: (COMMENT_ROLE_COLORS[legacyAuthor?.role] || COMMENT_ROLE_COLORS.SUPERVISOR).color,
              fontWeight: 600,
            }}>
              {legacyAuthor?.firstName} {legacyAuthor?.lastName} · {(COMMENT_ROLE_COLORS[legacyAuthor?.role] || COMMENT_ROLE_COLORS.SUPERVISOR).label}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', color: 'var(--color-on-tertiary-container)' }}>{legacyComment}</p>
        </div>
      ) : null}
    </div>
  );
}
