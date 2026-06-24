import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Login successful');
      const rolePath = data.user.role === 'EXTERNAL_EXAMINER' ? 'external' : data.user.role.toLowerCase();
      navigate(`/${rolePath}`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed';
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
        {/* Left: Branding */}
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

        {/* Right: Login Form */}
        <div className="login-card animate-fade-in-up">
          <h2>Sign In</h2>
          <p className="login-subtitle">Enter your credentials to access the panel.</p>

          {error && (
            <div className="login-error">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
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

            <div className="login-field">
              <label>PASSWORD</label>
              <div className="input-wrapper">
                <span className="material-symbols-outlined">lock</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="login-options">
              <label>
                <input type="checkbox" defaultChecked />
                Remember me
              </label>
              <a href="#">Forgot Password?</a>
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span>
                  Signing in...
                </>
              ) : (
                <>
                  Access Portal
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>Institute of Engineering &copy; 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
