import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

function ResetPassword() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const navigate = useNavigate();

  const handleRequest = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) return toast.warning('Please enter your email');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('If the email exists, a reset link has been sent.');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send reset email';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) return toast.warning('Please enter your email');
    if (!newPassword) return toast.warning('Please enter a new password');
    if (newPassword.length < 6) return toast.warning('Password must be at least 6 characters');
    if (newPassword !== confirmPassword) return toast.warning('Passwords do not match');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, newPassword });
      toast.success('Password reset successfully. Please login.');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to reset password';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="academic-mesh" style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }} />

      <div className="login-wrapper">
        {/* Left: Branding (same as login) */}
        <div className="login-brand">
          <div className="login-brand-badge">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>verified</span>
            SECURE INSTITUTIONAL PORTAL
          </div>

          <h1>Thesis/Project Management System of IOE</h1>
          <p>A centralized platform for managing academic theses, project groups, evaluations, and supervisor assignments at the Institute of Engineering.</p>

          <div className="login-features">
            <div className="login-feature-card">
              <div className="feature-icon">
                <span className="material-symbols-outlined">groups</span>
              </div>
              <h3>Project Management</h3>
              <p>Streamlined group creation, supervisor assignments, and tracking for bachelor projects.</p>
            </div>
            <div className="login-feature-card">
              <div className="feature-icon">
                <span className="material-symbols-outlined">shield</span>
              </div>
              <h3>Role-Based Access</h3>
              <p>Secure role-based authorization with full audit trails for all administrative actions.</p>
            </div>
          </div>
        </div>

        {/* Right: Reset Password Form */}
        <div className="login-card animate-fade-in-up">
          <h2>Reset Password</h2>
          <p className="login-subtitle">
            {!sent ? 'Enter your email to receive reset instructions.' : 'Check your email for reset instructions.'}
          </p>

          {error && (
            <div className="login-error">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          )}

          {!sent ? (
            <form className="login-form" onSubmit={handleRequest}>
              <div className="login-field">
                <label>EMAIL</label>
                <div className="input-wrapper">
                  <span className="material-symbols-outlined">badge</span>
                  <input
                    type="email"
                    placeholder="e.g. name@ioe.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span>
                    Sending...
                  </>
                ) : (
                  <>
                    Send Reset Link
                    <span className="material-symbols-outlined">send</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-success)' }}>mark_email_read</span>
              <p style={{ marginTop: 16, color: 'var(--color-on-surface-variant)', fontSize: 14 }}>Check your email for reset instructions.</p>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <a href="/login" className="link" style={{ fontSize: 13 }}>Back to Login</a>
          </div>

          <div className="login-footer">
            <p>Institute of Engineering &copy; 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
