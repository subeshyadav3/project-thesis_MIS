import React from 'react';
import { useNavigate } from 'react-router-dom';

function NotFound() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: 24, textAlign: 'center',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 80, color: 'var(--color-error)', marginBottom: 16 }}>
        error
      </span>
      <h1 style={{ margin: 0, fontSize: 72, fontWeight: 800, color: 'var(--color-primary)' }}>404</h1>
      <p style={{ fontSize: 18, color: 'var(--color-on-surface-variant)', marginTop: 8 }}>
        {user?.role === 'COORDINATOR' ? 'This section is not available for your program.' : 'Page not found.'}
      </p>
      <button className="btn btn-primary" onClick={() => navigate(user?.role ? '/' + user.role.toLowerCase().replace('_', '-') : '/login')} style={{ marginTop: 16 }}>
        <span className="material-symbols-outlined">arrow_back</span>
        Go to Dashboard
      </button>
    </div>
  );
}

export default NotFound;
