import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import ErrorBoundary from '../components/ErrorBoundary';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

function Profile() {
  const navigate = useNavigate();
  const toast = useToast();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResetForm, setShowResetForm] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then(({ data }) => {
      setUserData(data);
      localStorage.setItem('user', JSON.stringify(data));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const user = userData || cachedUser;
  const [resetForm, setResetForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [resetting, setResetting] = useState(false);

  const roleLabel = user.role?.replace('_', ' ') || 'USER';
  const initials = `${user?.firstName?.[0] || 'U'}${user?.lastName?.[0] || ''}`;
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
  const createdDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : '—';

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetForm.currentPassword) return toast.warning('Enter your current password');
    if (!resetForm.newPassword) return toast.warning('Enter a new password');
    if (resetForm.newPassword.length < 6) return toast.warning('Password must be at least 6 characters');
    if (resetForm.newPassword !== resetForm.confirmPassword) return toast.warning('Passwords do not match');
    setResetting(true);
    try {
      await api.post('/auth/change-password', { currentPassword: resetForm.currentPassword, newPassword: resetForm.newPassword });
      toast.success('Password updated successfully');
      setShowResetForm(false);
      setResetForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update password');
    } finally {
      setResetting(false);
    }
  };

  return (
    <ErrorBoundary><PageLayout title="Profile" user={user}>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Left: Main Profile Card */}
        <div className="card" style={{ flex: 2, minWidth: 280, marginBottom: 0 }}>
          {/* Avatar + Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '24px 0 16px', borderBottom: '1px solid var(--color-outline-variant)', marginBottom: 20 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--color-primary)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 700
            }}>
              {initials}
            </div>
            <div>
              <h2 style={{ fontSize: 22, margin: '0 0 4px' }}>{fullName}</h2>
              <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontSize: 14 }}>{user?.email || '—'}</p>
            </div>
          </div>

          {/* Personal Information */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-on-surface-variant)', marginBottom: 16 }}>
              Personal Information
            </div>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Full Name</span>
                <span style={{ fontWeight: 600 }}>{fullName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email Address</span>
                <span style={{ wordBreak: 'break-all' }}>{user?.email || '—'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Role</span>
                <span>{roleLabel}</span>
              </div>
              {user.role === 'STUDENT' && (
                <div className="detail-item">
                  <span className="detail-label">Degree Type</span>
                  <span>{user?.degreeType}</span>
                </div>
              )}
              {user.designation && (
                <div className="detail-item">
                  <span className="detail-label">Designation</span>
                  <span>{user.designation}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Program</span>
                <span>{user.program?.name ? `${user.program.name} (${user.program.code})` : '—'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Department</span>
                <span>{user.department?.name || '—'}</span>
              </div>

            </div>
          </div>

          {/* Account Details */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-on-surface-variant)', marginBottom: 16 }}>
              Account Details
            </div>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Account Created</span>
                <span>{createdDate}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status</span>
                <span className="badge badge-active"><span className="dot" />Active</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--color-outline-variant)' }}>
            <button className="btn btn-outline" onClick={() => navigate(-1)}>
              <span className="material-symbols-outlined">arrow_back</span>
              Back
            </button>
          </div>
        </div>

        {/* Right: Account Status + Reset Password */}
        <div style={{ width: 300, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Reset Password Card */}
          <div className="card">
            <div className="card-header">
              <h3>Reset Password</h3>
            </div>
            {!showResetForm ? (
              <div style={{ padding: '0 4px' }}>
                <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', margin: '0 0 12px' }}>
                  Update your account password. You'll need your current password.
                </p>
                <button className="btn btn-primary btn-block" onClick={() => setShowResetForm(true)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock_reset</span>
                  Change Password
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label>Current Password</label>
                  <input type="password" className="form-input" value={resetForm.currentPassword} onChange={e => setResetForm(f => ({ ...f, currentPassword: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" className="form-input" value={resetForm.newPassword} onChange={e => setResetForm(f => ({ ...f, newPassword: e.target.value }))} minLength={6} required />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input type="password" className="form-input" value={resetForm.confirmPassword} onChange={e => setResetForm(f => ({ ...f, confirmPassword: e.target.value }))} minLength={6} required />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button type="submit" className="btn btn-primary" disabled={resetting} style={{ flex: 1 }}>
                    {resetting ? 'Updating...' : 'Update'}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => { setShowResetForm(false); setResetForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Account Status */}
          <div className="card">
            <div className="card-header">
              <h3>Account Status</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, borderRadius: 8, background: 'var(--color-surface-container-low)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--color-success)' }}>check_circle</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Active</div>
                  <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Account is active</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, borderRadius: 8, background: 'var(--color-surface-container-low)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--color-primary)' }}>verified</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Verified</div>
                  <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Email verified</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PageLayout></ErrorBoundary>
  );
}

export default Profile;
