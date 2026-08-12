import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/ui';
import PageLayout from '../../components/PageLayout';
import CrossProgramReviewModal from '../../components/CrossProgramReviewModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

function StudentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [reviewThesisId, setReviewThesisId] = useState(null);
  const [confirmRejectNotif, setConfirmRejectNotif] = useState(null);
  const [crossTheses, setCrossTheses] = useState(null);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadCrossTheses = () => {
    if (user.role !== 'COORDINATOR') return;
    api.get('/theses')
      .then(({ data }) => setCrossTheses(data))
      .catch(() => {});
  };

  useEffect(() => { loadCrossTheses(); }, []);

  const pendingCrossIds = new Set((crossTheses || []).filter(t => t.crossProgramRequestedBy).map(t => t.id));
  const knownCrossIds = new Set((crossTheses || []).map(t => t.id));
  const crossStatus = (n) => {
    const id = parseThesisId(n);
    if (!id || crossTheses === null) return null;
    if (pendingCrossIds.has(id)) return 'pending';
    if (knownCrossIds.has(id)) return 'approved';
    return 'rejected';
  };

  const parseThesisId = (n) => {
    const m = (n.linkTo || '').match(/\/theses\/(\d+)/);
    return m ? parseInt(m[1]) : null;
  };

  const handleCrossDecision = async (n, action) => {
    const id = parseThesisId(n);
    if (!id) {
      toast.error('This request is no longer available');
      setConfirmRejectNotif(null);
      return;
    }
    try {
      await api.put(`/theses/${id}/${action === 'approve' ? 'approve' : 'reject'}-cross-program`);
      toast.success(action === 'approve' ? 'Cross-program thesis approved' : 'Cross-program thesis rejected');
      await api.put(`/notifications/${n.id}/read`).catch(() => {});
      loadNotifications();
      loadCrossTheses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setConfirmRejectNotif(null);
    }
  };

  const loadNotifications = () => {
    setLoading(true);
    api.get('/notifications')
      .then(({ data }) => setNotifications(data))
      .catch((err) => { toast.error(err.response?.data?.error || 'Failed to load notifications'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadNotifications(); }, []);

  useEffect(() => {
    if (user.role === 'COORDINATOR') {
      api.get('/assignment-requests')
        .then(({ data }) => setPendingRequests(data))
        .catch(() => {});
    }
  }, []);

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      toast.success('Marked as read');
      loadNotifications();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to mark as read');
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      toast.success('All notifications marked as read');
      loadNotifications();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await api.put(`/assignment-requests/${requestId}/approve`);
      toast.success('Request approved. Supervisor assigned to thesis.');
      setPendingRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'APPROVED' } : r));
      loadNotifications();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve request');
    }
  };

  const handleReject = async (requestId) => {
    setRejectSubmitting(true);
    try {
      await api.put(`/assignment-requests/${requestId}/reject`, { rejectReason: rejectReason.trim() || 'No reason provided' });
      toast.success('Request rejected.');
      setPendingRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'REJECTED' } : r));
      loadNotifications();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject request');
    } finally {
      setRejectSubmitting(false);
      setRejectingId(null);
      setRejectReason('');
    }
  };

  return (
    <PageLayout title="Notifications" subtitle="Stay updated with your project/thesis activity" user={user}
      actions={notifications.some(n => !n.read) ? (
        <button className="btn btn-outline btn-sm" onClick={markAllRead}>
          <Icon name="done_all" className="material-symbols-outlined" />
          Mark all read
        </button>
      ) : undefined}
    >
      {loading ? (
        <div className="loading-state"><Icon name="progress_activity" className="material-symbols-outlined" /><p>Loading notifications...</p></div>
      ) : notifications.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <Icon name="notifications_off" className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }} />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map(n => (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 10,
              background: n.read ? 'var(--color-surface-container-low)' : 'var(--color-primary-container)',
              border: `1px solid ${n.read ? 'var(--color-outline-variant)' : 'var(--color-primary)'}`,
              opacity: n.read ? 0.85 : 1
            }}>
              <Icon name={n.read ? 'check_circle' : 'notifications'} className="material-symbols-outlined" style={{ fontSize: 24, color: n.read ? 'var(--color-on-surface-variant)' : 'var(--color-primary)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: n.read ? 400 : 600 }}>{n.message}</div>
                <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>
                  {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString()}
                </div>
              </div>
              {!n.read && (
                <button className="btn btn-sm btn-outline" onClick={() => markRead(n.id)}>
                  <Icon name="check" className="material-symbols-outlined" />
                  Mark as read
                </button>
              )}
              {n.type === 'CROSS_PROGRAM_THESIS' && user.role === 'COORDINATOR' && (() => {
                if (!parseThesisId(n)) return null;
                if (crossStatus(n) === 'pending') {
                  return (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button className="btn btn-sm btn-outline" onClick={() => setReviewThesisId(parseThesisId(n))}>
                        <Icon name="visibility" className="material-symbols-outlined" style={{ fontSize: 16 }} />
                        View
                      </button>
                      <button className="btn btn-sm btn-success" onClick={() => handleCrossDecision(n, 'approve')}>
                        <Icon name="check" className="material-symbols-outlined" style={{ fontSize: 16 }} />
                        Accept
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => setConfirmRejectNotif(n)}>
                        <Icon name="close" className="material-symbols-outlined" style={{ fontSize: 16 }} />
                        Reject
                      </button>
                    </div>
                  );
                }
                if (crossStatus(n) === 'approved') {
                  return (
                    <span className="badge" style={{ background: 'var(--color-success-container)', color: 'var(--color-on-success-container)', flexShrink: 0 }}>
                      <Icon name="check_circle" className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }} /> Approved
                    </span>
                  );
                }
                if (crossStatus(n) === 'rejected') {
                  return (
                    <span className="badge" style={{ background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', flexShrink: 0 }}>
                      <Icon name="cancel" className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }} /> Rejected
                    </span>
                  );
                }
                return null;
              })()}
              {n.type === 'CROSS_PROGRAM_REQUEST' && user.role === 'COORDINATOR' && (() => {
                const req = pendingRequests.find(r => r.notificationId === n.id && r.status === 'PENDING');
                if (!req) return null;
                return (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-sm btn-success" onClick={() => handleApprove(req.id)}>
                      <Icon name="check" className="material-symbols-outlined" style={{ fontSize: 16 }} />
                      Approve
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => { setRejectingId(req.id); setRejectReason(''); }}>
                      <Icon name="close" className="material-symbols-outlined" style={{ fontSize: 16 }} />
                      Reject
                    </button>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {rejectingId && (
        <div className="modal-overlay" onClick={() => setRejectingId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div className="modal-header-icon danger"><Icon name="block" className="material-symbols-outlined" /></div>
              <div className="modal-header-text">
                <h2>Reject request</h2>
                <p>Provide a reason before rejecting this cross-program assignment request.</p>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Reason (optional)</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Supervisor already at full load"
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setRejectingId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleReject(rejectingId)} disabled={rejectSubmitting}>
                <Icon name={rejectSubmitting ? 'progress_activity' : 'close'} className="material-symbols-outlined" />
                {rejectSubmitting ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewThesisId && (
        <CrossProgramReviewModal
          thesisId={reviewThesisId}
          onClose={() => setReviewThesisId(null)}
          onDecision={() => { loadNotifications(); loadCrossTheses(); }}
        />
      )}

      <ConfirmDialog
        open={!!confirmRejectNotif}
        title="Reject cross-program thesis?"
        message="Rejecting will delete this thesis and notify the requesting coordinator. This cannot be undone."
        onConfirm={() => handleCrossDecision(confirmRejectNotif, 'reject')}
        onCancel={() => setConfirmRejectNotif(null)}
        confirmLabel="Reject"
        danger
      />
    </PageLayout>
  );
}

export default StudentNotifications;
