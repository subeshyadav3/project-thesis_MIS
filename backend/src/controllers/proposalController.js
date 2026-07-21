
const prisma = require('../utils/prisma');
const audit = require('../services/auditService');

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
      data: { supervisorComment: comment.trim() },
    });

    audit.log({ action: 'COMMENT', entity: 'Proposal', entityId: proposal.id, details: `Supervisor comment added to proposal ${proposal.id}`, performedById: req.user.id });

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
