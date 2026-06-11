import React from 'react';
import { Navigate } from 'react-router-dom';

function PrivateRoute({ children, role }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');
  if (!token || !user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to={`/${user.role.toLowerCase()}`} />;
  return children;
}

export default PrivateRoute;
