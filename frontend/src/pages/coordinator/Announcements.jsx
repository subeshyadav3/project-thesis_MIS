import React, { useState, useEffect, useRef, useCallback } from 'react';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import ErrorBoundary from '../../components/ErrorBoundary';
import SearchInput from '../../components/SearchInput';

const TYPE_LABELS = { GENERAL: 'General', MINOR: 'Minor Project', MAJOR: 'Major Project', THESIS: 'Thesis' };
const AUDIENCE_LABELS = { ALL: 'All Students', PROGRAMS: 'By Program', DEGREE: 'By Degree', STUDENTS: 'Specific Students' };

function CoordinatorAnnouncements() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [form, setForm] = useState({
    title: '', message: '', type: 'GENERAL',
    degreeType: user.program?.degreeType || '',
    programIds: user.program?.id ? [user.program.id] : [],
    studentIds: [],
    academicYearId: '', allowGroupFormation: false,
    expiresAt: '',
  });
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentOpen, setStudentOpen] = useState(false);
  const [viewAnnouncement, setViewAnnouncement] = useState(null);
  const [submissions, setSubmissions] = useState({ groups: [], theses: [] });
  const [subLoading, setSubLoading] = useState(false);
  const studentRef = useRef(null);
  const toast = useToast();

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/announcements').then(({ data }) => setAnnouncements(data)),
      api.get('/departments/academic-years').then(({ data }) => setAcademicYears(data)),
      api.get('/users/role/STUDENT?all=true').then(({ data }) => setAllStudents(data)),
    ]).catch(e => toast.error('Failed to load data')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const f = (e) => { if (studentRef.current && !studentRef.current.contains(e.target)) setStudentOpen(false); };
    if (studentOpen) document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, [studentOpen]);

  const activeAnnouncements = announcements.filter(a => !a.expiresAt || new Date(a.expiresAt) > new Date());
  const expiredAnnouncements = announcements.filter(a => a.expiresAt && new Date(a.expiresAt) <= new Date());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim() || !form.academicYearId) {
      toast.warning('Title, message, and academic year are required');
      return;
    }
    // degreeType and programIds are auto-set from user.program
    try {
      await api.post('/announcements', {
        ...form,
        degreeType: user.program?.degreeType || '',
        programIds: user.program?.id ? [user.program.id] : [],
        studentIds: selectedStudents,
      });
      toast.success('Announcement created');
      setShowCreate(false);
      setForm({ title: '', message: '', type: 'GENERAL', degreeType: user.program?.degreeType || '', programIds: [], studentIds: [], academicYearId: '', allowGroupFormation: false, expiresAt: '' });
      setSelectedStudents([]);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create'); }
  };

  const deactivate = async (id) => {
    try {
      await api.put(`/announcements/${id}/deactivate`);
      toast.success('Announcement deactivated');
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const loadSubmissions = async (ann) => {
    setSubLoading(true);
    try {
      if (ann.type === 'THESIS') {
        const { data } = await api.get(`/theses?announcementId=${ann.id}&status=PENDING`);
        setSubmissions({ groups: [], theses: data });
      } else {
        const { data } = await api.get(`/groups?announcementId=${ann.id}&status=PENDING`);
        setSubmissions({ groups: data, theses: [] });
      }
    } catch (err) {
      toast.error('Failed to load submissions');
      setSubmissions({ groups: [], theses: [] });
    } finally {
      setSubLoading(false);
    }
  };

  const handleApprove = async (item, type) => {
    try {
      const endpoint = type === 'thesis' ? `/theses/${item.id}/status` : `/groups/${item.id}/status`;
      await api.put(endpoint, { status: 'ACTIVE' });
      toast.success('Submission approved');
      loadSubmissions(viewAnnouncement);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve');
    }
  };

  const actions = (
    <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
      <span className="material-symbols-outlined">campaign</span> New Announcement
    </button>
  );

  return (
    <ErrorBoundary>
      <PageLayout title="Announcements" subtitle="Send notifications and open group formation" user={user} actions={actions}>
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card bento-card">
            <div className="stat-icon"><span className="material-symbols-outlined">campaign</span></div>
            <div className="stat-number">{announcements.length}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card bento-card">
            <div className="stat-icon"><span className="material-symbols-outlined">check_circle</span></div>
            <div className="stat-number">{activeAnnouncements.length}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card bento-card">
            <div className="stat-icon"><span className="material-symbols-outlined">groups</span></div>
            <div className="stat-number">{announcements.filter(a => a.allowGroupFormation).length}</div>
            <div className="stat-label">Group Formation</div>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-state"><span className="material-symbols-outlined spin">progress_activity</span><p>Loading...</p></div>
          ) : announcements.length === 0 ? (
            <div className="empty-state"><span className="material-symbols-outlined" style={{ fontSize: 48 }}>campaign</span><h3>No announcements</h3><p>Create your first announcement to notify students.</p></div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Audience</th>
                    <th>Form Groups?</th>
                    <th>Year</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.map(a => {
                    const active = !a.expiresAt || new Date(a.expiresAt) > new Date();
                    const hasGF = a.allowGroupFormation;
                    return (
                      <tr key={a.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{a.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.message}</div>
                        </td>
                        <td><span className={`badge badge-${a.type === 'THESIS' ? 'warning' : a.type === 'MINOR' ? 'info' : a.type === 'MAJOR' ? 'warning' : 'default'}`}>{TYPE_LABELS[a.type] || a.type}</span></td>
                        <td style={{ fontSize: 13 }}>{AUDIENCE_LABELS[a.audience]}</td>
                        <td>{hasGF ? <span className="badge badge-active"><span className="dot" /> Yes (max {a.groupSizeMax})</span> : <span style={{ color: 'var(--color-on-surface-variant)' }}>—</span>}</td>
                        <td style={{ fontSize: 13 }}>{a.academicYear?.year || '—'}</td>
                        <td>
                          {active ? (
                            <span className="badge badge-active"><span className="dot" />Active</span>
                          ) : (
                            <span className="badge badge-pending">Expired</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {hasGF && (
                            <button className="btn btn-sm btn-outline" onClick={() => { setViewAnnouncement(a); loadSubmissions(a); }}>
                              <span className="material-symbols-outlined">visibility</span> View Submissions
                            </button>
                          )}
                          {active && (
                            <button className="btn btn-sm btn-outline" onClick={() => deactivate(a.id)}>
                              <span className="material-symbols-outlined">cancel</span> Deactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-header-icon info"><span className="material-symbols-outlined">campaign</span></div>
                <div className="modal-header-text"><h2>New Announcement</h2><p>Send a notification to students</p></div>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group"><label>Title *</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="e.g. Minor Project Group Formation" /></div>
                <div className="form-group"><label>Message *</label><textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} required rows={3} placeholder="Details about this announcement..." /></div>
                <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Type</label>
                    <select value={form.type} onChange={e => { const t = e.target.value; setForm({...form, type: t, allowGroupFormation: ['MINOR', 'MAJOR', 'THESIS'].includes(t) ? true : form.allowGroupFormation, degreeType: ['MINOR', 'MAJOR'].includes(t) ? 'BACHELOR' : t === 'THESIS' ? 'MASTER' : '' }); }}>
                      <option value="GENERAL">General</option>
                      <option value="MINOR">Minor Project</option>
                      <option value="MAJOR">Major Project</option>
                      <option value="THESIS">Thesis</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Academic Year *</label>
                    <select value={form.academicYearId} onChange={e => setForm({...form, academicYearId: e.target.value})} required>
                      <option value="">Select year...</option>
                      {academicYears.map(y => <option key={y.id} value={y.id}>{y.year}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group" ref={studentRef}>
                  <label>Specific Students (optional)</label>
                  <div className="sup-dropdown-trigger">
                    <div className="sup-search-wrapper" onClick={() => setStudentOpen(true)}>
                      <span className="material-symbols-outlined">search</span>
                      <input type="text" placeholder="Search students..." value={studentSearch} onChange={e => { setStudentSearch(e.target.value); setStudentOpen(true); }} onFocus={() => setStudentOpen(true)} />
                    </div>
                    {studentOpen && (
                      <div className="sup-dropdown" style={{ maxHeight: 200, overflowY: 'auto' }}>
                      {allStudents.filter(s => `${s.firstName} ${s.lastName} ${s.rollNumber || ''} ${s.email}`.toLowerCase().includes(studentSearch.toLowerCase())).map(s => {
                            const sel = selectedStudents.includes(s.id);
                            return (
                              <div key={s.id} className={`sup-dropdown-item ${sel ? 'sup-dropdown-item-selected' : ''}`} onClick={() => setSelectedStudents(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}>
                                <div className="sup-dropdown-item-avatar">{s.firstName?.[0]}{s.lastName?.[0]}</div>
                                <div className="sup-dropdown-item-info">
                                  <div className="sup-dropdown-item-name">{s.firstName} {s.lastName}</div>
                                  <div className="sup-dropdown-item-email">{s.rollNumber || s.email} · {s.program?.code || '—'}</div>
                                </div>
                                {sel && <span className="material-symbols-outlined sup-dropdown-item-check">check_circle</span>}
                              </div>
                            );
                          })}
                      </div>
                    )}
                    {selectedStudents.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {selectedStudents.map(id => {
                          const s = allStudents.find(x => x.id === id);
                          return s ? <span key={id} className="badge badge-active" style={{ gap: 4 }}>{s.firstName} {s.lastName} <span style={{ cursor: 'pointer' }} onClick={() => setSelectedStudents(prev => prev.filter(x => x !== id))}>×</span></span> : null;
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group" style={{
                  background: 'var(--color-surface-container-low)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '16px',
                  border: form.allowGroupFormation ? '2px solid var(--color-primary)' : '2px solid var(--color-outline-variant)',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: form.allowGroupFormation ? 16 : 0 }}>
                    <div
                      onClick={() => setForm({...form, allowGroupFormation: !form.allowGroupFormation})}
                      style={{
                        width: 44, height: 24, borderRadius: 12,
                        background: form.allowGroupFormation ? 'var(--color-primary)' : 'var(--color-outline)',
                        position: 'relative', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 2,
                        left: form.allowGroupFormation ? 22 : 2,
                        transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </div>
                    <div>
                      <label style={{ margin: 0, fontWeight: 600, cursor: 'pointer' }} onClick={() => setForm({...form, allowGroupFormation: !form.allowGroupFormation})}>
                        Allow Group Formation
                      </label>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                        Students can form groups under this announcement
                      </p>
                    </div>
                  </div>
                  {form.allowGroupFormation && (
                    <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                      <div className="form-group" style={{ flex: 1, margin: 0 }}>
                        <label style={{ fontSize: 12 }}>Max Members</label>
                        <div style={{
                          padding: '10px 14px',
                          borderRadius: 'var(--border-radius-md)',
                          background: 'var(--color-surface-container-lowest)',
                          border: '1px solid var(--color-outline)',
                          fontSize: 14,
                          color: 'var(--color-on-surface)',
                          opacity: 0.7,
                        }}>
                          {form.type === 'THESIS' ? 1 : 4}
                          <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', marginLeft: 8 }}>
                            (Thesis=1, Bachelor=4)
                          </span>
                        </div>
                      </div>
                      <div className="form-group" style={{ flex: 1, margin: 0 }}>
                        <label style={{ fontSize: 12 }}>Expires At (optional)</label>
                        <input type="datetime-local" value={form.expiresAt} onChange={e => setForm({...form, expiresAt: e.target.value})} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}><span className="material-symbols-outlined">close</span> Cancel</button>
                  <button type="submit" className="btn btn-primary"><span className="material-symbols-outlined">send</span> Send</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {viewAnnouncement && (
          <div className="modal-overlay" onClick={() => setViewAnnouncement(null)}>
            <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-header-icon info"><span className="material-symbols-outlined">groups</span></div>
                <div className="modal-header-text"><h2>Submissions: {viewAnnouncement.title}</h2><p>{TYPE_LABELS[viewAnnouncement.type] || viewAnnouncement.type}</p></div>
              </div>
              <div className="modal-body">
                {subLoading ? (
                  <div className="loading-state"><span className="material-symbols-outlined spin">progress_activity</span><p>Loading submissions...</p></div>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr><th>Title</th><th>Student(s)</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
                      </thead>
                      <tbody>
                        {viewAnnouncement.type === 'THESIS' ? (
                          submissions.theses.length === 0 ? (
                            <tr><td colSpan={4} className="empty-cell">No pending thesis submissions</td></tr>
                          ) : (
                            submissions.theses.map(t => (
                              <tr key={t.id}>
                                <td>{t.title}</td>
                                <td>{t.student ? `${t.student.firstName} ${t.student.lastName}` : '—'}</td>
                                <td><span className="badge badge-pending">{t.status}</span></td>
                                <td style={{ textAlign: 'right' }}>
                                  <button className="btn btn-sm btn-primary" onClick={() => handleApprove(t, 'thesis')}>
                                    <span className="material-symbols-outlined">check_circle</span> Approve
                                  </button>
                                </td>
                              </tr>
                            ))
                          )
                        ) : (
                          submissions.groups.length === 0 ? (
                            <tr><td colSpan={4} className="empty-cell">No pending group submissions</td></tr>
                          ) : (
                            submissions.groups.map(g => (
                              <tr key={g.id}>
                                <td>{g.projectTitle || g.name}</td>
                                <td>{g.members?.map(m => `${m.student.firstName} ${m.student.lastName}`).join(', ') || '—'}</td>
                                <td><span className="badge badge-pending">{g.status}</span></td>
                                <td style={{ textAlign: 'right' }}>
                                  <button className="btn btn-sm btn-primary" onClick={() => handleApprove(g, 'group')}>
                                    <span className="material-symbols-outlined">check_circle</span> Approve
                                  </button>
                                </td>
                              </tr>
                            ))
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setViewAnnouncement(null)}><span className="material-symbols-outlined">close</span> Close</button>
              </div>
            </div>
          </div>
        )}

      </PageLayout>
    </ErrorBoundary>
  );
}

export default CoordinatorAnnouncements;
