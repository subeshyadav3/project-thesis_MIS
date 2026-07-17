import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

function StudentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

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
    const reason = prompt('Please provide a reason for rejection:');
    if (reason === null) return;
    try {
      await api.put(`/assignment-requests/${requestId}/reject`, { rejectReason: reason || 'No reason provided' });
      toast.success('Request rejected.');
      setPendingRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'REJECTED' } : r));
      loadNotifications();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject request');
    }
  };

  return (
    <PageLayout title="Notifications" subtitle="Stay updated with your project/thesis activity" user={user}
      actions={notifications.some(n => !n.read) ? (
        <button className="btn btn-outline btn-sm" onClick={markAllRead}>
          <span className="material-symbols-outlined">done_all</span>
          Mark all read
        </button>
      ) : undefined}
    >
      {loading ? (
        <div className="loading-state"><span className="material-symbols-outlined">progress_activity</span><p>Loading notifications...</p></div>
      ) : notifications.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }}>notifications_off</span>
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
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: n.read ? 'var(--color-on-surface-variant)' : 'var(--color-primary)' }}>
                {n.read ? 'check_circle' : 'notifications'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: n.read ? 400 : 600 }}>{n.message}</div>
                <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>
                  {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString()}
                </div>
              </div>
              {!n.read && (
                <button className="btn btn-sm btn-outline" onClick={() => markRead(n.id)}>
                  <span className="material-symbols-outlined">check</span>
                  Mark as read
                </button>
              )}
              {n.type === 'CROSS_PROGRAM_REQUEST' && user.role === 'COORDINATOR' && (() => {
                const req = pendingRequests.find(r => r.notificationId === n.id && r.status === 'PENDING');
                if (!req) return null;
                return (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-sm btn-success" onClick={() => handleApprove(req.id)}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                      Approve
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleReject(req.id)}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                      Reject
                    </button>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}

export default StudentNotifications;
