import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from './ui';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import CommandPalette from './CommandPalette';

const ROLE_LABEL = {
  maintainer: 'Maintainer', coordinator: 'Coordinator', supervisor: 'Supervisor',
  student: 'Student', external: 'External Examiner', profile: 'Profile',
};

const SECTION_LABEL = {
  users: 'User Management', departments: 'Departments', bachelor: 'Bachelor Projects',
  master: "Master's Thesis", theses: 'Theses', projects: 'Projects', groups: 'Groups',
  submissions: 'Submissions', evaluations: 'Evaluations', supervisors: 'Supervisors',
  examiners: 'Examiners', 'audit-log': 'Audit Log', announcements: 'Announcements',
  notifications: 'Notifications', project: 'Project', staff: 'Staff',
};

function buildCrumbs(pathname, pageTitle) {
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 0) return [{ label: 'Home', to: '/' }];
  const crumbs = [{ label: ROLE_LABEL[segs[0]] || 'Home', to: '/' + segs[0] }];
  for (let i = 1; i < segs.length; i++) {
    const isLast = i === segs.length - 1;
    const label = isLast
      ? (pageTitle || SECTION_LABEL[segs[i]] || decodeURIComponent(segs[i]).replace(/%20/g, ' '))
      : (SECTION_LABEL[segs[i]] || decodeURIComponent(segs[i]).replace(/%20/g, ' '));
    crumbs.push({ label, to: isLast ? pathname : '/' + segs.slice(0, i + 1).join('/') });
  }
  return crumbs;
}

function PageLayout({ children, title, subtitle, actions, user }) {
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('tpms-theme') === 'dark');
  const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');

  const crumbs = title ? buildCrumbs(pathname, title) : [];

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    try {
      localStorage.setItem('tpms-theme', next ? 'dark' : 'light');
      document.body.classList.toggle('dark', next);
    } catch (_) { /* ignore */ }
  };

  return (
    <div className="app-layout">
      {/* Sidebar gets the toggle state and the closing handler */}
      <Sidebar user={currentUser} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} user={currentUser} />
      
      <div className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            {/* Hamburger Button: Visible on mobile, hidden on desktop */}
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Icon name="menu" className="material-symbols-outlined" />
            </button>
            
            {/* Quick Command Palette trigger */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)',
                borderRadius: 'var(--border-radius-md)', color: 'var(--color-on-surface-variant)',
                fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              <Icon name="search" className="material-symbols-outlined" style={{ fontSize: 18 }} />
              <span>Search or type <kbd style={{ fontSize: 10, background: 'var(--color-surface-container)', padding: '1px 5px', borderRadius: 3 }}>Ctrl K</kbd></span>
            </button>
          </div>
          <div className="top-bar-actions">
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label="Toggle dark mode"
            >
              <Icon name={dark ? 'light_mode' : 'dark_mode'} className="material-symbols-outlined" />
            </button>
            <NotificationBell />
            {actions}
          </div>
        </header>

        <main className="page-content">
          {crumbs.length > 0 && (
            <nav aria-label="Breadcrumb" style={{
              display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4,
              marginBottom: 10, fontSize: 12, color: 'var(--color-on-surface-variant)',
            }}>
              {crumbs.map((c, i) => (
                <React.Fragment key={c.to + i}>
                  {i > 0 && (
                    <Icon name="chevron_right" className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--color-outline)' }} />
                  )}
                  {i === crumbs.length - 1 ? (
                    <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{c.label}</span>
                  ) : (
                    <Link
                      to={c.to}
                      style={{ color: 'var(--color-on-surface-variant)', textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-on-surface-variant)')}
                    >
                      {c.label}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}
          {(title || subtitle) && (
            <div className="page-header">
              <h1>
                <Icon name={title === 'Dashboard' ? 'dashboard' : 'folder'} className="material-symbols-outlined" />
                {title}
              </h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

export default PageLayout;