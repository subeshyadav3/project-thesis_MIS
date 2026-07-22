import React, { useState, useMemo } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import BulkPendingUsersModal from './BulkPendingUsersModal';

export default function GroupBulkUploadModal({ open, onClose, onSuccess }) {
  const toast = useToast();
  const [selectedFile, setSelectedFile] = useState(null);
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [rowActions, setRowActions] = useState({});
  const [rowEdits, setRowEdits] = useState({});
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const resetModal = () => {
    setSelectedFile(null);
    setBulkPreview(null);
    setBulkLoading(false);
    setShowReview(false);
    setExpandedRow(null);
    setRowActions({});
    setRowEdits({});
    onClose();
  };

  const skipCount = useMemo(() => {
    return Object.values(rowActions).filter(v => v === 'skip').length;
  }, [rowActions]);

  const duplicateCount = useMemo(() => {
    if (!bulkPreview?.preview) return 0;
    return bulkPreview.preview.filter(p => p.anomalies?.some(a => a.type === 'exact_duplicate')).length;
  }, [bulkPreview]);

  const hasPendingUsers = useMemo(() => {
    if (!bulkPreview?.preview) return false;
    return bulkPreview.preview.some(p => p.supervisorWillCreate || p.examinerWillCreate);
  }, [bulkPreview]);

  const handleBulkPreview = async (e) => {
    e.preventDefault();
    if (!selectedFile) { toast.warning('Select a file'); return; }
    setBulkLoading(true);
    setRowActions({});
    setRowEdits({});
    setExpandedRow(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const { data } = await api.post('/groups/bulk-import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBulkPreview(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
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

  const handleBulkConfirm = async (rowsOverride) => {
    const rows = rowsOverride || (bulkPreview?.preview || []).map(p => {
      const action = rowActions[p.row];
      let edits = rowEdits[p.row] ? { ...rowEdits[p.row] } : {};
      p.studentMatches.forEach((sm, j) => {
        if (sm) return;
        const current = edits.students?.[j];
        if (current?.firstName && current?.lastName) return;
        if (!p.members[j]) return;
        const parts = p.members[j].split(' ');
        edits.students = { ...(edits.students || {}), [j]: { ...(current || {}), firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' } };
      });
      return {
        _action: action,
        _edits: edits,
        row: p.row,
        groupName: edits?.groupName ?? p.groupName,
        projectTitle: edits?.projectTitle ?? p.projectTitle,
        projectType: edits?.projectType ?? p.projectType,
        members: p.members,
        rolls: p.rolls,
        batch: edits?.batch ?? p.batch,
        programId: p.programId,
        studentMatches: p.studentMatches,
        supervisorMatch: p.supervisorMatch,
        supervisorWillCreate: p.supervisorWillCreate,
        examinerMatch: p.examinerMatch,
        examinerWillCreate: p.examinerWillCreate,
      };
    });
    if (rows.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await api.post('/groups/bulk-import/confirm', { rows });
      const created = res.data?.created ?? bulkPreview.stats.matched;
      const skipCount = res.data?.skipped?.length ?? 0;
      let msg = `${created} imported`;
      if (skipCount) msg += `, ${skipCount} skipped`;
      toast.success(msg);
      resetModal();
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setBulkLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={resetModal}>
      <div className="modal" style={{ maxWidth: 900, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-icon info">
            <span className="material-symbols-outlined">upload_file</span>
          </div>
          <div className="modal-header-text">
            <h2>{showReview ? 'Review Users to Create' : (bulkPreview ? 'Preview Import' : 'Bulk Upload Groups')}</h2>
            <p>
              {showReview
                ? 'Edit user details before creating them'
                : bulkPreview
                  ? `Found ${bulkPreview.stats.total} rows — ${bulkPreview.stats.matched} matched, ${bulkPreview.stats.unmatched} unmatched`
                  : 'Required columns: Group Name, Project Title, Members, Roll Numbers, Batch, Supervisor, External Examiner'}
            </p>
          </div>
        </div>

        {showReview ? (
          <BulkPendingUsersModal
            open
            previewRows={bulkPreview.preview}
            type="groups"
            departmentId={user.departmentId}
            onComplete={handleReviewComplete}
            onBack={() => setShowReview(false)}
            onClose={resetModal}
          />
        ) : !bulkPreview ? (
          <form onSubmit={handleBulkPreview}>
            <div className="form-group">
              <label>Excel File (.xlsx)</label>
              <input type="file" accept=".xlsx,.xls" onChange={e => setSelectedFile(e.target.files[0])} required />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={resetModal}>
                <span className="material-symbols-outlined">close</span>Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={bulkLoading}>
                <span className="material-symbols-outlined">{bulkLoading ? 'progress_activity' : 'upload'}</span>
                {bulkLoading ? 'Analyzing...' : 'Preview'}
              </button>
            </div>
          </form>
        ) : (
          <div>
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
                    <th>Group</th>
                    <th>Title</th>
                    <th>Members</th>
                    <th>Students</th>
                    <th>Supervisor</th>
                    <th>Examiner</th>
                    <th>Type</th>
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
                    const studentEdits = edits.students || {};

                    const anomalyBadge = (a) => {
                      const labels = { exact_duplicate: 'Duplicate', group_name_exists: 'Name taken', student_in_group: 'Student conflict' };
                      const isError = a.type === 'exact_duplicate';
                      const style = { background: isError ? 'var(--color-error)' : 'var(--color-warning)', color: '#fff', padding: '1px 6px', borderRadius: 8, fontSize: 10, marginRight: 4, whiteSpace: 'nowrap', cursor: 'default' };
                      return <span key={a.type + (a.studentId || a.existingId || '')} style={style} title={a.message}>{labels[a.type] || 'Conflict'}</span>;
                    };

                    const toggleExpand = () => setExpandedRow(isExpanded ? null : p.row);
                    const setEdit = (field, value) => setRowEdits(prev => ({ ...prev, [p.row]: { ...(prev[p.row] || {}), [field]: value } }));
                    const setStudentEdit = (idx, field, value) => setRowEdits(prev => { const row = prev[p.row] || {}; const students = { ...(row.students || {}) }; students[idx] = { ...(students[idx] || {}), [field]: value }; return { ...prev, [p.row]: { ...row, students } }; });
                    const toggleSkip = () => setRowActions(prev => { const next = { ...prev }; if (next[p.row] === 'skip') delete next[p.row]; else next[p.row] = 'skip'; return next; });

                    return (
                      <React.Fragment key={p.row}>
                        <tr style={{ background: isSkipped ? 'var(--color-surface-variant)' : hasAnomaly ? 'var(--color-error-container)' : p.warnings.length ? 'var(--color-warning-container)' : 'transparent', opacity: isSkipped ? 0.5 : 1, cursor: 'pointer' }} onClick={toggleExpand}>
                          <td><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>{isExpanded ? 'expand_less' : 'expand_more'}</span></td>
                          <td>{p.row}</td>
                          <td style={{ fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                              {hasAnomaly && p.anomalies.map(anomalyBadge)}
                              <span style={{ textDecoration: isSkipped ? 'line-through' : 'none' }}>{edits.groupName || p.groupName}</span>
                            </div>
                          </td>
                          <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{edits.projectTitle || p.projectTitle}</td>
                          <td>{p.members.join(', ') || '—'}</td>
                          <td>
                            {p.studentMatches.filter(Boolean).length > 0 ? <span style={{ color: 'var(--color-success)' }}>{p.studentMatches.filter(Boolean).length} matched</span> : <span style={{ color: 'var(--color-error)' }}>?</span>}
                            {p.studentMatches.filter(m => !m).length > 0 && <span style={{ color: 'var(--color-error)', marginLeft: 4 }}>({p.studentMatches.filter(m => !m).length} missing)</span>}
                          </td>
                          <td>{p.supervisorMatch ? <span style={{ color: 'var(--color-success)' }}>{p.supervisorMatch.name}</span> : p.supervisorWillCreate ? <span style={{ color: 'var(--color-warning)' }}>Will create: {p.supervisorWillCreate.name}</span> : <span style={{ color: 'var(--color-error)' }}>—</span>}</td>
                          <td>{p.examinerMatch ? <span style={{ color: 'var(--color-success)' }}>{p.examinerMatch.name}</span> : p.examinerWillCreate ? <span style={{ color: 'var(--color-warning)' }}>Will create: {p.examinerWillCreate.name}</span> : <span style={{ color: 'var(--color-error)' }}>—</span>}</td>
                          <td>
                            <select value={(edits.projectType || p.projectType) || 'MINOR'} onChange={e => { e.stopPropagation(); setEdit('projectType', e.target.value); }} style={{ fontSize: 11, padding: '2px 4px' }} onClick={e => e.stopPropagation()}>
                              <option value="MINOR">Minor</option>
                              <option value="MAJOR">Major</option>
                            </select>
                          </td>
                          <td>{edits.batch || p.batch || '—'}</td>
                          <td onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 18, color: isSkipped ? 'var(--color-success)' : 'var(--color-error)', cursor: 'pointer' }} onClick={toggleSkip} title={isSkipped ? 'Unskip' : 'Skip'}>{isSkipped ? 'undo' : 'delete'}</span>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={11} style={{ padding: '8px 12px', background: 'var(--color-surface-variant)' }}>
                              {hasAnomaly && <div style={{ marginBottom: 8 }}>{p.anomalies.map((a, ai) => <div key={ai} style={{ fontSize: 11, color: a.type === 'exact_duplicate' ? 'var(--color-error)' : 'var(--color-warning)', marginBottom: 2 }}>⚠ {a.message}</div>)}</div>}
                              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <div><label style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Group Name</label><input type="text" value={edits.groupName ?? p.groupName} onChange={e => setEdit('groupName', e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }} /></div>
                                <div><label style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Project Title</label><input type="text" value={edits.projectTitle ?? p.projectTitle} onChange={e => setEdit('projectTitle', e.target.value)} style={{ fontSize: 12, padding: '4px 8px', width: 200 }} /></div>
                                <div><label style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Batch</label><input type="text" value={edits.batch ?? p.batch ?? ''} onChange={e => setEdit('batch', e.target.value)} style={{ fontSize: 12, padding: '4px 8px', width: 60 }} /></div>
                                <div><label style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Project Type</label><select value={edits.projectType || p.projectType || 'MINOR'} onChange={e => setEdit('projectType', e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }}><option value="MINOR">Minor</option><option value="MAJOR">Major</option></select></div>
                              </div>
                              <div style={{ marginTop: 12, borderTop: '1px solid var(--color-outline-variant)', paddingTop: 8 }}>
                                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Members</label>
                                {p.members.map((name, j) => {
                                  const origRoll = (p.rolls && p.rolls[j]) || '';
                                  const se = studentEdits[j] || {};
                                  const matched = p.studentMatches && p.studentMatches[j];
                                  return (
                                    <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', width: 24 }}>#{j + 1}</span>
                                      <input type="text" value={se.roll ?? origRoll} onChange={e => setStudentEdit(j, 'roll', e.target.value)} style={{ fontSize: 12, padding: '3px 6px', width: 110 }} placeholder="Roll" />
                                      {matched ? <span style={{ fontSize: 11, color: 'var(--color-success)' }}>{matched.name} ({origRoll}) ✅</span>
                                        : <span style={{ fontSize: 11, color: 'var(--color-error)' }}>❌ Not found — <input type="text" value={se.firstName ?? (name.split(' ')[0] || '')} onChange={e => setStudentEdit(j, 'firstName', e.target.value)} style={{ fontSize: 12, padding: '3px 6px', width: 100, marginLeft: 4 }} placeholder="First" /><input type="text" value={se.lastName ?? (name.split(' ').slice(1).join(' ') || '')} onChange={e => setStudentEdit(j, 'lastName', e.target.value)} style={{ fontSize: 12, padding: '3px 6px', width: 100, marginLeft: 4 }} placeholder="Last" /><span style={{ marginLeft: 4, color: 'var(--color-warning)', fontSize: 10 }}>(will auto-create)</span></span>}
                                    </div>
                                  );
                                })}
                              </div>
                              <div style={{ marginTop: 8 }}><label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}><input type="checkbox" checked={isSkipped} onChange={toggleSkip} /> Skip this row</label></div>
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
              <button type="button" className="btn btn-outline" onClick={() => setBulkPreview(null)}><span className="material-symbols-outlined">arrow_back</span>Back</button>
              {hasPendingUsers && <button type="button" className="btn btn-secondary" onClick={() => setShowReview(true)}><span className="material-symbols-outlined">person_add</span>Next — Create Users</button>}
              <button className="btn btn-primary" onClick={() => handleBulkConfirm()} disabled={bulkLoading || bulkPreview.preview.length === 0}>
                <span className="material-symbols-outlined">{bulkLoading ? 'progress_activity' : 'check'}</span>
                {bulkLoading ? 'Importing...' : `Import ${bulkPreview.preview.length - duplicateCount - skipCount} groups`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
