const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { validateMarks, computeSummary } = require('../config/evaluationScheme');

exports.getAssignedGroups = async (req, res) => {
  try {
    const assignments = await prisma.examinerAssignment.findMany({
      where: { externalExaminerId: req.user.id },
      include: {
        group: {
          include: {
            members: { include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } } },
            supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
            academicYear: true,
            evaluations: {
              include: { submittedBy: { select: { firstName: true, lastName: true } } },
            },
            evaluationComponents: true,
          },
        },
      },
    });
    res.json(assignments.map(a => a.group).filter(Boolean));
  } catch (error) {
    console.error('getAssignedGroups error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAssignedTheses = async (req, res) => {
  try {
    const assignments = await prisma.examinerAssignment.findMany({
      where: { externalExaminerId: req.user.id },
      include: {
        thesis: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, email: true } },
            supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
            academicYear: true,
            evaluations: {
              include: { submittedBy: { select: { firstName: true, lastName: true } } },
            },
            evaluationComponents: true,
          },
        },
      },
    });
    res.json(assignments.map(a => a.thesis).filter(Boolean));
  } catch (error) {
    console.error('getAssignedTheses error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Internal Examiner marks (the 10-mark component, evaluatorRole = EXTERNAL_EXAMINER)
exports.submitEvaluation = async (req, res) => {
  try {
    const { componentId, marks, comment, groupId, thesisId } = req.body;

    let component;
    if (componentId) {
      component = await prisma.evaluationComponent.findUnique({ where: { id: parseInt(componentId) } });
      if (!component) return res.status(404).json({ error: 'Evaluation component not found' });
    } else {
      // Backwards-compat fallback: find the EXTERNAL_EXAMINER component for this group/thesis
      component = await prisma.evaluationComponent.findFirst({
        where: {
          evaluatorRole: 'EXTERNAL_EXAMINER',
          ...(groupId ? { groupId: parseInt(groupId) } : { thesisId: parseInt(thesisId) }),
        },
      });
      if (!component) return res.status(404).json({ error: 'Internal Examiner component not found for this project' });
    }

    if (component.evaluatorRole !== 'EXTERNAL_EXAMINER') {
      return res.status(403).json({ error: 'This component is not evaluated by the Internal Examiner.' });
    }

    const validation = validateMarks(marks, component.maxMarks);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    const data = {
      componentId: component.id,
      stage: 'FINAL',
      evaluationType: 'EXTERNAL_EXAMINER',
      marks: marks !== null && marks !== undefined && marks !== '' ? parseFloat(marks) : null,
      comment: comment || null,
      submittedById: req.user.id,
      ...(groupId ? { groupId: parseInt(groupId) } : {}),
      ...(thesisId ? { thesisId: parseInt(thesisId) } : {}),
    };

    const existing = await prisma.evaluation.findUnique({ where: { componentId: component.id } });
    let evaluation;
    if (existing) {
      evaluation = await prisma.evaluation.update({ where: { id: existing.id }, data });
    } else {
      evaluation = await prisma.evaluation.create({ data });
    }

    const components = await prisma.evaluationComponent.findMany({
      where: groupId ? { groupId: parseInt(groupId) } : { thesisId: parseInt(thesisId) },
    });
    const evaluations = await prisma.evaluation.findMany({
      where: groupId ? { groupId: parseInt(groupId) } : { thesisId: parseInt(thesisId) },
      include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    const summary = computeSummary(evaluations, components);

    res.status(existing ? 200 : 201).json({ evaluation, summary });
  } catch (error) {
    console.error('submitEvaluation error:', error);
    res.status(500).json({ error: error.message });
  }
};
