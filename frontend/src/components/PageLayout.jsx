import React, { useState } from 'react';
import Sidebar from './Sidebar';

function PageLayout({ children, title, subtitle, actions, user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="app-layout">
      {/* Sidebar gets the toggle state and the closing handler */}
      <Sidebar user={currentUser} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            {/* Hamburger Button: Visible on mobile, hidden on desktop */}
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            
            {/* Optional text or element inside topbar left can go here if needed */}
          </div>
          <div className="top-bar-actions">
            {actions}
          </div>
        </header>

        <main className="page-content">
          {(title || subtitle) && (
            <div className="page-header">
              <h1>
                <span className="material-symbols-outlined">
                  {title === 'Dashboard' ? 'dashboard' : 'folder'}
                </span>
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