import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

const ROLE_LABEL = {
  SUPERVISOR: 'Supervisor',
  COORDINATOR: 'Coordinator',
  EXTERNAL_EXAMINER: 'Internal Examiner',
};

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'COMPLETE', label: 'Fully Evaluated' },
  { value: 'PARTIAL', label: 'Partially Evaluated' },
  { value: 'PENDING', label: 'Not Evaluated' },
];

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Types' },
  { value: 'MINOR', label: 'Minor' },
  { value: 'MAJOR', label: 'Major' },
];

const EVAL_STATUS = {
  COMPLETE: 'Evaluated',
  PARTIAL: 'In Progress',
  PENDING: 'Pending',
};

function Evaluations() {
  const toast = useToast();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('bachelor');
  const [showForward, setShowForward] = useState(false);
  const [showDefenseModal, setShowDefenseModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/groups').then(({ data }) => setGroups(data)),
      api.get('/theses').then(({ data }) => setTheses(data)),
    ]).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const coordinatorComponentTypes = ['PROPOSAL_DEFENSE', 'MIDTERM_DEFENSE', 'FINAL_DEFENSE'];

  const handleForward = async () => {
    try {
      await api.post('/forward', { departmentName: 'Computer Science' });
      toast.success('Results forwarded to Exam Department successfully');
      setShowForward(false);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      const cleanMsg = typeof msg === 'string' && msg.length > 120 ? msg.slice(0, 120) + '...' : msg;
      toast.error(cleanMsg || 'Failed to forward results.');
    }
  };

  const handleOpenDefenseModal = (item) => { setSelectedItem(item); setShowDefenseModal(true); };
  const handleOpenSummaryModal = (item) => { setSelectedItem(item); setShowSummaryModal(true); };

  const saveComponentMarks = async (component, marks, comment) => {
    const payload = {
      componentId: component.id,
      marks: marks === '' || marks === null || marks === undefined ? null : parseFloat(marks),
      comment: comment || null,
    };
    if (viewMode === 'bachelor') payload.groupId = selectedItem.id;
    else payload.thesisId = selectedItem.id;
    const { data } = await api.post('/evaluations/marks', payload);
    return data;
  };

  const handleSaveAllDefenses = async () => {
    const components = (selectedItem.evaluationComponents || []).filter(c =>
      coordinatorComponentTypes.includes(c.evaluationType)
    );
    setSaving(true);
    let ok = 0;
    for (const c of components) {
      try {
        const marks = document.getElementById(`marks-${c.id}`)?.value ?? '';
        const comment = document.getElementById(`comment-${c.id}`)?.value ?? '';
        const val = marks === '' ? null : parseFloat(marks);
        if (val !== null && (Number.isNaN(val) || val < 0 || val > c.maxMarks)) {
          toast.warning(`${c.name}: marks must be between 0 and ${c.maxMarks}`);
          continue;
        }
        await saveComponentMarks(c, marks, comment);
        ok += 1;
      } catch (err) {
        toast.error(`${c.name}: ${err.response?.data?.error || 'Save failed'}`);
      }
    }
    setSaving(false);
    toast.success(`Saved ${ok}/${components.length} defense components`);
    setShowDefenseModal(false);
    loadData();
  };

  const handleFinalize = async () => {
    if (!window.confirm('Are you sure you want to finalize this project? This will mark it as COMPLETED and no further changes can be made.')) return;
    setSaving(true);
    try {
      const status = 'COMPLETED';
      if (viewMode === 'bachelor') {
        await api.put(`/groups/${selectedItem.id}/status`, { status });
      } else {
        await api.put(`/theses/${selectedItem.id}/status`, { status });
      }
      toast.success('Project finalized successfully');
      setShowDefenseModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Finalize failed');
    }
    setSaving(false);
  };

  const findBreakdown = (item) => {
    const components = item.evaluationComponents || [];
    const evaluations = item.evaluations || [];
    return components.map(c => {
      const e = evaluations.find(ev => ev.componentId === c.id);
      return { component: c, evaluation: e };
    });
  };

  const totalMarks = (item) => findBreakdown(item)
    .reduce((sum, b) => sum + (b.evaluation?.marks ?? 0), 0);

  const getMaxTotal = (item) => {
    if (viewMode === 'master') return 200;
    return item.projectType === 'MAJOR' ? 100 : 50;
  };

  const completedCountFor = (item) => findBreakdown(item)
    .filter(b => b.evaluation?.marks !== null && b.evaluation?.marks !== undefined).length;

  // Compute status: COMPLETE, PARTIAL, PENDING
  const computeStatus = (item) => {
    const breakdown = findBreakdown(item);
    const done = breakdown.filter(b => b.evaluation?.marks !== null && b.evaluation?.marks !== undefined).length;
    if (breakdown.length === 0) return 'PENDING';
    if (done === breakdown.length) return 'COMPLETE';
    if (done > 0) return 'PARTIAL';
    return 'PENDING';
  };

  const items = viewMode === 'bachelor' ? groups : theses;

  // Process + filter + search
  const processedItems = useMemo(() => {
    return items.map(item => ({
      ...item,
      name: viewMode === 'bachelor' ? item.name : `${item.student?.firstName} ${item.student?.lastName}`,
      project: viewMode === 'bachelor' ? item.projectTitle : item.title,
      projectType: viewMode === 'bachelor' ? (item.projectType || 'MINOR') : 'MASTER',
      members: viewMode === 'bachelor'
        ? item.members?.map(m => `${m.student?.firstName} ${m.student?.lastName}`).join(', ')
        : `${item.student?.firstName} ${item.student?.lastName}`,
      rolls: viewMode === 'bachelor'
        ? item.members?.map(m => m.rollNumber).join(', ')
        : '',
      supervisorName: item.supervisor ? `${item.supervisor.firstName} ${item.supervisor.lastName}` : 'N/A',
      status: item.status || 'PENDING',
    }));
  }, [items, viewMode]);

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return processedItems.filter(item => {
      // Status filter
      if (statusFilter !== 'ALL') {
        const status = computeStatus(item);
        if (status !== statusFilter) return false;
      }
      // Type filter (bachelor only)
      if (viewMode === 'bachelor' && typeFilter !== 'ALL') {
        if (item.projectType !== typeFilter) return false;
      }
      // Search filter across name/project/members/rolls
      if (q) {
        const haystack = `${item.name} ${item.project} ${item.members} ${item.rolls} ${item.supervisorName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [processedItems, searchTerm, statusFilter, typeFilter, viewMode]);

  // Stats
  const total = processedItems.length;
  const completed = processedItems.filter(i => computeStatus(i) === 'COMPLETE').length;
  const partial = processedItems.filter(i => computeStatus(i) === 'PARTIAL').length;
  const pending = processedItems.filter(i => computeStatus(i) === 'PENDING').length;

  const actions = (
    <>
      <button className="btn btn-outline btn-sm" onClick={() => handlePrintAll()}>
        <span className="material-symbols-outlined">print</span>
        Print All
      </button>
      <button className="btn btn-success btn-sm" onClick={() => setShowForward(true)}>
        <span className="material-symbols-outlined">forward</span>
        Forward to Exam Dept
      </button>
    </>
  );

  // Print single result (opens a new window with formatted HTML)
  const handlePrintSingle = (item) => {
    const breakdown = findBreakdown(item);
    const name = viewMode === 'bachelor' ? item.name : `${item.student?.firstName} ${item.student?.lastName}`;
    const title = viewMode === 'bachelor' ? item.projectTitle : item.title;
    const sup = item.supervisor ? `${item.supervisor.firstName} ${item.supervisor.lastName}` : '—';
    const total = totalMarks(item);
    const membersList = viewMode === 'bachelor'
      ? (item.members || []).filter(m => m.student).map(m => `${m.student.firstName} ${m.student.lastName} (${m.rollNumber})`).join(', ')
      : `${item.student?.firstName} ${item.student?.lastName}`;
    const rows = breakdown.map(b => {
      const e = b.evaluation;
      const marks = e && e.marks !== null && e.marks !== undefined ? e.marks : '—';
      return `<tr><td>${b.component.name}</td><td>${ROLE_LABEL[b.component.evaluatorRole]}</td><td style="text-align:right">${b.component.maxMarks}</td><td style="text-align:right;font-weight:700">${marks}</td></tr>`;
    }).join('');
    printHtml(`
      <html><head><title>Evaluation Result — ${escapeHtml(name)}</title>
      <style>
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#222;padding:32px;}
        h1{font-size:20px;margin:0 0 4px;}
        h2{font-size:14px;font-weight:600;color:#666;margin:0 0 16px;}
        table{width:100%;border-collapse:collapse;margin-top:12px;}
        th,td{padding:8px 10px;border-bottom:1px solid #ddd;text-align:left;font-size:13px;}
        th{background:#f5f5f5;text-transform:uppercase;font-size:11px;letter-spacing:.4px;}
        .info{display:flex;gap:24px;margin-bottom:12px;}
        .info div{font-size:13px;}
        .info span{display:block;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.4px;}
        .total{margin-top:16px;padding:12px 16px;background:#e3f2fd;border-radius:8px;display:flex;justify-content:space-between;align-items:center;}
        .total .label{font-weight:600;}
        .total .value{font-size:22px;font-weight:700;}
        @media print{.no-print{display:none;}}
      </style></head>
      <body>
        <h1>Minor Project Evaluation Result</h1>
        <h2>Thesis / Project Management System</h2>
        <div class="info">
          <div><span>${viewMode === 'bachelor' ? 'Group' : 'Student'}</span>${escapeHtml(name)}</div>
          <div><span>Title</span>${escapeHtml(title)}</div>
          <div><span>Supervisor</span>${escapeHtml(sup)}</div>
          <div><span>Academic Year</span>${escapeHtml(item.academicYear?.year || '—')}</div>
        </div>
        <div class="info">
          <div><span>${viewMode === 'bachelor' ? 'Members' : 'Student'}</span>${escapeHtml(membersList)}</div>
        </div>
        <table>
          <thead><tr><th>Component</th><th>Evaluated By</th><th style="text-align:right">Max</th><th style="text-align:right">Marks</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
          <div class="total"><span class="label">Grand Total</span><span class="value">${total.toFixed(1)} / ${getMaxTotal(item)}</span></div>
        <button class="no-print" onclick="window.print()" style="margin-top:20px;padding:8px 16px;background:#1a73e8;color:white;border:none;border-radius:6px;cursor:pointer;">Print</button>
      </body></html>`);
  };

  // Print all evaluated results (one page per group/thesis)
  const handlePrintAll = () => {
    const evaluated = filteredItems.filter(i => computeStatus(i) === 'COMPLETE' || computeStatus(i) === 'PARTIAL');
    if (evaluated.length === 0) {
      toast.warning('No evaluated items to print');
      return;
    }
    const pages = evaluated.map(item => {
      const breakdown = findBreakdown(item);
      const name = viewMode === 'bachelor' ? item.name : `${item.student?.firstName} ${item.student?.lastName}`;
      const title = viewMode === 'bachelor' ? item.projectTitle : item.title;
      const sup = item.supervisor ? `${item.supervisor.firstName} ${item.supervisor.lastName}` : '—';
      const total = totalMarks(item);
      const membersList = viewMode === 'bachelor'
        ? (item.members || []).filter(m => m.student).map(m => `${m.student.firstName} ${m.student.lastName} (${m.rollNumber})`).join(', ')
        : `${item.student?.firstName} ${item.student?.lastName}`;
      const rows = breakdown.map(b => {
        const e = b.evaluation;
        const marks = e && e.marks !== null && e.marks !== undefined ? e.marks : '—';
        return `<tr><td>${b.component.name}</td><td>${ROLE_LABEL[b.component.evaluatorRole]}</td><td style="text-align:right">${b.component.maxMarks}</td><td style="text-align:right;font-weight:700">${marks}</td></tr>`;
      }).join('');
      return `
        <div class="print-page">
          <h1>Minor Project Evaluation Result</h1>
          <h2>Thesis / Project Management System</h2>
          <div class="info">
            <div><span>${viewMode === 'bachelor' ? 'Group' : 'Student'}</span>${escapeHtml(name)}</div>
            <div><span>Title</span>${escapeHtml(title)}</div>
            <div><span>Supervisor</span>${escapeHtml(sup)}</div>
            <div><span>Academic Year</span>${escapeHtml(item.academicYear?.year || '—')}</div>
          </div>
          <div class="info">
            <div><span>${viewMode === 'bachelor' ? 'Members' : 'Student'}</span>${escapeHtml(membersList)}</div>
          </div>
          <table>
            <thead><tr><th>Component</th><th>Evaluated By</th><th style="text-align:right">Max</th><th style="text-align:right">Marks</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        <div class="total"><span class="label">Grand Total</span><span class="value">${total.toFixed(1)} / ${getMaxTotal(item)}</span></div>
        </div>`;
    }).join('<div class="page-break"></div>');

    printHtml(`
      <html><head><title>Evaluation Results — Batch Print</title>
      <style>
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#222;padding:32px;}
        h1{font-size:20px;margin:0 0 4px;}
        h2{font-size:14px;font-weight:600;color:#666;margin:0 0 16px;}
        table{width:100%;border-collapse:collapse;margin-top:12px;}
        th,td{padding:8px 10px;border-bottom:1px solid #ddd;text-align:left;font-size:13px;}
        th{background:#f5f5f5;text-transform:uppercase;font-size:11px;letter-spacing:.4px;}
        .info{display:flex;gap:24px;margin-bottom:12px;flex-wrap:wrap;}
        .info div{font-size:13px;}
        .info span{display:block;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.4px;}
        .total{margin-top:16px;padding:12px 16px;background:#e3f2fd;border-radius:8px;display:flex;justify-content:space-between;align-items:center;}
        .total .label{font-weight:600;}
        .total .value{font-size:22px;font-weight:700;}
        .page-break{page-break-after:always;height:0;}
        .print-page{page-break-after:always;}
        .print-page:last-child{page-break-after:auto;}
        @media print{.no-print{display:none;}}
      </style></head>
      <body>
        ${pages}
        <button class="no-print" onclick="window.print()" style="position:fixed;bottom:20px;right:20px;padding:10px 20px;background:#1a73e8;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">Print All</button>
      </body></html>`);
  };

  function printHtml(html) {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { toast.error('Please allow popups to print'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  const isCompleted = (item) => computeStatus(item) === 'COMPLETE';

  return (
    <PageLayout title="Evaluations" user={user} actions={actions}>

      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">checklist</span></div>
          <div className="stat-number">{total}</div>
          <div className="stat-label">Total {viewMode === 'bachelor' ? 'Projects' : 'Theses'}</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">check_circle</span></div>
          <div className="stat-number">{completed}</div>
          <div className="stat-label">Fully Evaluated</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">progress_activity</span></div>
          <div className="stat-number">{partial}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">pending_actions</span></div>
          <div className="stat-number">{pending}</div>
          <div className="stat-label">Not Started</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="tabs" style={{ margin: 0, borderBottom: 'none' }}>
            <div className={`tab ${viewMode === 'bachelor' ? 'active' : ''}`} onClick={() => setViewMode('bachelor')}>
              <span className="material-symbols-outlined">school</span>Bachelor Projects
            </div>
            <div className={`tab ${viewMode === 'master' ? 'active' : ''}`} onClick={() => setViewMode('master')}>
              <span className="material-symbols-outlined">library_books</span>Master's Thesis
            </div>
          </div>
        </div>

        {/* Search + status filter bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: 12, borderBottom: '1px solid var(--color-outline-variant)' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="search-input-wrapper" style={{ width: '100%' }}>
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder={`Search by ${viewMode === 'bachelor' ? 'group, project, member, roll' : 'student, thesis, supervisor'}...`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div className="filter-item" style={{ margin: 0 }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {viewMode === 'bachelor' && (
            <div className="filter-item" style={{ margin: 0 }}>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
            {filteredItems.length} of {processedItems.length} shown
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <span className="material-symbols-outlined">progress_activity</span>
            <p>Loading evaluations...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">grading</span>
            <h3>No evaluations match</h3>
            <p>{searchTerm || statusFilter !== 'ALL' ? 'Try adjusting your filters.' : `No ${viewMode === 'bachelor' ? 'projects' : 'theses'} registered yet.`}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={{ width: 150 }}>{viewMode === 'bachelor' ? 'Group' : 'Student'}</th>
                  <th style={{ width: 220 }}>Project / Thesis</th>
                  <th style={{ width: 140 }}>Supervisor</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Total</th>
                  <th className="sticky-right" style={{ width: 220, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const breakdown = findBreakdown(item);
                  const done = breakdown.filter(b => b.evaluation?.marks !== null && b.evaluation?.marks !== undefined).length;
                  const tot = breakdown.length || 5;
                  const total = totalMarks(item);
                  const status = computeStatus(item);
                  const statusColor = status === 'COMPLETE' ? 'var(--color-success)'
                    : status === 'PARTIAL' ? 'var(--color-warning)' : 'var(--color-on-surface-variant)';
                  const completed = status === 'COMPLETE';
                  const rowPath = viewMode === 'bachelor' ? `/coordinator/project/group/${item.id}` : `/coordinator/project/thesis/${item.id}`;

                  return (
                    <tr key={item.id} style={{ cursor: 'pointer', opacity: completed ? 0.7 : 1, background: completed ? 'var(--color-surface-container-low)' : 'transparent' }}>
                      <td style={{ fontWeight: 500 }} onClick={() => navigate(rowPath)}>{item.name}</td>
                      <td style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }} onClick={() => navigate(rowPath)}>{item.project}</td>
                      <td style={{ fontSize: 13 }} onClick={() => navigate(rowPath)}>{item.supervisorName}</td>
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: statusColor, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                            {EVAL_STATUS[status]}
                          </span>
                          <div style={{ width: 60, height: 4, background: 'var(--color-outline-variant)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${tot ? (done / tot) * 100 : 0}%`, height: '100%', background: statusColor }} />
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--color-on-surface-variant)' }}>{done} / {tot}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-primary)' }}>{total.toFixed(1)}</span>
                        <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 12 }}> / {getMaxTotal(item)}</span>
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => handleOpenSummaryModal(item)} title="View all components" style={{ minWidth: 32, padding: '6px 8px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>visibility</span>
                          </button>
                          <button className="btn btn-primary btn-sm" onClick={() => {
                            if (completed) {
                              toast.warning('Already complete, can\'t edit');
                              return;
                            }
                            handleOpenDefenseModal(item);
                          }} title="Enter defense marks" disabled={completed || item.status === 'COMPLETED'} style={{ minWidth: 32, padding: '6px 8px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit_note</span>
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={() => handlePrintSingle(item)} title="Print / Save PDF" disabled={done === 0} style={{ minWidth: 32, padding: '6px 8px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>print</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Defense marks modal */}
      {showDefenseModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDefenseModal(false)}>
          <div className="modal" style={{ maxWidth: 720, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon primary"><span className="material-symbols-outlined">edit_note</span></div>
              <div className="modal-header-text">
                <h2>Defense Marks</h2>
                <p>Enter marks for the 3 defense components of <strong>{selectedItem.name}</strong>.</p>
              </div>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <div style={{ padding: 10, borderRadius: 8, background: 'var(--color-surface-container-low)', marginBottom: 14, fontSize: 13 }}>
                <strong>{selectedItem.project}</strong><br />
                <span style={{ color: 'var(--color-on-surface-variant)' }}>Supervisor: {selectedItem.supervisorName}</span>
              </div>
              {(selectedItem.evaluationComponents || [])
                .filter(c => coordinatorComponentTypes.includes(c.evaluationType))
                .map(c => {
                  const evalRec = (selectedItem.evaluations || []).find(e => e.componentId === c.id);
                  return (
                    <div key={c.id} className="card" style={{ padding: 12, marginBottom: 10, border: '1px solid var(--color-outline-variant)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div>
                          <h4 style={{ margin: 0 }}>{c.name}</h4>
                          <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>{ROLE_LABEL[c.evaluatorRole]} evaluates this</span>
                        </div>
                        <span className="badge" style={{ background: 'var(--color-secondary-container)', color: 'var(--color-on-secondary-container)' }}>Max: {c.maxMarks}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div className="form-group" style={{ width: 110, marginBottom: 0 }}>
                          <label style={{ fontSize: 11 }}>Marks (out of {c.maxMarks})</label>
                          <input id={'marks-${c.id}'} type="number" defaultValue={evalRec?.marks ?? ''} min="0" max={c.maxMarks} step="0.5" placeholder={'0-${c.maxMarks}'} disabled={selectedItem.status === 'COMPLETED'} />
                        </div>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                          <label style={{ fontSize: 11 }}>Comments</label>
                          <input id={'comment-${c.id}'} type="text" defaultValue={evalRec?.comment ?? ''} placeholder={'Enter ${c.name.toLowerCase()} comments...'} disabled={selectedItem.status === 'COMPLETED'} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                {(selectedItem.evaluationComponents || [])
                  .filter(c => c.evaluationType === 'SUPERVISOR' || c.evaluationType === 'EXTERNAL_EXAMINER')
                  .map(c => {
                    const e = (selectedItem.evaluations || []).find(ev => ev.componentId === c.id);
                    return (
                      <div key={c.id} style={{ padding: 12, background: 'var(--color-surface-container-low)', borderRadius: 8, border: '1px solid var(--color-outline-variant)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>{c.name} by {ROLE_LABEL[c.evaluatorRole]}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: e?.marks !== null && e?.marks !== undefined ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}>
                          {e?.marks !== null && e?.marks !== undefined ? e.marks : '-'}
                          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-on-surface-variant)' }}> / {c.maxMarks}</span>
                        </div>
                        {e?.comment && <div style={{ fontSize: 11, fontStyle: 'italic', marginTop: 4, color: 'var(--color-on-surface-variant)' }}>"{e.comment}"</div>}
                      </div>
                    );
                  })}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowDefenseModal(false)} disabled={saving}>
                <span className="material-symbols-outlined">close</span>Cancel
              </button>
              {selectedItem.status !== 'COMPLETED' && (
                <>
                  <button className="btn btn-primary" onClick={handleSaveAllDefenses} disabled={saving}>
                    <span className="material-symbols-outlined">{saving ? 'progress_activity' : 'check'}</span>
                    {saving ? 'Saving...' : 'Save All Defenses'}
                  </button>
                  <button className="btn btn-success" onClick={handleFinalize} disabled={saving}>
                    <span className="material-symbols-outlined">task_alt</span>
                    Finalize
                  </button>
                </>
              )}
              {selectedItem.status === 'COMPLETED' && (
                <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                  Completed
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary modal */}
      {showSummaryModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowSummaryModal(false)}>
          <div className="modal" style={{ maxWidth: 600, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info"><span className="material-symbols-outlined">fact_check</span></div>
              <div className="modal-header-text">
                <h2>Evaluation Summary</h2>
                <p>{selectedItem.project}</p>
              </div>
            </div>
            <div className="modal-body">
              {(selectedItem.evaluationComponents || []).map(c => {
                const e = (selectedItem.evaluations || []).find(ev => ev.componentId === c.id);
                const status = e?.marks !== null && e?.marks !== undefined ? 'done' : 'pending';
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, marginBottom: 8, background: status === 'done' ? 'var(--color-surface-container-low)' : 'transparent', border: '1px solid var(--color-outline-variant)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: status === 'done' ? 'var(--color-success-container)' : 'var(--color-surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: status === 'done' ? 'var(--color-on-success-container)' : 'var(--color-on-surface-variant)', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{status === 'done' ? 'check_circle' : 'pending'}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>Evaluated by {ROLE_LABEL[c.evaluatorRole]} Max {c.maxMarks} marks</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: status === 'done' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}>
                        {e?.marks !== null && e?.marks !== undefined ? e.marks : '-'}
                        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-on-surface-variant)' }}> / {c.maxMarks}</span>
                      </div>
                      {e?.submittedBy && <div style={{ fontSize: 10, color: 'var(--color-on-surface-variant)' }}>{e.submittedBy.firstName} {e.submittedBy.lastName}</div>}
                    </div>
                  </div>
                );
              })}
              <div style={{
                marginTop: 14, padding: 0, borderRadius: 12, overflow: 'hidden',
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', display: 'flex', alignItems: 'stretch',
              }}>
                <div style={{ padding: '14px 18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8' }}>award_star</span>
                    <span style={{ fontWeight: 600, fontSize: 12, color: '#94a3b8', letterSpacing: 0.5, textTransform: 'uppercase' }}>Grand Total</span>
                  </div>
                </div>
                <div style={{
                  padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 4,
                  background: 'rgba(255,255,255,0.06)', borderLeft: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>{totalMarks(selectedItem).toFixed(1)}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b', marginTop: 10 }}>/ {getMaxTotal(selectedItem)}</span>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowSummaryModal(false)}><span className="material-symbols-outlined">close</span>Close</button>
              <button className="btn btn-primary" onClick={() => handlePrintSingle(selectedItem)}><span className="material-symbols-outlined">print</span>Print / Save PDF</button>
            </div>
          </div>
        </div>
      )}

      {showForward && (
        <div className="modal-overlay" onClick={() => setShowForward(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon success"><span className="material-symbols-outlined">forward</span></div>
              <div className="modal-header-text">
                <h2>Forward Results</h2>
                <p>This will send all completed evaluations to the Examination Department. This action cannot be undone.</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowForward(false)}><span className="material-symbols-outlined">close</span>Cancel</button>
              <button className="btn btn-success" onClick={handleForward}><span className="material-symbols-outlined">check</span>Confirm Forward</button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export default Evaluations;
