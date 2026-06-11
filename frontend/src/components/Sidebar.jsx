import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function Sidebar({ user }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/') ? 'active' : '';

  const maintainerLinks = [
    { path: '/maintainer', label: 'Dashboard', exact: true },
    { path: '/maintainer/users', label: 'User Management' },
    { path: '/maintainer/departments', label: 'Departments' },
  ];

  const coordinatorLinks = [
    { path: '/coordinator', label: 'Dashboard', exact: true },
    { path: '/coordinator/bachelor', label: 'Bachelor Projects' },
    { path: '/coordinator/master', label: "Master's Thesis" },
    { path: '/coordinator/evaluations', label: 'Evaluations' },
  ];

  const supervisorLinks = [
    { path: '/supervisor', label: 'Dashboard', exact: true },
  ];

  const links = user?.role === 'MAINTAINER' ? maintainerLinks
    : user?.role === 'COORDINATOR' ? coordinatorLinks
    : user?.role === 'SUPERVISOR' ? supervisorLinks
    : [];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>University TM</h2>
        <p>{user?.firstName} {user?.lastName} ({user?.role})</p>
      </div>
      <ul className="sidebar-nav">
        {links.map((link) => (
          <li key={link.path}>
            <Link to={link.path} className={isActive(link.path)}>
              {link.label}
            </Link>
          </li>
        ))}
        <li><button onClick={handleLogout}>Logout</button></li>
      </ul>
    </div>
  );
}

export default Sidebar;
