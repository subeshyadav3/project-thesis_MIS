import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../components/ui';
import PageLayout from '../../components/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import ErrorBoundary from '../../components/ErrorBoundary';
import { Link } from 'react-router-dom';

const FIELD_TYPES = { TEXT: 'text', TEXTAREA: 'textarea', NUMBER: 'number', DATE: 'date', EMAIL: 'email' };

const DEFAULT_STUDENT_FORM_FIELDS = [
  { key: 'projectType', label: 'Proposal Type (Thesis / Project)', type: 'select', required: true, options: ['Thesis', 'Project'] },
  { key: 'program', label: 'Program', type: 'select', required: true, options: ['MSDSA', 'MSCSK', 'MSICE', 'MSNCS'] },
  { key: 'cluster', label: 'Research Project Cluster / Area', type: 'select', required: true, options: ['AI/ML and image processing', 'Audio, NLP and data/text analytics', 'Electronic devices, circuits and communication', 'Computer networks and security'] },
  { key: 'is_guided', label: 'Is it a guided proposal? (topic provided by a faculty member)', type: 'select', required: true, options: ['Yes', 'No'] },
  { key: 'primary_supervisor', label: 'Primary faculty member consulted or preferred as supervisor', type: 'text', required: false, placeholder: 'Enter primary supervisor name (optional)' },
  { key: 'secondary_supervisor', label: 'Secondary faculty member(s) consulted or preferred as supervisor', type: 'text', required: false, placeholder: 'Enter secondary supervisor name(s) (optional)' },
  { key: 'pdfUrl', label: 'Concept Note Project Proposal Document (PDF, max 10MB)', type: 'file', required: true, note: 'Name file with your Roll Number (e.g., 080MSDSA010.pdf)' },
  { key: 'remarks', label: 'Remarks (if any)', type: 'textarea', required: false, placeholder: 'Additional comments...' },
];

