import React, { useState, useEffect } from 'react';
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
        if (['COORDINATOR', 'SUPERVISOR', 'STUDENT'].includes(role)) {
          promises.push(
            api.get('/groups').then(({ data }) =>
              data
                .filter(g =>
                  g.name.toLowerCase().includes(query.toLowerCase()) ||
                  g.projectTitle.toLowerCase().includes(query.toLowerCase())
                )
                .slice(0, 4)
                .map(g => ({
                  id: `group-${g.id}`,
                  title: g.name,
                  subtitle: g.projectTitle,
                  category: 'Bachelor Project',
                  icon: 'school',
                  path: role === 'SUPERVISOR' ? `/supervisor/project/group/${g.id}` : `/coordinator/project/group/${g.id}`,
                }))
            )
          );
        }
        if (['COORDINATOR', 'SUPERVISOR', 'STUDENT'].includes(role)) {
          promises.push(
            api.get('/theses').then(({ data }) =>
              data
                .filter(t =>
                  t.title.toLowerCase().includes(query.toLowerCase()) ||
                  (t.student && `${t.student.firstName} ${t.student.lastName}`.toLowerCase().includes(query.toLowerCase()))
                )
                .slice(0, 4)
                .map(t => ({
                  id: `thesis-${t.id}`,
                  title: t.title,
                  subtitle: t.student ? `${t.student.firstName} ${t.student.lastName}` : 'Thesis',
                  category: "Master's Thesis",
                  icon: 'library_books',
                  path: role === 'SUPERVISOR' ? `/supervisor/project/thesis/${t.id}` : `/coordinator/project/thesis/${t.id}`,
                }))
            )
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

  if (!isOpen) return null;

  const defaultNavigation = [
    { title: 'Dashboard', category: 'Navigation', icon: 'dashboard', path: user?.role === 'SUPERVISOR' ? '/supervisor' : '/coordinator' },
    { title: 'Bachelor Projects', category: 'Navigation', icon: 'school', path: user?.role === 'SUPERVISOR' ? '/supervisor/bachelor' : '/coordinator/bachelor' },
    { title: "Master's Thesis", category: 'Navigation', icon: 'library_books', path: user?.role === 'SUPERVISOR' ? '/supervisor/master' : '/coordinator/master' },
    { title: 'Evaluations', category: 'Navigation', icon: 'grading', path: user?.role === 'SUPERVISOR' ? '/supervisor/bachelor' : '/coordinator/evaluations' },
    { title: 'Notifications', category: 'Navigation', icon: 'notifications', path: user?.role === 'SUPERVISOR' ? '/supervisor/notifications' : '/coordinator/notifications' },
  ];

  const items = query.trim() ? searchResults : defaultNavigation;

  const handleSelect = (item) => {
    navigate(item.path);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 580, width: '92%', padding: 0, borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--color-outline-variant)', background: 'var(--color-surface)' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', fontSize: 20, marginRight: 10 }}>search</span>
          <input
            type="text"
            placeholder="Search projects, theses, or type a command... (Esc to close)"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            autoFocus
            style={{
              width: '100%', border: 'none', background: 'transparent', outline: 'none',
              fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--color-on-surface)',
            }}
          />
          <kbd style={{ fontSize: 11, background: 'var(--color-surface-container)', padding: '2px 6px', borderRadius: 4, color: 'var(--color-on-surface-variant)' }}>ESC</kbd>
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

          {!loading && items.map((item, idx) => (
            <div
              key={item.id || item.path}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(idx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer',
                background: selectedIndex === idx ? 'var(--color-primary-container)' : 'transparent',
                color: selectedIndex === idx ? 'var(--color-on-primary-container)' : 'var(--color-on-surface)',
                transition: 'background 0.15s',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: 'var(--color-surface-container)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-primary)' }}>{item.icon}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                {item.subtitle && <div style={{ fontSize: 11, opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subtitle}</div>}
              </div>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.6, fontWeight: 600 }}>{item.category}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '8px 16px', background: 'var(--color-surface-container-low)', borderTop: '1px solid var(--color-outline-variant)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-on-surface-variant)' }}>
          <span>Tip: Press <kbd style={{ padding: '1px 4px', background: 'var(--color-surface-container)', borderRadius: 3 }}>Ctrl</kbd> + <kbd style={{ padding: '1px 4px', background: 'var(--color-surface-container)', borderRadius: 3 }}>K</kbd> anywhere</span>
          <span>TPMS Quick Search</span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;