const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const emailService = require('../services/emailService');

exports.submitEvaluation = async (req, res) => {
  try {
    const { stage, marks, comment, groupId, thesisId, evaluationType } = req.body;
    
    let finalType = evaluationType;
    // Auto-infer evaluationType if not provided
    if (!finalType) {
      if (req.user.role === 'SUPERVISOR') {
        finalType = 'SUPERVISOR';
      } else if (req.user.role === 'EXTERNAL_EXAMINER') {
        finalType = 'EXTERNAL_EXAMINER';
      } else if (req.user.role === 'COORDINATOR') {
        if (stage === 'PROPOSAL') finalType = 'PROPOSAL_DEFENSE';
        else if (stage === 'MID_TERM') finalType = 'MIDTERM_DEFENSE';
        else if (stage === 'FINAL') finalType = 'FINAL_DEFENSE';
      }
    }

    let maxMarks = 50;
    if (finalType === 'SUPERVISOR') maxMarks = 25;
    else if (finalType === 'PROPOSAL_DEFENSE') maxMarks = 5;
    else if (finalType === 'MIDTERM_DEFENSE') maxMarks = 5;
    else if (finalType === 'FINAL_DEFENSE') maxMarks = 5;
    else if (finalType === 'EXTERNAL_EXAMINER') maxMarks = 10;

    const parsedMarks = marks !== undefined && marks !== null ? parseFloat(marks) : null;
    if (parsedMarks !== null) {
      if (parsedMarks < 0 || parsedMarks > maxMarks) {
        return res.status(400).json({ error: `Marks for ${finalType || 'evaluation'} must be between 0 and ${maxMarks}` });
      }
    }

    // Role-based security validation
    if (req.user.role === 'SUPERVISOR' && finalType !== 'SUPERVISOR') {
      return res.status(403).json({ error: 'Supervisors can only submit Supervisor evaluation marks (max 25).' });
    }
    if (req.user.role === 'EXTERNAL_EXAMINER' && finalType !== 'EXTERNAL_EXAMINER') {
      return res.status(403).json({ error: 'External Examiners can only submit External Examiner marks (max 10).' });
    }
    if (req.user.role === 'COORDINATOR' && !['PROPOSAL_DEFENSE', 'MIDTERM_DEFENSE', 'FINAL_DEFENSE', 'SUPERVISOR', 'EXTERNAL_EXAMINER'].includes(finalType)) {
      return res.status(400).json({ error: 'Invalid evaluation type for coordinator.' });
    }

    const evaluation = await prisma.evaluation.create({
      data: {
        stage,
        evaluationType: finalType,
        marks: parsedMarks,
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
