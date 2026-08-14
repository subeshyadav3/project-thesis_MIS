
const prisma = require('../utils/prisma');

/**
 * Resolve which program an audit entry belongs to, based on its subject:
 *  - Item entities (Thesis, ProjectGroup, Proposal, Evaluation, ...) → the item's program
 *  - User entities (login/logout/password/user CRUD) → the user's program (students)
 *  - LOGIN_FAILED → look up the user by the email embedded in the details
 *  - No entity link → fall back to the performer's own program (student or program coordinator)
 * Returns null when the event is department/system-level (visible only to MAINTAINER).
 */
async function resolveProgram({ action, entity, entityId, details, performedById }) {
  const id = entityId ? parseInt(entityId) : null;
  const programOfItem = async (where) => {
    const row = await where;
    return row?.programId ?? null;
  };

  try {
    switch (entity) {
      case 'Thesis':
        if (!id) return await resolvePerformerProgram(performedById);
        return programOfItem(prisma.thesis.findUnique({
          where: { id },
          select: { programId: true, student: { select: { programId: true } } },
        }).then(t => ({ programId: t?.programId ?? t?.student?.programId })));

      case 'ProjectGroup':
        if (!id) return await resolvePerformerProgram(performedById);
        return programOfItem(prisma.projectGroup.findUnique({ where: { id }, select: { programId: true } }));

      // COMPLETE_EVALUATION logs entity 'Project' with entityId = groupId || thesisId
      case 'Project': {
        if (!id) return await resolvePerformerProgram(performedById);
        const group = await prisma.projectGroup.findUnique({ where: { id }, select: { programId: true } });
        if (group?.programId) return group.programId;
        const thesis = await prisma.thesis.findUnique({
          where: { id },
          select: { programId: true, student: { select: { programId: true } } },
        });
        return (thesis?.programId ?? thesis?.student?.programId) ?? await resolvePerformerProgram(performedById);
      }

      case 'Evaluation': {
        if (!id) return await resolvePerformerProgram(performedById);
        const ev = await prisma.evaluation.findUnique({
          where: { id },
          select: {
            group: { select: { programId: true } },
            thesis: { select: { programId: true, student: { select: { programId: true } } } },
          },
        });
        return ev?.group?.programId ?? ev?.thesis?.programId ?? ev?.thesis?.student?.programId ?? await resolvePerformerProgram(performedById);
      }

      case 'Proposal':
        if (!id) return await resolvePerformerProgram(performedById);
        return programOfItem(prisma.proposal.findUnique({
          where: { id },
          select: {
            group: { select: { programId: true } },
            thesis: { select: { programId: true, student: { select: { programId: true } } } },
          },
        }).then(p => ({ programId: p?.group?.programId ?? p?.thesis?.programId ?? p?.thesis?.student?.programId })));

      case 'ExaminerAssignment':
        if (!id) return await resolvePerformerProgram(performedById);
        return programOfItem(prisma.examinerAssignment.findUnique({
          where: { id },
          select: {
            group: { select: { programId: true } },
            thesis: { select: { programId: true, student: { select: { programId: true } } } },
          },
        }).then(a => ({ programId: a?.group?.programId ?? a?.thesis?.programId ?? a?.thesis?.student?.programId })));

      case 'Recommendation':
        if (!id) return await resolvePerformerProgram(performedById);
        return programOfItem(prisma.recommendation.findUnique({
          where: { id },
          select: {
            group: { select: { programId: true } },
            thesis: { select: { programId: true, student: { select: { programId: true } } } },
          },
        }).then(r => ({ programId: r?.group?.programId ?? r?.thesis?.programId ?? r?.thesis?.student?.programId })));

      case 'User':
        if (id) {
          return programOfItem(prisma.user.findUnique({ where: { id }, select: { programId: true } }));
        }
        if (action === 'LOGIN_FAILED') {
          const emailMatch = String(details || '').match(/([^\s]+@[^\s]+)/);
          if (emailMatch) {
            const user = await prisma.user.findUnique({ where: { email: emailMatch[1] }, select: { programId: true } });
            if (user?.programId) return user.programId;
          }
        }
        return null;

      case 'FormResponse':
        if (!id) return await resolvePerformerProgram(performedById);
        return programOfItem(prisma.formResponse.findUnique({
          where: { id },
          select: { student: { select: { programId: true } } },
        }).then(f => ({ programId: f?.student?.programId })));

      case 'GroupMember':
        if (!id) return await resolvePerformerProgram(performedById);
        return programOfItem(prisma.groupMember.findUnique({
          where: { id },
          select: { group: { select: { programId: true } } },
        }).then(m => ({ programId: m?.group?.programId })));

      case 'Program':
        return id || null;

      default:
        return await resolvePerformerProgram(performedById);
    }
  } catch (e) {
    return null;
  }
}

/** Fallback: performer's program if they are a student or a program coordinator. */
async function resolvePerformerProgram(performedById) {
  if (!performedById) return null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(performedById) },
      select: { id: true, role: true, programId: true },
    });
    if (!user) return null;
    if (user.programId) return user.programId;
    if (user.role === 'COORDINATOR') {
      const program = await prisma.program.findUnique({ where: { coordinatorId: user.id }, select: { id: true } });
      return program?.id ?? null;
    }
    return null;
  } catch (e) {
    console.error('resolvePerformerProgram error:', e.message);
    return null;
  }
}

const log = async ({ action, entity, entityId, details, performedById }) => {
  try {
    const programId = await resolveProgram({ action, entity, entityId, details, performedById });
    await prisma.auditLog.create({
      data: {
        action, entity,
        entityId: entityId ? parseInt(entityId) : null,
        details: details ? String(details).slice(0, 500) : null,
        performedById: performedById ? parseInt(performedById) : null,
        programId: programId ? parseInt(programId) : null,
      },
    });
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
};

/**
 * Batched marks audit: marking several components of the same project/thesis
 * in quick succession (e.g. one "Save changes" click) produces a single,
 * readable audit entry naming the item — instead of one row per component.
 */
const pendingMarksBatches = new Map();

const logMarks = async ({ groupId, thesisId, title, performedById, isUpdate }) => {
  const itemKey = groupId ? `g:${groupId}` : `t:${thesisId}`;
  const batchKey = `${performedById}:${itemKey}`;

  const flush = async (entry) => {
    pendingMarksBatches.delete(batchKey);
    const action = entry.isUpdate ? 'UPDATE_MARKS' : 'SUBMIT_MARKS';
    const entity = groupId ? 'Project' : 'Thesis';
    const detail = entry.count > 1
      ? `${entry.actionLabel} for "${entry.title}" (${entry.count} components)`
      : `${entry.actionLabel} for "${entry.title}"`;
    await log({ action, entity, entityId: groupId || thesisId, details: detail, performedById });
  };

  const existing = pendingMarksBatches.get(batchKey);
  if (existing) {
    existing.count += 1;
    existing.isUpdate = existing.isUpdate || isUpdate;
    existing.actionLabel = existing.isUpdate ? 'Updated marks' : 'Submitted marks';
    clearTimeout(existing.timer);
    existing.timer = setTimeout(() => flush(existing), 800);
  } else {
    const entry = {
      count: 1,
      isUpdate: !!isUpdate,
      title,
      actionLabel: isUpdate ? 'Updated marks' : 'Submitted marks',
      timer: null,
    };
    entry.timer = setTimeout(() => flush(entry), 800);
    pendingMarksBatches.set(batchKey, entry);
  }
};

module.exports = { log, logMarks };
