const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { stage, type } = req.body;
    const allowedStages = ['PROPOSAL', 'MID_TERM', 'FINAL'];
    if (!allowedStages.includes(stage)) return res.status(400).json({ error: 'Invalid stage' });

    const documentUrl = `/storage/${type}s/${req.file.filename}`;

    let whereClause = {};
    if (type === 'group') {
      if (req.body.groupId) {
        whereClause = { groupId: parseInt(req.body.groupId), stage };
      } else {
        const member = await prisma.groupMember.findFirst({ where: { studentId: req.user.id } });
        if (!member) return res.status(404).json({ error: 'You are not in any group' });
        whereClause = { groupId: member.groupId, stage };
      }
    } else {
      if (req.body.thesisId) {
        whereClause = { thesisId: parseInt(req.body.thesisId), stage };
      } else {
        const thesis = await prisma.thesis.findFirst({ where: { studentId: req.user.id } });
        if (!thesis) return res.status(404).json({ error: 'You have no thesis' });
        whereClause = { thesisId: thesis.id, stage };
      }
    }

    const existing = await prisma.proposal.findFirst({ where: whereClause });
    if (existing) {
      await prisma.proposal.update({ where: { id: existing.id }, data: { documentUrl } });
    } else {
      await prisma.proposal.create({
        data: {
          stage,
          documentUrl,
          submittedById: req.user.id,
          ...(type === 'group' ? { groupId: whereClause.groupId } : { thesisId: whereClause.thesisId }),
        },
      });
    }

    res.json({ message: 'Document uploaded successfully', documentUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyGroups = async (req, res) => {
  try {
    const members = await prisma.groupMember.findMany({
      where: { studentId: req.user.id },
      include: {
        group: {
          include: {
            supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
            academicYear: true,
            members: {
              include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } },
            },
            evaluations: {
              include: { submittedBy: { select: { firstName: true, lastName: true } } },
            },
            proposals: {
              include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(members.map(m => ({ ...m.group, _memberRoll: m.rollNumber })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyTheses = async (req, res) => {
  try {
    const theses = await prisma.thesis.findMany({
      where: { studentId: req.user.id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
        academicYear: true,
        evaluations: {
          include: { submittedBy: { select: { firstName: true, lastName: true } } },
        },
        proposals: {
          include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(theses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getGroupById = async (req, res) => {
  try {
    const group = await prisma.projectGroup.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
        academicYear: true,
        members: {
          include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        evaluations: {
          include: { submittedBy: { select: { firstName: true, lastName: true } } },
        },
        proposals: {
          include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getThesisById = async (req, res) => {
  try {
    const thesis = await prisma.thesis.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
        academicYear: true,
        evaluations: {
          include: { submittedBy: { select: { firstName: true, lastName: true } } },
        },
        proposals: {
          include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    if (!thesis) return res.status(404).json({ error: 'Thesis not found' });
    res.json(thesis);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
};
