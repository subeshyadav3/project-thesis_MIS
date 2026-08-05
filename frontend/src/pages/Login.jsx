import React, { useState } from 'react';
import { Icon } from '../components/ui';
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
            <Icon name="verified" className="material-symbols-outlined" style={{ fontSize: 16 }} />
            SECURE INSTITUTIONAL PORTAL
          </div>

          <h1>Thesis/Project Management System of IOE</h1>
          <p>A centralized platform for managing academic theses, project groups, evaluations, and supervisor assignments at the Institute of Engineering.</p>

          <div className="login-features">
            <div className="login-feature-card">
              <div className="feature-icon">
                <Icon name="groups" className="material-symbols-outlined" />
              </div>
              <h3>Project Management</h3>
              <p>Streamlined group creation, supervisor assignments, and tracking for bachelor projects.</p>
            </div>
            <div className="login-feature-card">
              <div className="feature-icon">
                <Icon name="shield" className="material-symbols-outlined" />
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
              <Icon name="error" className="material-symbols-outlined" />
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label>EMAIL</label>
              <div className="input-wrapper">
                <Icon name="badge" className="material-symbols-outlined" />
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
                <Icon name="lock" className="material-symbols-outlined" />
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
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="material-symbols-outlined" />
                </button>
              </div>
            </div>

            <div className="login-options">
              <label>
                <input type="checkbox" defaultChecked />
                Remember me
              </label>
              <a href="/reset-password">Forgot Password?</a>
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? (
                <>
                  <Icon name="progress_activity" className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }} />
                  Signing in...
                </>
              ) : (
                <>
                  Access Portal
                  <Icon name="arrow_forward" className="material-symbols-outlined" />
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
