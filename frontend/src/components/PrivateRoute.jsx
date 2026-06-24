import React from 'react';
import { Navigate } from 'react-router-dom';

function PrivateRoute({ children, role }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');
  if (!token || !user) return <Navigate to="/login" />;
  if (role && user.role !== role) {
    const rolePath = user.role === 'EXTERNAL_EXAMINER' ? 'external' : user.role.toLowerCase();
    return <Navigate to={`/${rolePath}`} />;
  }
  return children;
}

export default PrivateRoute;
