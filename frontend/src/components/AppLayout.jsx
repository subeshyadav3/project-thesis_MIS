import React, { createContext, useContext, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import { Icon } from './ui';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import CommandPalette from './CommandPalette';

const LayoutContext = createContext({ actions: null, setActions: () => {} });
export const useLayout = () => useContext(LayoutContext);

const contentFallback = (
  <div className="route-loading">
    <div className="route-loading-bar" />
    <div className="route-loading-text">
      <Icon name="progress_activity" className="material-symbols-outlined" />
      Loading…
    </div>
  </div>
);

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [actions, setActions] = useState(null);
  const [dark, setDark] = useState(() => localStorage.getItem('tpms-theme') === 'dark');
  const { pathname } = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setActions(null);
  }, [pathname]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    try {
      localStorage.setItem('tpms-theme', next ? 'dark' : 'light');
      document.body.classList.toggle('dark', next);
    } catch (_) { /* ignore */ }
  };

  return (
    <LayoutContext.Provider value={{ actions, setActions }}>
      <div className="app-layout">
        <Sidebar user={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} user={user} />

        <div className="main-content">
          <header className="top-bar">
            <div className="top-bar-left">
              <button
                className="hamburger-btn"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Icon name="menu" className="material-symbols-outlined" />
              </button>

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

          <Suspense fallback={contentFallback}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </LayoutContext.Provider>
  );
}

export default AppLayout;
