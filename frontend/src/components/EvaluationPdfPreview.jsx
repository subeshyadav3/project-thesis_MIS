import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from './ui';
import ConfirmDialog from './ConfirmDialog';
import api from '../services/api';
import { getApiMessage } from '../utils/helpers';

const ROLE_LABEL = { SUPERVISOR: 'Supervisor', EXTERNAL_EXAMINER: 'External Examiner', COORDINATOR: 'Coordinator' };

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
  const userId = Number(user.id);
  const isScopeLocked = !!initialScope;
  // Auto-detect the correct scope for external examiners & supervisors
  const computedInitial = useMemo(() => {
    if (user.role === 'EXTERNAL_EXAMINER') {
      if (initialScope === 'both' || initialScope === 'external-both') return 'external-both';
      if (initialScope === 'external-final') return 'external-final';
      if (initialScope === 'external') return 'external';
      if (item?.projectType === 'PROJECT') return 'external-final';
      const isMid = Number(item?.externalMidTerm?.id || item?.externalMidTermId) === userId;
      const isFinal = Number(item?.externalFinal?.id || item?.externalFinalId) === userId || item?.examinerAssignments?.some(a => Number(a.externalExaminerId) === userId);
      if (isMid && isFinal) return 'external-both';
      if (isFinal && !isMid) return 'external-final';
      if (isMid && !isFinal) return 'external';
      return 'external-final';
    }
    if (user.role === 'SUPERVISOR') {
      if (item?.projectType === 'PROJECT') return 'external-final';
      return 'supervisor';
    }
    if (initialScope === 'external') {
      if (item) {
        if (item.projectType === 'PROJECT') return 'external-final';
        const isMid = Number(item?.externalMidTerm?.id || item?.externalMidTermId) === userId;
        const isFinal = Number(item?.externalFinal?.id || item?.externalFinalId) === userId;
        if (isFinal && !isMid) return 'external-final';
        if (isMid && !isFinal) return 'external';
      }
      // Fallback: pick the one that has an assignment for this user
      if (item) {
        if (Number(item?.externalMidTerm?.id || item?.externalMidTermId) === userId) return 'external';
        if (Number(item?.externalFinal?.id || item?.externalFinalId) === userId) return 'external-final';
      }
    }
    if (!initialScope && item) {
      if (item.projectType === 'PROJECT') return 'external-final';
      const isMid = Number(item?.externalMidTerm?.id || item?.externalMidTermId) === userId;
      const isFinal = Number(item?.externalFinal?.id || item?.externalFinalId) === userId;
      if (isFinal && !isMid) return 'external-final';
      if (isMid && !isFinal) return 'external';
    }
    return initialScope;
  }, [initialScope, user.role, userId, item]);
  const [pdfScope, setPdfScope] = useState(computedInitial || 'both');

  // Keep scope in sync when computedInitial changes (data loads)
  useEffect(() => {
    if (computedInitial && (isScopeLocked || hideScopeSelector || user.role === 'EXTERNAL_EXAMINER')) {
      setPdfScope(computedInitial);
    }
  }, [computedInitial, isScopeLocked, hideScopeSelector, user.role]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const detailEndpoint = type === 'group' ? `/groups/${id}` : `/theses/${id}`;
    try {
      const detail = await api.get(detailEndpoint);
      setItem(detail.data);
      const previewEndpoint = type === 'group'
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
    const isAssignedSupervisor = Number(item?.supervisor?.id || item?.supervisorId) === userId;
    const isAssignedExternalMid = Number(item?.externalMidTerm?.id || item?.externalMidTermId) === userId;
    const isAssignedExternalFinal = Number(item?.externalFinal?.id || item?.externalFinalId) === userId || item?.examinerAssignments?.some(a => Number(a.externalExaminerId) === userId);
    const isProject = item?.projectType === 'PROJECT';

    // 1. Filter by pdfScope
    let scopeFiltered = components;
    if (type === 'thesis' && pdfScope !== 'both') {
      if (pdfScope === 'supervisor') {
        scopeFiltered = components.filter(c => c.evaluatorRole === 'SUPERVISOR' || (isProject && isAssignedSupervisor));
      } else if (pdfScope === 'external') {
        scopeFiltered = components.filter(c => c.evaluationType === 'EXTERNAL_MIDTERM');
      } else if (pdfScope === 'external-final') {
        scopeFiltered = components.filter(c => c.evaluationType === 'EXTERNAL_FINAL' || (!c.evaluationType && c.evaluatorRole === 'EXTERNAL_EXAMINER'));
      } else if (pdfScope === 'external-both') {
        scopeFiltered = components.filter(c => c.evaluationType === 'EXTERNAL_MIDTERM' || c.evaluationType === 'EXTERNAL_FINAL' || (!c.evaluationType && c.evaluatorRole === 'EXTERNAL_EXAMINER'));
      }
    }

    if (['COORDINATOR', 'MAINTAINER'].includes(user.role)) {
      return scopeFiltered;
    }

    if (user.role === 'SUPERVISOR') {
      return scopeFiltered.filter(c => c.evaluatorRole === 'SUPERVISOR' || (isProject && isAssignedSupervisor));
    }

    if (user.role === 'EXTERNAL_EXAMINER') {
      if (type === 'group') {
        return scopeFiltered.filter(c => c.evaluatorRole === 'EXTERNAL_EXAMINER' || c.evaluationType === 'EXTERNAL_EXAMINER');
      }
      if (isAssignedExternalMid && !isAssignedExternalFinal) {
        return scopeFiltered.filter(c => c.evaluationType === 'EXTERNAL_MIDTERM');
      }
      if (isAssignedExternalFinal && !isAssignedExternalMid) {
        return scopeFiltered.filter(c => c.evaluationType === 'EXTERNAL_FINAL' || (!c.evaluationType && c.evaluatorRole === 'EXTERNAL_EXAMINER') || c.evaluationType === 'EXTERNAL_EXAMINER');
      }
      if (isAssignedExternalMid && isAssignedExternalFinal) {
        return scopeFiltered.filter(c => c.evaluatorRole === 'EXTERNAL_EXAMINER' || c.evaluationType === 'EXTERNAL_MIDTERM' || c.evaluationType === 'EXTERNAL_FINAL');
      }
      if (pdfScope === 'external') return scopeFiltered.filter(c => c.evaluationType === 'EXTERNAL_MIDTERM');
      if (pdfScope === 'external-final') return scopeFiltered.filter(c => c.evaluationType === 'EXTERNAL_FINAL' || (!c.evaluationType && c.evaluatorRole === 'EXTERNAL_EXAMINER') || c.evaluationType === 'EXTERNAL_EXAMINER');
      return scopeFiltered.filter(c => c.evaluatorRole === 'EXTERNAL_EXAMINER' || c.evaluationType === 'EXTERNAL_EXAMINER');
    }

    return scopeFiltered.filter(c => c.evaluatorRole === user.role);
  }, [item, user.role, userId, type, pdfScope]);

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
      const key = c.evaluationType || c.evaluatorRole;
      const e = evaluationFor(c.id);
      if (!result[key]) result[key] = { comments: '', suggestions: '' };
      if (e?.comments) result[key].comments = e.comments;
      if (e?.suggestions) result[key].suggestions = e.suggestions;
    });
    return result;
  }, [item, editableComponents]);

  const [marks, setMarks] = useState({});
  const [feedback, setFeedback] = useState({});
  const [saved, setSaved] = useState(false);

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
    setSaved(false);
  }, [editableComponents, feedbackInitial]);

  const saveChanges = async () => {
    setSaving(true);
    setError('');
    try {
      for (const component of editableComponents) {
        const val = marks[component.id];
        if (val !== undefined && val !== null && val !== '') {
          const num = Number(val);
          if (Number.isNaN(num) || num < 0 || num > component.maxMarks) {
            throw new Error(`Marks for "${component.name}" must be between 0 and ${component.maxMarks}`);
          }
        }
      }

      for (const component of editableComponents) {
        const marksVal = marks[component.id];
        const num = marksVal === '' || marksVal === null || marksVal === undefined ? null : Number(marksVal);
        const fb = feedback[component.evaluationType] || feedback[component.evaluatorRole] || { comments: '', suggestions: '' };
        const payload = {
          componentId: component.id,
          marks: num,
          comments: fb.comments || null,
          suggestions: fb.suggestions || null,
        };
        if (type === 'group') payload.groupId = parseInt(id); else payload.thesisId = parseInt(id);
        await api.post('/evaluations/marks', payload);
      }
      setSaved(true);
      if (onSave) onSave();
      await load();
    } catch (e) {
      setError(e.message || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  const updateFeedback = (typeKey, field, value) => {
    setFeedback(prev => ({
      ...prev,
      [typeKey]: { ...prev[typeKey], [field]: value },
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
        <div className="modal-header"><div className="modal-header-icon info"><Icon name="picture_as_pdf" className="material-symbols-outlined" /></div><div className="modal-header-text"><h2>Evaluation review & PDF</h2><p>Correct marks or feedback, then review the live print layout.</p></div></div>
        {error && <div style={{ margin: '0 16px 8px', color: 'var(--color-error)', fontSize: 13 }}>{error}</div>}
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(300px, .85fr) minmax(0, 1.35fr)', gap: 16, padding: '0 16px 16px' }}>
          <section style={{ overflowY: 'auto', paddingRight: 4 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>{type === 'group' ? item?.projectTitle || 'Project' : item?.title || 'Thesis'}</h3>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>{type === 'group' ? item?.name : `${item?.student?.firstName || ''} ${item?.student?.lastName || ''}`}</p>

            {/* Scope selector: only for master thesis, hidden when locked, hidden by parent, or for master project */}
            {type === 'thesis' && item?.projectType !== 'PROJECT' && !isScopeLocked && !hideScopeSelector && (
              <div style={{ marginBottom: 14, padding: 10, background: 'var(--color-surface-container-low)', borderRadius: 8, border: '1px solid var(--color-outline-variant)' }}>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Print scope</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(user.role === 'EXTERNAL_EXAMINER'
                    ? (item?.externalMidTerm?.id === user.id && item?.externalFinal?.id === user.id
                        ? [
                            { value: 'external', label: 'External (Mid-Term)' },
                            { value: 'external-final', label: 'External (Final)' },
                            { value: 'external-both', label: 'Both Phases' },
                          ]
                        : item?.externalMidTerm?.id === user.id
                          ? [{ value: 'external', label: 'External (Mid-Term)' }]
                          : [{ value: 'external-final', label: 'External (Final)' }]
                      )
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
              const hasMid = components.some(c => c.evaluationType === 'EXTERNAL_MIDTERM');
              const hasFinal = components.some(c => c.evaluationType === 'EXTERNAL_FINAL');

              let sections = [];
              if (role === 'EXTERNAL_EXAMINER' && (hasMid || hasFinal)) {
                if (hasMid) {
                  sections.push({
                    key: 'EXTERNAL_MIDTERM',
                    label: 'External (Mid-Term)',
                    filter: c => c.evaluationType === 'EXTERNAL_MIDTERM'
                  });
                }
                if (hasFinal) {
                  sections.push({
                    key: 'EXTERNAL_FINAL',
                    label: 'External (Final)',
                    filter: c => c.evaluationType === 'EXTERNAL_FINAL' || (!hasMid && c.evaluatorRole === 'EXTERNAL_EXAMINER')
                  });
                }
              } else {
                const isInternal = type === 'group' && role === 'EXTERNAL_EXAMINER';
                sections = [{
                  key: components[0]?.evaluationType || role,
                  label: role === 'SUPERVISOR' ? 'Supervisor'
                    : role === 'EXTERNAL_EXAMINER'
                      ? (isInternal ? 'Internal Examiner'
                          : components[0]?.evaluationType === 'EXTERNAL_MIDTERM' ? 'External (Mid-Term)'
                          : components[0]?.evaluationType === 'EXTERNAL_FINAL' ? 'External (Final)'
                          : (ROLE_LABEL[role] || 'External Examiner'))
                    : (ROLE_LABEL[role] || role),
                  filter: () => true
                }];
              }
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
                  {components.filter(section.filter).map(component => {
                    const cur = marks[component.id];
                    const num = cur === '' || cur === null || cur === undefined ? null : Number(cur);
                    const invalid = num !== null && (num < 0 || num > component.maxMarks);
                    return (
                      <div key={component.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '6px 8px', border: `1px solid ${invalid ? 'var(--color-error)' : 'var(--color-outline-variant)'}`, borderRadius: 8 }}>
                        <label style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{component.name}<small style={{ display: 'block', fontWeight: 400, color: invalid ? 'var(--color-error)' : 'var(--color-on-surface-variant)' }}>Max {component.maxMarks}</small></label>
                        <input type="number" min="0" max={component.maxMarks} step="0.01" value={cur ?? ''} onChange={e => { setMarks(prev => ({ ...prev, [component.id]: e.target.value })); setSaved(false); }} style={{ width: 72, padding: '5px 6px', fontSize: 13, border: invalid ? '1px solid var(--color-error)' : '1px solid var(--color-outline)', borderRadius: 4, outline: 'none' }} />
                        {invalid && <Icon name="warning" className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-error)' }} />}
                      </div>
                    );
                  })}

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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <button className="btn btn-outline btn-sm" onClick={saveChanges} disabled={saving}>
                  <Icon name="save" className="material-symbols-outlined" />{saving ? 'Saving...' : 'Save changes'}
                </button>
                {saved && !saving && <span style={{ fontSize: 11, color: 'var(--color-success)' }}><Icon name="check" className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }} /> Saved</span>}
              </div>
            )}
          </section>
          <div style={{ minWidth: 0, border: '1px solid var(--color-outline-variant)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
            {loading ? <div className="loading-state"><Icon name="progress_activity" className="material-symbols-outlined" /></div> : <iframe srcDoc={previewHtml} style={{ width: '100%', height: '100%', border: 'none' }} title="Evaluation PDF preview" />}
          </div>
        </div>
        <div className="modal-actions" style={{ padding: '12px 16px' }}><button className="btn btn-outline" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={() => setConfirmOpen(true)} disabled={downloading || loading}><Icon name="download" className="material-symbols-outlined" />{downloading ? 'Downloading...' : 'Download PDF'}</button></div>
      </div>
    </div>
    <ConfirmDialog open={confirmOpen} title="Download evaluation PDF" message="Are you sure you want to download this evaluation sheet?" onConfirm={confirmDownload} onCancel={() => setConfirmOpen(false)} confirmLabel="Download" />
  </>;
}
