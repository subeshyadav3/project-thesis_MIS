import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../components/ui';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import ErrorBoundary from '../../components/ErrorBoundary';
import { Link } from 'react-router-dom';

const FIELD_TYPES = { TEXT: 'text', TEXTAREA: 'textarea', NUMBER: 'number', DATE: 'date', EMAIL: 'email' };

function FormSubmissionModal({ announcement, toast, onClose, onSubmit }) {
  const [form, setForm] = useState(() => {
    const init = { title: '', description: '' };
    (announcement.formFields || []).forEach(f => { init[f.key] = ''; });
    return init;
  });
  const [submitting, setSubmitting] = useState(false);
  const fields = announcement.formFields || [];
  const isLate = !!(announcement.expirationDate && new Date() > new Date(announcement.expirationDate));

  const handleSubmit = async () => {
    const title = (form.title || '').trim();
    const description = (form.description || '').trim();
    if (!title) return toast.error('Thesis title is required');
    if (!description) return toast.error('Thesis description is required');
    setSubmitting(true);
    try {
      await onSubmit({ title, description, ...Object.fromEntries(fields.map(f => [f.key, form[f.key]])) });
      setSubmitting(false);
    } catch (e) {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="modal-header-icon warning">
            <Icon name="description" className="material-symbols-outlined" />
          </div>
          <div className="modal-header-text">
            <h2>Submit Thesis Form</h2>
            <p>{announcement.title}</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" className="material-symbols-outlined" />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isLate && (
            <div className="alert alert-warning" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 'var(--border-radius-sm)' }}>
              <Icon name="warning" className="material-symbols-outlined" style={{ fontSize: 18 }} />
              <div>
                <strong>Late submission.</strong> The form deadline ({new Date(announcement.expirationDate).toLocaleDateString()}) has passed. Your proposal will require coordinator approval before it becomes visible.
              </div>
            </div>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Thesis Title <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Enter the proposed thesis title" />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Abstract / Description <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <textarea className="form-input" rows={6} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the research problem, objectives and methodology..." />
          </div>

          {fields.map(f => {
            const isCluster = f.key?.toLowerCase().includes('cluster') || f.label?.toLowerCase().includes('cluster');
            const isProgram = f.key?.toLowerCase().includes('program') || f.label?.toLowerCase().includes('program');
            const isGuided = f.key?.toLowerCase().includes('guided') || f.label?.toLowerCase().includes('guided');

            return (
              <div className="form-group" key={f.key} style={{ margin: 0 }}>
                <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {f.label} {f.required ? <span style={{ color: 'var(--color-error)' }}>*</span> : <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal', fontSize: 11, color: 'var(--color-on-surface-variant)' }}>(optional)</span>}
                </label>
                {isCluster ? (
                  <select className="form-input" value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}>
                    <option value="">Select Research Cluster...</option>
                    <option value="AI/ML and image processing">AI/ML and image processing</option>
                    <option value="Audio, NLP and data/text analytics">Audio, NLP and data/text analytics</option>
                    <option value="Electronic devices, circuits and communication">Electronic devices, circuits and communication</option>
                    <option value="Computer networks and security">Computer networks and security</option>
                  </select>
                ) : isProgram ? (
                  <select className="form-input" value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}>
                    <option value="">Select Program...</option>
                    <option value="MSDSA">MSDSA</option>
                    <option value="MSCSK">MSCSK</option>
                    <option value="MSICE">MSICE</option>
                    <option value="MSNCS">MSNCS</option>
                  </select>
                ) : isGuided ? (
                  <select className="form-input" value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}>
                    <option value="">Select Option...</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea className="form-input" rows={3} value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder || ''} />
                ) : (
                  <input
                    className="form-input"
                    type={FIELD_TYPES[f.type] || 'text'}
                    value={form[f.key] || ''}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.placeholder || ''}
                  />
                )}
              </div>
            );
          })}

          <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', display: 'flex', gap: 6, alignItems: 'center' }}>
            <Icon name="info" className="material-symbols-outlined" style={{ fontSize: 16 }} />
            Submitting this form creates your thesis and auto-generates the proposal document (PDF).
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            <Icon name={submitting ? 'sync' : 'send'} className="material-symbols-outlined" />
            {submitting ? 'Submitting...' : 'Submit Form'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentForms() {
  const [eligible, setEligible] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/announcements/eligible');
      setEligible(data.filter(a => a.formEnabled));
    } catch (e) {
      toast.error('Failed to load thesis forms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, []);

  const handleSubmit = async (formData) => {
    try {
      await api.post('/students/form-responses', { announcementId: selected.id, formData });
      toast.success('Thesis form submitted! Your thesis and proposal were created.');
      setSelected(null);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit form');
      throw err;
    }
  };

  const deadlinePassed = (a) => !!(a.expirationDate && new Date() > new Date(a.expirationDate));

  return (
    <ErrorBoundary>
      <PageLayout title="Thesis Forms" subtitle="Fill in the coordinator's thesis form to register your thesis" user={user}>
        {loading ? (
          <div className="loading-state"><Icon name="progress_activity" className="material-symbols-outlined spin" /><p>Loading...</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {eligible.length === 0 && (
              <div className="empty-state" style={{ padding: 60 }}>
                <Icon name="description" className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }} />
                <h3>No Thesis Forms Open</h3>
                <p>The coordinator has not opened any thesis registration forms yet. Check back later.</p>
              </div>
            )}

            {eligible.map(a => {
              const submitted = a.formSubmitted?.submitted;
              return (
                <div key={a.id} className="card">
                  <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 15 }}>{a.title}</strong>
                        <span className="badge badge-warning">Master Thesis</span>
                        {deadlinePassed(a) && <span className="badge badge-error">Deadline Passed</span>}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>{a.message}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span className="badge badge-active">
                          <Icon name="event" className="material-symbols-outlined" style={{ fontSize: 13 }} />
                          {a.expirationDate
                            ? `Deadline: ${new Date(a.expirationDate).toLocaleDateString()}`
                            : 'No deadline set'}
                        </span>
                        {a.batch && <span>Batch: {a.batch}</span>}
                        {(a.formFields?.length || 0) > 0 && <span>{a.formFields.length} additional field(s)</span>}
                      </div>
                      {submitted && (
                        <div style={{ marginTop: 8 }}>
                          {a.formSubmitted.status === 'LATE_SUBMITTED' ? (
                            <span className="badge badge-warning"><span className="dot" />Submitted late — awaiting approval</span>
                          ) : (
                            <span className="badge badge-completed"><span className="dot" />Submitted</span>
                          )}
                          {a.formSubmitted.thesisId && (
                            <Link to={`/student/theses/${a.formSubmitted.thesisId}`} style={{ marginLeft: 8, fontSize: 13 }}>
                              View thesis <Icon name="arrow_forward" className="material-symbols-outlined" style={{ fontSize: 13, verticalAlign: 'middle' }} />
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      {!submitted ? (
                        <button className="btn btn-primary" onClick={() => setSelected(a)}>
                          <Icon name="description" className="material-symbols-outlined" /> Fill Form
                        </button>
                      ) : (
                        <button className="btn btn-outline" disabled>
                          <Icon name="check_circle" className="material-symbols-outlined" /> Already Submitted
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selected && (
          <FormSubmissionModal
            announcement={selected}
            toast={toast}
            onClose={() => setSelected(null)}
            onSubmit={handleSubmit}
          />
        )}
      </PageLayout>
    </ErrorBoundary>
  );
}

export default StudentForms;