function FormSubmissionModal({ announcement, toast, onClose, onSubmit }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const fields = (announcement.formFields && announcement.formFields.length > 0)
    ? announcement.formFields
    : DEFAULT_STUDENT_FORM_FIELDS;

  const initialData = announcement.formSubmitted?.formData || {};

  const [form, setForm] = useState(() => {
    const init = {
      title: initialData.title || '',
      description: initialData.description || '',
      program: initialData.program || user.program?.code || '',
      projectType: initialData.projectType || 'Thesis',
    };
    fields.forEach(f => {
      if (f.key) init[f.key] = initialData[f.key] !== undefined ? initialData[f.key] : '';
    });
    return init;
  });
  const [submitting, setSubmitting] = useState(false);
  const isLate = !!(announcement.expirationDate && new Date() > new Date(announcement.expirationDate));

  const handleSubmit = async () => {
    const title = (form.title || '').trim();
    const description = (form.description || form.remarks || form.title || '').trim();
    if (!title) return toast.error('Concept title is required');

    for (const f of fields) {
      if (f.required && !form[f.key]) {
        return toast.error(`${f.label} is required`);
      }
    }

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
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="modal-header-icon warning">
            <Icon name="description" className="material-symbols-outlined" />
          </div>
          <div className="modal-header-text">
            <h2>{announcement.formSubmitted?.submitted ? 'Edit Concept Form' : (announcement.title?.toLowerCase().includes('project') ? 'MSc Project Concept Proposal Form' : 'MSc Thesis / Project Concept Proposal Form')}</h2>
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

          {/* Student Profile Info Card */}
          <div style={{ border: '1px solid var(--color-outline-variant)', borderRadius: 8, background: 'var(--color-surface-container-lowest)', padding: '10px 14px' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-on-surface)' }}>
              Student Profile (Auto-Linked)
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>
              Name: <strong>{user.firstName} {user.lastName}</strong> | Roll: <strong>{user.rollNumber || '—'}</strong> | Email: <strong>{user.email}</strong>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Project / Thesis Concept Title <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Enter proposed concept title" />
          </div>

          {fields.map(f => {
            const isBachelor = user?.program?.degreeType === 'BACHELOR' || announcement?.degreeType === 'BACHELOR';
            const isCluster = f.key?.toLowerCase().includes('cluster') || f.label?.toLowerCase().includes('cluster');
            const isProgram = f.key?.toLowerCase().includes('program') || f.label?.toLowerCase().includes('program');
            const isGuided = f.key?.toLowerCase().includes('guided') || f.label?.toLowerCase().includes('guided');
            const bachelorClusters = ['AIML', 'IPCV', 'ANLP', 'NTS', 'EDMES', 'ACOM', 'EII'];
            const masterClusters = ['AI/ML and image processing', 'Audio, NLP and data/text analytics', 'Electronic devices, circuits and communication', 'Computer networks and security'];
            const selectOptions = f.options || (isCluster ? (isBachelor ? bachelorClusters : masterClusters) : isProgram ? (isBachelor ? ['BCT', 'BCE', 'BEI', 'BGE', 'BME', 'BIE'] : ['MSDSA', 'MSCSK', 'MSICE', 'MSNCS']) : isGuided ? ['Yes', 'No'] : null);

            return (
              <div className="form-group" key={f.key} style={{ margin: 0 }}>
                <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {f.label} {f.required ? <span style={{ color: 'var(--color-error)' }}>*</span> : <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal', fontSize: 11, color: 'var(--color-on-surface-variant)' }}>(optional)</span>}
                </label>
                {f.type === 'file' ? (
                  <div>
                    <input
                      className="form-input"
                      type="file"
                      accept=".pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const uploadData = new FormData();
                          uploadData.append('document', file);
                          uploadData.append('isStandalone', 'true');
                          uploadData.append('stage', 'PROPOSAL');
                          uploadData.append('documentType', 'PROPOSAL');
                          try {
                            const { data } = await api.post('/students/upload', uploadData, { headers: { 'Content-Type': 'multipart/form-data' } });
                            const url = data.documentUrl || data.url || data.path;
                            setForm(prev => ({ ...prev, [f.key]: url }));
                            toast.success('PDF document uploaded successfully!');
                          } catch (err) {
                            toast.error(err.response?.data?.error || 'Failed to upload PDF document');
                          }
                        }
                      }}
                    />
                    {form[f.key] ? (
                      <p style={{ fontSize: 12, color: 'var(--color-success)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="check_circle" className="material-symbols-outlined" style={{ fontSize: 16 }} />
                        Document attached successfully!
                      </p>
                    ) : (
                      <p style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', margin: '4px 0 0' }}>
                        {f.note || 'Named with student Roll e.g., 080MSDSA010.pdf'}
                      </p>
                    )}
                  </div>
                ) : selectOptions || f.type === 'select' || f.type === 'radio' ? (
                  <select className="form-input" value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}>
                    <option value="">Select option...</option>
                    {(selectOptions || ['Yes', 'No']).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
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
            Submitting this form creates your thesis concept note proposal for coordinator review.
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            <Icon name={submitting ? 'sync' : 'send'} className={`material-symbols-outlined ${submitting ? 'spin' : ''}`} />
            {submitting ? 'Saving...' : announcement.formSubmitted?.submitted ? 'Update Form' : 'Submit Form'}
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
      toast.success('Thesis form submitted! It is now pending coordinator review.');
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
              const isUnderReview = submitted && (a.formSubmitted?.status === 'UNDER_REVIEW' || a.formSubmitted?.status === 'REVIEWED');
              const isFinalized = submitted && (a.formSubmitted?.status === 'FINALIZED' || Boolean(a.formSubmitted?.thesisId));
              const isLocked = isFinalized || isUnderReview;
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
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {isFinalized ? (
                            <span className="badge badge-completed"><Icon name="lock" className="material-symbols-outlined" style={{ fontSize: 12 }} /> Finalized by Coordinator</span>
                          ) : isUnderReview ? (
                            <span className="badge badge-info"><Icon name="lock" className="material-symbols-outlined" style={{ fontSize: 12 }} /> Reviewed by Coordinator (Locked)</span>
                          ) : a.formSubmitted.status === 'LATE_SUBMITTED' ? (
                            <span className="badge badge-warning"><span className="dot" />Submitted late — awaiting approval</span>
                          ) : (
                            <span className="badge badge-completed"><span className="dot" />Submitted (Editable)</span>
                          )}
                          {a.formSubmitted.thesisId && (
                            <Link to={`/student/theses/${a.formSubmitted.thesisId}`} style={{ fontSize: 13 }}>
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
                      ) : !isLocked ? (
                        <button className="btn btn-outline" onClick={() => setSelected(a)}>
                          <Icon name="edit" className="material-symbols-outlined" /> Edit Submission
                        </button>
                      ) : (
                        <button className="btn btn-outline" disabled>
                          <Icon name="lock" className="material-symbols-outlined" /> {isFinalized ? 'Finalized' : 'Under Review'}
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
