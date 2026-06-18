const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const emailService = require('../services/emailService');

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
    if (groupId) {
      const group = await prisma.projectGroup.findUnique({
        where: { id: parseInt(groupId) },
        include: {
          members: { include: { student: true } },
          supervisor: { select: { firstName: true, lastName: true } },
        },
      });
      if (group?.members) {
        const studentEmails = group.members.map(m => m.student.email).filter(Boolean);
        const supName = group.supervisor ? `${group.supervisor.firstName} ${group.supervisor.lastName}` : 'Supervisor';
        emailService.notifyEvaluationSubmitted(
          studentEmails, group.name, group.projectTitle, supName, stage, marks || 'N/A'
        );
      }
    } else if (thesisId) {
      const thesis = await prisma.thesis.findUnique({
        where: { id: parseInt(thesisId) },
        include: { student: true, supervisor: { select: { firstName: true, lastName: true } } },
      });
      if (thesis?.student) {
        const supName = thesis.supervisor ? `${thesis.supervisor.firstName} ${thesis.supervisor.lastName}` : 'Supervisor';
        emailService.notifyEvaluationSubmitted(
          [thesis.student.email],
          `${thesis.student.firstName} ${thesis.student.lastName} (Thesis)`,
          thesis.title, supName, stage, marks || 'N/A'
        );
      }
    }
    res.status(201).json(evaluation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.submitFeedback = async (req, res) => {
  try {
    const { stage, comment, groupId, thesisId } = req.body;
    const evaluation = await prisma.evaluation.create({
      data: {
        stage,
        marks: null,
        comment,
        submittedById: req.user.id,
        groupId: groupId ? parseInt(groupId) : null,
        thesisId: thesisId ? parseInt(thesisId) : null,
      },
    });
    if (groupId) {
      const group = await prisma.projectGroup.findUnique({
        where: { id: parseInt(groupId) },
        include: {
          members: { include: { student: true } },
          supervisor: { select: { firstName: true, lastName: true } },
        },
      });
      if (group?.members) {
        const studentEmails = group.members.map(m => m.student.email).filter(Boolean);
        const supName = group.supervisor ? `${group.supervisor.firstName} ${group.supervisor.lastName}` : 'Supervisor';
        emailService.notifyFeedbackSubmitted(
          studentEmails, group.name, group.projectTitle, supName, stage, comment || 'N/A'
        );
      }
    } else if (thesisId) {
      const thesis = await prisma.thesis.findUnique({
        where: { id: parseInt(thesisId) },
        include: { student: true, supervisor: { select: { firstName: true, lastName: true } } },
      });
      if (thesis?.student) {
        const supName = thesis.supervisor ? `${thesis.supervisor.firstName} ${thesis.supervisor.lastName}` : 'Supervisor';
        emailService.notifyFeedbackSubmitted(
          [thesis.student.email],
          `${thesis.student.firstName} ${thesis.student.lastName} (Thesis)`,
          thesis.title, supName, stage, comment || 'N/A'
        );
      }
    }
    res.status(201).json(evaluation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getGroupEvaluations = async (req, res) => {
  try {
    const evaluations = await prisma.evaluation.findMany({
      where: { groupId: parseInt(req.params.id) },
      include: { submittedBy: { select: { firstName: true, lastName: true } } },
    });
    const components = await prisma.evaluationComponent.findMany({
      where: { groupId: parseInt(req.params.id) },
    });
    res.json({ evaluations, components });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getThesisEvaluations = async (req, res) => {
  try {
    const evaluations = await prisma.evaluation.findMany({
      where: { thesisId: parseInt(req.params.id) },
      include: { submittedBy: { select: { firstName: true, lastName: true } } },
    });
    const components = await prisma.evaluationComponent.findMany({
      where: { thesisId: parseInt(req.params.id) },
    });
    res.json({ evaluations, components });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
