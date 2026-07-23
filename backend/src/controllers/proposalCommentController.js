const prisma = require('../utils/prisma');
const audit = require('../services/auditService');

/** List all comments for a proposal */
exports.listComments = async (req, res) => {
  try {
    const proposalId = parseInt(req.params.proposalId);
    const comments = await prisma.proposalComment.findMany({
      where: { proposalId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(comments);
  } catch (error) {
    console.error('listComments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** Create a new comment */
exports.createComment = async (req, res) => {
  try {
    const proposalId = parseInt(req.params.proposalId);
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

    const comment = await prisma.proposalComment.create({
      data: {
        content: content.trim(),
        proposalId,
        authorId: req.user.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    const roleLabel = req.user.role === 'SUPERVISOR' ? 'Supervisor' : req.user.role === 'COORDINATOR' ? 'Coordinator' : 'External';
    audit.log({ action: 'COMMENT', entity: 'Proposal', entityId: proposalId, details: `${roleLabel} added comment to proposal ${proposalId}`, performedById: req.user.id });

    res.status(201).json(comment);
  } catch (error) {
    console.error('createComment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** Update an existing comment */
exports.updateComment = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const comment = await prisma.proposalComment.findUnique({ where: { id } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    // Only the author or a coordinator/maintainer can edit
    if (comment.authorId !== req.user.id && !['COORDINATOR', 'MAINTAINER'].includes(req.user.role)) {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    const updated = await prisma.proposalComment.update({
      where: { id },
      data: { content: content.trim() },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('updateComment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/** Delete a comment */
exports.deleteComment = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const comment = await prisma.proposalComment.findUnique({ where: { id } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    // Only the author or a coordinator/maintainer can delete
    if (comment.authorId !== req.user.id && !['COORDINATOR', 'MAINTAINER'].includes(req.user.role)) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    await prisma.proposalComment.delete({ where: { id } });

    audit.log({ action: 'DELETE_COMMENT', entity: 'Proposal', entityId: comment.proposalId, details: `Comment ${id} deleted`, performedById: req.user.id });

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('deleteComment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
