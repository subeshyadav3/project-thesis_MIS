import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import ErrorBoundary from '../../components/ErrorBoundary';
import { Link } from 'react-router-dom';

const TYPE_LABELS = { GENERAL: 'General', MINOR: 'Minor Project', MAJOR: 'Major Project', THESIS: 'Thesis' };

function StudentGroups() {
  const [eligible, setEligible] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [available, setAvailable] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnn, setSelectedAnn] = useState(null);
  const [createForm, setCreateForm] = useState({ name: '', projectTitle: '' });
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
      });
      toast.success('Group created!');
      setSelectedAnn(null);
      setCreateForm({ name: '', projectTitle: '' });
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create group');
    }
  };

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
                      <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>
                        <span className={`badge badge-${a.type === 'THESIS' ? 'warning' : 'info'}`}>{TYPE_LABELS[a.type]}</span>
                        &nbsp;Max {a.groupSizeMax} members &middot; {a.academicYear?.year || '—'}
                      </div>
                    </div>
                    {selectedAnn?.id === a.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 250 }}>
                        <input className="form-input" placeholder="Optional group name" value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} />
                        <input className="form-input" placeholder="Optional project title" value={createForm.projectTitle} onChange={e => setCreateForm({...createForm, projectTitle: e.target.value})} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-sm btn-primary" onClick={handleCreate}><span className="material-symbols-outlined">add</span> Create</button>
                          <button className="btn btn-sm btn-outline" onClick={() => setSelectedAnn(null)}>Cancel</button>
                        </div>
                      </div>
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
                    <thead><tr><th>Name</th><th>Title</th><th>Type</th><th>Members</th><th>Status</th></tr></thead>
                    <tbody>
                      {myGroups.map(g => (
                        <tr key={g.id}>
                          <td>{g.name}</td>
                          <td style={{ color: 'var(--color-on-surface-variant)' }}>{g.projectTitle}</td>
                          <td><span className={`badge badge-${g.projectType === 'MAJOR' ? 'warning' : 'info'}`}>{g.projectType}</span></td>
                          <td style={{ fontSize: 13 }}>{g.members?.map(m => `${m.student?.firstName} ${m.student?.lastName}`).join(', ')}</td>
                          <td><span className={`badge badge-${g.status?.toLowerCase() || 'pending'}`}><span className="dot" />{g.status}</span></td>
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
