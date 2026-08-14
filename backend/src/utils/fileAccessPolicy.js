
const prisma = require('../utils/prisma');

/**
 * Whether a user may view/access a proposal document (or the item it belongs to).
 * MAINTAINER: everything. Coordinator: within scope. Supervisor: own items.
 * Examiner: assigned to the item. Student: own group/thesis or own submission.
 */
async function canAccessProposal(user, proposal) {
  if (!user || !proposal) return false;
  if (user.role === 'MAINTAINER') return true;

  if (user.role === 'STUDENT') {
    if (proposal.submittedById === user.id) return true;
    if (proposal.groupId) {
      const member = await prisma.groupMember.findUnique({
        where: { studentId_groupId: { studentId: user.id, groupId: proposal.groupId } },
      });
      if (member) return true;
    }
    if (proposal.thesisId) {
      const thesis = await prisma.thesis.findUnique({ where: { id: proposal.thesisId }, select: { studentId: true } });
      if (thesis && thesis.studentId === user.id) return true;
    }
    return false;
  }

  if (user.role === 'SUPERVISOR') {
    const item = proposal.groupId
      ? await prisma.projectGroup.findUnique({ where: { id: proposal.groupId }, select: { supervisorId: true } })
      : await prisma.thesis.findUnique({ where: { id: proposal.thesisId }, select: { supervisorId: true } });
    return !!item && item.supervisorId === user.id;
  }

  if (user.role === 'EXTERNAL_EXAMINER') {
    if (proposal.groupId) {
      const assigned = await prisma.examinerAssignment.findFirst({
        where: { externalExaminerId: user.id, groupId: proposal.groupId },
      });
      return !!assigned;
    }
    if (proposal.thesisId) {
      const thesis = await prisma.thesis.findUnique({
        where: { id: proposal.thesisId },
        select: { externalMidTermId: true, externalFinalId: true },
      });
      if (thesis && (thesis.externalMidTermId === user.id || thesis.externalFinalId === user.id)) return true;
      const assigned = await prisma.examinerAssignment.findFirst({
        where: { externalExaminerId: user.id, thesisId: proposal.thesisId },
      });
      return !!assigned;
    }
    return false;
  }

  if (user.role === 'COORDINATOR') {
    const { resolveCoordinatorScope, canManageGroupAsCoordinator, canManageThesisAsCoordinator } = require('./coordinatorScope');
    const scope = await resolveCoordinatorScope(user);
    if (proposal.groupId) {
      const group = await prisma.projectGroup.findUnique({
        where: { id: proposal.groupId },
        select: { id: true, programId: true, supervisorId: true },
      });
      return await canManageGroupAsCoordinator(group, scope, user);
    }
    if (proposal.thesisId) {
      const thesis = await prisma.thesis.findUnique({
        where: { id: proposal.thesisId },
        select: { id: true, programId: true, supervisorId: true, student: { select: { programId: true } } },
      });
      return await canManageThesisAsCoordinator(thesis, scope, user);
    }
    return false;
  }

  return false;
}

/**
 * Whether a user may upload a document for a group/thesis.
 * Students: own group/thesis only. Supervisors: own items only.
 * Coordinators: within scope. Examiners and maintainers: uploads are not part of their flow.
 */
async function canUploadForItem(user, group, thesis) {
  if (!user) return false;
  const item = group ? { kind: 'group', id: group.id, supervisorId: group.supervisorId } : { kind: 'thesis', id: thesis.id, supervisorId: thesis.supervisorId };

  if (user.role === 'STUDENT') {
    if (group) {
      const member = await prisma.groupMember.findUnique({
        where: { studentId_groupId: { studentId: user.id, groupId: group.id } },
      });
      return !!member;
    }
    return thesis.studentId === user.id;
  }

  if (user.role === 'MAINTAINER') return true;

  if (user.role === 'SUPERVISOR') return item.supervisorId === user.id;

  if (user.role === 'COORDINATOR') {
    const { resolveCoordinatorScope, canManageGroupAsCoordinator, canManageThesisAsCoordinator } = require('./coordinatorScope');
    const scope = await resolveCoordinatorScope(user);
    return group
      ? await canManageGroupAsCoordinator(group, scope, user)
      : await canManageThesisAsCoordinator(thesis, scope, user);
  }

  return false;
}

module.exports = { canAccessProposal, canUploadForItem };
