import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from './ui';
import { useLayout } from './AppLayout';

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

function PageLayout({ children, title, subtitle, actions, headerActions }) {
  const { pathname } = useLocation();
  const { setActions } = useLayout();

  useEffect(() => {
    setActions(actions || null);
    return () => setActions(null);
  }, [actions, setActions]);

  const crumbs = title ? buildCrumbs(pathname, title) : [];

  return (
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
      {(title || subtitle || headerActions) && (
        <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1>
              <Icon name={title === 'Dashboard' ? 'dashboard' : 'folder'} className="material-symbols-outlined" />
              {title}
            </h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}
      {children}
    </main>
  );
}

export default PageLayout;
