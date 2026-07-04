const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { validateMarks, computeSummary } = require('../config/evaluationScheme');
const notifSvc = require('../services/notificationService');

exports.getAssignedGroups = async (req, res) => {
  try {
    const assignments = await prisma.examinerAssignment.findMany({
      where: { externalExaminerId: req.user.id },
      include: {
        group: {
          include: {
            members: { include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } } },
            supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
            academicYear: true,
            evaluations: {
              include: { submittedBy: { select: { firstName: true, lastName: true } } },
            },
            evaluationComponents: true,
            proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });
    res.json(assignments.map(a => a.group).filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
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
            supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
            academicYear: true,
            evaluations: {
              include: { submittedBy: { select: { firstName: true, lastName: true } } },
            },
            evaluationComponents: true,
            proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });
    res.json(assignments.map(a => a.thesis).filter(Boolean));
  } catch (error) {
    console.error('getAssignedTheses error:', error);
    res.status(500).json({ error: 'Internal server error' });
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

    // Verify examiner is assigned to this group/thesis
    if (groupId) {
      const assigned = await prisma.examinerAssignment.findFirst({
        where: { externalExaminerId: req.user.id, groupId: parseInt(groupId) },
      });
      if (!assigned) return res.status(403).json({ error: 'You are not assigned to evaluate this group' });
    } else if (thesisId) {
      const assigned = await prisma.examinerAssignment.findFirst({
        where: { externalExaminerId: req.user.id, thesisId: parseInt(thesisId) },
      });
      if (!assigned) return res.status(403).json({ error: 'You are not assigned to evaluate this thesis' });
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

    // In-app notification on marks submitted
    try {
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
    console.error('submitEvaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
