import React, { useState } from 'react';
import { Icon } from './ui';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import CommandPalette from './CommandPalette';

function PageLayout({ children, title, subtitle, actions, user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('tpms-theme') === 'dark');
  const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');

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