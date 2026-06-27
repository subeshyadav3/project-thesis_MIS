import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

const ROLE_LABEL = {
  SUPERVISOR: 'Supervisor',
  COORDINATOR: 'Coordinator',
  EXTERNAL_EXAMINER: 'Internal Examiner',
};

function ProjectDetail() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [summary, setSummary] = useState(null);
  const [components, setComponents] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSupervisor = user.role === 'SUPERVISOR';
  const isCoordinator = user.role === 'COORDINATOR';

  const loadData = () => {
    setLoading(true);
    const endpoint = type === 'group' ? `/groups/${id}` : `/theses/${id}`;
    api.get(endpoint)
      .then(({ data }) => setItem(data))
      .catch(() => {});
    const evalEndpoint = type === 'group' ? `/evaluations/group/${id}` : `/evaluations/thesis/${id}`;
    api.get(evalEndpoint)
      .then(({ data }) => {
        setSummary(data.summary || null);
        setComponents(data.components || []);
        setEvaluations(data.evaluations || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [id, type]);

  // Find a component by evaluationType
  const componentByType = (evalType) => components.find(c => c.evaluationType === evalType);
  const evaluationForComponent = (compId) => evaluations.find(e => e.componentId === compId);

  const handleSaveComponent = async (component, marksValue, comment) => {
    if (marksValue === '' || marksValue === null || marksValue === undefined) {
      toast.warning('Please enter marks');
      return;
    }
    const m = parseFloat(marksValue);
    if (Number.isNaN(m) || m < 0 || m > component.maxMarks) {
      toast.warning(`Marks must be between 0 and ${component.maxMarks}`);
      return;
    }
    try {
      const payload = {
        componentId: component.id,
        marks: m,
        comment: comment || null,
      };
      if (type === 'group') payload.groupId = parseInt(id); else payload.thesisId = parseInt(id);
      await api.post('/evaluations/marks', payload);
      toast.success(`${component.name} marks saved`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to save ${component.name}`);
    }
  };

  const name = type === 'group' ? item?.name : `${item?.student?.firstName} ${item?.student?.lastName}`;
  const title = type === 'group' ? item?.projectTitle : item?.title;
  const backPath = isSupervisor
    ? (type === 'group' ? '/supervisor/bachelor' : '/supervisor/master')
    : (type === 'group' ? '/coordinator/bachelor' : '/coordinator/master');

  // Sort components in evaluation order
  const orderedComponents = [...components].sort((a, b) => {
    const order = ['PROPOSAL_DEFENSE', 'MIDTERM_DEFENSE', 'FINAL_DEFENSE', 'SUPERVISOR', 'EXTERNAL_EXAMINER'];
    return order.indexOf(a.evaluationType) - order.indexOf(b.evaluationType);
  });

  return (
    <PageLayout title={title} subtitle={name || ''} user={user}
      actions={
        <button className="btn btn-outline btn-sm" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate(backPath); }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span> Back
        </button>
      }
    >
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">score</span></div>
          <div className="stat-number">{summary ? summary.total : 0}</div>
          <div className="stat-label">Total Marks / {summary?.maxTotal || 50}</div>
        </div>
        <div className="stat-card bento-card">
          <div className="stat-icon"><span className="material-symbols-outlined">check_circle</span></div>
          <div className="stat-number">{summary?.completedCount || 0}<span style={{ fontSize: 16, color: 'var(--color-on-surface-variant)' }}>/{summary?.totalCount || 5}</span></div>
          <div className="stat-label">Components Evaluated</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><h3>Evaluation Breakdown</h3></div>
        {orderedComponents.length === 0 ? (
          <p style={{ color: 'var(--color-on-surface-variant)' }}>No evaluation components yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orderedComponents.map(c => {
              const e = evaluationForComponent(c.id);
              const hasMarks = e && e.marks !== null && e.marks !== undefined;
              return (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                  borderRadius: 8,
                  background: hasMarks ? 'var(--color-surface-container-low)' : 'transparent',
                  border: '1px solid var(--color-outline-variant)'
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: hasMarks ? 'var(--color-success-container)' : 'var(--color-surface-container)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: hasMarks ? 'var(--color-on-success-container)' : 'var(--color-on-surface-variant)',
                    flexShrink: 0,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      {hasMarks ? 'check_circle' : 'pending'}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>
                      Evaluated by {ROLE_LABEL[c.evaluatorRole]} · Max {c.maxMarks} marks
                    </div>
                    {e?.comment && (
                      <div style={{ fontSize: 12, fontStyle: 'italic', marginTop: 4, color: 'var(--color-on-surface-variant)' }}>
                        "{e.comment}"
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: hasMarks ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}>
                      {hasMarks ? e.marks : '—'}
                      <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-on-surface-variant)' }}> / {c.maxMarks}</span>
                    </div>
                    {e?.submittedBy && (
                      <div style={{ fontSize: 10, color: 'var(--color-on-surface-variant)' }}>
                        by {e.submittedBy.firstName} {e.submittedBy.lastName}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 14, borderRadius: 8, background: 'var(--color-primary-container)', border: '2px solid var(--color-primary)' }}>
              <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-on-primary)' }}>Grand Total</span>
              <span style={{ fontWeight: 800, fontSize: 24, color: 'var(--color-on-primary)' }}>
                {summary?.total ?? 0} <span style={{ fontWeight: 400, fontSize: 14 }}>/ {summary?.maxTotal ?? 50}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SUPERVISOR: enter/edit the 25-mark Supervisor component */}
      {isSupervisor && (() => {
        const comp = componentByType('SUPERVISOR');
        if (!comp) return null;
        const evalRec = evaluationForComponent(comp.id);
        return (
          <SupervisorMarksCard
            component={comp}
            evaluation={evalRec}
            onSave={(marks, comment) => handleSaveComponent(comp, marks, comment)}
          />
        );
      })()}

      {/* COORDINATOR: enter/edit the 3 defense components */}
      {isCoordinator && (() => {
        const defenseComponents = ['PROPOSAL_DEFENSE', 'MIDTERM_DEFENSE', 'FINAL_DEFENSE']
          .map(t => componentByType(t))
          .filter(Boolean);
        return (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {defenseComponents.map(c => (
              <DefenseCard
                key={c.id}
                component={c}
                evaluation={evaluationForComponent(c.id)}
                onSave={(marks, comment) => handleSaveComponent(c, marks, comment)}
              />
            ))}
          </div>
        );
      })()}
    </PageLayout>
  );
}

function SupervisorMarksCard({ component, evaluation, onSave }) {
  const [marks, setMarks] = useState(evaluation?.marks?.toString() ?? '');
  const [comment, setComment] = useState(evaluation?.comment ?? '');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setMarks(evaluation?.marks?.toString() ?? '');
    setComment(evaluation?.comment ?? '');
  }, [evaluation?.id, evaluation?.marks, evaluation?.comment]);

  const submit = async () => {
    setSaving(true);
    try { await onSave(marks, comment); }
    finally { setSaving(false); }
  };

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="card-header">
        <div>
          <h3 style={{ margin: 0 }}>{component.name} Evaluation</h3>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
            Continuous assessment of progress, quality of work and engagement throughout the project.
          </p>
        </div>
        <span className="badge" style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' }}>
          Max: {component.maxMarks}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'start' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: 12 }}>Marks (out of {component.maxMarks})</label>
          <input
            type="number"
            value={marks}
            onChange={e => setMarks(e.target.value)}
            max={component.maxMarks}
            min="0"
            step="0.5"
            placeholder="0"
            style={{ fontSize: 20, fontWeight: 700, textAlign: 'center' }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: 12 }}>Comment (optional)</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Share your overall assessment of the student's performance..."
            style={{ minHeight: 80, width: '100%' }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          <span className="material-symbols-outlined">{saving ? 'progress_activity' : 'save'}</span>
          {saving ? 'Saving...' : 'Save Supervisor Marks'}
        </button>
      </div>
    </div>
  );
}

function DefenseCard({ component, evaluation, onSave }) {
  const [marks, setMarks] = useState(evaluation?.marks?.toString() ?? '');
  const [comment, setComment] = useState(evaluation?.comment ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMarks(evaluation?.marks?.toString() ?? '');
    setComment(evaluation?.comment ?? '');
  }, [evaluation?.id, evaluation?.marks, evaluation?.comment]);

  const submit = async () => {
    setSaving(true);
    try { await onSave(marks, comment); }
    finally { setSaving(false); }
  };

  return (
    <div className="card" style={{ flex: 1, minWidth: 240 }}>
      <div className="card-header">
        <h3>{component.name}</h3>
        <span className="badge" style={{ background: 'var(--color-secondary-container)', color: 'var(--color-on-secondary-container)' }}>
          Max: {component.maxMarks}
        </span>
      </div>
      <div className="form-group">
        <label style={{ fontSize: 12 }}>Marks (out of {component.maxMarks})</label>
        <input
          type="number"
          value={marks}
          onChange={e => setMarks(e.target.value)}
          max={component.maxMarks}
          min="0"
          step="0.5"
          placeholder="0"
        />
      </div>
      <div className="form-group">
        <label style={{ fontSize: 12 }}>Comment</label>
        <input
          type="text"
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder={`${component.name} comments...`}
        />
      </div>
      <button className="btn btn-primary" onClick={submit} disabled={saving} style={{ width: '100%' }}>
        <span className="material-symbols-outlined">{saving ? 'progress_activity' : 'save'}</span>
        {saving ? 'Saving...' : 'Save Marks'}
      </button>
    </div>
  );
}

export default ProjectDetail;
