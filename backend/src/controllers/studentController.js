
const prisma = require('../utils/prisma');
const path = require('path');
const notifSvc = require('../services/notificationService');
const audit = require('../services/auditService');

/**
 * Fire the unified ai_chatbot pipeline in the background.
 * Reuses the same endpoint the legacy embed routine did, but the new service
 * performs extract -> chunk -> embed -> store -> analyze -> persist + summary
 * + evaluation automatically. Failures are non-blocking.
 */
function triggerAIPipeline({ proposalId, documentUrl, documentType, authToken }) {
  const base = (process.env.AI_CHATBOT_URL || 'http://localhost:8001').replace(/\/$/, '');
  const url = `${base}/api/ai/analyze`;
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = authToken;
  const fire = async () => {
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
  setImmediate(fire);
}

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { stage, type } = req.body;
    const allowedStages = ['PROPOSAL', 'MID_TERM', 'FINAL'];
    if (!allowedStages.includes(stage)) return res.status(400).json({ error: 'Invalid stage' });

    const documentUrl = `/api/files/${type}s/${req.file.filename}`;

    let whereClause = {};
    if (type === 'group') {
      if (req.body.groupId) {
        const groupId = parseInt(req.body.groupId);
        if (isNaN(groupId)) return res.status(400).json({ error: 'Invalid group ID' });
        const member = await prisma.groupMember.findFirst({
          where: { studentId: req.user.id, groupId },
        });
        if (!member) return res.status(403).json({ error: 'You are not a member of this group' });
        whereClause = { groupId: member.groupId, stage };
      } else {
        const member = await prisma.groupMember.findFirst({ where: { studentId: req.user.id } });
        if (!member) return res.status(404).json({ error: 'You are not in any group' });
        whereClause = { groupId: member.groupId, stage };
      }
    } else {
      if (req.body.thesisId) {
        const thesisId = parseInt(req.body.thesisId);
        if (isNaN(thesisId)) return res.status(400).json({ error: 'Invalid thesis ID' });
        const thesis = await prisma.thesis.findFirst({
          where: { id: thesisId, studentId: req.user.id },
        });
        if (!thesis) return res.status(403).json({ error: 'This thesis does not belong to you' });
        whereClause = { thesisId: thesis.id, stage };
      } else {
        const thesis = await prisma.thesis.findFirst({ where: { studentId: req.user.id } });
        if (!thesis) return res.status(404).json({ error: 'You have no thesis' });
        whereClause = { thesisId: thesis.id, stage };
      }
    }

    // Always create a new Proposal record — keep full version history.
    const parentId = whereClause.groupId || whereClause.thesisId;
    const proposal = await prisma.proposal.create({
      data: {
        stage,
        documentType: 'PROPOSAL',
        documentUrl,
        submittedById: req.user.id,
        ...(type === 'group' ? { groupId: whereClause.groupId } : { thesisId: whereClause.thesisId }),
      },
    });

    // Fire-and-forget embedding generation so the user doesn't wait.
    triggerAIPipeline({
      proposalId: proposal.id,
      documentUrl: proposal.documentUrl,
      documentType: stage,
      authToken: req.headers.authorization,
    });

    // Notify supervisor + coordinators (not the student)
    try {
      const uploader = await prisma.user.findUnique({ where: { id: req.user.id }, select: { firstName: true, lastName: true } });
      const studentName = uploader ? `${uploader.firstName} ${uploader.lastName}` : 'A student';
      const itemTitle = type === 'group'
        ? (await prisma.projectGroup.findUnique({ where: { id: whereClause.groupId }, select: { projectTitle: true } }))?.projectTitle
        : (await prisma.thesis.findUnique({ where: { id: whereClause.thesisId }, select: { title: true } }))?.title;
      await notifSvc.notifyProposalUpload({
        groupId: type === 'group' ? whereClause.groupId : undefined,
        thesisId: type === 'thesis' ? whereClause.thesisId : undefined,
        stage,
        uploaderId: req.user.id,
        studentName,
        itemTitle: itemTitle || 'project',
      });
    } catch (e) {
      console.error('notifyProposalUpload error:', e.message);
    }

    const stageLabel = stage;
  audit.log({ action: 'UPLOAD', entity: 'Document', details: `Uploaded ${stageLabel} document`, performedById: req.user.id });
    res.json({ message: 'Document uploaded successfully', documentUrl, proposal });
  } catch (error) {
    console.error('uploadDocument error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

exports.getMyGroups = async (req, res) => {
  try {
    const members = await prisma.groupMember.findMany({
      where: { studentId: req.user.id },
      include: {
        group: {
          include: {
            supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
            academicYear: { include: { department: { select: { id: true, name: true } } } },
            program: { include: { department: { select: { id: true, name: true } } } },
            members: {
              include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } },
            },
            evaluations: {
              include: { submittedBy: { select: { firstName: true, lastName: true } } },
            },
            evaluationComponents: true,
            proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" } },
            announcement: { select: { id: true, title: true, expirationDate: true, startDate: true } },
            examinerAssignments: { include: { externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true } } } },
          },
        },
      },
    });
    res.json(members.map(m => ({ ...m.group, _memberRoll: m.rollNumber })));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getMyTheses = async (req, res) => {
  try {
    const theses = await prisma.thesis.findMany({
      where: { studentId: req.user.id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true, rollNumber: true, program: { include: { department: { select: { id: true, name: true } } } } } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
        externalMidTerm: { select: { id: true, firstName: true, lastName: true, email: true } },
        externalFinal: { select: { id: true, firstName: true, lastName: true, email: true } },
        evaluations: {
          include: { submittedBy: { select: { firstName: true, lastName: true } } },
        },
        evaluationComponents: true,
        proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" } },
        announcement: { select: { id: true, title: true, expirationDate: true, startDate: true } },
        examinerAssignments: { include: { externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(theses);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getGroupById = async (req, res) => {
  try {
    const group = await prisma.projectGroup.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
        academicYear: { include: { department: { select: { id: true, name: true } } } },
        program: { include: { department: { select: { id: true, name: true } } } },
        members: {
          include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        evaluations: {
          include: { submittedBy: { select: { firstName: true, lastName: true } } },
        },
        evaluationComponents: true,
        proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" } },
        announcement: { select: { id: true, title: true, expirationDate: true, startDate: true } },
        examinerAssignments: { include: { externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    const isMember = group.members.some(m => m.studentId === req.user.id);
    if (!isMember) return res.status(403).json({ error: 'You are not a member of this group' });
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getThesisById = async (req, res) => {
  try {
    const thesis = await prisma.thesis.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true, rollNumber: true, program: { include: { department: { select: { id: true, name: true } } } } } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
        externalMidTerm: { select: { id: true, firstName: true, lastName: true, email: true } },
        externalFinal: { select: { id: true, firstName: true, lastName: true, email: true } },
        evaluations: {
          include: { submittedBy: { select: { firstName: true, lastName: true } } },
        },
        evaluationComponents: true,
        proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" } },
        announcement: { select: { id: true, title: true, expirationDate: true, startDate: true } },
        examinerAssignments: { include: { externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
    });
    if (!thesis) return res.status(404).json({ error: 'Thesis not found' });
    if (thesis.studentId !== req.user.id) return res.status(403).json({ error: 'This thesis does not belong to you' });
    res.json(thesis);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId, 10);
    const studentId = parseInt(req.params.studentId, 10);
    if (!groupId || !studentId) {
      return res.status(400).json({ error: 'groupId and studentId are required' });
    }

    const group = await prisma.projectGroup.findUnique({
      where: { id: groupId },
      include: {
        members: true,
        announcement: { select: { groupSizeMin: true, groupSizeMax: true } },
      },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isSelf = req.user.id === studentId;
    const isCreator = group.members[0]?.studentId === req.user.id;
    const canRemove = isSelf || isCreator || req.user.role === 'COORDINATOR' || req.user.role === 'MAINTAINER';
    if (!canRemove) return res.status(403).json({ error: 'Not allowed to remove this member' });

    const member = group.members.find((m) => m.studentId === studentId);
    if (!member) return res.status(404).json({ error: 'Member not in this group' });

    // Announcement-driven minimum size guard (defaults to 1 if no announcement)
    const minSize = group.announcement?.groupSizeMin ?? 1;
    if (group.members.length - 1 < minSize) {
      return res.status(400).json({
        error: `Cannot remove: this group requires a minimum of ${minSize} members.`,
      });
    }

    await prisma.groupMember.delete({ where: { id: member.id } });

    const remaining = await prisma.groupMember.count({ where: { groupId } });
    if (remaining === 0 && group.status === 'PENDING') {
      // No members left and group is still forming — clean it up.
      await prisma.projectGroup.delete({ where: { id: groupId } });
      return res.json({ message: 'Member removed and empty group deleted' });
    }

    audit.log({ action: 'REMOVE', entity: 'GroupMember', entityId: member.id, details: `Removed student ${studentId} from group ${groupId}`, performedById: req.user.id });
    res.json({ message: 'Member removed' });
  } catch (e) {
    console.error('removeMember error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: parseInt(req.params.id) },
      data: { read: true },
    });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteThesis = async (req, res) => {
  try {
    const thesisId = Number(req.params.id);
    const thesis = await prisma.thesis.findUnique({
      where: { id: thesisId },
      include: { evaluationComponents: true, proposals: true },
    });
    if (!thesis) return res.status(404).json({ error: 'Thesis not found' });
    if (thesis.studentId !== req.user.id) return res.status(403).json({ error: 'This thesis does not belong to you' });
    if (thesis.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending theses can be deleted' });
    }

    await prisma.proposal.deleteMany({ where: { thesisId } });
    await prisma.evaluationComponent.deleteMany({ where: { thesisId } });
    await prisma.thesis.delete({ where: { id: thesisId } });

    audit.log({ action: 'DELETE', entity: 'Thesis', entityId: thesisId, details: `Student deleted thesis "${thesis.title}"`, performedById: req.user.id });
    res.json({ message: 'Thesis deleted' });
  } catch (e) {
    console.error('deleteThesis error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};
