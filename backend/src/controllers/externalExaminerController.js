const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAssignedGroups = async (req, res) => {
  // Mock: return all active groups for now
  try {
    const groups = await prisma.projectGroup.findMany({
      where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
      include: {
        members: { include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
        academicYear: true,
        evaluations: {
          include: { submittedBy: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAssignedTheses = async (req, res) => {
  try {
    const theses = await prisma.thesis.findMany({
      where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
        academicYear: true,
        evaluations: {
          include: { submittedBy: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    res.json(theses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.submitEvaluation = async (req, res) => {
  try {
    const { stage, marks, comment, groupId, thesisId } = req.body;
    const evaluation = await prisma.evaluation.create({
      data: {
        stage,
        marks: marks ? parseFloat(marks) : null,
        comment,
        submittedById: req.user.id,
        groupId: groupId ? parseInt(groupId) : null,
        thesisId: thesisId ? parseInt(thesisId) : null,
      },
    });
    res.status(201).json(evaluation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
