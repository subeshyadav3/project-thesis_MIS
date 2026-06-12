import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';

function Profile() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <PageLayout title="Profile" user={user}>
      <div className="profile-card bento-card">
        <div className="profile-header">
          <div className="profile-avatar-large">
            {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
          </div>
          <div className="profile-header-info">
            <h2>{user?.firstName} {user?.lastName}</h2>
            <span className="profile-role-badge">{user?.role?.replace('_', ' ') || 'USER'}</span>
          </div>
        </div>

        <div className="profile-details">
          <div className="profile-detail-row">
            <span className="profile-detail-label">Email</span>
            <span className="profile-detail-value">{user?.email || '—'}</span>
          </div>
          <div className="profile-detail-row">
            <span className="profile-detail-label">Role</span>
            <span className="profile-detail-value">{user?.role?.replace('_', ' ') || '—'}</span>
          </div>
          <div className="profile-detail-row">
            <span className="profile-detail-label">User ID</span>
            <span className="profile-detail-value">{user?.id || '—'}</span>
          </div>
        </div>

        <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
          <span className="material-symbols-outlined">arrow_back</span>
          Back
        </button>
      </div>
    </PageLayout>
  );
}

export default Profile;
