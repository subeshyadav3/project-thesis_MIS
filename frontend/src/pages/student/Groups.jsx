import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import ErrorBoundary from '../../components/ErrorBoundary';
import { Link } from 'react-router-dom';

const TYPE_LABELS = { GENERAL: 'General', MINOR: 'Minor Project', MAJOR: 'Major Project', THESIS: 'Thesis' };

function CreateGroupForm({ announcement, user, createForm, setCreateForm, selectedMembers, setSelectedMembers, availableStudents, loadAvailableStudents, inviteLoading, onCreate, onCancel }) {
  const [memberSearch, setMemberSearch] = useState('');
  const [memberOpen, setMemberOpen] = useState(false);
  const memberRef = useRef(null);

  useEffect(() => {
    const f = (e) => { if (memberRef.current && !memberRef.current.contains(e.target)) setMemberOpen(false); };
    if (memberOpen) document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, [memberOpen]);

  const selectMember = (student) => {
    if (!selectedMembers.includes(student.id)) {
      setSelectedMembers(prev => [...prev, student.id]);
    }
    setMemberSearch('');
    setMemberOpen(false);
  };

  const removeMember = (id) => {
    setSelectedMembers(prev => prev.filter(x => x !== id));
  };

  const filtered = availableStudents.filter(s =>
    `${s.firstName} ${s.lastName} ${s.rollNumber || ''}`.toLowerCase().includes(memberSearch.toLowerCase())
  ).filter(s => !selectedMembers.includes(s.id) && s.id !== user.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 360, padding: '16px', background: 'var(--color-surface-container-low)', borderRadius: 'var(--border-radius-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottom: '1px solid var(--color-outline-variant)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-primary)' }}>group_add</span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Create New Group</span>
        <span className={`badge badge-${announcement.type === 'THESIS' ? 'warning' : 'info'}`} style={{ marginLeft: 'auto' }}>
          {TYPE_LABELS[announcement.type]}
        </span>
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Group Name</label>
        <input className="form-input" value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} placeholder="Enter a name for your group" />
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project Title</label>
        <input className="form-input" value={createForm.projectTitle} onChange={e => setCreateForm({...createForm, projectTitle: e.target.value})} placeholder="Enter project title" />
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal', fontSize: 11, color: 'var(--color-on-surface-variant)' }}>(optional)</span></label>
        <textarea className="form-input" rows={3} value={createForm.description || ''} onChange={e => setCreateForm({...createForm, description: e.target.value})} placeholder="Brief description of your project..." />
      </div>

      <div style={{ borderTop: '1px solid var(--color-outline-variant)', paddingTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            Add Members — max {announcement.groupSizeMax - 1} more ({announcement.groupSizeMax} including you)
          </div>
          <span className="badge badge-info">{selectedMembers.length}/{announcement.groupSizeMax - 1}</span>
        </div>

        {selectedMembers.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {selectedMembers.map(id => {
              const s = availableStudents.find(x => x.id === id);
              return s ? (
                <span key={id} className="badge badge-active" style={{ gap: 4, display: 'inline-flex', alignItems: 'center' }}>
                  {s.firstName} {s.lastName}
                  <span onClick={() => removeMember(id)} style={{ cursor: 'pointer', marginLeft: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                  </span>
                </span>
              ) : null;
            })}
          </div>
        )}

        <div className="sup-dropdown-trigger" ref={memberRef}>
          <div className="sup-search-wrapper" onClick={() => setMemberOpen(true)}>
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="Search students by name or roll number..."
              value={memberSearch}
              onChange={e => { setMemberSearch(e.target.value); setMemberOpen(true); }}
              onFocus={() => setMemberOpen(true)}
              style={{ flex: 1 }}
            />
            {memberOpen && (
              <span className="material-symbols-outlined sup-dropdown-arrow">arrow_drop_up</span>
            )}
          </div>
          {memberOpen && (
            <div className="sup-dropdown" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {inviteLoading ? (
                <div className="sup-dropdown-empty">Loading students...</div>
              ) : filtered.length > 0 ? (
                filtered.map(s => (
                  <div key={s.id} className="sup-dropdown-item" onClick={() => selectMember(s)}>
                    <div className="sup-dropdown-item-avatar">{s.firstName?.[0]}{s.lastName?.[0]}</div>
                    <div className="sup-dropdown-item-info">
                      <div className="sup-dropdown-item-name">{s.firstName} {s.lastName}</div>
                      <div className="sup-dropdown-item-email">{s.rollNumber || s.email} · {s.program?.code || '—'}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="sup-dropdown-empty" style={{ padding: 16, textAlign: 'center' }}>
                  No students found.{availableStudents.length === 0 ? ' Click "Reload" below to load your program mates.' : ''}
                </div>
              )}
            </div>
          )}
        </div>

        <button className="btn btn-sm btn-outline" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }} onClick={loadAvailableStudents} disabled={inviteLoading}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{inviteLoading ? 'sync' : 'refresh'}</span>
          {inviteLoading ? 'Loading...' : 'Reload Program Students'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--color-outline-variant)', paddingTop: 16 }}>
        <button className="btn btn-primary" onClick={onCreate} disabled={selectedMembers.length > announcement.groupSizeMax - 1}>
          <span className="material-symbols-outlined">add</span> Create Group
        </button>
        <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function StudentGroups() {
  const [eligible, setEligible] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [available, setAvailable] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnn, setSelectedAnn] = useState(null);
  const [createForm, setCreateForm] = useState({ name: '', projectTitle: '', description: '' });
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [eRes, gRes, aRes, iRes] = await Promise.all([
        api.get('/announcements/eligible'),
        api.get('/student-groups'),
        api.get('/student-groups/available'),
        api.get('/student-groups/invitations'),
      ]);
      setEligible(eRes.data);
      setMyGroups(gRes.data);
      setAvailable(aRes.data);
      setInvitations(iRes.data);
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, []);

  const handleCreate = async () => {
    if (!selectedAnn) return;
    try {
      await api.post('/student-groups', {
        announcementId: selectedAnn.id,
        name: createForm.name.trim() || undefined,
        projectTitle: createForm.projectTitle.trim() || undefined,
        description: createForm.description?.trim() || undefined,
        programId: user.programId,
        memberIds: selectedMembers,
      });
      toast.success('Group created!');
      setSelectedAnn(null);
      setCreateForm({ name: '', projectTitle: '', description: '' });
      setSelectedMembers([]);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create group');
    }
  };

  const loadAvailableStudents = async () => {
    if (!user.programId) { toast.warning('No program assigned'); return; }
    const batchYear = user.rollNumber?.slice(0, 3);
    setInviteLoading(true);
    try {
      const { data } = await api.get(`/student-groups/students-by-program?programId=${user.programId}&year=${batchYear}`);
      setAvailableStudents(data.filter(s => s.id !== user.id));
    } catch (e) {
      toast.error('Failed to load students');
      console.error(e);
    } finally {
      setInviteLoading(false);
    }
  };

  const filteredStudents = availableStudents.filter(s =>
    `${s.firstName} ${s.lastName} ${s.rollNumber || ''}`.toLowerCase().includes(inviteSearch.toLowerCase())
  );

  const handleJoin = async (groupId) => {
    try {
      await api.post(`/student-groups/${groupId}/join`);
      toast.success('Joined group!');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to join');
    }
  };

  const handleInvite = async (groupId, inviteeId) => {
    try {
      await api.post(`/student-groups/${groupId}/invite`, { inviteeId });
      toast.success('Invitation sent!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to invite');
    }
  };

  const handleRespond = async (invitationId, action) => {
    try {
      await api.put(`/student-groups/invitations/${invitationId}`, { action });
      toast.success(action === 'ACCEPT' ? 'Invitation accepted!' : 'Declined');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Delete this group? This action cannot be undone.')) return;
    try {
      await api.delete(`/student-groups/${groupId}`);
      toast.success('Group deleted');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete group');
    }
  };

  const eligibleForGroup = eligible.filter(a => a.allowGroupFormation && !a.alreadyInAGroup);
  const myEligible = eligible.filter(a => a.allowGroupFormation && a.alreadyInAGroup);

  return (
    <ErrorBoundary>
      <PageLayout title="Group Formation" subtitle="Create or join project groups" user={user}>
        {loading ? (
          <div className="loading-state"><span className="material-symbols-outlined spin">progress_activity</span><p>Loading...</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Invitations */}
            {invitations.length > 0 && (
              <div className="card">
                <div className="card-header"><h3 style={{ margin: 0 }}>Pending Invitations ({invitations.length})</h3></div>
                {invitations.map(inv => (
                  <div key={inv.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <strong>{inv.group.name}</strong>
                      <div style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>Invited by {inv.inviter?.firstName} {inv.inviter?.lastName}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-sm btn-primary" onClick={() => handleRespond(inv.id, 'ACCEPT')}>Accept</button>
                      <button className="btn btn-sm btn-outline" onClick={() => handleRespond(inv.id, 'DECLINE')}>Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Eligible announcements for creating groups */}
            {eligibleForGroup.length > 0 && (
              <div className="card">
                <div className="card-header"><h3 style={{ margin: 0 }}>Open for Group Formation</h3></div>
                {eligibleForGroup.map(a => (
                  <div key={a.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <strong>{a.title}</strong>
                      <div style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>{a.message}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span className={`badge badge-${a.type === 'THESIS' ? 'warning' : 'info'}`}>{TYPE_LABELS[a.type]}</span>
                          <span>Max {a.groupSizeMax} members</span>
                          <span>{a.academicYear?.year || '—'}</span>
                          {a.program?.code && <span>{a.program.code}</span>}
                        </div>
                    </div>
                    {selectedAnn?.id === a.id ? (
                      <CreateGroupForm
                        announcement={a}
                        user={user}
                        createForm={createForm}
                        setCreateForm={setCreateForm}
                        selectedMembers={selectedMembers}
                        setSelectedMembers={setSelectedMembers}
                        availableStudents={availableStudents}
                        loadAvailableStudents={loadAvailableStudents}
                        inviteLoading={inviteLoading}
                        onCreate={handleCreate}
                        onCancel={() => { setSelectedAnn(null); setCreateForm({ name: '', projectTitle: '' }); setSelectedMembers([]); }}
                      />
                    ) : (
                      <button className="btn btn-sm btn-primary" onClick={() => { setSelectedAnn(a); setCreateForm({ name: `Group of ${user.firstName}`, projectTitle: a.title }); }}>
                        <span className="material-symbols-outlined">group_add</span> Create Group
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* My existing groups */}
            {myGroups.length > 0 && (
              <div className="card">
                <div className="card-header"><h3 style={{ margin: 0 }}>My Groups ({myGroups.length})</h3></div>
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th>Name</th><th>Title</th><th>Type</th><th>Members</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                    <tbody>
                      {myGroups.map(g => (
                        <tr key={g.id}>
                          <td>{g.name}</td>
                          <td style={{ color: 'var(--color-on-surface-variant)' }}>{g.projectTitle}</td>
                          <td><span className={`badge badge-${g.projectType === 'MAJOR' ? 'warning' : 'info'}`}>{g.projectType}</span></td>
                          <td style={{ fontSize: 13 }}>{g.members?.map(m => `${m.student?.firstName} ${m.student?.lastName}`).join(', ')}</td>
                          <td><span className={`badge badge-${g.status?.toLowerCase() || 'pending'}`}><span className="dot" />{g.status}</span></td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                              {g.status === 'PENDING' && g.members?.[0]?.student?.id === user.id && (
                                <button className="icon-btn danger" title="Delete Group" onClick={() => handleDeleteGroup(g.id)}>
                                  <span className="material-symbols-outlined">delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Available groups to join */}
            {available.length > 0 && (
              <div className="card">
                <div className="card-header"><h3 style={{ margin: 0 }}>Open Groups to Join ({available.length})</h3></div>
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th>Group</th><th>Members</th><th>Slots</th><th></th></tr></thead>
                    <tbody>
                      {available.map(g => (
                        <tr key={g.id}>
                          <td>
                            <strong>{g.name}</strong>
                            <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>{g.projectTitle}</div>
                          </td>
                          <td style={{ fontSize: 13 }}>{g.members?.map(m => `${m.student?.firstName} ${m.student?.lastName}`).join(', ')}</td>
                          <td><span className="badge badge-active">{g.slotsRemaining} left</span></td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-sm btn-primary" onClick={() => handleJoin(g.id)}>
                              <span className="material-symbols-outlined">group_add</span> Join
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Announcements I already have a group for */}
            {myEligible.length > 0 && (
              <div className="card">
                <div className="card-header"><h3 style={{ margin: 0 }}>Announcements (Already in a Group)</h3></div>
                {myEligible.map(a => (
                  <div key={a.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-outline-variant)' }}>
                    <strong>{a.title}</strong>
                    <span style={{ marginLeft: 10 }}><span className="badge badge-completed"><span className="dot" />Already in a group</span></span>
                  </div>
                ))}
              </div>
            )}

            {eligible.length === 0 && myGroups.length === 0 && invitations.length === 0 && (
              <div className="empty-state" style={{ padding: 60 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }}>groups</span>
                <h3>No Group Opportunities</h3>
                <p>The coordinator has not opened group formation yet. Check back later.</p>
              </div>
            )}
          </div>
        )}
      </PageLayout>
    </ErrorBoundary>
  );
}

export default StudentGroups;
