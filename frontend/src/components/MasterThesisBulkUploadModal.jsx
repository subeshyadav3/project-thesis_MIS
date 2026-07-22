import React, { useState, useMemo } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import BulkPendingUsersModal from './BulkPendingUsersModal';

/**
 * Shared master thesis Excel bulk import (preview → confirm → review users).
 * Pass `title` to override the heading (e.g. on Supervisor / Examiner pages).
 */
export default function MasterThesisBulkUploadModal({ open, onClose, onSuccess, title }) {
  const toast = useToast();
  const [selectedFile, setSelectedFile] = useState(null);
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [rowActions, setRowActions] = useState({});
  const [rowEdits, setRowEdits] = useState({});
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const hasPendingUsers = useMemo(() => {
    if (!bulkPreview?.preview) return false;
    return bulkPreview.preview.some(p => p.supervisorWillCreate || p.externalMidTermWillCreate || p.externalFinalWillCreate);
  }, [bulkPreview]);

  const skipCount = useMemo(() => {
    return Object.values(rowActions).filter(v => v === 'skip').length;
  }, [rowActions]);

  const duplicateCount = useMemo(() => {
    if (!bulkPreview?.preview) return 0;
    return bulkPreview.preview.filter(p => p.anomalies?.some(a => a.type === 'exact_duplicate')).length;
  }, [bulkPreview]);

  if (!open) return null;

  const resetAndClose = () => {
    setSelectedFile(null);
    setBulkPreview(null);
    setBulkLoading(false);
    setShowReview(false);
    setExpandedRow(null);
    setRowActions({});
    setRowEdits({});
    onClose();
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) { toast.warning('Select a file'); return; }
    setBulkLoading(true);
    setRowActions({});
    setRowEdits({});
    setExpandedRow(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const { data } = await api.post('/theses/bulk-import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBulkPreview(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkConfirm = async (rowsOverride) => {
    const rows = rowsOverride || (bulkPreview?.preview || []).map(p => {
      const action = rowActions[p.row];
      let edits = rowEdits[p.row] ? { ...rowEdits[p.row] } : {};
      // Auto-populate student name from Excel if unmatched
      if (!p.studentMatch) {
        const se = edits?.student || {};
        if (!se.firstName && p.name) {
          const parts = p.name.split(' ');
          edits.student = { ...se, firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' };
        }
      }
      return {
        _action: action,
        _edits: edits,
        row: p.row,
        name: p.name,
        roll: edits?.roll ?? p.roll,
        title: edits?.title ?? p.title,
        batch: edits?.batch ?? p.batch,
        cluster: edits?.cluster ?? p.cluster,
        programId: p.programId,
        studentMatch: p.studentMatch,
        supervisorMatch: p.supervisorMatch,
        supervisorWillCreate: p.supervisorWillCreate,
        externalMidTermMatch: p.externalMidTermMatch,
        externalMidTermWillCreate: p.externalMidTermWillCreate,
        externalFinalMatch: p.externalFinalMatch,
        externalFinalWillCreate: p.externalFinalWillCreate,
      };
    });
    if (rows.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await api.post('/theses/bulk-import/confirm', { rows });
      const created = res.data?.created ?? 0;
      const skipCount = res.data?.skipped?.length ?? 0;
      let msg = `${created} imported`;
      if (skipCount) msg += `, ${skipCount} skipped`;
      toast.success(msg);
      resetAndClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleReviewComplete = (updatedRows) => {
    if (bulkPreview?.preview) {
      setBulkPreview({ ...bulkPreview, preview: updatedRows });
    }
    setShowReview(false);
  };

  const anomalyBadge = (a) => {
    const labels = {
      exact_duplicate: 'Duplicate thesis',
      student_in_thesis: 'Has active thesis',
    };
    const isError = a.type === 'exact_duplicate';
    const style = {
      background: isError ? 'var(--color-error)' : 'var(--color-warning)',
      color: '#fff', padding: '1px 6px', borderRadius: 8, fontSize: 10, marginRight: 4, whiteSpace: 'nowrap', cursor: 'default',
    };
    return <span key={a.type + (a.studentId || a.existingId || '')} style={style} title={a.message}>{labels[a.type] || 'Conflict'}</span>;
  };

  const crossProgramWarning = (p) => {
    if (!p.warnings) return null;
    const cp = p.warnings.find(w => w.toLowerCase().includes('does not match selected program'));
    if (!cp) return null;
    return <span style={{ background: 'var(--color-error)', color: '#fff', padding: '1px 6px', borderRadius: 8, fontSize: 10, marginRight: 4, whiteSpace: 'nowrap' }} title={cp}>Cross-program</span>;
  };

  const setStudentEdit = (field, value) => {
    setRowEdits(prev => {
      const row = prev[expandedRow] || {};
      return { ...prev, [expandedRow]: { ...row, student: { ...(row.student || {}), [field]: value } } };
    });
  };

  return (
    <div className="modal-overlay" onClick={resetAndClose}>
      <div className="modal" style={{ maxWidth: 900, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-icon info">
            <span className="material-symbols-outlined">upload_file</span>
          </div>
          <div className="modal-header-text">
            <h2>{bulkPreview ? (showReview ? 'Review Users to Create' : 'Preview Import') : title}</h2>
            <p>
              {showReview
                ? 'Edit user details before creating them'
                : bulkPreview
                  ? `Found ${bulkPreview.stats.total} rows — ${bulkPreview.stats.matched} matched, ${bulkPreview.stats.unmatched} unmatched`
                  : 'Required columns: Name, Roll, Title, Batch, Cluster, Program, Supervisor, External_mid_term, External_final'}
            </p>
          </div>
        </div>

        {!bulkPreview ? (
          <form onSubmit={handleFileUpload}>
            <div className="form-group">
              <label>Excel File (.xlsx)</label>
              <input type="file" accept=".xlsx,.xls" onChange={e => setSelectedFile(e.target.files[0])} required />
                  <a
                    href={user.role === 'SUPERVISOR' || user.role === 'EXTERNAL_EXAMINER' ? '/api/download-template/master_upload_template.xlsx' : '/master_upload_template.xlsx'}
                    download
                    style={{ fontSize: 12, color: 'var(--color-primary)', marginTop: 4, display: 'inline-block' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>download</span>
                    {' '}Download blank template
                  </a>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={resetAndClose}>
                <span className="material-symbols-outlined">close</span>Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={bulkLoading}>
                <span className="material-symbols-outlined">{bulkLoading ? 'progress_activity' : 'upload'}</span>
                {bulkLoading ? 'Analyzing...' : 'Preview'}
              </button>
            </div>
          </form>
        ) : showReview ? (
          <BulkPendingUsersModal
            open
            previewRows={bulkPreview.preview}
            type="theses"
            departmentId={user.departmentId}
            onComplete={handleReviewComplete}
            onBack={() => setShowReview(false)}
            onClose={resetAndClose}
          />
        ) : (
          <div>
            {/* Summary bar */}
            <div style={{ display: 'flex', gap: 12, padding: '8px 0', fontSize: 12, flexWrap: 'wrap', borderBottom: '1px solid var(--color-outline-variant)', marginBottom: 8 }}>
              <span>Total: <strong>{bulkPreview.preview.length}</strong></span>
              {duplicateCount > 0 && <span style={{ color: 'var(--color-error)' }}>Duplicates: <strong>{duplicateCount}</strong></span>}
              {skipCount > 0 && <span style={{ color: 'var(--color-warning)' }}>Skipped: <strong>{skipCount}</strong></span>}
              <span style={{ color: 'var(--color-success)' }}>Will import: <strong>{bulkPreview.preview.length - duplicateCount - skipCount}</strong></span>
            </div>

            <div style={{ maxHeight: 400, overflow: 'auto', marginBottom: 16 }}>
              <table style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ width: 30 }}></th>
                    <th>#</th>
                    <th>Roll</th>
                    <th>Title</th>
                    <th>Student</th>
                    <th>Supervisor</th>
                    <th>Ext (Mid)</th>
                    <th>Ext (Final)</th>
                    <th>Batch</th>
                    <th style={{ width: 60 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkPreview.preview.map(p => {
                    const isSkipped = rowActions[p.row] === 'skip';
                    const isExpanded = expandedRow === p.row;
                    const edits = rowEdits[p.row] || {};
                    const hasAnomaly = p.anomalies && p.anomalies.length > 0;

                    const toggleExpand = () => setExpandedRow(isExpanded ? null : p.row);

                    const setEdit = (field, value) => {
                      setRowEdits(prev => ({
                        ...prev,
                        [p.row]: { ...(prev[p.row] || {}), [field]: value },
                      }));
                    };

                    const toggleSkip = () => {
                      setRowActions(prev => {
                        const next = { ...prev };
                        if (next[p.row] === 'skip') delete next[p.row];
                        else next[p.row] = 'skip';
                        return next;
                      });
                    };

                    return (
                      <React.Fragment key={p.row}>
                        <tr style={{
                          background: isSkipped ? 'var(--color-surface-variant)' : hasAnomaly ? 'var(--color-error-container)' : p.warnings.length ? 'var(--color-warning-container)' : 'transparent',
                          opacity: isSkipped ? 0.5 : 1,
                          cursor: 'pointer',
                        }} onClick={toggleExpand}>
                          <td>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </td>
                          <td>{p.row}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                              {hasAnomaly && p.anomalies.map(anomalyBadge)}
                              {crossProgramWarning(p)}
                              <span style={{ textDecoration: isSkipped ? 'line-through' : 'none' }}>
                                {edits.roll || p.roll}
                              </span>
                            </div>
                          </td>
                          <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{edits.title || p.title}</td>
                          <td>{p.studentMatch ? <span style={{ color: 'var(--color-success)' }}>{p.studentMatch.name}</span> : <span style={{ color: 'var(--color-error)' }}>?</span>}</td>
                          <td>{p.supervisorMatch ? <span style={{ color: 'var(--color-success)' }}>{p.supervisorMatch.name}</span> : p.supervisorWillCreate ? <span style={{ color: 'var(--color-warning)' }}>Will create: {p.supervisorWillCreate.name}</span> : <span style={{ color: 'var(--color-error)' }}>?</span>}</td>
                          <td>{p.externalMidTermMatch ? <span style={{ color: 'var(--color-success)' }}>{p.externalMidTermMatch.name}</span> : p.externalMidTermWillCreate ? <span style={{ color: 'var(--color-warning)' }}>Will create: {p.externalMidTermWillCreate.name}</span> : <span style={{ color: 'var(--color-error)' }}>?</span>}</td>
                          <td>{p.externalFinalMatch ? <span style={{ color: 'var(--color-success)' }}>{p.externalFinalMatch.name}</span> : p.externalFinalWillCreate ? <span style={{ color: 'var(--color-warning)' }}>Will create: {p.externalFinalWillCreate.name}</span> : <span style={{ color: 'var(--color-error)' }}>?</span>}</td>
                          <td>{edits.batch || p.batch || '—'}</td>
                          <td onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: 18, color: isSkipped ? 'var(--color-success)' : 'var(--color-error)', cursor: 'pointer' }}
                                onClick={toggleSkip}
                                title={isSkipped ? 'Unskip' : 'Skip'}
                              >
                                {isSkipped ? 'undo' : 'delete'}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={10} style={{ padding: '8px 12px', background: 'var(--color-surface-variant)' }}>
                              {hasAnomaly && (
                                <div style={{ marginBottom: 8 }}>
                                  {p.anomalies.map((a, ai) => (
                                    <div key={ai} style={{ fontSize: 11, color: a.type === 'exact_duplicate' ? 'var(--color-error)' : 'var(--color-warning)', marginBottom: 2 }}>
                                      ⚠ {a.message}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div style={{ marginBottom: 8 }}>
                                {p.warnings.filter(w => w.toLowerCase().includes('belongs to another program') || w.toLowerCase().includes('does not match selected program')).map((w, wi) => (
                                  <div key={wi} style={{ fontSize: 11, color: 'var(--color-error)', marginBottom: 2 }}>
                                    ⚠ {w}
                                  </div>
                                ))}
                              </div>
                              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <div>
                                  <label style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Roll</label>
                                  <input
                                    type="text"
                                    value={edits.roll ?? p.roll ?? ''}
                                    onChange={e => setEdit('roll', e.target.value)}
                                    style={{ fontSize: 12, padding: '4px 8px', width: 100 }}
                                  />
                                </div>
                                {!p.studentMatch && (
                                  <>
                                    <div>
                                      <label style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>First Name</label>
                                      <input
                                        type="text"
                                        value={edits.student?.firstName ?? (p.name ? p.name.split(' ')[0] : '')}
                                        onChange={e => setStudentEdit('firstName', e.target.value)}
                                        style={{ fontSize: 12, padding: '4px 8px', width: 100 }}
                                        placeholder="First"
                                      />
                                    </div>
                                    <div>
                                      <label style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Last Name</label>
                                      <input
                                        type="text"
                                        value={edits.student?.lastName ?? (p.name ? p.name.split(' ').slice(1).join(' ') : '')}
                                        onChange={e => setStudentEdit('lastName', e.target.value)}
                                        style={{ fontSize: 12, padding: '4px 8px', width: 100 }}
                                        placeholder="Last"
                                      />
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--color-warning)', marginTop: 20 }}>
                                      (will auto-create student)
                                    </div>
                                  </>
                                )}
                                <div>
                                  <label style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Title</label>
                                  <input
                                    type="text"
                                    value={edits.title ?? p.title ?? ''}
                                    onChange={e => setEdit('title', e.target.value)}
                                    style={{ fontSize: 12, padding: '4px 8px', width: 200 }}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Batch</label>
                                  <input
                                    type="text"
                                    value={edits.batch ?? p.batch ?? ''}
                                    onChange={e => setEdit('batch', e.target.value)}
                                    style={{ fontSize: 12, padding: '4px 8px', width: 60 }}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Cluster</label>
                                  <input
                                    type="text"
                                    value={edits.cluster ?? p.cluster ?? ''}
                                    onChange={e => setEdit('cluster', e.target.value)}
                                    style={{ fontSize: 12, padding: '4px 8px', width: 80 }}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>&nbsp;</label>
                                  <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={isSkipped} onChange={toggleSkip} />
                                    Skip
                                  </label>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setBulkPreview(null)}>
                <span className="material-symbols-outlined">arrow_back</span>Back
              </button>
              {hasPendingUsers && (
                <button type="button" className="btn btn-secondary" onClick={() => setShowReview(true)}>
                  <span className="material-symbols-outlined">person_add</span>Next — Create Users
                </button>
              )}
              <button className="btn btn-primary" onClick={() => handleBulkConfirm()} disabled={bulkLoading || bulkPreview.preview.length === 0}>
                <span className="material-symbols-outlined">{bulkLoading ? 'progress_activity' : 'check'}</span>
                {bulkLoading ? 'Importing...' : `Import ${bulkPreview.preview.length - duplicateCount - skipCount} theses`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
