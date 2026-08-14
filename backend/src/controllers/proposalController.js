
const prisma = require('../utils/prisma');
const audit = require('../services/auditService');
const notifSvc = require('../services/notificationService');

exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, error: 'Comment is required' });
    }

    const proposal = await prisma.proposal.findUnique({ where: { id: parseInt(id) } });
    if (!proposal) return res.status(404).json({ success: false, error: 'Document not found' });

    const updated = await prisma.proposal.update({
      where: { id: parseInt(id) },
      data: {
        supervisorComment: comment.trim(),
        commentedById: req.user.id,
      },
    });

    const roleLabel = req.user.role === 'SUPERVISOR' ? 'Supervisor' : req.user.role === 'COORDINATOR' ? 'Coordinator' : 'External';
    audit.log({ action: 'COMMENT', entity: 'Proposal', entityId: proposal.id, details: `${roleLabel} comment added to proposal ${proposal.id}`, performedById: req.user.id });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update comment error:', error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const proposal = await prisma.proposal.findUnique({
      where: { id: parseInt(id) },
      include: {
        submittedBy: { select: { id: true, firstName: true, lastName: true } },
        group: { select: { id: true, name: true, projectTitle: true, projectType: true } },
        thesis: { select: { id: true, title: true } },
      },
    });
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    res.json(proposal);
  } catch (error) {
    console.error('getProposal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.listPendingLateProposals = async (req, res) => {
  try {
    const where = { status: 'PENDING_APPROVAL' };
    if (req.user.role === 'COORDINATOR') {
      const program = await prisma.program.findUnique({ where: { coordinatorId: req.user.id } });
      const progId = req.user.programId ?? program?.id ?? null;
      if (progId) {
        where.submittedBy = { programId: progId };
      } else {
        const deptUsers = await prisma.user.findMany({
          where: { departmentId: req.user.departmentId },
          select: { id: true },
        });
        where.submittedById = { in: deptUsers.map(u => u.id) };
      }
    }
    const proposals = await prisma.proposal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        submittedBy: { select: { id: true, firstName: true, lastName: true, rollNumber: true, program: { select: { code: true } } } },
        thesis: { select: { id: true, title: true, status: true } },
      },
    });
    res.json(proposals);
  } catch (e) {
    console.error('listPendingLateProposals error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.approveLateProposal = async (req, res) => {
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { thesis: { select: { id: true, title: true, studentId: true } } },
    });
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    if (proposal.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Only late proposals awaiting approval can be approved' });
    }

    const updated = await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: 'VISIBLE',
        supervisorComment: req.body?.reason
          ? `Late submission approved by coordinator: ${String(req.body.reason).slice(0, 300)}`
          : 'Late submission approved by coordinator.',
        commentedById: req.user.id,
      },
    });

    try {
      const coordinatorName = `${req.user.firstName} ${req.user.lastName}`.trim() || 'Coordinator';
      await notifSvc.notify(
        proposal.thesis?.studentId,
        'PROPOSAL_APPROVED',
        `${coordinatorName} approved your late thesis proposal "${proposal.thesis?.title || 'Untitled'}".`,
        `/theses/${proposal.thesisId}`
      );
    } catch (e) { console.error('notify error:', e.message); }

    audit.log({ action: 'APPROVE', entity: 'Proposal', entityId: proposal.id, details: `Late proposal for thesis "${proposal.thesis?.title || ''}" approved`, performedById: req.user.id });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('approveLateProposal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.rejectLateProposal = async (req, res) => {
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { thesis: { select: { id: true, title: true, studentId: true } } },
    });
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    const reason = String(req.body?.reason || '').trim() || 'Proposal rejected by coordinator.';

    const updated = await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: 'REJECTED',
        studentFeedback: reason,
        commentedById: req.user.id,
      },
    });

    try {
      await notifSvc.notify(
        proposal.thesis?.studentId,
        'PROPOSAL_REJECTED',
        `Your late thesis proposal "${proposal.thesis?.title || 'Untitled'}" was rejected. Reason: ${reason}`,
        `/theses/${proposal.thesisId}`
      );
    } catch (e) { console.error('notify error:', e.message); }

    audit.log({ action: 'REJECT', entity: 'Proposal', entityId: proposal.id, details: `Late proposal for thesis "${proposal.thesis?.title || ''}" rejected: ${reason}`, performedById: req.user.id });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('rejectLateProposal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
