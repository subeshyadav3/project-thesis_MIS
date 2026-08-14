
const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * File metadata audit trail: every document action (upload, view/download,
 * delete) with the document's metadata and the item it belongs to.
 * Maintainer-only.
 */
router.get('/', authenticate, authorize('MAINTAINER'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const entries = await prisma.auditLog.findMany({
      where: { action: { in: ['UPLOAD', 'VIEW', 'DELETE_DOCUMENT'] } },
      include: { performedBy: { select: { id: true, firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const proposalIds = entries.map(e => e.entityId).filter(Boolean);
    const proposals = proposalIds.length
      ? await prisma.proposal.findMany({
          where: { id: { in: proposalIds } },
          select: {
            id: true, stage: true, documentType: true, status: true, documentUrl: true,
            group: { select: { id: true, name: true, projectTitle: true } },
            thesis: { select: { id: true, title: true } },
          },
        })
      : [];
    const byId = new Map(proposals.map(p => [p.id, p]));

    const rows = entries.map(e => {
      const p = e.entityId ? byId.get(e.entityId) : null;
      return {
        id: e.id,
        action: e.action,
        details: e.details,
        createdAt: e.createdAt,
        performedBy: e.performedBy,
        item: p ? (p.thesis
          ? { kind: 'thesis', id: p.thesis.id, title: p.thesis.title }
          : { kind: 'group', id: p.group?.id, name: p.group?.name, projectTitle: p.group?.projectTitle })
          : null,
        document: p ? { stage: p.stage, documentType: p.documentType, status: p.status, url: p.documentUrl } : null,
      };
    });

    res.json(rows);
  } catch (error) {
    console.error('files-audit error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
