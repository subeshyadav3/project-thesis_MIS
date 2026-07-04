import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 10;

function SupervisorList() {
  const toast = useToast();
  const [supervisors, setSupervisors] = useState([]);
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
      api.get('/users/role/supervisor?all=true').then(({ data }) => setSupervisors(data)),
      api.get('/groups').then(({ data }) => setGroups(data)),
      api.get('/theses').then(({ data }) => setTheses(data)),
    ]).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { loadData(); }, []);

  const handleCreateSupervisor = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', { ...createForm, role: 'SUPERVISOR' });
      toast.success('Supervisor created successfully');
      setShowCreate(false);
      setCreateForm({ firstName: '', lastName: '', email: '', password: 'subesh' });
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Create failed'); }
  };

  const enriched = useMemo(() => {
    return supervisors.map(s => ({
      ...s,
      groupCount: groups.filter(g => g.supervisorId === s.id).length,
      thesisCount: theses.filter(t => t.supervisorId === s.id).length,
      totalCount: groups.filter(g => g.supervisorId === s.id).length + theses.filter(t => t.supervisorId === s.id).length,
      assignedGroups: groups.filter(g => g.supervisorId === s.id),
      assignedTheses: theses.filter(t => t.supervisorId === s.id),
    }));
  }, [supervisors, groups, theses]);

  const filtered = useMemo(() => {
    if (!searchTerm) return enriched;
    const q = searchTerm.toLowerCase();
    return enriched.filter(s =>
      `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(q)
    );
  }, [enriched, searchTerm]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const totalGroups = groups.length;
  const totalTheses = theses.length;
  const unassignedGroups = groups.filter(g => !g.supervisorId).length;
  const unassignedTheses = theses.filter(t => !t.supervisorId).length;

  const actions = (
    <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
      <span className="material-symbols-outlined">add</span>
      Add Supervisor
    </button>
  );

  return (
    <PageLayout title="Supervisors" user={user} actions={actions}>
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info">
                <span className="material-symbols-outlined">badge</span>
              </div>
              <div className="modal-header-text">
                <h2>Add Supervisor</h2>
                <p>Register a new supervisor</p>
              </div>
            </div>
            <form onSubmit={handleCreateSupervisor}>
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
                <input type="email" value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})} required placeholder="e.g. name@pcampus.edu.np" />
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
                <span className="material-symbols-outlined">badge</span>
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
                    <tr>
                      <th>Group</th>
                      <th>Project</th>
                      <th>Members</th>
                      <th>Status</th>
                    </tr>
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
                          <span className={`badge badge-${g.status?.toLowerCase() || 'pending'}`}>
                            <span className="dot" />
                            {g.status || 'PENDING'}
                          </span>
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
                    <tr>
                      <th>Student</th>
                      <th>Thesis Title</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showDetail.assignedTheses.map(t => (
                      <tr key={t.id} className="clickable-row" onClick={() => navigate(`/coordinator/project/thesis/${t.id}`)}>
                        <td style={{ fontWeight: 500 }}>{t.student?.firstName} {t.student?.lastName}</td>
                        <td style={{ color: 'var(--color-on-surface-variant)' }}>{t.title}</td>
                        <td>
                          <span className={`badge badge-${t.status?.toLowerCase() || 'pending'}`}>
                            <span className="dot" />
                            {t.status || 'PENDING'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="modal-actions">
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
          <div className="stat-icon"><span className="material-symbols-outlined">supervisor_account</span></div>
          <div className="stat-number">{supervisors.length}</div>
          <div className="stat-label">Total Supervisors</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">school</span></div>
          <div className="stat-number">{totalGroups}</div>
          <div className="stat-label">Bachelor Projects</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">library_books</span></div>
          <div className="stat-number">{totalTheses}</div>
          <div className="stat-label">Master Theses</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">person_add</span></div>
          <div className="stat-number">{unassignedGroups + unassignedTheses}</div>
          <div className="stat-label">Unassigned</div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <div className="search-input-wrapper">
              <span className="material-symbols-outlined">search</span>
              <input type="text" placeholder="Search supervisors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="table-toolbar-right">
            <span className="font-label text-xs font-semibold text-on-surface-variant">{filtered.length} supervisors</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <span className="material-symbols-outlined">progress_activity</span>
            <p>Loading supervisors...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">supervisor_account</span>
            <h3>No supervisors found</h3>
            <p>{searchTerm ? 'Try adjusting your search.' : 'No supervisors have been registered yet.'}</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Supervisor</th>
                  <th>Email</th>
                  <th>Bachelor Groups</th>
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
                    <td>
                      <span className="stat-chip">{s.groupCount}</span>
                    </td>
                    <td>
                      <span className="stat-chip">{s.thesisCount}</span>
                    </td>
                    <td>
                      <span className="stat-chip stat-chip-primary">{s.totalCount}</span>
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => setShowDetail(s)}>
                          <span className="material-symbols-outlined">visibility</span>
                          View
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm(`Toggle active status for ${s.firstName} ${s.lastName}?`)) return;
                          try {
                            await api.put(`/users/${s.id}/toggle-active`);
                            toast.success('Supervisor status toggled');
                            loadData();
                          } catch (err) {
                            toast.error(err.response?.data?.error || 'Toggle failed');
                          }
                        }}>
                          <span className="material-symbols-outlined">edit</span>
                          Edit
                        </button>
                      </div>
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

export default SupervisorList;
