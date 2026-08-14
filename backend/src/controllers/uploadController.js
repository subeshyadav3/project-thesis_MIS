
const path = require('path');
const fs = require('fs');
const prisma = require('../utils/prisma');
const audit = require('../services/auditService');
const { canAccessProposal } = require('../utils/fileAccessPolicy');

// Magic number signatures for common document types
const MAGIC_SIGNATURES = {
  pdf:  [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  docx: [{ offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }], // PK\x03\x04 (ZIP)
  xlsx: [{ offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }], // PK\x03\x04 (ZIP)
  doc:  [{ offset: 0, bytes: [0xD0, 0xCF, 0x11, 0xE0] }], // CFB
  png:  [{ offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47] }], // PNG
  jpg:  [{ offset: 0, bytes: [0xFF, 0xD8, 0xFF] }],       // JPEG
};

function detectMimeFromBuffer(buffer) {
  for (const [type, signatures] of Object.entries(MAGIC_SIGNATURES)) {
    for (const sig of signatures) {
      const matches = sig.bytes.every((byte, i) =>
        buffer[sig.offset + i] === byte
      );
      if (matches) return type;
    }
  }
  return null;
}

const ALLOWED_MIME_TYPES = ['pdf', 'docx', 'doc', 'png', 'jpg'];

/**
 * Trigger the new ai_chatbot pipeline in the background. Best-effort —
 * synchronously returns the response while the AI runs async, with errors
 * only logged, never rethrown to the caller.
 */
function triggerAIChatbot({ proposalId, documentUrl, documentType, authToken }) {
  const base = (process.env.AI_CHATBOT_URL || 'http://localhost:8001').replace(/\/$/, '');
  const url = `${base}/api/ai/analyze`;
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = authToken;
  const fetchAndLog = async () => {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ proposal_id: proposalId, document_url: documentUrl, document_type: documentType }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) {
        console.warn(`[ai_chatbot] analyze returned ${resp.status} for proposal ${proposalId}`);
      } else {
        console.log(`[ai_chatbot] analyze queued for proposal ${proposalId}`);
      }
    } catch (e) {
      console.warn(`[ai_chatbot] unreachable for proposal ${proposalId}:`, e.message);
    }
  };
  setImmediate(fetchAndLog);
}

exports.uploadProposal = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const detectedType = detectMimeFromBuffer(req.file.buffer);
    if (!detectedType || !ALLOWED_MIME_TYPES.includes(detectedType)) {
      return res.status(400).json({ success: false, error: `Invalid file type detected (${detectedType || 'unknown'}). Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` });
    }
    const { groupId, thesisId, stage } = req.body;
    if (!stage) return res.status(400).json({ success: false, error: 'Stage is required' });
    if (!groupId && !thesisId) return res.status(400).json({ success: false, error: 'groupId or thesisId is required' });

    if (groupId) {
      const group = await prisma.projectGroup.findUnique({ where: { id: parseInt(groupId) }, select: { id: true, programId: true, supervisorId: true } });
      if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
    }
    if (thesisId) {
      const thesis = await prisma.thesis.findUnique({ where: { id: parseInt(thesisId) }, select: { id: true, programId: true, supervisorId: true, student: { select: { programId: true } } } });
      if (!thesis) return res.status(404).json({ success: false, error: 'Thesis not found' });
    }

    // Only members/owners of the item may upload documents for it
    const { canUploadForItem } = require('../utils/fileAccessPolicy');
    const group = groupId ? await prisma.projectGroup.findUnique({
      where: { id: parseInt(groupId) },
      select: { id: true, programId: true, supervisorId: true, members: { select: { studentId: true } } },
    }) : null;
    const thesis = thesisId ? await prisma.thesis.findUnique({
      where: { id: parseInt(thesisId) },
      select: { id: true, programId: true, supervisorId: true, student: { select: { programId: true } } },
    }) : null;
    if (!(await canUploadForItem(req.user, group, thesis))) {
      return res.status(403).json({ success: false, error: 'You are not allowed to upload documents for this item' });
    }

    const entityType = groupId ? 'groups' : 'theses';
    const entityId = groupId || thesisId;
    const storageDir = path.join(__dirname, '..', '..', 'storage', entityType);
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

    // Late uploads (after the announcement window closed) require coordinator approval.
    let proposalStatus = 'VISIBLE';
    try {
      const item = groupId
        ? await prisma.projectGroup.findUnique({ where: { id: parseInt(groupId) }, select: { announcementId: true } })
        : await prisma.thesis.findUnique({ where: { id: parseInt(thesisId) }, select: { announcementId: true } });
      if (item?.announcementId) {
        const ann = await prisma.announcement.findUnique({
          where: { id: item.announcementId },
          select: { expirationDate: true },
        });
        if (ann?.expirationDate && new Date() > ann.expirationDate) proposalStatus = 'PENDING_APPROVAL';
      }
    } catch (e) { /* default to VISIBLE on lookup failure */ }

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
        status: proposalStatus,
      },
    });

    // Background embedding generation so the user doesn't wait.
    triggerAIChatbot({
      proposalId: proposal.id,
      documentUrl: proposal.documentUrl,
      documentType: stage,
      authToken: req.headers.authorization,
    });

    if (proposal.status === 'PENDING_APPROVAL') {
      try {
        const notifSvc = require('../services/notificationService');
        const coordinatorId = await notifSvc.findCoordinatorForItem(groupId ? parseInt(groupId) : null, thesisId ? parseInt(thesisId) : null);
        if (coordinatorId) {
          await notifSvc.notify(coordinatorId, 'PROPOSAL_PENDING_APPROVAL',
            `A late proposal document was uploaded (stage: ${stage}) — pending your approval.`);
        }
      } catch (e) { console.error('notify pending approval error:', e.message); }
    }

    audit.log({ action: 'UPLOAD', entity: 'Proposal', entityId: proposal.id, details: `Proposal uploaded for ${entityType}/${entityId}${proposal.status === 'PENDING_APPROVAL' ? ' (late, pending approval)' : ''}`, performedById: req.user.id });

    res.status(201).json({ success: true, data: proposal });
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.deleteProposal = async (req, res) => {
  try {
    const proposalId = parseInt(req.params.proposalId);
    if (!proposalId) return res.status(400).json({ success: false, error: 'Invalid proposal id' });

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { group: { select: { id: true, programId: true, supervisorId: true } }, thesis: { select: { id: true, programId: true, supervisorId: true, student: { select: { programId: true } } } } },
    });
    if (!proposal) return res.status(404).json({ success: false, error: 'Proposal not found' });

    const isOwner = proposal.submittedById === req.user.id;
    const isStaff = ['SUPERVISOR', 'COORDINATOR', 'MAINTAINER'].includes(req.user.role);
    if (!isOwner && !(isStaff && await canAccessProposal(req.user, proposal))) {
      return res.status(403).json({ success: false, error: 'You are not allowed to delete this document' });
    }

    if (proposal.documentUrl) {
      const relative = proposal.documentUrl.replace('/api/files/', '');
      if (relative.includes('..')) {
        return res.status(400).json({ success: false, error: 'Invalid document path' });
      }
      const filePath = path.join(__dirname, '..', '..', 'storage', relative);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn(`[upload] failed to remove file ${filePath}:`, e.message);
        }
      }
    }

    await prisma.proposal.delete({ where: { id: proposalId } });

    audit.log({ action: 'DELETE_DOCUMENT', entity: 'Proposal', entityId: proposalId, details: `Document removed (stage: ${proposal.stage})`, performedById: req.user.id });

    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    console.error('Delete proposal error:', error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
