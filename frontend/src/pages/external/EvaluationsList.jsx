import React, { useState, useEffect, useMemo } from 'react';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import ErrorBoundary from '../../components/ErrorBoundary';
import EvaluationPdfPreview from '../../components/EvaluationPdfPreview';
import SearchInput from '../../components/SearchInput';
import { TableSkeleton } from '../../components/Skeleton';

function ExternalEvaluationsList() {
  const [groups, setGroups] = useState([]);
  const [theses, setTheses] = useState([]);
  const [activeTab, setActiveTab] = useState('groups');
  const [loading, setLoading] = useState(true);
  const [pdfPreviewItem, setPdfPreviewItem] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProjectType, setUploadProjectType] = useState('MINOR');
  const [uploading, setUploading] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [bulkYearId, setBulkYearId] = useState('');

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) { toast.warning('Select a file'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (activeTab === 'groups') {
        formData.append('projectType', uploadProjectType);
        await api.post('/groups/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Groups imported successfully');
      } else {
        if (!bulkYearId) { toast.warning('Select an academic year'); setUploading(false); return; }
        formData.append('academicYearId', bulkYearId);
        const { data } = await api.post('/theses/bulk-import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success(`${data.stats?.matched || 0} theses matched`);
      }
      setShowUpload(false);
      setSelectedFile(null);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/external-examiners/groups').then(({ data }) => setGroups(data)).catch(() => {}),
      api.get('/external-examiners/theses').then(({ data }) => setTheses(data)).catch(() => {}),
      api.get('/departments/academic-years').then(({ data }) => setAcademicYears(data)).catch(() => {}),
    ]).catch((err) => toast.error(err.response?.data?.error || 'Failed to load data'))
      .finally(() => setLoading(false));
  };
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    setLoading(true);
    Promise.all([
      api.get('/external-examiners/groups', { signal }).then(({ data }) => setGroups(data)).catch((err) => { if (err.name === 'CanceledError') return; }),
      api.get('/external-examiners/theses', { signal }).then(({ data }) => setTheses(data)).catch((err) => { if (err.name === 'CanceledError') return; }),
      api.get('/departments/academic-years', { signal }).then(({ data }) => setAcademicYears(data)).catch(() => {}),
    ]).catch((err) => { if (err.name !== 'CanceledError') toast.error(err.response?.data?.error || 'Failed to load data'); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const groupsWithStatus = useMemo(() => {
    return groups.map(g => {
      const comp = g.evaluationComponents?.find(c => c.evaluatorRole === 'EXTERNAL_EXAMINER');
      const evalRec = g.evaluations?.find(e => e.componentId === comp?.id);
      return { ...g, evalStatus: evalRec?.status || 'DRAFT', hasMarks: evalRec?.marks != null };
    });
  }, [groups]);

  const thesesWithStatus = useMemo(() => {
    return theses.map(t => {
      const extComps = (t.evaluationComponents || []).filter(c => c.evaluatorRole === 'EXTERNAL_EXAMINER');
      const statuses = extComps.map(c => t.evaluations?.find(e => e.componentId === c.id)?.status || 'DRAFT');
      const allCompleted = statuses.length > 0 && statuses.every(s => s === 'COMPLETED');
      const hasMarks = extComps.some(c => t.evaluations?.find(e => e.componentId === c.id)?.marks != null);
      const evalStatus = allCompleted ? 'COMPLETED' : 'DRAFT';
      return { ...t, evalStatus, hasMarks };
    });
  }, [theses]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groupsWithStatus;
    const q = searchQuery.toLowerCase();
    return groupsWithStatus.filter(g =>
      g.name?.toLowerCase().includes(q) ||
      g.projectTitle?.toLowerCase().includes(q) ||
      (g.members || []).some(m =>
        `${m.student?.firstName} ${m.student?.lastName}`.toLowerCase().includes(q)
      )
    );
  }, [groupsWithStatus, searchQuery]);

  const filteredTheses = useMemo(() => {
    if (!searchQuery) return thesesWithStatus;
    const q = searchQuery.toLowerCase();
    return thesesWithStatus.filter(t =>
      t.title?.toLowerCase().includes(q) ||
      `${t.student?.firstName} ${t.student?.lastName}`.toLowerCase().includes(q) ||
      `${t.supervisor?.firstName} ${t.supervisor?.lastName}`.toLowerCase().includes(q)
    );
  }, [thesesWithStatus, searchQuery]);

  return (
    <ErrorBoundary>
    <PageLayout title="Assigned Evaluations" subtitle="Projects and theses assigned for evaluation" user={user}>
      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowUpload(true)}>
              <span className="material-symbols-outlined">upload_file</span>
              Upload Excel
            </button>
          </div>
          <div className="tabs" style={{ marginBottom: 24 }}>
            <div className={`tab ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => setActiveTab('groups')}>
              <span className="material-symbols-outlined">school</span> Bachelor Projects ({groups.length})
            </div>
            <div className={`tab ${activeTab === 'theses' ? 'active' : ''}`} onClick={() => setActiveTab('theses')}>
              <span className="material-symbols-outlined">library_books</span> Master's Theses ({theses.length})
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by name, title, or member..." />
          </div>

          {activeTab === 'groups' ? (
            groups.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48 }}>school</span>
                <p>No bachelor projects assigned for evaluation.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Group</th>
                      <th>Project Title</th>
                      <th>Status</th>
                      <th>Eval Status</th>
                      <th>Members</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroups.map(g => (
                      <tr key={g.id} onClick={() => navigate(`/external/evaluate/group/${g.id}`)} style={{ cursor: 'pointer' }}>
                        <td><div className="default-badge">{g.name?.slice(0, 2).toUpperCase()}</div><span style={{ fontWeight: 500 }}>{g.name}</span></td>
                        <td style={{ color: 'var(--color-on-surface-variant)' }}>{g.projectTitle}</td>
                        <td><span className={`badge badge-${g.status?.toLowerCase() || 'pending'}`}><span className="dot" />{g.status}</span></td>
                        <td>
                          <span className={`badge ${g.evalStatus === 'COMPLETED' ? 'badge-success' : ''}`} style={{ fontSize: 11 }}>
                            {g.evalStatus === 'COMPLETED' ? 'Completed' : g.hasMarks ? 'Draft' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>
                          {(g.members || []).filter(m => m.student).map(m => `${m.student.firstName} ${m.student.lastName}`).join(', ') || '—'}
                        </td>
                        <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button className="btn btn-sm btn-outline" onClick={() => navigate(`/external/evaluate/group/${g.id}`)}>
                              <span className="material-symbols-outlined">visibility</span> View
                            </button>
                            <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); setPdfPreviewItem(g); }}>
                              <span className="material-symbols-outlined">picture_as_pdf</span> PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            theses.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48 }}>library_books</span>
                <p>No master's theses assigned for evaluation.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Thesis Title</th>
                      <th>Status</th>
                      <th>Eval Status</th>
                      <th>Supervisor</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTheses.map(t => (
                      <tr key={t.id} onClick={() => navigate(`/external/evaluate/thesis/${t.id}`)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: 500 }}>{t.student?.firstName} {t.student?.lastName}</td>
                        <td style={{ color: 'var(--color-on-surface-variant)' }}>{t.title}</td>
                        <td><span className={`badge badge-${t.status?.toLowerCase() || 'pending'}`}><span className="dot" />{t.status}</span></td>
                        <td>
                          <span className={`badge ${t.evalStatus === 'COMPLETED' ? 'badge-success' : ''}`} style={{ fontSize: 11 }}>
                            {t.evalStatus === 'COMPLETED' ? 'Completed' : t.hasMarks ? 'Draft' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>{t.supervisor ? `${t.supervisor.designation ? t.supervisor.designation + ' ' : ''}${t.supervisor.firstName} ${t.supervisor.lastName}` : '—'}</td>
                        <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button className="btn btn-sm btn-outline" onClick={() => navigate(`/external/evaluate/thesis/${t.id}`)}>
                              <span className="material-symbols-outlined">visibility</span> View
                            </button>
                            <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); setPdfPreviewItem(t); }}>
                              <span className="material-symbols-outlined">picture_as_pdf</span> PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
      {pdfPreviewItem && (
        <EvaluationPdfPreview
          type={pdfPreviewItem.title ? 'thesis' : 'group'}
          id={pdfPreviewItem.id}
          onClose={() => setPdfPreviewItem(null)}
          onSave={() => { setPdfPreviewItem(null); window.location.reload(); }}
          {...(pdfPreviewItem.title ? { initialScope: 'external' } : {})}
        />
      )}

      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <span className="material-symbols-outlined">upload_file</span>
              </div>
              <div className="modal-header-text">
                <h2>Upload Excel</h2>
                <p>{activeTab === 'groups' ? 'Import groups from an Excel spreadsheet' : 'Import theses from an Excel spreadsheet'}</p>
              </div>
            </div>
            <form onSubmit={handleFileUpload}>
              {activeTab === 'groups' ? (
                <div className="form-group">
                  <label>Project Type</label>
                  <select value={uploadProjectType} onChange={e => setUploadProjectType(e.target.value)}>
                    <option value="MINOR">Minor Project</option>
                    <option value="MAJOR">Major Project</option>
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label>Academic Year</label>
                  <select value={bulkYearId} onChange={e => setBulkYearId(e.target.value)} required>
                    <option value="">Select year...</option>
                    {academicYears.map(y => <option key={y.id} value={y.id}>{y.year}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Excel File (.xlsx)</label>
                <input type="file" accept=".xlsx" onChange={e => setSelectedFile(e.target.files[0])} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowUpload(false)}>
                  <span className="material-symbols-outlined">close</span>Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploading || !selectedFile}>
                  <span className="material-symbols-outlined">{uploading ? 'progress_activity' : 'upload'}</span>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
    </ErrorBoundary>
  );
}

export default ExternalEvaluationsList;
