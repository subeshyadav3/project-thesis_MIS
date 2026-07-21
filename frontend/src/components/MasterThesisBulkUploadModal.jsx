import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

/**
 * Shared master thesis Excel bulk import (preview → confirm).
 * Academic year is resolved automatically from the Excel Batch column.
 * Pass `title` to override the heading (e.g. on Supervisor / Examiner pages).
 */
export default function MasterThesisBulkUploadModal({ open, onClose, onSuccess, title }) {
  const toast = useToast();
  const [selectedFile, setSelectedFile] = useState(null);
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  if (!open) return null;

  const resetAndClose = () => {
    setSelectedFile(null);
    setBulkPreview(null);
    setBulkLoading(false);
    onClose();
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) { toast.warning('Select a file'); return; }
    setBulkLoading(true);
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

  const handleBulkConfirm = async () => {
    if (!bulkPreview?.preview) return;
    setBulkLoading(true);
    try {
      const rows = bulkPreview.preview.map(p => ({
        row: p.row,
        name: p.name,
        roll: p.roll,
        title: p.title,
        batch: p.batch,
        cluster: p.cluster,
        programId: p.programId,
        studentMatch: p.studentMatch,
        supervisorMatch: p.supervisorMatch,
        supervisorWillCreate: p.supervisorWillCreate,
        externalMidTermMatch: p.externalMidTermMatch,
        externalMidTermWillCreate: p.externalMidTermWillCreate,
        externalFinalMatch: p.externalFinalMatch,
        externalFinalWillCreate: p.externalFinalWillCreate,
      }));
      await api.post('/theses/bulk-import/confirm', { rows });
      toast.success(`${bulkPreview.stats.matched} theses imported`);
      resetAndClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={resetAndClose}>
      <div className="modal" style={{ maxWidth: 900, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-icon info">
            <span className="material-symbols-outlined">upload_file</span>
          </div>
          <div className="modal-header-text">
            <h2>{bulkPreview ? 'Preview Import' : (title || 'Bulk Upload Theses')}</h2>
            <p>
              {bulkPreview
                ? `Found ${bulkPreview.stats.total} rows — ${bulkPreview.stats.matched} matched, ${bulkPreview.stats.unmatched} unmatched`
                : 'Upload Excel with Name, Roll, Title, Batch, Cluster, Program, Supervisor, External_mid_term, External_final'}
            </p>
          </div>
        </div>

        {!bulkPreview ? (
          <form onSubmit={handleFileUpload}>
            <div className="form-group">
              <label>Excel File (.xlsx)</label>
              <input type="file" accept=".xlsx,.xls" onChange={e => setSelectedFile(e.target.files[0])} required />
              <a
                href="/master_upload_template.xlsx"
                download
                style={{ fontSize: 12, color: 'var(--color-primary)', marginTop: 4, display: 'inline-block' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>download</span>
                {' '}Download blank template
              </a>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>
                Columns: Name, Roll, Title, Batch, Cluster, Program, Supervisor, External_mid_term, External_final
              </span>
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
        ) : (
          <div>
            <div style={{ maxHeight: 400, overflow: 'auto', marginBottom: 16 }}>
              <table style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Roll</th>
                    <th>Title</th>
                    <th>Batch</th>
                    <th>Student</th>
                    <th>Supervisor</th>
                    <th>Ext (Mid)</th>
                    <th>Ext (Final)</th>
                    <th>Cluster</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkPreview.preview.map(p => (
                    <tr key={p.row} style={{ background: p.warnings.length ? 'var(--color-error-container)' : 'transparent' }}>
                      <td>{p.row}</td>
                      <td>{p.name}</td>
                      <td style={{ fontSize: 11 }}>{p.roll}</td>
                      <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</td>
                      <td>{p.batch || '—'}</td>
                      <td>{p.studentMatch ? <span style={{ color: 'var(--color-success)' }}>{p.studentMatch.name}</span> : <span style={{ color: 'var(--color-error)' }}>?</span>}</td>
                      <td>{p.supervisorMatch ? <span style={{ color: 'var(--color-success)' }}>{p.supervisorMatch.name}</span> : p.supervisorWillCreate ? <span style={{ color: 'var(--color-warning)' }}>Will create: {p.supervisorWillCreate.name}</span> : <span style={{ color: 'var(--color-error)' }}>?</span>}</td>
                      <td>{p.externalMidTermMatch ? <span style={{ color: 'var(--color-success)' }}>{p.externalMidTermMatch.name}</span> : p.externalMidTermWillCreate ? <span style={{ color: 'var(--color-warning)' }}>Will create: {p.externalMidTermWillCreate.name}</span> : <span style={{ color: 'var(--color-error)' }}>?</span>}</td>
                      <td>{p.externalFinalMatch ? <span style={{ color: 'var(--color-success)' }}>{p.externalFinalMatch.name}</span> : p.externalFinalWillCreate ? <span style={{ color: 'var(--color-warning)' }}>Will create: {p.externalFinalWillCreate.name}</span> : <span style={{ color: 'var(--color-error)' }}>?</span>}</td>
                      <td>{p.cluster || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setBulkPreview(null)}>
                <span className="material-symbols-outlined">arrow_back</span>Back
              </button>
              <button className="btn btn-primary" onClick={handleBulkConfirm} disabled={bulkLoading || bulkPreview.stats.matched === 0}>
                <span className="material-symbols-outlined">{bulkLoading ? 'progress_activity' : 'check'}</span>
                {bulkLoading ? 'Importing...' : `Import ${bulkPreview.stats.matched} theses`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
