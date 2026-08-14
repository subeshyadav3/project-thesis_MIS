import React, { useState, useEffect } from 'react';
import { Icon } from './ui';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function CommandPalette({ isOpen, onClose, user }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const role = user?.role;
        const promises = [];
        const q = query.toLowerCase();

        if (role === 'MAINTAINER') {
          // 1. Search Users
          promises.push(
            api.get('/users').then(({ data }) =>
              (data || [])
                .filter(
                  (u) =>
                    `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
                    u.email.toLowerCase().includes(q) ||
                    (u.rollNumber && u.rollNumber.toLowerCase().includes(q)) ||
                    u.role.toLowerCase().includes(q)
                )
                .slice(0, 4)
                .map((u) => ({
                  id: `user-${u.id}`,
                  title: `${u.firstName} ${u.lastName}`,
                  subtitle: `${u.role}${u.rollNumber ? ` • ${u.rollNumber}` : ''} • ${u.email}`,
                  category: 'User',
                  icon: u.role === 'STUDENT' ? 'school' : u.role === 'SUPERVISOR' ? 'person' : 'badge',
                  path: '/maintainer/users',
                }))
            ).catch(() => [])
          );

          // 2. Search Departments
          promises.push(
            api.get('/departments').then(({ data }) =>
              (data || [])
                .filter((d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q))
                .slice(0, 3)
                .map((d) => ({
                  id: `dept-${d.id}`,
                  title: d.name,
                  subtitle: `Code: ${d.code} • ${d.programs?.length || 0} programs`,
                  category: 'Department',
                  icon: 'account_balance',
                  path: '/maintainer/departments',
                }))
            ).catch(() => [])
          );

          // 3. Search Programs
          promises.push(
            api.get('/departments/programs').then(({ data }) =>
              (data || [])
                .filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
                .slice(0, 3)
                .map((p) => ({
                  id: `prog-${p.id}`,
                  title: p.name,
                  subtitle: `${p.code} (${p.degreeType || 'BACHELOR'}) • ${p.department?.name || 'Department'}`,
                  category: 'Program',
                  icon: 'school',
                  path: '/maintainer/departments',
                }))
            ).catch(() => [])
          );

          // 4. Search Bachelor Groups
          promises.push(
            api.get('/groups').then(({ data }) =>
              (data || [])
                .filter((g) => g.name.toLowerCase().includes(q) || g.projectTitle.toLowerCase().includes(q))
                .slice(0, 3)
                .map((g) => ({
                  id: `group-${g.id}`,
                  title: g.name,
                  subtitle: g.projectTitle,
                  category: 'Bachelor Project',
                  icon: 'group_work',
                  path: '/maintainer',
                }))
            ).catch(() => [])
          );

          // 5. Search Master Theses
          promises.push(
            api.get('/theses').then(({ data }) =>
              (data || [])
                .filter(
                  (t) =>
                    t.title.toLowerCase().includes(q) ||
                    (t.student && `${t.student.firstName} ${t.student.lastName}`.toLowerCase().includes(q))
                )
                .slice(0, 3)
                .map((t) => ({
                  id: `thesis-${t.id}`,
                  title: t.title,
                  subtitle: t.student ? `${t.student.firstName} ${t.student.lastName}` : 'Thesis',
                  category: "Master's Thesis",
                  icon: 'library_books',
                  path: '/maintainer',
                }))
            ).catch(() => [])
          );
        } else if (role === 'COORDINATOR' || role === 'SUPERVISOR') {
          promises.push(
            api.get('/groups').then(({ data }) =>
              (data || [])
                .filter((g) => g.name.toLowerCase().includes(q) || g.projectTitle.toLowerCase().includes(q))
                .slice(0, 4)
                .map((g) => ({
                  id: `group-${g.id}`,
                  title: g.name,
                  subtitle: g.projectTitle,
                  category: 'Bachelor Project',
                  icon: 'school',
                  path: role === 'SUPERVISOR' ? `/supervisor/project/group/${g.id}` : `/coordinator/project/group/${g.id}`,
                }))
            ).catch(() => [])
          );
          promises.push(
            api.get('/theses').then(({ data }) =>
              (data || [])
                .filter(
                  (t) =>
                    t.title.toLowerCase().includes(q) ||
                    (t.student && `${t.student.firstName} ${t.student.lastName}`.toLowerCase().includes(q))
                )
                .slice(0, 4)
                .map((t) => ({
                  id: `thesis-${t.id}`,
                  title: t.title,
                  subtitle: t.student ? `${t.student.firstName} ${t.student.lastName}` : 'Thesis',
                  category: "Master's Thesis",
                  icon: 'library_books',
                  path: role === 'SUPERVISOR' ? `/supervisor/project/thesis/${t.id}` : `/coordinator/project/thesis/${t.id}`,
                }))
            ).catch(() => [])
          );
        }

        const res = await Promise.all(promises);
        setSearchResults(res.flat());
      } catch (_) {
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, user?.role]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults, query]);

  if (!isOpen) return null;

  const role = user?.role;
  const defaultNavigationMap = {
    MAINTAINER: [
      { title: 'Dashboard', subtitle: 'System administration & overview', category: 'Navigation', icon: 'dashboard', path: '/maintainer' },
      { title: 'User Management', subtitle: 'Manage campus students, supervisors & coordinators', category: 'Navigation', icon: 'groups', path: '/maintainer/users' },
      { title: 'Departments', subtitle: 'Manage academic departments & degree programs', category: 'Navigation', icon: 'account_balance', path: '/maintainer/departments' },
      { title: 'Audit Logs', subtitle: 'Track system actions and security logs', category: 'Navigation', icon: 'history', path: '/maintainer/audit-log' },
    ],
    STUDENT: [
      { title: 'Dashboard', category: 'Navigation', icon: 'dashboard', path: '/student' },
      { title: 'Thesis Forms', category: 'Navigation', icon: 'description', path: '/student/forms' },
      { title: 'Project Submission', category: 'Navigation', icon: 'upload_file', path: '/student/submissions' },
      { title: 'Notifications', category: 'Navigation', icon: 'notifications', path: '/student/notifications' },
    ],
    COORDINATOR: [
      { title: 'Dashboard', category: 'Navigation', icon: 'dashboard', path: '/coordinator' },
      { title: "Master's Thesis", category: 'Navigation', icon: 'library_books', path: '/coordinator/master' },
      { title: 'Evaluations', category: 'Navigation', icon: 'grading', path: '/coordinator/evaluations' },
      { title: 'Supervisors', category: 'Navigation', icon: 'supervisor_account', path: '/coordinator/supervisors' },
      { title: 'Announcements', category: 'Navigation', icon: 'campaign', path: '/coordinator/announcements' },
      { title: 'Notifications', category: 'Navigation', icon: 'notifications', path: '/coordinator/notifications' },
    ],
    SUPERVISOR: [
      { title: 'Dashboard', category: 'Navigation', icon: 'dashboard', path: '/supervisor' },
      { title: "Master's Thesis", category: 'Navigation', icon: 'library_books', path: '/supervisor/master' },
      { title: 'Bachelor Projects', category: 'Navigation', icon: 'school', path: '/supervisor/bachelor' },
      { title: 'Notifications', category: 'Navigation', icon: 'notifications', path: '/supervisor/notifications' },
    ],
    EXTERNAL_EXAMINER: [
      { title: 'Dashboard', category: 'Navigation', icon: 'dashboard', path: '/external' },
      { title: 'Evaluations', category: 'Navigation', icon: 'grading', path: '/external/evaluations' },
      { title: 'Notifications', category: 'Navigation', icon: 'notifications', path: '/external/notifications' },
    ],
  };
  const defaultNavigation = defaultNavigationMap[role] || defaultNavigationMap.COORDINATOR;

  const items = query.trim() ? searchResults : defaultNavigation;

  const handleSelect = (item) => {
    navigate(item.path);
    onClose();
  };

  const handleKeyDown = (e) => {
    const count = Math.max(items.length, 1);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % count);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + count) % count);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[selectedIndex];
      if (item) handleSelect(item);
    }
  };

  const searchPlaceholder =
    role === 'MAINTAINER'
      ? 'Search users, departments, programs, projects... (Esc to close)'
      : 'Search projects, theses, or type a command... (Esc to close)';

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 9999, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 580,
          width: '92%',
          padding: 0,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-outline-variant)',
            background: 'var(--color-surface)',
          }}
        >
          <Icon
            name="search"
            className="material-symbols-outlined"
            style={{ color: 'var(--color-on-surface-variant)', fontSize: 20, marginRight: 10 }}
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              color: 'var(--color-on-surface)',
            }}
          />
          <kbd
            style={{
              fontSize: 11,
              background: 'var(--color-surface-container)',
              padding: '2px 6px',
              borderRadius: 4,
              color: 'var(--color-on-surface-variant)',
            }}
          >
            ESC
          </kbd>
        </div>

        <div style={{ maxHeight: 340, overflowY: 'auto', padding: '8px 0' }}>
          {loading && (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: 'var(--color-on-surface-variant)' }}>
              Searching...
            </div>
          )}

          {!loading && items.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: 'var(--color-on-surface-variant)' }}>
              No results found for "{query}"
            </div>
          )}

          {!loading &&
            items.map((item, idx) => (
              <div
                key={item.id || item.path + idx}
                className={`command-item${selectedIndex === idx ? ' active' : ''}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'var(--color-surface-container)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon
                    name={item.icon}
                    className="material-symbols-outlined"
                    style={{ fontSize: 18, color: 'var(--color-primary)' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.7,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.subtitle}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.6, fontWeight: 600 }}>
                  {item.category}
                </span>
              </div>
            ))}
        </div>

        <div
          style={{
            padding: '8px 16px',
            background: 'var(--color-surface-container-low)',
            borderTop: '1px solid var(--color-outline-variant)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--color-on-surface-variant)',
          }}
        >
          <span>
            Tip: Press{' '}
            <kbd style={{ padding: '1px 4px', background: 'var(--color-surface-container)', borderRadius: 3 }}>Ctrl</kbd> +{' '}
            <kbd style={{ padding: '1px 4px', background: 'var(--color-surface-container)', borderRadius: 3 }}>K</kbd>{' '}
            anywhere
          </span>
          <span>TPMS Quick Search</span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;