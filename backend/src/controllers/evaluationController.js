const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { validateMarks, computeSummary } = require('../config/evaluationScheme');
const notifSvc = require('../services/notificationService');

// Submit / update marks for a specific evaluation component.
// The component decides who can evaluate it (`evaluatorRole`).
// One Evaluation per component (upsert by componentId).
exports.submitComponentMarks = async (req, res) => {
  try {
    const { componentId, marks, comment, groupId, thesisId } = req.body;

    if (!componentId || (groupId == null && thesisId == null)) {
      return res.status(400).json({ error: 'componentId and groupId/thesisId are required' });
    }

    const component = await prisma.evaluationComponent.findUnique({
      where: { id: parseInt(componentId) },
    });
    if (!component) return res.status(404).json({ error: 'Evaluation component not found' });

    // The user role must match the component's evaluatorRole
    if (req.user.role !== component.evaluatorRole) {
      return res.status(403).json({
        error: `${req.user.role} cannot evaluate the "${component.name}" component (evaluator: ${component.evaluatorRole}).`,
      });
    }

    // Validate marks (allow null to clear)
    const marksValidation = validateMarks(marks, component.maxMarks);
    if (!marksValidation.valid) return res.status(400).json({ error: marksValidation.error });

    const data = {
      componentId: component.id,
      stage: component.evaluationType === 'MIDTERM_DEFENSE' ? 'MID_TERM'
        : component.evaluationType === 'PROPOSAL_DEFENSE' ? 'PROPOSAL' : 'FINAL',
      evaluationType: component.evaluationType,
      marks: marks !== null && marks !== undefined && marks !== '' ? parseFloat(marks) : null,
      comment: comment || null,
      submittedById: req.user.id,
      ...(groupId ? { groupId: parseInt(groupId) } : {}),
      ...(thesisId ? { thesisId: parseInt(thesisId) } : {}),
    };

    const existing = await prisma.evaluation.findUnique({
      where: { componentId: component.id },
    });

    let evaluation;
    if (existing) {
      evaluation = await prisma.evaluation.update({ where: { id: existing.id }, data });
    } else {
      evaluation = await prisma.evaluation.create({ data });
    }

    // Build the new summary so the caller doesn't have to refetch
    const components = await prisma.evaluationComponent.findMany({
      where: groupId
        ? { groupId: parseInt(groupId) }
        : { thesisId: parseInt(thesisId) },
    });
    const evaluations = await prisma.evaluation.findMany({
      where: groupId
        ? { groupId: parseInt(groupId) }
        : { thesisId: parseInt(thesisId) },
      include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    const summary = computeSummary(evaluations, components);

    // In-app notification on marks submitted
    try {
      const submitter = await prisma.user.findUnique({ where: { id: req.user.id }, select: { firstName: true, lastName: true } });
      const itemTitle = groupId
        ? (await prisma.projectGroup.findUnique({ where: { id: parseInt(groupId) }, select: { projectTitle: true } }))?.projectTitle
        : (await prisma.thesis.findUnique({ where: { id: parseInt(thesisId) }, select: { title: true } }))?.title;
      await notifSvc.notifyMarksSubmitted({
        groupId: groupId ? parseInt(groupId) : undefined,
        thesisId: thesisId ? parseInt(thesisId) : undefined,
        componentName: component.name,
        marks: data.marks,
        maxMarks: component.maxMarks,
        evaluatorRole: component.evaluatorRole,
        itemTitle: itemTitle || 'project',
        submitterId: req.user.id,
      });
    } catch (e) { console.error('notifyMarksSubmitted:', e.message); }

    res.status(existing ? 200 : 201).json({ evaluation, summary });
  } catch (error) {
    console.error('submitComponentMarks error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Supervisor feedback/comment without marks (still per-component if componentId given)
exports.submitFeedback = async (req, res) => {
  try {
    const { stage, comment, groupId, thesisId, componentId } = req.body;
    const evaluation = await prisma.evaluation.create({
      data: {
        stage,
        evaluationType: 'SUPERVISOR',
        marks: null,
        comment,
        submittedById: req.user.id,
        componentId: componentId ? parseInt(componentId) : null,
        groupId: groupId ? parseInt(groupId) : null,
        thesisId: thesisId ? parseInt(thesisId) : null,
      },
    });

    if (groupId) {
      const group = await prisma.projectGroup.findUnique({
        where: { id: parseInt(groupId) },
        include: { members: { include: { student: true } }, supervisor: { select: { firstName: true, lastName: true } } },
      });
      if (group?.members) {
        const studentEmails = group.members.map(m => m.student.email).filter(Boolean);
        const supName = group.supervisor ? `${group.supervisor.firstName} ${group.supervisor.lastName}` : 'Supervisor';
        const emailService = require('../services/emailService');
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
        const emailService = require('../services/emailService');
        emailService.notifyFeedbackSubmitted(
          [thesis.student.email],
          `${thesis.student.firstName} ${thesis.student.lastName} (Thesis)`,
          thesis.title, supName, stage, comment || 'N/A'
        );
      }
    }
    res.status(201).json(evaluation);
  } catch (error) {
    console.error('submitFeedback error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getGroupEvaluations = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [evaluations, components] = await Promise.all([
      prisma.evaluation.findMany({
        where: { groupId: id },
        include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.evaluationComponent.findMany({
        where: { groupId: id },
        orderBy: { id: 'asc' },
      }),
    ]);
    const summary = computeSummary(evaluations, components);
    res.json({ evaluations, components, summary });
  } catch (error) {
    console.error('getGroupEvaluations error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getThesisEvaluations = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [evaluations, components] = await Promise.all([
      prisma.evaluation.findMany({
        where: { thesisId: id },
        include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.evaluationComponent.findMany({
        where: { thesisId: id },
        orderBy: { id: 'asc' },
      }),
    ]);
    const summary = computeSummary(evaluations, components);
    res.json({ evaluations, components, summary });
  } catch (error) {
    console.error('getThesisEvaluations error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getMarksSummary = async (req, res) => {
  try {
    const { groupId, thesisId } = req.query;
    if (!groupId && !thesisId) {
      return res.status(400).json({ error: 'groupId or thesisId required' });
    }
    const where = groupId ? { groupId: parseInt(groupId) } : { thesisId: parseInt(thesisId) };
    const [evaluations, components] = await Promise.all([
      prisma.evaluation.findMany({
        where,
        include: { submittedBy: { select: { firstName: true, lastName: true } } },
      }),
      prisma.evaluationComponent.findMany({ where }),
    ]);
    const summary = computeSummary(evaluations, components);
    res.json({ evaluations, summary });
  } catch (error) {
    console.error('getMarksSummary error:', error);
    res.status(500).json({ error: error.message });
  }
};
