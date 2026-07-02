const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ROLE_LABEL = {
  SUPERVISOR: 'Supervisor',
  COORDINATOR: 'Coordinator',
  EXTERNAL_EXAMINER: 'Internal Examiner',
  STUDENT: 'Student',
  MAINTAINER: 'Maintainer',
};

/**
 * Create a notification for a single user.
 */
async function notify(userId, type, message) {
  if (!userId) return null;
  try {
    return await prisma.notification.create({ data: { userId, type, message } });
  } catch (e) {
    console.error('notify error:', e.message);
    return null;
  }
}

/**
 * Create notifications for multiple users (skips duplicates / nulls).
 */
async function notifyMany(userIds, type, message) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return;
  try {
    return await prisma.notification.createMany({
      data: ids.map(userId => ({ userId, type, message })),
    });
  } catch (e) {
    console.error('notifyMany error:', e.message);
  }
}

/**
 * Notify all users with a given role.
 */
async function notifyRole(role, type, message) {
  const users = await prisma.user.findMany({ where: { role }, select: { id: true } });
  return notifyMany(users.map(u => u.id), type, message);
}

// ── Helpers to gather recipient IDs ──────────────────────────

async function getGroupStudentIds(groupId) {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { studentId: true },
  });
  return members.map(m => m.studentId);
}

async function getGroupNotifyIds(groupId, { includeStudents = true } = {}) {
  const group = await prisma.projectGroup.findUnique({
    where: { id: groupId },
    select: { supervisorId: true, members: { select: { studentId: true } } },
  });
  if (!group) return [];
  const ids = [];
  if (group.supervisorId) ids.push(group.supervisorId);
  if (includeStudents) ids.push(...group.members.map(m => m.studentId));
  return ids;
}

async function getThesisNotifyIds(thesisId, { includeStudent = true } = {}) {
  const thesis = await prisma.thesis.findUnique({
    where: { id: thesisId },
    select: { supervisorId: true, studentId: true },
  });
  if (!thesis) return [];
  const ids = [];
  if (thesis.supervisorId) ids.push(thesis.supervisorId);
  if (includeStudent && thesis.studentId) ids.push(thesis.studentId);
  return ids;
}

async function getCoordinatorIds() {
  const users = await prisma.user.findMany({ where: { role: 'COORDINATOR' }, select: { id: true } });
  return users.map(u => u.id);
}

// ── Domain-specific notification helpers ─────────────────────

/**
 * Student uploaded a proposal/defense document.
 * Notify: supervisor + coordinators (not the student who uploaded).
 */
async function notifyProposalUpload({ groupId, thesisId, stage, uploaderId, studentName, itemTitle }) {
  const stageLabel = stage === 'MID_TERM' ? 'Mid-Term' : stage.charAt(0) + stage.slice(1).toLowerCase();
  const recipients = [
    ...(groupId ? await getGroupNotifyIds(groupId, { includeStudents: false }) : await getThesisNotifyIds(thesisId, { includeStudent: false })),
    ...await getCoordinatorIds(),
  ].filter(id => id !== uploaderId);
  return notifyMany(recipients, 'PROPOSAL_UPLOAD', `${studentName} uploaded a ${stageLabel} document for "${itemTitle}"`);
}

/**
 * Someone submitted/updated evaluation marks.
 * Notify: students + supervisor + coordinators (excluding the submitter).
 */
async function notifyMarksSubmitted({ groupId, thesisId, componentName, marks, maxMarks, evaluatorRole, itemTitle, submitterId }) {
  const recipients = [
    ...(groupId ? await getGroupNotifyIds(groupId) : await getThesisNotifyIds(thesisId)),
    ...await getCoordinatorIds(),
  ].filter(id => id !== submitterId);
  const roleLabel = ROLE_LABEL[evaluatorRole] || evaluatorRole;
  const marksStr = marks !== null && marks !== undefined ? `${marks}/${maxMarks}` : `cleared`;
  return notifyMany(recipients, 'MARKS_SUBMITTED', `${roleLabel} marks for "${itemTitle}" — ${componentName}: ${marksStr}`);
}

/**
 * Coordinator assigned an examiner to a group/thesis.
 * Notify: the examiner + students + supervisor.
 */
async function notifyExaminerAssignment({ examinerId, itemTitle, type, assignerName }) {
  const typeLabel = type === 'group' ? 'bachelor project' : 'master thesis';
  return notify(examinerId, 'EXAMINER_ASSIGNMENT', `${assignerName} assigned you as Internal Examiner for "${itemTitle}" (${typeLabel})`);
}

/**
 * Coordinator assigned a supervisor to a group/thesis.
 * Notify: the supervisor + students.
 */
async function notifySupervisorAssignment({ supervisorId, itemTitle, type, assignerName, studentIds }) {
  const typeLabel = type === 'group' ? 'bachelor project' : 'master thesis';
  const recs = [supervisorId, ...studentIds].filter(Boolean);
  return notifyMany(recs, 'SUPERVISOR_ASSIGNMENT', `${assignerName} assigned a supervisor for "${itemTitle}" (${typeLabel})`);
}

/**
 * Project/thesis status changed.
 * Notify: students + supervisor.
 */
async function notifyStatusChange({ groupId, thesisId, oldStatus, newStatus, itemTitle, changerId }) {
  const recipients = [
    ...(groupId ? await getGroupNotifyIds(groupId) : await getThesisNotifyIds(thesisId)),
  ].filter(id => id !== changerId);
  return notifyMany(recipients, 'STATUS_CHANGE', `Status changed for "${itemTitle}": ${oldStatus} → ${newStatus}`);
}

module.exports = {
  notify,
  notifyMany,
  notifyRole,
  getGroupStudentIds,
  getGroupNotifyIds,
  getThesisNotifyIds,
  getCoordinatorIds,
  notifyProposalUpload,
  notifyMarksSubmitted,
  notifyExaminerAssignment,
  notifySupervisorAssignment,
  notifyStatusChange,
};
