import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

function generateEmail({ firstName, lastName, role }) {
  const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z.]/g, '');
  const suffix = role === 'SUPERVISOR' ? 'sup' : 'ext';
  return `${base}.${suffix}@pcampus.edu.np`;
}

const DESIGNATION_OPTIONS = [
  'Assoc. Prof. Dr.',
  'Assoc. Prof.',
  'Asst. Prof. Dr.',
  'Asst. Prof.',
  'Prof. Dr.',
];

function normalizeName(name) {
  return name ? name.toLowerCase().replace(/\s+/g, ' ').trim() : '';
}

export default function BulkPendingUsersModal({ open, previewRows, type, departmentId, onComplete, onBack, onClose }) {
  const toast = useToast();
  const [creating, setCreating] = useState(false);

  const initialUsers = useMemo(() => {
    if (!previewRows || previewRows.length === 0) return [];
    const seen = new Map();
    for (const row of previewRows) {
      const candidates = [];
      if (type === 'groups') {
        if (row.supervisorWillCreate) candidates.push({ ...row.supervisorWillCreate, role: 'SUPERVISOR', rowKey: 'supervisor' });
        if (row.examinerWillCreate) candidates.push({ ...row.examinerWillCreate, role: 'EXTERNAL_EXAMINER', rowKey: 'examiner' });
      } else {
        if (row.supervisorWillCreate) candidates.push({ ...row.supervisorWillCreate, role: 'SUPERVISOR', rowKey: 'supervisor' });
        if (row.externalMidTermWillCreate) candidates.push({ ...row.externalMidTermWillCreate, role: 'EXTERNAL_EXAMINER', rowKey: 'externalMidTerm' });
        if (row.externalFinalWillCreate) candidates.push({ ...row.externalFinalWillCreate, role: 'EXTERNAL_EXAMINER', rowKey: 'externalFinal' });
      }
      for (const c of candidates) {
        const key = normalizeName(c.name);
        if (!seen.has(key)) {
          seen.set(key, {
            _key: key,
            firstName: c.firstName,
            lastName: c.lastName || c.firstName,
            email: generateEmail(c),
            role: c.role,
            designation: c.designation || DESIGNATION_OPTIONS[0],
          });
        }
      }
    }
    return Array.from(seen.values());
  }, [previewRows, type]);

  const [pendingUsers, setPendingUsers] = useState(initialUsers);

  useEffect(() => {
    setPendingUsers(initialUsers);
  }, [initialUsers]);

  const handleCreate = async () => {
    if (pendingUsers.length === 0) {
      onComplete(previewRows);
      return;
    }
    setCreating(true);
    try {
      const users = pendingUsers.map(u => ({
        email: u.email,
        password: 'subesh',
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        designation: u.designation || null,
        departmentId: departmentId || undefined,
      }));
      const { data } = await api.post('/users/bulk', { users });
      const createdCount = data.created?.length || 0;
      const failedCount = data.failed?.length || 0;

      const emailToIdMap = new Map();
      for (const u of data.created || []) {
        emailToIdMap.set(u.email.toLowerCase(), u.id);
      }

      const nameToEmailMap = new Map();
      for (const pu of pendingUsers) {
        nameToEmailMap.set(pu._key, pu.email);
      }

      const updatedRows = previewRows.map(row => {
        const r = { ...row };
        const updateField = (willCreateField, matchField, willCreateObj) => {
          if (!willCreateObj) return;
          const key = normalizeName(willCreateObj.name);
          const email = nameToEmailMap.get(key);
          const userId = email ? emailToIdMap.get(email.toLowerCase()) : null;
          if (userId) {
            r[matchField] = { id: userId, name: willCreateObj.name, score: 1.0, status: 'matched' };
            r[willCreateField] = null;
          }
        };
        if (type === 'groups') {
          updateField('supervisorWillCreate', 'supervisorMatch', row.supervisorWillCreate);
          updateField('examinerWillCreate', 'examinerMatch', row.examinerWillCreate);
        } else {
          updateField('supervisorWillCreate', 'supervisorMatch', row.supervisorWillCreate);
          updateField('externalMidTermWillCreate', 'externalMidTermMatch', row.externalMidTermWillCreate);
          updateField('externalFinalWillCreate', 'externalFinalMatch', row.externalFinalWillCreate);
        }
        return r;
      });

      const msg = [`Created ${createdCount} user(s)`];
      if (failedCount > 0) msg.push(`${failedCount} failed`);
      toast.success(msg.join(' · '));
      onComplete(updatedRows);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create users');
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div>
      {pendingUsers.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', marginBottom: 12 }}>
            Review the users that will be created. Same-name users are grouped together.
          </p>
          <div style={{ maxHeight: 300, overflow: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Role</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Email</th>
                  <th>Designation</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map(u => (
                  <tr key={u._key}>
                    <td>
                      <span className="badge" style={{ background: u.role === 'SUPERVISOR' ? 'var(--color-tertiary-container)' : 'var(--color-secondary-container)' }}>
                        {u.role === 'SUPERVISOR' ? 'Sup' : 'Ext'}
                      </span>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={u.firstName}
                        onChange={e => {
                          const updated = [...pendingUsers];
                          const idx = updated.findIndex(x => x._key === u._key);
                          updated[idx] = { ...updated[idx], firstName: e.target.value, email: generateEmail({ ...updated[idx], firstName: e.target.value }) };
                          setPendingUsers(updated);
                        }}
                        style={{ width: 120, padding: '4px 6px', fontSize: 12 }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={u.lastName}
                        onChange={e => {
                          const updated = [...pendingUsers];
                          const idx = updated.findIndex(x => x._key === u._key);
                          updated[idx] = { ...updated[idx], lastName: e.target.value, email: generateEmail({ ...updated[idx], lastName: e.target.value }) };
                          setPendingUsers(updated);
                        }}
                        style={{ width: 120, padding: '4px 6px', fontSize: 12 }}
                      />
                    </td>
                    <td>
                      <input
                        type="email"
                        value={u.email}
                        onChange={e => {
                          const updated = [...pendingUsers];
                          const idx = updated.findIndex(x => x._key === u._key);
                          updated[idx] = { ...updated[idx], email: e.target.value };
                          setPendingUsers(updated);
                        }}
                        style={{ width: 200, padding: '4px 6px', fontSize: 12 }}
                      />
                    </td>
                    <td>
                      <select
                        value={u.designation || DESIGNATION_OPTIONS[0]}
                        onChange={e => {
                          const updated = [...pendingUsers];
                          const idx = updated.findIndex(x => x._key === u._key);
                          updated[idx] = { ...updated[idx], designation: e.target.value };
                          setPendingUsers(updated);
                        }}
                        style={{ width: 140, padding: '4px 6px', fontSize: 12 }}
                      >
                        {DESIGNATION_OPTIONS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="modal-actions" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-outline" onClick={onBack} disabled={creating}>
          <span className="material-symbols-outlined">arrow_back</span>Back
        </button>
        <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={creating || pendingUsers.length === 0}>
          <span className="material-symbols-outlined">{creating ? 'progress_activity' : 'person_add'}</span>
          {creating ? 'Creating...' : pendingUsers.length > 0 ? `Create ${pendingUsers.length} user(s) & Continue` : 'Continue'}
        </button>
      </div>
    </div>
  );
}
