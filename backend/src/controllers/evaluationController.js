const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { validateMarks, computeSummary } = require('../config/evaluationScheme');
const notifSvc = require('../services/notificationService');
const audit = require('../services/auditService');

// Submit / update marks for a specific evaluation component.
// The component decides who can evaluate it (`evaluatorRole`).
// One Evaluation per component (upsert by componentId).
exports.submitComponentMarks = async (req, res) => {
  try {
    const { componentId, marks, comment, groupId, thesisId } = req.body;

    if (!componentId || (groupId == null && thesisId == null)) {
      return res.status(400).json({ error: 'componentId and groupId/thesisId are required' });
    }
    if (marks !== null && marks !== undefined && marks !== '' && (typeof marks !== 'number' || marks < 0)) {
      return res.status(400).json({ error: 'marks must be a non-negative number' });
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

    // Verify assignment: supervisors can only mark their own groups/theses
    if (req.user.role === 'SUPERVISOR') {
      const groupIdNum = groupId ? parseInt(groupId) : null;
      const thesisIdNum = thesisId ? parseInt(thesisId) : null;
      if (groupIdNum) {
        const group = await prisma.projectGroup.findUnique({ where: { id: groupIdNum }, select: { supervisorId: true } });
        if (!group || group.supervisorId !== req.user.id) {
          return res.status(403).json({ error: 'You are not the supervisor of this group' });
        }
      } else if (thesisIdNum) {
        const thesis = await prisma.thesis.findUnique({ where: { id: thesisIdNum }, select: { supervisorId: true } });
        if (!thesis || thesis.supervisorId !== req.user.id) {
          return res.status(403).json({ error: 'You are not the supervisor of this thesis' });
        }
      }
    }

    // Verify assignment: external examiners can only mark what they're assigned to
    if (req.user.role === 'EXTERNAL_EXAMINER') {
      const groupIdNum = groupId ? parseInt(groupId) : null;
      const thesisIdNum = thesisId ? parseInt(thesisId) : null;
      if (groupIdNum) {
        const assigned = await prisma.examinerAssignment.findFirst({
          where: { externalExaminerId: req.user.id, groupId: groupIdNum },
        });
        if (!assigned) return res.status(403).json({ error: 'You are not assigned to evaluate this group' });
      } else if (thesisIdNum) {
        const assigned = await prisma.examinerAssignment.findFirst({
          where: { externalExaminerId: req.user.id, thesisId: thesisIdNum },
        });
        if (!assigned) return res.status(403).json({ error: 'You are not assigned to evaluate this thesis' });
      }
    }

    // Prevent editing if parent project/thesis is COMPLETED
    const groupIdNum = groupId ? parseInt(groupId) : null;
    const thesisIdNum = thesisId ? parseInt(thesisId) : null;
    if (groupIdNum) {
      const grp = await prisma.projectGroup.findUnique({ where: { id: groupIdNum }, select: { status: true } });
      if (grp?.status === 'COMPLETED') return res.status(400).json({ error: 'Cannot edit marks: project is already completed.' });
    }
    if (thesisIdNum) {
      const th = await prisma.thesis.findUnique({ where: { id: thesisIdNum }, select: { status: true } });
      if (th?.status === 'COMPLETED') return res.status(400).json({ error: 'Cannot edit marks: thesis is already completed.' });
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

    const scopeWhere = groupId ? { groupId: parseInt(groupId, 10) } : { thesisId: parseInt(thesisId, 10) };
    const existing = await prisma.evaluation.findFirst({
      where: { componentId: component.id, ...scopeWhere },
    });

    // Prevent editing if already completed
    if (existing && existing.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Evaluation is already completed and cannot be edited.' });
    }

    const isUpdate = !!existing;
    const evaluation = await (isUpdate
      ? prisma.evaluation.update({ where: { id: existing.id }, data })
      : prisma.evaluation.create({ data }));
    const auditAction = isUpdate ? 'UPDATE_MARKS' : 'SUBMIT_MARKS';
    const auditDetails = isUpdate
      ? `Updated ${component.evaluationType.replace('_', ' ').toLowerCase()} marks to ${data.marks ?? 'null'}/${component.maxMarks}`
      : `Submitted ${data.marks ?? 'null'}/${component.maxMarks} marks for ${component.evaluationType.replace('_', ' ').toLowerCase()}`;
    audit.log({ action: auditAction, entity: 'Evaluation', entityId: evaluation.id, details: auditDetails, performedById: req.user.id });

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

    // Determine project type for correct total
    let projectType = 'MINOR';
    if (groupId) {
      const grp = await prisma.projectGroup.findUnique({ where: { id: parseInt(groupId) }, select: { projectType: true } });
      if (grp) projectType = grp.projectType;
    } else if (thesisId) {
      projectType = 'MASTER';
    }
    const summary = computeSummary(evaluations, components, projectType);

    // In-app + email notification on marks submitted
    try {
      const submitter = await prisma.user.findUnique({ where: { id: req.user.id }, select: { firstName: true, lastName: true, email: true } });
      const itemTitle = groupId
        ? (await prisma.projectGroup.findUnique({ where: { id: parseInt(groupId) }, select: { projectTitle: true, name: true } }))?.projectTitle
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
      // Email notification to students
      try {
        const emailService = require('../services/emailService');
        if (groupId) {
          const grp = await prisma.projectGroup.findUnique({
            where: { id: parseInt(groupId) },
            include: { members: { include: { student: { select: { email: true } } } } },
          });
          const studentEmails = grp?.members?.map(m => m.student.email).filter(Boolean) || [];
          if (studentEmails.length) {
            emailService.notifyEvaluationSubmitted(studentEmails, grp.name, itemTitle, `${submitter.firstName} ${submitter.lastName}`, component.evaluationType, `${data.marks ?? '-'}/${component.maxMarks}`);
          }
        } else if (thesisId) {
          const th = await prisma.thesis.findUnique({
            where: { id: parseInt(thesisId) },
            include: { student: { select: { email: true } } },
          });
          if (th?.student?.email) {
            emailService.notifyEvaluationSubmitted([th.student.email], `${th.student.firstName} ${th.student.lastName} (Thesis)`, itemTitle, `${submitter.firstName} ${submitter.lastName}`, component.evaluationType, `${data.marks ?? '-'}/${component.maxMarks}`);
          }
        }
      } catch (e) { console.error('email notification error:', e.message); }
    } catch (e) { console.error('notifyMarksSubmitted:', e.message); }

    res.status(existing ? 200 : 201).json({ evaluation, summary });
  } catch (error) {
    console.error('submitComponentMarks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Supervisor feedback/comment without marks (still per-component if componentId given)
exports.submitFeedback = async (req, res) => {
  try {
    const { stage, comment, groupId, thesisId, componentId } = req.body;
    if (groupId) {
      const group = await prisma.projectGroup.findUnique({ where: { id: parseInt(groupId) }, select: { supervisorId: true } });
      if (!group || group.supervisorId !== req.user.id) {
        return res.status(403).json({ error: 'You are not the supervisor of this group' });
      }
    } else if (thesisId) {
      const thesis = await prisma.thesis.findUnique({ where: { id: parseInt(thesisId) }, select: { supervisorId: true } });
      if (!thesis || thesis.supervisorId !== req.user.id) {
        return res.status(403).json({ error: 'You are not the supervisor of this thesis' });
      }
    }
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
        include: { members: { include: { student: true } }, supervisor: { select: { firstName: true, lastName: true, active: true } } },
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
        include: { student: true, supervisor: { select: { firstName: true, lastName: true, active: true } } },
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
    audit.log({ action: 'SUBMIT_FEEDBACK', entity: 'Evaluation', details: `Supervisor provided feedback for ${stage} stage`, performedById: req.user.id });
    res.status(201).json(evaluation);
  } catch (error) {
    console.error('submitFeedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getGroupEvaluations = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [evaluations, components, group] = await Promise.all([
      prisma.evaluation.findMany({
        where: { groupId: id },
        include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.evaluationComponent.findMany({
        where: { groupId: id },
        orderBy: { id: 'asc' },
      }),
      prisma.projectGroup.findUnique({ where: { id }, select: { projectType: true } }),
    ]);
  const projectType = group?.projectType || 'MINOR';
  const summary = computeSummary(evaluations, components, projectType);
  audit.log({ action: 'VIEW', entity: 'GroupEvaluations', details: `Retrieved evaluations for group ${id}`, performedById: req.user.id });
  res.json({ evaluations, components, summary });
  } catch (error) {
    console.error('getGroupEvaluations error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    const summary = computeSummary(evaluations, components, 'MASTER');
    res.json({ evaluations, components, summary });
  } catch (error) {
    console.error('getThesisEvaluations error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    let projectType = 'MINOR';
    if (groupId) {
      const grp = await prisma.projectGroup.findUnique({ where: { id: parseInt(groupId) }, select: { projectType: true } });
      if (grp) projectType = grp.projectType;
    } else {
      projectType = 'MASTER';
    }
    const summary = computeSummary(evaluations, components, projectType);
    res.json({ evaluations, summary });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark an evaluation (component) as COMPLETED — evaluator cannot edit after
exports.completeEvaluation = async (req, res) => {
  try {
    const componentId = parseInt(req.params.id);
    const { groupId, thesisId } = req.body;

    const evaluation = await prisma.evaluation.findUnique({
      where: { componentId },
      include: { component: true },
    });
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found. Submit marks first.' });
    }
    if (evaluation.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Evaluation already completed.' });
    }
    if (req.user.role !== evaluation.component.evaluatorRole) {
      return res.status(403).json({ error: 'You cannot complete this evaluation.' });
    }

    await prisma.evaluation.update({
      where: { id: evaluation.id },
      data: { status: 'COMPLETED' },
    });

    res.json({ message: 'Evaluation completed successfully' });
  } catch (error) {
    console.error('completeEvaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
