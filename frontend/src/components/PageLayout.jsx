import React from 'react';
import Sidebar from './Sidebar';

function PageLayout({ children, title, subtitle, actions, user }) {
  const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="app-layout">
      <Sidebar user={currentUser} />
      <div className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            <h1>{title}</h1>
          </div>
          <div className="top-bar-actions">
            {actions}
          </div>
        </header>
        <main className="page-content">
          {(title || subtitle) && (
            <div className="page-header">
              <h1>
                <span className="material-symbols-outlined">{title === 'Dashboard' ? 'dashboard' : 'folder'}</span>
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
