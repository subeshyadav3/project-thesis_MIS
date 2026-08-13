
const prisma = require('../utils/prisma');

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
async function notify(userId, type, message, linkTo) {
  if (!userId) return null;
  try {
    return await prisma.notification.create({ data: { userId, type, message, linkTo: linkTo || null } });
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
 * Notify: supervisor + relevant coordinator (not the student who uploaded).
 */
async function notifyProposalUpload({ groupId, thesisId, stage, uploaderId, studentName, itemTitle }) {
  const stageLabel = stage === 'MID_TERM' ? 'Mid-Term' : stage.charAt(0) + stage.slice(1).toLowerCase();
  const recipients = [
    ...(groupId ? await getGroupNotifyIds(groupId, { includeStudents: false }) : await getThesisNotifyIds(thesisId, { includeStudent: false })),
  ].filter(id => id !== uploaderId);
  const coordinatorId = await findCoordinatorForItem(groupId, thesisId);
  if (coordinatorId && coordinatorId !== uploaderId && !recipients.includes(coordinatorId)) {
    recipients.push(coordinatorId);
  }
  if (recipients.length === 0) return null;
  return notifyMany(recipients, 'PROPOSAL_UPLOAD', `${studentName} uploaded a ${stageLabel} document for "${itemTitle}"`);
}

/**
 * Someone submitted/updated evaluation marks.
 * Notify: the relevant coordinator only (excluding the submitter).
 * Rapid updates to the same item (e.g. saving a whole evaluation sheet)
 * are batched into a single notification.
 */
const pendingMarksBatches = new Map();

async function notifyMarksSubmitted({ groupId, thesisId, componentName, marks, maxMarks, evaluatorRole, itemTitle, submitterId }) {
  const roleLabel = ROLE_LABEL[evaluatorRole] || evaluatorRole;
  const marksStr = marks !== null && marks !== undefined ? `${marks}/${maxMarks}` : `cleared`;
  const itemKey = groupId ? `g:${groupId}` : `t:${thesisId}`;
  const batchKey = `${submitterId}:${itemKey}`;

  const flush = async (entry) => {
    pendingMarksBatches.delete(batchKey);
    const coordinatorId = await findCoordinatorForItem(groupId, thesisId);
    if (!coordinatorId || coordinatorId === submitterId) return;
    const detail = entry.count === 1
      ? entry.firstDetail
      : `${entry.count} components`;
    await notify(coordinatorId, 'MARKS_SUBMITTED', `${roleLabel} updated marks for "${itemTitle}" — ${detail}`);
  };

  const existing = pendingMarksBatches.get(batchKey);
  if (existing) {
    existing.count += 1;
    if (existing.names.length < 8) existing.names.push(`${componentName}: ${marksStr}`);
    clearTimeout(existing.timer);
    existing.timer = setTimeout(() => flush(existing), 800);
  } else {
    const entry = {
      count: 1,
      firstDetail: `${componentName}: ${marksStr}`,
      names: [`${componentName}: ${marksStr}`],
      timer: null,
    };
    entry.timer = setTimeout(() => flush(entry), 800);
    pendingMarksBatches.set(batchKey, entry);
  }
  return null;
}

/** Look up the coordinator for a group or thesis. */
async function findCoordinatorForItem(groupId, thesisId) {
  let programId = null;
  if (groupId) {
    const group = await prisma.projectGroup.findUnique({ where: { id: groupId }, select: { programId: true } });
    programId = group?.programId;
  } else if (thesisId) {
    const thesis = await prisma.thesis.findUnique({ where: { id: thesisId }, include: { student: { select: { programId: true } } } });
    programId = thesis?.student?.programId;
  }
  if (!programId) return null;
  const program = await prisma.program.findUnique({ where: { id: programId }, select: { coordinatorId: true } });
  return program?.coordinatorId || null;
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
  return notifyMany(recs, 'SUPERVISOR_ASSIGNMENT', `${assignerName} assigned a supervisor for "${itemTitle}" (${typeLabel}) — pending your acceptance.`);
}

async function notifySupervisorAccepted({ supervisorName, itemTitle, type, studentIds, coordinatorIds }) {
  const typeLabel = type === 'group' ? 'bachelor project' : 'master thesis';
  await notifyMany([...studentIds].filter(Boolean), 'SUPERVISOR_ACCEPTED', `${supervisorName} accepted supervision of your ${typeLabel} "${itemTitle}".`);
  return notifyMany([...(coordinatorIds || [])].filter(Boolean), 'SUPERVISOR_ACCEPTED', `${supervisorName} accepted supervision of the ${typeLabel} "${itemTitle}".`);
}

async function notifySupervisorRejected({ supervisorName, itemTitle, type, reason, studentIds, coordinatorIds }) {
  const typeLabel = type === 'group' ? 'bachelor project' : 'master thesis';
  await notifyMany([...studentIds].filter(Boolean), 'SUPERVISOR_REJECTED', `${supervisorName} declined to supervise your ${typeLabel} "${itemTitle}".`, `/theses`);
  return notifyMany([...(coordinatorIds || [])].filter(Boolean), 'SUPERVISOR_REJECTED', `${supervisorName} declined to supervise the ${typeLabel} "${itemTitle}". Reason: ${reason || 'No reason provided.'}`, `/theses`);
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
  notifySupervisorAccepted,
  notifySupervisorRejected,
  notifyStatusChange,
};
