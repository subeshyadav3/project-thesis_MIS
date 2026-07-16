import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import api from '../services/api';

/** Editable review surface shared by coordinators, supervisors and externals. */
export default function EvaluationPdfPreview({ type, id, onClose }) {
  const [item, setItem] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const detailEndpoint = type === 'group' ? `/groups/${id}` : `/theses/${id}`;
    const previewEndpoint = type === 'group' ? `/print/preview/group/${id}` : `/print/preview/thesis/${id}`;
    try {
      const [detail, preview] = await Promise.all([api.get(detailEndpoint), api.get(previewEndpoint, { responseType: 'text' })]);
      setItem(detail.data);
      setPreviewHtml(preview.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load the evaluation preview.');
    } finally { setLoading(false); }
  }, [type, id]);

  useEffect(() => { load(); }, [load]);

  const editableComponents = useMemo(() => {
    const components = item?.evaluationComponents || [];
    return ['COORDINATOR', 'MAINTAINER'].includes(user.role)
      ? components
      : components.filter(c => c.evaluatorRole === user.role);
  }, [item, user.role]);
  const evaluationFor = (componentId) => (item?.evaluations || []).find(e => e.componentId === componentId);
  const feedback = useMemo(() => {
    const evaluations = editableComponents.map(c => evaluationFor(c.id)).filter(Boolean);
    return {
      comments: evaluations.map(e => e.comments).find(Boolean) || '',
      suggestions: evaluations.map(e => e.suggestions).find(Boolean) || '',
    };
  }, [item, editableComponents]);
  const [marks, setMarks] = useState({});
  const [comments, setComments] = useState('');
  const [suggestions, setSuggestions] = useState('');
  useEffect(() => {
    const next = {};
    editableComponents.forEach(c => { next[c.id] = evaluationFor(c.id)?.marks ?? ''; });
    setMarks(next); setComments(feedback.comments); setSuggestions(feedback.suggestions);
  }, [item, editableComponents.length, feedback.comments, feedback.suggestions]);

  const saveChanges = async () => {
    setSaving(true); setError('');
    try {
      for (const component of editableComponents) {
        const value = marks[component.id];
        if (value !== '' && (Number.isNaN(Number(value)) || Number(value) < 0 || Number(value) > component.maxMarks)) {
          throw new Error(`${component.name}: enter marks from 0 to ${component.maxMarks}.`);
        }
        await api.post('/evaluations/marks', {
          componentId: component.id,
          marks: value === '' ? null : Number(value),
          comments: comments || null,
          suggestions: suggestions || null,
          ...(type === 'group' ? { groupId: Number(id) } : { thesisId: Number(id) }),
        });
      }
      await load();
    } catch (e) { setError(e.response?.data?.error || e.message || 'Could not save changes.'); }
    finally { setSaving(false); }
  };

  const confirmDownload = () => {
    setConfirmOpen(false); setDownloading(true);
    const endpoint = type === 'group' ? `/api/print/group/${id}` : `/api/print/thesis/${id}`;
    const a = document.createElement('a'); a.href = endpoint; a.download = `evaluation_${id}.pdf`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => setDownloading(false), 800);
  };

  return <>
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal" style={{ maxWidth: 1240, width: '96%', height: '88vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><div className="modal-header-icon info"><span className="material-symbols-outlined">picture_as_pdf</span></div><div className="modal-header-text"><h2>Evaluation review & PDF</h2><p>Correct marks or feedback, then review the live print layout.</p></div></div>
        {error && <div style={{ margin: '0 16px 8px', color: 'var(--color-error)', fontSize: 13 }}>{error}</div>}
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(270px, .8fr) minmax(0, 1.4fr)', gap: 16, padding: '0 16px 16px' }}>
          <section style={{ overflowY: 'auto', paddingRight: 4 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>{type === 'group' ? item?.projectTitle || 'Project' : item?.title || 'Thesis'}</h3>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>{type === 'group' ? item?.name : `${item?.student?.firstName || ''} ${item?.student?.lastName || ''}`}</p>
            {editableComponents.map(component => <div key={component.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: 8, border: '1px solid var(--color-outline-variant)', borderRadius: 8 }}>
              <label style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{component.name}<small style={{ display: 'block', fontWeight: 400, color: 'var(--color-on-surface-variant)' }}>Max {component.maxMarks}</small></label>
              <input type="number" min="0" max={component.maxMarks} step="0.01" value={marks[component.id] ?? ''} onChange={e => setMarks(prev => ({ ...prev, [component.id]: e.target.value }))} style={{ width: 76, padding: '6px 8px' }} />
            </div>)}
            {!editableComponents.length && <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>You can review this form, but do not have an assigned evaluation component.</p>}
            {editableComponents.length > 0 && <>
              <label style={{ display: 'block', marginTop: 14, fontSize: 12, fontWeight: 600 }}>Comments</label>
              <textarea rows={3} value={comments} onChange={e => setComments(e.target.value)} style={{ width: '100%', padding: 8 }} />
              <label style={{ display: 'block', marginTop: 10, fontSize: 12, fontWeight: 600 }}>Suggestions & recommendations</label>
              <textarea rows={3} value={suggestions} onChange={e => setSuggestions(e.target.value)} style={{ width: '100%', padding: 8 }} />
              <button className="btn btn-outline btn-sm" onClick={saveChanges} disabled={saving} style={{ marginTop: 10 }}><span className="material-symbols-outlined">save</span>{saving ? 'Saving...' : 'Save changes'}</button>
            </>}
          </section>
          <div style={{ minWidth: 0, border: '1px solid var(--color-outline-variant)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
            {loading ? <div className="loading-state"><span className="material-symbols-outlined">progress_activity</span></div> : <iframe srcDoc={previewHtml} style={{ width: '100%', height: '100%', border: 'none' }} title="Evaluation PDF preview" />}
          </div>
        </div>
        <div className="modal-actions" style={{ padding: '12px 16px' }}><button className="btn btn-outline" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={() => setConfirmOpen(true)} disabled={downloading || loading}><span className="material-symbols-outlined">download</span>{downloading ? 'Downloading...' : 'Download PDF'}</button></div>
      </div>
    </div>
    <ConfirmDialog open={confirmOpen} title="Download evaluation PDF" message="Are you sure you want to download this evaluation sheet?" onConfirm={confirmDownload} onCancel={() => setConfirmOpen(false)} confirmLabel="Download" />
  </>;
}
