const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const prisma = new PrismaClient();
const audit = require('../services/auditService');

exports.uploadProposal = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const { groupId, thesisId, stage } = req.body;
    if (!stage) return res.status(400).json({ success: false, error: 'Stage is required' });
    if (!groupId && !thesisId) return res.status(400).json({ success: false, error: 'groupId or thesisId is required' });

    if (groupId) {
      const group = await prisma.projectGroup.findUnique({ where: { id: parseInt(groupId) } });
      if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
    }
    if (thesisId) {
      const thesis = await prisma.thesis.findUnique({ where: { id: parseInt(thesisId) } });
      if (!thesis) return res.status(404).json({ success: false, error: 'Thesis not found' });
    }

    const entityType = groupId ? 'groups' : 'theses';
    const entityId = groupId || thesisId;
    const storageDir = path.join(__dirname, '..', '..', 'storage', entityType);
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

    const ext = path.extname(req.file.originalname);
    const filename = `proposal_${entityId}_${Date.now()}${ext}`;
    const filePath = path.join(storageDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);

    const proposal = await prisma.proposal.create({
      data: {
        stage,
        documentUrl: `/api/files/${entityType}/${filename}`,
        groupId: groupId ? parseInt(groupId) : null,
        thesisId: thesisId ? parseInt(thesisId) : null,
        submittedById: req.user.id,
      },
    });

    // Background embedding generation so the user doesn't wait.
    setImmediate(async () => {
      try {
        const aiController = require('./aiController');
        const aiReq = { params: { id: proposal.id }, headers: req.headers };
        const aiRes = { json: () => {}, status: () => aiRes };
        await aiController.embed(aiReq, aiRes);
      } catch (e) {
        console.error('background embed error:', e.message);
      }
    });

    audit.log({ action: 'UPLOAD', entity: 'Proposal', entityId: proposal.id, details: `Proposal uploaded for ${entityType}/${entityId}`, performedById: req.user.id });

    res.status(201).json({ success: true, data: proposal });
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
