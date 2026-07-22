import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import api from '../services/api';

const ROLE_LABEL = { SUPERVISOR: 'Supervisor', EXTERNAL_EXAMINER: 'External Examiner' };

/** Editable review surface shared by coordinators, supervisors and externals. */
export default function EvaluationPdfPreview({ type, id, onClose, onSave, initialScope, hideScopeSelector }) {
  const [item, setItem] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isScopeLocked = !!initialScope;
  // Auto-detect the correct scope for external examiners
  const computedInitial = useMemo(() => {
    if (user.role === 'EXTERNAL_EXAMINER' && initialScope === 'both') {
      // External with both mid and final roles: use external-both scope
      return 'external-both';
    }
    if (initialScope === 'external') {
      if (user.role === 'EXTERNAL_EXAMINER' && item) {
        if (item.externalFinal?.id === user.id && item.externalMidTerm?.id !== user.id) return 'external-final';
        if (item.externalMidTerm?.id === user.id && item.externalFinal?.id !== user.id) return 'external';
      }
      // Fallback: pick the one that has an assignment for this user
      if (user.role === 'EXTERNAL_EXAMINER' && item) {
        if (item.externalMidTerm?.id === user.id) return 'external';
        if (item.externalFinal?.id === user.id) return 'external-final';
      }
    }
    return initialScope;
  }, [initialScope, user.role, user.id, item]);
  const [pdfScope, setPdfScope] = useState(computedInitial || 'both');

  // Keep scope in sync when computedInitial changes (data loads)
  useEffect(() => {
    if (computedInitial && (isScopeLocked || hideScopeSelector)) {
      setPdfScope(computedInitial);
    }
  }, [computedInitial, isScopeLocked, hideScopeSelector]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const detailEndpoint = type === 'group' ? `/groups/${id}` : `/theses/${id}`;
    try {
      const detail = await api.get(detailEndpoint);
      setItem(detail.data);      const previewEndpoint = type === 'group'
        ? `/print/preview/group/${id}?_t=${Date.now()}`
        : `/print/preview/thesis/${id}?scope=${pdfScope}&_t=${Date.now()}`;
      const previewRes = await api.get(previewEndpoint, { responseType: 'text' });
      setPreviewHtml(previewRes.data);
    } catch (e) {
      setError(e.message || 'Failed to load the evaluation preview.');
    } finally { setLoading(false); }
  }, [type, id, pdfScope]);

  useEffect(() => { load(); }, [load]);

  // --- Filter components based on scope + user role ---
  const editableComponents = useMemo(() => {
    const components = item?.evaluationComponents || [];
    const scopeFiltered = type === 'thesis' && pdfScope !== 'both'
      ? components.filter(c =>
          pdfScope === 'supervisor'
            ? c.evaluatorRole === 'SUPERVISOR'
            : pdfScope === 'external'
              ? c.evaluationType === 'EXTERNAL_MIDTERM'
              : pdfScope === 'external-both'
                ? (c.evaluationType === 'EXTERNAL_MIDTERM' || c.evaluationType === 'EXTERNAL_FINAL')
              : c.evaluationType === 'EXTERNAL_FINAL'
        )
      : components;
    return ['COORDINATOR', 'MAINTAINER'].includes(user.role)
      ? scopeFiltered
      : scopeFiltered.filter(c => c.evaluatorRole === user.role);
  }, [item, user.role, type, pdfScope]);

  const evaluationFor = (componentId) => (item?.evaluations || []).find(e => e.componentId === componentId);

  // Group components by evaluator role for section rendering and per-role feedback
  const groupedByRole = useMemo(() => {
    const groups = {};
    editableComponents.forEach(c => {
      const role = c.evaluatorRole;
      if (!groups[role]) groups[role] = [];
      groups[role].push(c);
    });
    return groups;
  }, [editableComponents]);

  // Extract per-type feedback from existing evaluations
  const feedbackInitial = useMemo(() => {
    const result = {};
    editableComponents.forEach(c => {
      const key = c.evaluationType;
      const e = evaluationFor(c.id);
      if (!result[key]) result[key] = { comments: '', suggestions: '' };
      if (e?.comments) result[key].comments = e.comments;
      if (e?.suggestions) result[key].suggestions = e.suggestions;
    });
    return result;
  }, [item, editableComponents]);

  const [marks, setMarks] = useState({});
  const [feedback, setFeedback] = useState({});

  // Initialize marks and per-type feedback when data loads
  useEffect(() => {
    const nextMarks = {};
    editableComponents.forEach(c => { nextMarks[c.id] = evaluationFor(c.id)?.marks ?? ''; });
    setMarks(nextMarks);
    setFeedback(prev => {
      const merged = { ...prev };
      Object.keys(feedbackInitial).forEach(key => {
        if (!merged[key]) merged[key] = { comments: '', suggestions: '' };
        if (feedbackInitial[key].comments) merged[key].comments = feedbackInitial[key].comments;
        if (feedbackInitial[key].suggestions) merged[key].suggestions = feedbackInitial[key].suggestions;
      });
      return merged;
    });
  }, [item, editableComponents.length, feedbackInitial]);

  const saveChanges = async () => {
    setSaving(true); setError('');
    let saveOk = false;
    try {
      // Track which evaluationTypes have had feedback saved already
      const feedbackSavedForType = {};
      for (const component of editableComponents) {
        const value = marks[component.id];
        if (value !== '' && (Number.isNaN(Number(value)) || Number(value) < 0 || Number(value) > component.maxMarks)) {
          setError(`${component.name}: enter marks from 0 to ${component.maxMarks}.`);
          setSaving(false);
          return;
        }
        const typeKey = component.evaluationType;
        // Only save comments/suggestions to the FIRST component per evaluationType
        const fb = feedback[typeKey] || { comments: '', suggestions: '' };
        const comments = !feedbackSavedForType[typeKey] ? (fb.comments || null) : null;
        const suggestions = !feedbackSavedForType[typeKey] ? (fb.suggestions || null) : null;
        feedbackSavedForType[typeKey] = true;
        await api.post('/evaluations/marks', {
          componentId: component.id,
          marks: value === '' ? null : Number(value),
          comments,
          suggestions,
          ...(type === 'group' ? { groupId: Number(id) } : { thesisId: Number(id) }),
        });
      }
      saveOk = true;
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Could not save changes.');
    }
    // Always refresh the preview so it reflects latest data (even if some saves failed, partial data may have been saved)
    try { await load(); } catch (_) { /* preview load is best-effort */ }
    if (saveOk && onSave) onSave();
    setSaving(false);
  };

  const updateFeedback = (key, field, value) => {
    setFeedback(prev => ({
      ...prev,
      [key]: { ...(prev[key] || { comments: '', suggestions: '' }), [field]: value },
    }));
  };

  const confirmDownload = () => {
    setConfirmOpen(false); setDownloading(true);
    const endpoint = type === 'group'
      ? `/api/print/group/${id}`
      : `/api/print/thesis/${id}?scope=${pdfScope}`;
    const label = pdfScope === 'both' ? 'full' : pdfScope;
    const a = document.createElement('a'); a.href = endpoint; a.download = `evaluation_${id}_${label}.pdf`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => setDownloading(false), 800);
  };

  const roleOrder = ['SUPERVISOR', 'EXTERNAL_EXAMINER'];
  const displayedRoles = Object.keys(groupedByRole).sort((a, b) => roleOrder.indexOf(a) - roleOrder.indexOf(b));

  return <>
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal" style={{ maxWidth: 1240, width: '96%', height: '88vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><div className="modal-header-icon info"><span className="material-symbols-outlined">picture_as_pdf</span></div><div className="modal-header-text"><h2>Evaluation review & PDF</h2><p>Correct marks or feedback, then review the live print layout.</p></div></div>
        {error && <div style={{ margin: '0 16px 8px', color: 'var(--color-error)', fontSize: 13 }}>{error}</div>}
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(300px, .85fr) minmax(0, 1.35fr)', gap: 16, padding: '0 16px 16px' }}>
          <section style={{ overflowY: 'auto', paddingRight: 4 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>{type === 'group' ? item?.projectTitle || 'Project' : item?.title || 'Thesis'}</h3>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>{type === 'group' ? item?.name : `${item?.student?.firstName || ''} ${item?.student?.lastName || ''}`}</p>

            {/* Scope selector: only for master thesis, hidden when locked or hidden by parent */}
            {type === 'thesis' && !isScopeLocked && !hideScopeSelector && (
              <div style={{ marginBottom: 14, padding: 10, background: 'var(--color-surface-container-low)', borderRadius: 8, border: '1px solid var(--color-outline-variant)' }}>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Print scope</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(user.role === 'EXTERNAL_EXAMINER'
                    ? [
                        { value: 'external', label: 'External (Mid-Term)' },
                        { value: 'external-final', label: 'External (Final)' },
                      ]
                    : [
                        { value: 'supervisor', label: 'Supervisor' },
                        { value: 'external', label: 'External (Mid-Term)' },
                        { value: 'external-final', label: 'External (Final)' },
                        { value: 'both', label: 'All Pages' },
                      ]
                  ).map(opt => (
                    <button key={opt.value}
                      onClick={() => setPdfScope(opt.value)}
                      style={{
                        flex: 1, padding: '6px 8px', fontSize: 11, borderRadius: 6,
                        border: pdfScope === opt.value ? '2px solid var(--color-primary)' : '1px solid var(--color-outline)',
                        background: pdfScope === opt.value ? 'var(--color-primary-container)' : 'var(--color-surface)',
                        color: pdfScope === opt.value ? 'var(--color-on-primary-container)' : 'var(--color-on-surface)',
                        fontWeight: pdfScope === opt.value ? 600 : 400,
                        cursor: 'pointer', transition: 'all 0.15s',
                        minWidth: 0,
                      }}
                    >{opt.label}</button>
                  ))}
                </div>
                <p style={{ fontSize: 10, color: 'var(--color-on-surface-variant)', margin: '6px 0 0' }}>
                  {pdfScope === 'supervisor' ? 'Only supervisor components shown below' :
                   pdfScope === 'external' ? 'Only mid-term external examiner components shown below' :
                   pdfScope === 'external-final' ? 'Only final external examiner components shown below' :
                   'All evaluation components shown below'}
                </p>
              </div>
            )}

            {!editableComponents.length && <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>You can review this form, but do not have an assigned evaluation component.</p>}

            {/* Per-type sections */}
            {displayedRoles.map((role, ri) => {
              const components = groupedByRole[role];
              // When the scope is "both" or external section is unlocked, an external may have both mid-term and final components.
              const shouldShowBothExt = role === 'EXTERNAL_EXAMINER' && (pdfScope === 'both' || pdfScope === 'external-both');
              const sections = shouldShowBothExt
                ? [
                    { key: 'EXTERNAL_MIDTERM', label: 'External (Mid-Term)', filter: c => c.evaluationType === 'EXTERNAL_MIDTERM' },
                    { key: 'EXTERNAL_FINAL', label: 'External (Final)', filter: c => c.evaluationType === 'EXTERNAL_FINAL' },
                  ].filter(s => components.some(s.filter))
                : [{ key: components[0]?.evaluationType || 'UNKNOWN', label: role === 'SUPERVISOR' ? 'Supervisor'
                    : role === 'EXTERNAL_EXAMINER' && pdfScope === 'external' ? 'External (Mid-Term)'
                    : role === 'EXTERNAL_EXAMINER' && pdfScope === 'external-final' ? 'External (Final)'
                    : (ROLE_LABEL[role] || role), filter: () => true }];
              return sections.map((section, si) => {
                const fb = feedback[section.key] || { comments: '', suggestions: '' };
                return (
                <div key={`${role}-${section.key}`} style={{ marginBottom: (ri < displayedRoles.length - 1 || si < sections.length - 1) ? 18 : 0 }}>
                  {/* Section header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      {section.label}
                    </span>
                    <div style={{ flex: 1, height: 1, background: 'var(--color-outline-variant)' }} />
                  </div>

                  {/* Marks for this section */}
                  {components.filter(section.filter).map(component => (
                    <div key={component.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '6px 8px', border: '1px solid var(--color-outline-variant)', borderRadius: 8 }}>
                      <label style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{component.name}<small style={{ display: 'block', fontWeight: 400, color: 'var(--color-on-surface-variant)' }}>Max {component.maxMarks}</small></label>
                      <input type="number" min="0" max={component.maxMarks} step="0.01" value={marks[component.id] ?? ''} onChange={e => setMarks(prev => ({ ...prev, [component.id]: e.target.value }))} style={{ width: 72, padding: '5px 6px', fontSize: 13 }} />
                    </div>
                  ))}

                  {/* Per-type comments & suggestions */}
                  <label style={{ display: 'block', marginTop: 10, fontSize: 11, fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>
                    Comments {displayedRoles.length > 1 ? `(${section.label})` : ''}
                  </label>
                  <textarea rows={2} value={fb.comments} onChange={e => updateFeedback(section.key, 'comments', e.target.value)} style={{ width: '100%', padding: '6px 8px', fontSize: 13 }} />

                  <label style={{ display: 'block', marginTop: 8, fontSize: 11, fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>
                    Suggestions & recommendations {displayedRoles.length > 1 ? `(${section.label})` : ''}
                  </label>
                  <textarea rows={2} value={fb.suggestions} onChange={e => updateFeedback(section.key, 'suggestions', e.target.value)} style={{ width: '100%', padding: '6px 8px', fontSize: 13 }} />
                </div>
              );});
            })}

            {editableComponents.length > 0 && (
              <button className="btn btn-outline btn-sm" onClick={saveChanges} disabled={saving} style={{ marginTop: 12 }}>
                <span className="material-symbols-outlined">save</span>{saving ? 'Saving...' : 'Save changes'}
              </button>
            )}
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
