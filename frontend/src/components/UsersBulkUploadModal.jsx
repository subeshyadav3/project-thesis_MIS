import React, { useMemo, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

const ROLE_OPTIONS = [
  { value: 'STUDENT', label: 'Student', href: '/student_users_template.xlsx', columns: 'email, password, firstName, lastName, rollNumber, programCode, degreeType' },
  { value: 'SUPERVISOR', label: 'Supervisor', href: '/supervisor_users_template.xlsx', columns: 'email, password, firstName, lastName, designation' },
  { value: 'EXTERNAL_EXAMINER', label: 'External Examiner', href: '/external_users_template.xlsx', columns: 'email, password, firstName, lastName, designation' },
];

/**
 * Excel people-only bulk import.
 * Pass `fixedRole` on Supervisors / Examiners pages; omit it on /users to pick a type.
 */
export default function UsersBulkUploadModal({
  open,
  onClose,
  onSuccess,
  fixedRole = null,
  title,
  subtitle,
}) {
  const toast = useToast();
  const [userType, setUserType] = useState(fixedRole || 'STUDENT');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const active = useMemo(
    () => ROLE_OPTIONS.find(o => o.value === (fixedRole || userType)) || ROLE_OPTIONS[0],
    [fixedRole, userType]
  );

  if (!open) return null;

  const resetAndClose = () => {
    setFile(null);
    setResult(null);
    setUploading(false);
    if (!fixedRole) setUserType('STUDENT');
    onClose();
  };

  const handleUpload = async () => {
    if (!file) { toast.warning('Select a file'); return; }
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('role', active.value);
      const { data } = await api.post('/users/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      toast.success(data.message || `Created ${data.created} user(s)`);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const heading = title
    || (fixedRole === 'SUPERVISOR'
      ? 'Bulk Import Supervisors'
      : fixedRole === 'EXTERNAL_EXAMINER'
        ? 'Bulk Import External Examiners'
        : 'Bulk Upload Users');

  return (
    <div className="modal-overlay" onClick={resetAndClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-icon info">
            <span className="material-symbols-outlined">upload_file</span>
          </div>
          <div className="modal-header-text">
            <h2>{heading}</h2>
            <p>{subtitle || 'Download the template, fill rows, then upload Excel'}</p>
          </div>
        </div>

        {!fixedRole && (
          <div className="form-group">
            <label>User type</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ROLE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setUserType(opt.value); setResult(null); setFile(null); }}
                  style={{
                    flex: 1, padding: '8px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
                    border: userType === opt.value ? '2px solid var(--color-primary)' : '1px solid var(--color-outline)',
                    background: userType === opt.value ? 'var(--color-primary-container)' : 'var(--color-surface)',
                    fontWeight: userType === opt.value ? 600 : 400,
                    minWidth: 0,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Excel file (.xlsx)</label>
          <input type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files[0])} />
          <a href={active.href} download style={{ fontSize: 12, color: 'var(--color-primary)', marginTop: 6, display: 'inline-block' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>download</span>
            {' '}Download blank template
          </a>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>
            Columns: {active.columns}
          </span>
        </div>

        {result && (
          <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: 'var(--color-surface-container-low)', fontSize: 13 }}>
            <div>Created: <strong>{result.created}</strong> · Failed: <strong>{result.failed}</strong></div>
            {result.errors?.length > 0 && (
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, maxHeight: 120, overflow: 'auto', fontSize: 12 }}>
                {result.errors.slice(0, 20).map((err, i) => (
                  <li key={i}>Row {err.row || '?'}: {err.email} — {err.error}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={resetAndClose}>
            <span className="material-symbols-outlined">close</span>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={uploading || !file} onClick={handleUpload}>
            <span className="material-symbols-outlined">{uploading ? 'progress_activity' : 'upload'}</span>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
