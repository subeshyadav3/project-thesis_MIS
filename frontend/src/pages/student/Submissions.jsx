import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import DocumentViewer from '../../components/DocumentViewer';
import { useToast } from '../../contexts/ToastContext';
import ErrorBoundary from '../../components/ErrorBoundary';
import { downloadFile } from '../../utils/download';
import ProposalCommentsViewer from '../../components/ProposalCommentsViewer';
import api from '../../services/api';

function getDeadlineInfo(expirationDate) {
  if (!expirationDate) return null;
  const now = new Date();
  const deadline = new Date(expirationDate);
  const diffMs = deadline - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (diffMs < 0) return { expired: true, label: 'Deadline passed', urgent: false };
  if (diffDays > 30) return { expired: false, label: `${deadline.toLocaleDateString()}`, urgent: false };
  if (diffDays > 7) return { expired: false, label: `${diffDays} days left`, urgent: false };
  if (diffDays > 1) return { expired: false, label: `${diffDays} days left`, urgent: true };
  if (diffHours >= 1) return { expired: false, label: `${diffHours} hours left`, urgent: true };
  return { expired: false, label: 'Due soon', urgent: true };
}

function StudentSubmissions() {
  const [groups, setGroups] = useState([]);
  const [theses, setTheses] = useState([]);
  const [activeTab, setActiveTab] = useState('groups');
  const [selectedId, setSelectedId] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [announcement, setAnnouncement] = useState(null);
  const [uploading, setUploading] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewerDoc, setViewerDoc] = useState(null);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const stages = ['PROPOSAL', 'MID_TERM', 'FINAL'];

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/students/groups').then(({ data }) => setGroups(data)).catch(err => { toast.error(err.response?.data?.error || 'Failed to load groups'); setGroups([]); }),
      api.get('/students/theses').then(({ data }) => setTheses(data)).catch(err => { toast.error(err.response?.data?.error || 'Failed to load theses'); setTheses([]); }),
    ]);
  }, []);

  // Auto-select the correct tab once data loads: prefer 'theses' if only theses exist, else 'groups'
  useEffect(() => {
    if (groups.length === 0 && theses.length > 0) {
      setActiveTab('theses');
    } else {
      setActiveTab('groups');
    }
    setLoading(false);
  }, [groups.length, theses.length]);

  useEffect(() => {
    if (!selectedId) { setProposals([]); setAnnouncement(null); return; }
    const isGroup = activeTab === 'groups';
    const endpoint = isGroup ? `/students/groups/${selectedId}` : `/students/theses/${selectedId}`;
    api.get(endpoint)
      .then(({ data }) => {
        setProposals(data.proposals || []);
        setAnnouncement(data.announcement || null);
      })
      .catch(err => { toast.error(err.response?.data?.error || 'Failed to load proposals'); setProposals([]); setAnnouncement(null); });
  }, [selectedId, activeTab]);

  const items = activeTab === 'groups' ? groups : theses;
  const itemLabel = activeTab === 'groups' ? 'Project' : 'Thesis';

  useEffect(() => {
    if (items.length > 0 && !selectedId) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  const handleUpload = async (stage, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, [stage]: true }));
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('stage', stage);
      formData.append('type', activeTab === 'groups' ? 'group' : 'thesis');
      formData.append(activeTab === 'groups' ? 'groupId' : 'thesisId', selectedId);
      await api.post('/students/upload', formData);
      toast.success(`${stage === 'MID_TERM' ? 'Mid-Term' : stage.charAt(0) + stage.slice(1).toLowerCase()} document uploaded`);
      const endpoint = activeTab === 'groups' ? `/students/groups/${selectedId}` : `/students/theses/${selectedId}`;
      const { data } = await api.get(endpoint);
      setProposals(data.proposals || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(prev => ({ ...prev, [stage]: false }));
    }
  };

  if (loading) {
    return (
      <ErrorBoundary><PageLayout title="Submissions" user={user}>
        <div className="loading-state"><span className="material-symbols-outlined">progress_activity</span><p>Loading...</p></div>
      </PageLayout></ErrorBoundary>
    );
  }

  if (groups.length === 0 && theses.length === 0) {
    return (
      <ErrorBoundary><PageLayout title="Document Submissions" user={user}>
        <div className="empty-state" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, margin: '0 auto 16px', background: 'var(--color-surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--color-outline)' }}>upload_file</span>
          </div>
          <h3>No Assignments</h3>
          <p style={{ color: 'var(--color-on-surface-variant)', marginTop: 8 }}>You have no projects or theses to submit documents for.</p>
        </div>
      </PageLayout></ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary><PageLayout title="Document Submissions" subtitle="Upload and manage documents for each evaluation stage" user={user}>
      {/* Tab switcher: Projects / Theses */}
      {groups.length > 0 && theses.length > 0 && (
        <div className="tabs" style={{ marginBottom: 16 }}>
          <div className={`tab ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => { setActiveTab('groups'); setSelectedId(null); }}>
            <span className="material-symbols-outlined">school</span>Projects
          </div>
          <div className={`tab ${activeTab === 'theses' ? 'active' : ''}`} onClick={() => { setActiveTab('theses'); setSelectedId(null); }}>
            <span className="material-symbols-outlined">library_books</span>Theses
          </div>
        </div>
      )}

      {/* Assignment selector — always shown so user can pick which project/thesis to upload to */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>
            {activeTab === 'groups' ? 'school' : 'library_books'}
          </span>
          {itemLabel}:
        </span>
        <select
          value={selectedId || ''}
          onChange={e => setSelectedId(parseInt(e.target.value))}
          className="input"
          style={{ maxWidth: 400, padding: '6px 10px', fontSize: 13 }}
        >
          {items.map(i => (
            <option key={i.id} value={i.id}>
              {activeTab === 'groups' ? i.projectTitle : i.title} ({i.batch || '—'})
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {stages.map(stage => {
          const existing = proposals.find(p => p.stage === stage);
          const stageLabel = stage === 'MID_TERM' ? 'Mid-Term' : stage.charAt(0) + stage.slice(1).toLowerCase();
          return (
            <div key={stage} className="card" style={{ overflow: 'hidden' }}>
              <div className="card-header" style={{
                background: existing?.documentUrl ? 'var(--color-primary-container)' : 'transparent',
                borderBottom: '1px solid var(--color-outline-variant)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: existing?.documentUrl ? 'var(--color-primary)' : 'var(--color-surface-container)',
                    color: existing?.documentUrl ? '#fff' : 'var(--color-on-surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      {stage === 'PROPOSAL' ? 'description' : stage === 'MID_TERM' ? 'schedule' : 'flag'}
                    </span>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15 }}>{stageLabel} Stage</h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                      {existing?.documentUrl ? 'Document uploaded' : 'No document uploaded yet'}
                    </p>
                  </div>
                </div>
                <span className={`badge badge-${existing?.documentUrl ? 'active' : 'pending'}`}>
                  <span className="dot" />{existing?.documentUrl ? 'Uploaded' : 'Pending'}
                </span>
              </div>

              {announcement?.expirationDate && (() => {
                const info = getDeadlineInfo(announcement.expirationDate);
                if (!info) return null;
                return (
                  <div style={{
                    padding: '6px 16px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6,
                    background: info.expired ? 'var(--color-error-container)' : info.urgent ? 'var(--color-warning-container)' : 'transparent',
                    color: info.expired ? 'var(--color-on-error-container)' : info.urgent ? 'var(--color-on-warning-container)' : 'var(--color-on-surface-variant)',
                    borderBottom: '1px solid var(--color-outline-variant)',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{info.expired ? 'error' : info.urgent ? 'warning' : 'schedule'}</span>
                    {info.label}
                  </div>
                );
              })()}

              <div style={{ padding: 16 }}>
                {existing?.documentUrl ? (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: 12, borderRadius: 8, background: 'var(--color-surface-container-low)',
                      border: '1px solid var(--color-outline-variant)',
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                      onClick={() => setViewerDoc({ url: existing.documentUrl, name: `${stageLabel}_Document.${existing.documentUrl.match(/\.(\w+)$/)?.[1] || 'pdf'}` })}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-container)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface-container-low)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span className="material-symbols-outlined" style={{ color: 'var(--color-on-primary-container)', fontSize: 22 }}>description</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: 14 }}>
                            {stageLabel}_Document{existing.documentUrl.match(/\.(\w+)$/)?.[1] ? `.${existing.documentUrl.match(/\.(\w+)$/)[1]}` : ''}
                          </span>
                          {existing.submittedBy && (
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                              Uploaded by {existing.submittedBy.firstName} {existing.submittedBy.lastName}
                              {' · '}{new Date(existing.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }}
                          onClick={(e) => { e.stopPropagation(); setViewerDoc({ url: existing.documentUrl, name: `${stageLabel}_Document.${existing.documentUrl.match(/\.(\w+)$/)?.[1] || 'pdf'}` }); }}
                          title="Preview">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }}
                          onClick={(e) => { e.stopPropagation(); downloadFile(existing.documentUrl, `${stageLabel}_Document`); }}
                          title="Download">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                        </button>
                        <a href={existing.documentUrl} target="_blank" rel="noopener noreferrer"
                          className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12, textDecoration: 'none' }}
                          title="Open in new tab">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
                        </a>
                      </div>
                    </div>

                    {/* Show comments (new system) or legacy feedback if no new comments exist */}
                    <ProposalCommentsViewer proposalId={existing.id} legacyComment={existing.supervisorComment} legacyAuthor={existing.commentedBy} />
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: '16px 0' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--color-outline)' }}>upload_file</span>
                    <p style={{ margin: '4px 0 12px', fontSize: 13 }}>Upload your {stageLabel.toLowerCase()} document</p>
                  </div>
                )}

                <label className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>upload</span>
                  {uploading[stage] ? 'Uploading...' : existing?.documentUrl ? 'Upload New Version' : 'Upload Document'}
                  <input type="file" accept=".pdf,.doc,.docx,.zip" style={{ display: 'none' }}
                    onChange={(e) => handleUpload(stage, e)} disabled={uploading[stage]} />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {viewerDoc && (
        <DocumentViewer fileUrl={viewerDoc.url} fileName={viewerDoc.name} onClose={() => setViewerDoc(null)} />
      )}
    </PageLayout></ErrorBoundary>
  );
}

export default StudentSubmissions;
