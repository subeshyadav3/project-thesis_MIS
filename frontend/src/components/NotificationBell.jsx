import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const TYPE_ICON = {
  PROPOSAL_UPLOAD: 'upload_file',
  MARKS_SUBMITTED: 'grading',
  EXAMINER_ASSIGNMENT: 'person_apron',
  SUPERVISOR_ASSIGNMENT: 'supervisor_account',
  STATUS_CHANGE: 'swap_horiz',
  BULK_ANNOUNCEMENT: 'campaign',
  GROUP_FORMATION_OPENED: 'group_add',
  GROUP_INVITATION: 'person_add',
  GROUP_INVITATION_ACCEPTED: 'check',
  GROUP_MEMBER_JOINED: 'group_add',
  CROSS_PROGRAM_REQUEST: 'contact_support',
  CROSS_PROGRAM_APPROVED: 'check_circle',
  CROSS_PROGRAM_REJECTED: 'cancel',
  CROSS_PROGRAM_THESIS: 'swap_horiz',
  CROSS_PROGRAM_THESIS_APPROVED: 'check_circle',
  CROSS_PROGRAM_THESIS_REJECTED: 'cancel',
};

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchUnread = () => {
    api.get('/notifications/unread-count').then(({ data }) => setUnreadCount(data.count || 0)).catch(() => {});
  };

  const fetchAll = () => {
    setLoading(true);
    api.get('/notifications').then(({ data }) => {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000); // poll every 15s
    const onFocus = () => fetchUnread();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    if (open && notifications.length === 0) fetchAll();
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <div className="notification-dropdown-title">Notifications</div>
            {unreadCount > 0 && (
              <button className="notification-mark-all" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-dropdown-body">
            {loading ? (
              <div className="notification-loading">
                <span className="material-symbols-outlined spin">progress_activity</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--color-outline)' }}>notifications_off</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 20).map(n => (
                <div
                  key={n.id}
                  className={`notification-item ${n.read ? 'read' : 'unread'} ${!n.read && (n.type === 'CROSS_PROGRAM_THESIS_REJECTED' || n.type === 'CROSS_PROGRAM_REJECTED') ? 'notification-item-rejected' : ''}`}
                  onClick={() => { if (!n.read) handleMarkRead(n.id, { stopPropagation: () => {} }); }}
                >
                  <div className="notification-item-icon">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {TYPE_ICON[n.type] || 'info'}
                    </span>
                  </div>
                  <div className="notification-item-content">
                    <p className="notification-item-text">{n.message}</p>
                    <span className="notification-item-time">{formatTime(n.createdAt)}</span>
                  </div>
                  {!n.read && <span className="notification-item-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
