const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getMyGroup = async (req, res) => {
  try {
    const member = await prisma.groupMember.findFirst({
      where: { studentId: req.user.id },
      include: {
        group: {
          include: {
            supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
            academicYear: true,
            evaluations: {
              include: { submittedBy: { select: { firstName: true, lastName: true } } },
            },
            evaluationComponents: true,
            proposals: true,
          },
        },
      },
    });
    if (!member) return res.status(404).json({ error: 'You are not assigned to any project group' });
    res.json(member.group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyThesis = async (req, res) => {
  try {
    const thesis = await prisma.thesis.findFirst({
      where: { studentId: req.user.id },
      include: {
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
        academicYear: true,
        evaluations: {
          include: { submittedBy: { select: { firstName: true, lastName: true } } },
        },
        evaluationComponents: true,
        proposals: true,
      },
    });
    if (!thesis) return res.status(404).json({ error: 'You are not assigned any thesis' });
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
