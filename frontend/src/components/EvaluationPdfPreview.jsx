import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import api from '../services/api';

const ROLE_LABEL = { SUPERVISOR: 'Supervisor', EXTERNAL_EXAMINER: 'External Examiner' };

/** Editable review surface shared by coordinators, supervisors and externals. */
export default function EvaluationPdfPreview({ type, id, onClose, onSave, initialScope }) {
  const [item, setItem] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isScopeLocked = !!initialScope;
  // Auto-detect: if initialScope is 'external' but current user is the thesis's final external examiner, default to external-final
  const computedInitial = useMemo(() => {
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
    if (computedInitial && isScopeLocked) {
      setPdfScope(computedInitial);
    }
  }, [computedInitial, isScopeLocked]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const detailEndpoint = type === 'group' ? `/groups/${id}` : `/theses/${id}`;
    try {
      const detail = await api.get(detailEndpoint);
      setItem(detail.data);
      const previewEndpoint = type === 'group'
        ? `/print/preview/group/${id}`
        : `/print/preview/thesis/${id}?scope=${pdfScope}`;
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

  // Extract per-role feedback from existing evaluations
  const roleFeedbackInitial = useMemo(() => {
    const result = {};
    Object.keys(groupedByRole).forEach(role => {
      const roleEvals = groupedByRole[role].map(c => evaluationFor(c.id)).filter(Boolean);
      result[role] = {
        comments: roleEvals.map(e => e.comments).find(Boolean) || '',
        suggestions: roleEvals.map(e => e.suggestions).find(Boolean) || '',
      };
    });
    return result;
  }, [item, groupedByRole]);

  const [marks, setMarks] = useState({});
  const [roleFeedback, setRoleFeedback] = useState({});

  // Initialize marks and per-role feedback when data loads
  useEffect(() => {
    const nextMarks = {};
    editableComponents.forEach(c => { nextMarks[c.id] = evaluationFor(c.id)?.marks ?? ''; });
    setMarks(nextMarks);
    setRoleFeedback(prev => {
      const merged = { ...prev };
      Object.keys(roleFeedbackInitial).forEach(role => {
        if (!merged[role]) {
          merged[role] = { comments: '', suggestions: '' };
        }
        // Only overwrite with empty if there is actual saved data
        if (roleFeedbackInitial[role].comments) merged[role].comments = roleFeedbackInitial[role].comments;
        if (roleFeedbackInitial[role].suggestions) merged[role].suggestions = roleFeedbackInitial[role].suggestions;
      });
      return merged;
    });
  }, [item, editableComponents.length, roleFeedbackInitial]);

  const saveChanges = async () => {
    setSaving(true); setError('');
    try {
      for (const component of editableComponents) {
        const value = marks[component.id];
        if (value !== '' && (Number.isNaN(Number(value)) || Number(value) < 0 || Number(value) > component.maxMarks)) {
          throw new Error(`${component.name}: enter marks from 0 to ${component.maxMarks}.`);
        }
        const rf = roleFeedback[component.evaluatorRole] || { comments: '', suggestions: '' };
        await api.post('/evaluations/marks', {
          componentId: component.id,
          marks: value === '' ? null : Number(value),
          comments: rf.comments || null,
          suggestions: rf.suggestions || null,
          ...(type === 'group' ? { groupId: Number(id) } : { thesisId: Number(id) }),
        });
      }
      await load();
      if (onSave) onSave();
    } catch (e) { setError(e.response?.data?.error || e.message || 'Could not save changes.'); }
    finally { setSaving(false); }
  };

  const updateRoleFeedback = (role, field, value) => {
    setRoleFeedback(prev => ({
      ...prev,
      [role]: { ...(prev[role] || { comments: '', suggestions: '' }), [field]: value },
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

            {/* Scope selector: only for master thesis, hidden when locked */}
            {type === 'thesis' && !isScopeLocked && (
              <div style={{ marginBottom: 14, padding: 10, background: 'var(--color-surface-container-low)', borderRadius: 8, border: '1px solid var(--color-outline-variant)' }}>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Print scope</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { value: 'supervisor', label: 'Supervisor' },
                    { value: 'external', label: 'External (Mid-Term)' },
                    { value: 'external-final', label: 'External (Final)' },
                    { value: 'both', label: 'All Pages' },
                  ].map(opt => (
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

            {/* Per-role sections */}
            {displayedRoles.map((role, ri) => {
              const rf = roleFeedback[role] || { comments: '', suggestions: '' };
              const components = groupedByRole[role];
              // When the scope is "both" or external section is unlocked, an external may have both mid-term and final components.
              const sections = role === 'EXTERNAL_EXAMINER' && pdfScope === 'both'
                ? [
                    { key: 'mid', label: 'External (Mid-Term)', filter: c => c.evaluationType === 'EXTERNAL_MIDTERM' },
                    { key: 'final', label: 'External (Final)', filter: c => c.evaluationType === 'EXTERNAL_FINAL' },
                  ].filter(s => components.some(s.filter))
                : [{ key: 'all', label: role === 'SUPERVISOR' ? 'Supervisor'
                    : role === 'EXTERNAL_EXAMINER' && pdfScope === 'external' ? 'External (Mid-Term)'
                    : role === 'EXTERNAL_EXAMINER' && pdfScope === 'external-final' ? 'External (Final)'
                    : (ROLE_LABEL[role] || role), filter: () => true }];
              return sections.map((section, si) => (
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

                  {/* Per-role comments & suggestions */}
                  <label style={{ display: 'block', marginTop: 10, fontSize: 11, fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>
                    Comments {displayedRoles.length > 1 ? `(${section.label})` : ''}
                  </label>
                  <textarea rows={2} value={rf.comments} onChange={e => updateRoleFeedback(role, 'comments', e.target.value)} style={{ width: '100%', padding: '6px 8px', fontSize: 13 }} />

                  <label style={{ display: 'block', marginTop: 8, fontSize: 11, fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>
                    Suggestions & recommendations {displayedRoles.length > 1 ? `(${section.label})` : ''}
                  </label>
                  <textarea rows={2} value={rf.suggestions} onChange={e => updateRoleFeedback(role, 'suggestions', e.target.value)} style={{ width: '100%', padding: '6px 8px', fontSize: 13 }} />
                </div>
              ));
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
