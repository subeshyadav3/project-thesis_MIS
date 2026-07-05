const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
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
