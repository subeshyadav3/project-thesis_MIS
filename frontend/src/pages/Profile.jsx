import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';

function Profile() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const roleLabel = user.role?.replace('_', ' ') || 'USER';
  const initials = `${user?.firstName?.[0] || 'U'}${user?.lastName?.[0] || ''}`;
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
  const createdDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : '—';

  return (
    <PageLayout title="Profile" user={user}>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Left: Main Profile Card */}
        <div className="card" style={{ flex: 2, minWidth: 280, marginBottom: 0 }}>
          <div className="card-header">
            <h3>Profile</h3>
            <span className={`badge badge-${user?.role?.toLowerCase() || 'pending'}`}>
              <span className="dot" />
              {roleLabel}
            </span>
          </div>

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
              <div className="detail-item">
                <span className="detail-label">User ID</span>
                <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{user?.id || '—'}</span>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div>
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

        {/* Right: Summary Card */}
        <div style={{ width: 280, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Account Status */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header" style={{ paddingBottom: 12 }}>
              <h3>Account Status</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: 'var(--color-success-container)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-success)' }}>check_circle</span>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Active</div>
                  <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Your account is active</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: 'var(--color-primary-container)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-primary)' }}>verified</span>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Verified</div>
                  <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>Email verified</div>
                </div>
              </div>
            </div>
          </div>

          {/* Role Info */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header" style={{ paddingBottom: 12 }}>
              <h3>Role & Permissions</h3>
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 8px' }}><strong style={{ color: 'var(--color-on-surface)' }}>{roleLabel}</strong></p>
              {user.role === 'SUPERVISOR' ? (
                <p style={{ margin: 0 }}>You can evaluate student projects and theses, provide feedback, and issue recommendation letters.</p>
              ) : user.role === 'COORDINATOR' ? (
                <p style={{ margin: 0 }}>You can manage student groups, assign supervisors, track evaluations, and forward results to the Examination Department.</p>
              ) : user.role === 'MAINTAINER' ? (
                <p style={{ margin: 0 }}>You have full system access to manage users, departments, and system configurations.</p>
              ) : user.role === 'STUDENT' ? (
                <p style={{ margin: 0 }}>You can view your project/thesis details, submit documents, and track evaluations and feedback.</p>
              ) : user.role === 'EXTERNAL_EXAMINER' ? (
                <p style={{ margin: 0 }}>You can view assigned projects and theses, and submit evaluation marks and comments.</p>
              ) : (
                <p style={{ margin: 0 }}>Standard user access.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default Profile;
