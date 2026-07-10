import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

function Sidebar({ user, isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('user');
    navigate('/login'); 
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/') ? 'active' : '';

  const maintainerLinks = [
    { path: '/maintainer', label: 'Dashboard', icon: 'dashboard' },
    { path: '/maintainer/users', label: 'User Management', icon: 'groups' },
    { path: '/maintainer/departments', label: 'Departments', icon: 'account_balance' },
  ];

  const coordinatorLinks = [
    { path: '/coordinator', label: 'Dashboard', icon: 'dashboard' },
    { path: '/coordinator/bachelor', label: 'Bachelor Projects', icon: 'school' },
    { path: '/coordinator/master', label: "Master's Thesis", icon: 'library_books' },
    { path: '/coordinator/evaluations', label: 'Evaluations', icon: 'grading' },
    { path: '/coordinator/supervisors', label: 'Supervisors', icon: 'supervisor_account' },
    { path: '/coordinator/examiners', label: 'Examiners', icon: 'person' },
    { path: '/coordinator/users', label: 'Users', icon: 'groups' },
    { path: '/coordinator/announcements', label: 'Announcements', icon: 'campaign' },
    { path: '/coordinator/audit-log', label: 'Audit Log', icon: 'history' },
    { path: '/coordinator/notifications', label: 'Notifications', icon: 'notifications' },
  ];

  const supervisorLinks = [
    { path: '/supervisor', label: 'Dashboard', icon: 'dashboard' },
    { path: '/supervisor/bachelor', label: 'Bachelor Projects', icon: 'school' },
    { path: '/supervisor/master', label: "Master's Thesis", icon: 'library_books' },
    { path: '/supervisor/notifications', label: 'Notifications', icon: 'notifications' },
  ];

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const sType = storedUser?.degreeType === 'BACHELOR' ? 'bachelor' : storedUser?.degreeType === 'MASTER' ? 'master' : storedUser?.studentType;

  const studentLinks = [
    { path: '/student', label: 'Dashboard', icon: 'dashboard' },
    ...(sType === 'bachelor'
      ? [{ path: '/student/projects', label: 'Projects', icon: 'school' }]
      : sType === 'master'
        ? [{ path: '/student/theses', label: 'Theses', icon: 'library_books' }]
        : [
            { path: '/student/projects', label: 'Projects', icon: 'school' },
            { path: '/student/theses', label: 'Theses', icon: 'library_books' },
          ]
    ),
    { path: '/student/groups', label: 'Groups', icon: 'group_add' },
    { path: '/student/submissions', label: 'Submissions', icon: 'upload_file' },
    { path: '/student/notifications', label: 'Notifications', icon: 'notifications' },
  ];

  const externalLinks = [
    { path: '/external', label: 'Dashboard', icon: 'dashboard' },
    { path: '/external/evaluations', label: 'Evaluations', icon: 'grading' },
    { path: '/external/notifications', label: 'Notifications', icon: 'notifications' },
  ];

  const links = user?.role === 'MAINTAINER' ? maintainerLinks
    : user?.role === 'COORDINATOR' ? coordinatorLinks
    : user?.role === 'SUPERVISOR' ? supervisorLinks
    : user?.role === 'STUDENT' ? studentLinks
    : user?.role === 'EXTERNAL_EXAMINER' ? externalLinks
    : [];

  return (
    <>
      {/* Backdrop Mobile Overlay: Clicking outside the sidebar automatically triggers onClose */}
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Sidebar Container: Dynamically receives '.open' layout state */}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-area">
            <img src="https://ioe.tu.edu.np/assets/logo.png" alt="IOE Logo" className="sidebar-logo" />
            <div className="logo-text">
              <h2>TPMS</h2>
              <p>Thesis/Project Management System</p>
            </div>
          </div>
          {/* Close button visible only inside mobile viewports */}
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <ul className="sidebar-nav">
          {links.map((link) => (
            <li key={link.path}>
              {/* Added onClose trigger to menu links so drawer rolls away upon selecting pages */}
              <Link to={link.path} className={isActive(link.path)} onClick={onClose}>
                <span className="material-symbols-outlined">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          <div className="sidebar-profile" onClick={() => { navigate('/profile'); onClose && onClose(); }}>
            <div className="sidebar-profile-avatar">
              {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
            </div>
            <div className="sidebar-profile-info">
              <div className="sidebar-profile-name">{user?.firstName} {user?.lastName}</div>
              <div className="sidebar-profile-email">{user?.email || ''}</div>
            </div>
            <span className="material-symbols-outlined sidebar-profile-arrow">chevron_right</span>
          </div>
          <button className="sidebar-logout-btn" onClick={() => setShowLogoutConfirm(true)}>
            <span className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </button>
        </div>

        {showLogoutConfirm && (
          <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
              <div className="modal-header">
                <div className="modal-header-icon danger">
                  <span className="material-symbols-outlined">logout</span>
                </div>
                <div className="modal-header-text">
                  <h2>Confirm Logout</h2>
                  <p>Are you sure you want to sign out?</p>
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-outline" onClick={() => setShowLogoutConfirm(false)}>
                  <span className="material-symbols-outlined">close</span>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleLogout}>
                  <span className="material-symbols-outlined">logout</span>
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Sidebar;