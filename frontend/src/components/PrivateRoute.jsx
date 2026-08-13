import React from 'react';
import { Navigate } from 'react-router-dom';

function PrivateRoute({ children, role }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) return <Navigate to="/login" />;
  const allowed = Array.isArray(role) ? role : (role ? [role] : null);
  if (allowed && !allowed.includes(user.role)) {
    const rolePath = user.role === 'EXTERNAL_EXAMINER' ? 'external' : user.role.toLowerCase();
    return <Navigate to={`/${rolePath}`} />;
  }
  return children;
}

export default PrivateRoute;
