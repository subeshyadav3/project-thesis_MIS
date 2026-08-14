
const prisma = require('../utils/prisma');
const audit = require('../services/auditService');
const notifSvc = require('../services/notificationService');
const { PROPOSAL_STATUS } = require('../config/statusConstants');
const { parseId } = require('../utils/params');
const logger = require('../utils/logger');


exports.getProposal = async (req, res) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        submittedBy: { select: { id: true, firstName: true, lastName: true } },
        group: { select: { id: true, name: true, projectTitle: true, projectType: true } },
        thesis: { select: { id: true, title: true } },
      },
    });
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    res.json(proposal);
  } catch (error) {
    logger.error('getProposal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.listPendingLateProposals = async (req, res) => {
  try {
    const where = { status: PROPOSAL_STATUS.PENDING_APPROVAL };
    if (req.user.role === 'COORDINATOR') {
      const program = await prisma.program.findUnique({ where: { coordinatorId: req.user.id } });
      const progId = req.user.programId ?? program?.id ?? null;
      if (progId) {
        where.OR = [
          { thesis: { student: { programId: progId } } },
          { thesis: { programId: progId } },
          { group: { programId: progId } },
        ];
      } else {
        const deptPrograms = await prisma.program.findMany({
          where: { departmentId: req.user.departmentId },
          select: { id: true },
        });
        const deptProgIds = deptPrograms.map(p => p.id);
        where.OR = [
          { thesis: { student: { programId: { in: deptProgIds } } } },
          { thesis: { programId: { in: deptProgIds } } },
          { group: { programId: { in: deptProgIds } } },
        ];
      }
    }
    const proposals = await prisma.proposal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        submittedBy: { select: { id: true, firstName: true, lastName: true, rollNumber: true, program: { select: { code: true } } } },
        thesis: { select: { id: true, title: true, status: true } },
        group: { select: { id: true, name: true, projectTitle: true, status: true } },
      },
    });
    res.json(proposals);
  } catch (e) {
    logger.error('listPendingLateProposals error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.approveLateProposal = async (req, res) => {
  try {
    const proposalId = parseId(req, res);
    if (proposalId === null) return;
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        thesis: { select: { id: true, title: true, studentId: true, programId: true, student: { select: { programId: true } } } },
        group: { select: { id: true, projectTitle: true, programId: true, members: { select: { studentId: true } } } },
      },
    });
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    if (proposal.status !== PROPOSAL_STATUS.PENDING_APPROVAL) {
      return res.status(400).json({ error: 'Only late proposals awaiting approval can be approved' });
    }
    if (req.user.role === 'COORDINATOR') {
      const { resolveCoordinatorScope, canManageGroupAsCoordinator, canManageThesisAsCoordinator } = require('../utils/coordinatorScope');
      const scope = await resolveCoordinatorScope(req.user);
      if (proposal.groupId) {
        if (!await canManageGroupAsCoordinator(proposal.group, scope, req.user)) {
          return res.status(403).json({ error: 'Access denied. Proposal belongs to another program.' });
        }
      } else if (!await canManageThesisAsCoordinator(proposal.thesis, scope, req.user)) {
        return res.status(403).json({ error: 'Access denied. Proposal belongs to another program.' });
      }
    }

    const updated = await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: PROPOSAL_STATUS.VISIBLE,
        supervisorComment: req.body?.reason
          ? `Late submission approved by coordinator: ${String(req.body.reason).slice(0, 300)}`
          : 'Late submission approved by coordinator.',
        commentedById: req.user.id,
      },
    });

    try {
      const coordinatorName = `${req.user.firstName} ${req.user.lastName}`.trim() || 'Coordinator';
      const itemTitle = proposal.thesis?.title || proposal.group?.projectTitle || 'Untitled';
      const studentIds = proposal.groupId
        ? proposal.group.members.map(m => m.studentId)
        : [proposal.thesis?.studentId];
      await notifSvc.notifyMany(studentIds.filter(Boolean), 'PROPOSAL_APPROVED',
        `${coordinatorName} approved your late proposal "${itemTitle}".`);
    } catch (e) { logger.error('notify error:', e.message); }

    audit.log({ action: 'APPROVE', entity: 'Proposal', entityId: proposal.id, details: `Late proposal for "${proposal.thesis?.title || proposal.group?.projectTitle || ''}" approved`, performedById: req.user.id });
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('approveLateProposal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.rejectLateProposal = async (req, res) => {
  try {
    const proposalId = parseId(req, res);
    if (proposalId === null) return;
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        thesis: { select: { id: true, title: true, studentId: true, programId: true, student: { select: { programId: true } } } },
        group: { select: { id: true, projectTitle: true, programId: true, members: { select: { studentId: true } } } },
      },
    });
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    if (req.user.role === 'COORDINATOR') {
      const { resolveCoordinatorScope, canManageGroupAsCoordinator, canManageThesisAsCoordinator } = require('../utils/coordinatorScope');
      const scope = await resolveCoordinatorScope(req.user);
      if (proposal.groupId) {
        if (!await canManageGroupAsCoordinator(proposal.group, scope, req.user)) {
          return res.status(403).json({ error: 'Access denied. Proposal belongs to another program.' });
        }
      } else if (!await canManageThesisAsCoordinator(proposal.thesis, scope, req.user)) {
        return res.status(403).json({ error: 'Access denied. Proposal belongs to another program.' });
      }
    }
    const reason = String(req.body?.reason || '').trim() || 'Proposal rejected by coordinator.';

    const updated = await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: PROPOSAL_STATUS.REJECTED,
        studentFeedback: reason,
        commentedById: req.user.id,
      },
    });

    try {
      const itemTitle = proposal.thesis?.title || proposal.group?.projectTitle || 'Untitled';
      const studentIds = proposal.groupId
        ? proposal.group.members.map(m => m.studentId)
        : [proposal.thesis?.studentId];
      await notifSvc.notifyMany(studentIds.filter(Boolean), 'PROPOSAL_REJECTED',
        `Your late proposal "${itemTitle}" was rejected. Reason: ${reason}`);
    } catch (e) { logger.error('notify error:', e.message); }

    audit.log({ action: 'REJECT', entity: 'Proposal', entityId: proposal.id, details: `Late proposal for "${proposal.thesis?.title || proposal.group?.projectTitle || ''}" rejected: ${reason}`, performedById: req.user.id });
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('rejectLateProposal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
