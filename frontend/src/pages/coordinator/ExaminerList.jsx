import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 10;

function ExaminerList() {
  const toast = useToast();
  const [examiners, setExaminers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetail, setShowDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ firstName: '', lastName: '', email: '', password: 'subesh' });
  const [currentPage, setCurrentPage] = useState(1);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/users/role/external_examiner').then(({ data }) => setExaminers(data)),
      api.get('/groups').then(({ data }) => setGroups(data)),
      api.get('/theses').then(({ data }) => setTheses(data)),
    ]).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', { ...createForm, role: 'EXTERNAL_EXAMINER' });
      toast.success('Internal Examiner created successfully');
      setShowCreate(false);
      setCreateForm({ firstName: '', lastName: '', email: '', password: 'subesh' });
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Create failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this Internal Examiner? Their assignments will also be cleared.')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Internal Examiner removed');
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
  };

  // Build examiner assignments from group.thesis examinerAssignments lists
  const enriched = useMemo(() => {
    const assignmentFor = (exId) => [
      ...groups.filter(g => (g.examinerAssignments || []).some(a => a.externalExaminerId === exId)),
      ...theses.filter(t => (t.examinerAssignments || []).some(a => a.externalExaminerId === exId)),
    ];
    return examiners.map(e => {
      const assignedGroups = groups.filter(g => (g.examinerAssignments || []).some(a => a.externalExaminerId === e.id));
      const assignedTheses = theses.filter(t => (t.examinerAssignments || []).some(a => a.externalExaminerId === e.id));
      return {
        ...e,
        assignedGroups,
        assignedTheses,
        groupCount: assignedGroups.length,
        thesisCount: assignedTheses.length,
        totalCount: assignedGroups.length + assignedTheses.length,
      };
    });
  }, [examiners, groups, theses]);

  const filtered = useMemo(() => {
    if (!searchTerm) return enriched;
    const q = searchTerm.toLowerCase();
    return enriched.filter(s =>
      `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(q)
    );
  }, [enriched, searchTerm]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(1); }, [totalPages, currentPage]);

  const totalAssigned = groups.reduce((s, g) => s + (g.examinerAssignments?.length || 0), 0)
    + theses.reduce((s, t) => s + (t.examinerAssignments?.length || 0), 0);
  const unassignedGroups = groups.filter(g => !g.examinerAssignments?.length).length;
  const unassignedTheses = theses.filter(t => !t.examinerAssignments?.length).length;

  const actions = (
    <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
      <span className="material-symbols-outlined">add</span>
      Add Examiner
    </button>
  );

  return (
    <PageLayout title="Internal Examiners" subtitle="Manage internal examiners and their assignments" user={user} actions={actions}>
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <span className="material-symbols-outlined">person_add</span>
              </div>
              <div className="modal-header-text">
                <h2>Add Internal Examiner</h2>
                <p>Register a new internal examiner (evaluates the 10-mark component)</p>
              </div>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>First Name</label>
                <input value={createForm.firstName} onChange={e => setCreateForm({...createForm, firstName: e.target.value})} required placeholder="Enter first name" />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input value={createForm.lastName} onChange={e => setCreateForm({...createForm, lastName: e.target.value})} required placeholder="Enter last name" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})} required placeholder="e.g. name@ioe.edu.np" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})} required placeholder="Default: subesh" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>
                  <span className="material-symbols-outlined">close</span>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <span className="material-symbols-outlined">add</span>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <span className="material-symbols-outlined">person</span>
              </div>
              <div className="modal-header-text">
                <h2>{showDetail.firstName} {showDetail.lastName}</h2>
                <p>{showDetail.email}</p>
              </div>
            </div>

            <div className="detail-section">
              <h4 className="detail-section-title">Assigned Projects ({showDetail.groupCount})</h4>
              {showDetail.assignedGroups.length === 0 ? (
                <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 14, padding: '8px 0' }}>No bachelor projects assigned.</p>
              ) : (
                <table className="detail-table">
                  <thead>
                    <tr><th>Group</th><th>Project</th><th>Members</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {showDetail.assignedGroups.map(g => (
                      <tr key={g.id} className="clickable-row" onClick={() => navigate(`/coordinator/project/group/${g.id}`)}>
                        <td style={{ fontWeight: 500 }}>{g.name}</td>
                        <td style={{ color: 'var(--color-on-surface-variant)' }}>{g.projectTitle}</td>
                        <td style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>
                          {(g.members || []).filter(m => m.student).map(m => `${m.student.firstName} ${m.student.lastName}`).join(', ') || '—'}
                        </td>
                        <td>
                          <span className={`badge badge-${g.status?.toLowerCase() || 'pending'}`}><span className="dot" />{g.status || 'PENDING'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="detail-section">
              <h4 className="detail-section-title">Assigned Theses ({showDetail.thesisCount})</h4>
              {showDetail.assignedTheses.length === 0 ? (
                <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 14, padding: '8px 0' }}>No master theses assigned.</p>
              ) : (
                <table className="detail-table">
                  <thead>
                    <tr><th>Student</th><th>Thesis Title</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {showDetail.assignedTheses.map(t => (
                      <tr key={t.id} className="clickable-row" onClick={() => navigate(`/coordinator/project/thesis/${t.id}`)}>
                        <td style={{ fontWeight: 500 }}>{t.student?.firstName} {t.student?.lastName}</td>
                        <td style={{ color: 'var(--color-on-surface-variant)' }}>{t.title}</td>
                        <td>
                          <span className={`badge badge-${t.status?.toLowerCase() || 'pending'}`}><span className="dot" />{t.status || 'PENDING'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn btn-danger" onClick={() => { handleDelete(showDetail.id); setShowDetail(null); }}>
                <span className="material-symbols-outlined">delete</span>
                Remove Examiner
              </button>
              <button className="btn btn-outline" onClick={() => setShowDetail(null)}>
                <span className="material-symbols-outlined">close</span>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">person</span></div>
          <div className="stat-number">{examiners.length}</div>
          <div className="stat-label">Total Examiners</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">assignment_ind</span></div>
          <div className="stat-number">{totalAssigned}</div>
          <div className="stat-label">Total Assignments</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">school</span></div>
          <div className="stat-number">{unassignedGroups}</div>
          <div className="stat-label">Projects Unassigned</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">library_books</span></div>
          <div className="stat-number">{unassignedTheses}</div>
          <div className="stat-label">Theses Unassigned</div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <div className="search-input-wrapper">
              <span className="material-symbols-outlined">search</span>
              <input type="text" placeholder="Search examiners..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="table-toolbar-right">
            <span className="font-label text-xs font-semibold text-on-surface-variant">{filtered.length} examiners</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <span className="material-symbols-outlined">progress_activity</span>
            <p>Loading examiners...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">person</span>
            <h3>No examiners found</h3>
            <p>{searchTerm ? 'Try adjusting your search.' : 'No internal examiners have been registered yet.'}</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Examiner</th>
                  <th>Email</th>
                  <th>Bachelor Projects</th>
                  <th>Master Theses</th>
                  <th>Total</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(s => (
                  <tr key={s.id} className="clickable-row" onClick={() => setShowDetail(s)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="default-badge">{s.firstName?.[0]}{s.lastName?.[0]}</div>
                        <span style={{ fontWeight: 500 }}>{s.firstName} {s.lastName}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>{s.email}</td>
                    <td><span className="stat-chip">{s.groupCount}</span></td>
                    <td><span className="stat-chip">{s.thesisCount}</span></td>
                    <td><span className="stat-chip stat-chip-primary">{s.totalCount}</span></td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => setShowDetail(s)}>
                        <span className="material-symbols-outlined">visibility</span>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-footer">
              <span className="font-label text-xs text-on-surface-variant table-footer-info">
                {filtered.length > 0
                  ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}`
                  : '0 results'}
              </span>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}

export default ExaminerList;
