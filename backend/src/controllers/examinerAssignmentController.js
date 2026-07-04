const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const notifSvc = require('../services/notificationService');

exports.assignExaminerToGroup = async (req, res) => {
  try {
    const { externalExaminerId, groupId } = req.body;
    if (!externalExaminerId || !groupId) {
      return res.status(400).json({ error: 'externalExaminerId and groupId required' });
    }
    const assignment = await prisma.examinerAssignment.create({
      data: {
        externalExaminerId: parseInt(externalExaminerId),
        groupId: parseInt(groupId),
        assignedById: req.user.id,
      },
      include: {
        externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
        group: { select: { projectTitle: true } },
      },
    });
    // Notify examiner
    try {
      const assigner = await prisma.user.findUnique({ where: { id: req.user.id }, select: { firstName: true, lastName: true } });
      const assignerName = assigner ? `${assigner.firstName} ${assigner.lastName}` : 'Coordinator';
      await notifSvc.notifyExaminerAssignment({
        examinerId: parseInt(externalExaminerId), itemTitle: assignment.group?.projectTitle || 'project',
        type: 'group', assignerName,
      });
    } catch (e) { console.error('notifyExaminerAssignment:', e.message); }
    res.status(201).json(assignment);
  } catch (error) {
    console.error('assignExaminerToGroup error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'This examiner is already assigned to this group' });
    }
    res.status(500).json({ error: error.message });
  }
};

exports.assignExaminerToThesis = async (req, res) => {
  try {
    const { externalExaminerId, thesisId } = req.body;
    if (!externalExaminerId || !thesisId) {
      return res.status(400).json({ error: 'externalExaminerId and thesisId required' });
    }
    const assignment = await prisma.examinerAssignment.create({
      data: {
        externalExaminerId: parseInt(externalExaminerId),
        thesisId: parseInt(thesisId),
        assignedById: req.user.id,
      },
      include: {
        externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
        thesis: { select: { title: true } },
      },
    });
    // Notify examiner
    try {
      const assigner = await prisma.user.findUnique({ where: { id: req.user.id }, select: { firstName: true, lastName: true } });
      const assignerName = assigner ? `${assigner.firstName} ${assigner.lastName}` : 'Coordinator';
      await notifSvc.notifyExaminerAssignment({
        examinerId: parseInt(externalExaminerId), itemTitle: assignment.thesis?.title || 'thesis',
        type: 'thesis', assignerName,
      });
    } catch (e) { console.error('notifyExaminerAssignment:', e.message); }
    res.status(201).json(assignment);
  } catch (error) {
    console.error('assignExaminerToThesis error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'This examiner is already assigned to this thesis' });
    }
    res.status(500).json({ error: error.message });
  }
};

exports.getAssignedExaminersForGroup = async (req, res) => {
  try {
    const assignments = await prisma.examinerAssignment.findMany({
      where: { groupId: parseInt(req.params.id) },
      include: {
        externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
      },
    });
    res.json(assignments);
  } catch (error) {
    console.error('getAssignedExaminersForGroup error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAssignedExaminersForThesis = async (req, res) => {
  try {
    const assignments = await prisma.examinerAssignment.findMany({
      where: { thesisId: parseInt(req.params.id) },
      include: {
        externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
      },
    });
    res.json(assignments);
  } catch (error) {
    console.error('getAssignedExaminersForThesis error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.removeAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.examinerAssignment.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Assignment removed' });
  } catch (error) {
    console.error('removeAssignment error:', error);
    res.status(500).json({ error: error.message });
  }
};
