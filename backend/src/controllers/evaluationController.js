
const prisma = require('../utils/prisma');
const { validateMarks, computeSummary } = require('../config/evaluationScheme');
const { parseId } = require('../utils/params');
const { GROUP_STATUS, THESIS_STATUS, SUPERVISOR_ASSIGNMENT_STATUS } = require('../config/statusConstants');
const logger = require('../utils/logger');
const notifSvc = require('../services/notificationService');
const audit = require('../services/auditService');
const { resolveCoordinatorScope, isGroupVisibleToCoordinator, isThesisVisibleToCoordinator, canManageGroupAsCoordinator, canManageThesisAsCoordinator } = require('../utils/coordinatorScope');

// Submit / update marks for a specific evaluation component.
// The component decides who can evaluate it (`evaluatorRole`).
// One Evaluation per component (upsert by componentId).
exports.submitComponentMarks = async (req, res) => {
  try {
    const { componentId, marks, comment, comments, suggestions, groupId, thesisId } = req.body;

    if (!componentId || (groupId == null && thesisId == null)) {
      return res.status(400).json({ error: 'componentId and groupId/thesisId are required' });
    }
    if (marks !== null && marks !== undefined && marks !== '') {
      const parsed = Number(marks);
      if (isNaN(parsed) || parsed < 0) {
        return res.status(400).json({ error: 'marks must be a non-negative number' });
      }
    }

    const component = await prisma.evaluationComponent.findUnique({
      where: { id: parseInt(componentId) },
    });
    if (!component) return res.status(404).json({ error: 'Evaluation component not found' });

    // Coordinators may record marks on items inside their coordinator
    // scope, or on their own supervised components, or on their assigned examiner components.
    if (req.user.role === 'COORDINATOR') {
      const scope = await resolveCoordinatorScope(req.user);
      if (groupId) {
        const group = await prisma.projectGroup.findUnique({
          where: { id: parseInt(groupId) },
          select: { id: true, programId: true, supervisorId: true, examinerAssignments: { select: { externalExaminerId: true } } },
        });
        const canManage = await canManageGroupAsCoordinator(group, scope, req.user);
        const ownSupervisorComponent = group?.supervisorId === req.user.id && component.evaluatorRole === 'SUPERVISOR';
        const isAssignedExaminer = component.evaluatorRole === 'EXTERNAL_EXAMINER' &&
          group?.examinerAssignments?.some(ea => ea.externalExaminerId === req.user.id);
        if (!canManage && !ownSupervisorComponent && !isAssignedExaminer) {
          return res.status(403).json({ error: 'You cannot record evaluations for this group from your coordinator scope.' });
        }
      } else if (thesisId) {
        const thesis = await prisma.thesis.findUnique({
          where: { id: parseInt(thesisId) },
          select: {
            id: true, programId: true, supervisorId: true, externalMidTermId: true, externalFinalId: true,
            student: { select: { programId: true } },
            examinerAssignments: { select: { externalExaminerId: true } },
          },
        });
        const canManage = await canManageThesisAsCoordinator(thesis, scope, req.user);
        const ownSupervisorComponent = thesis?.supervisorId === req.user.id && component.evaluatorRole === 'SUPERVISOR';
        const isAssignedExaminer = (
          (thesis?.externalMidTermId === req.user.id && (component.evaluationType === 'EXTERNAL_MIDTERM' || component.evaluationType === 'MIDTERM_DEFENSE' || component.evaluatorRole === 'EXTERNAL_MIDTERM' || component.evaluatorRole === 'EXTERNAL_EXAMINER')) ||
          (thesis?.externalFinalId === req.user.id && (component.evaluationType === 'EXTERNAL_FINAL' || component.evaluationType === 'FINAL_DEFENSE' || component.evaluatorRole === 'EXTERNAL_FINAL' || component.evaluatorRole === 'EXTERNAL_EXAMINER')) ||
          (thesis?.examinerAssignments?.some(ea => ea.externalExaminerId === req.user.id))
        );
        if (!canManage && !ownSupervisorComponent && !isAssignedExaminer) {
          return res.status(403).json({ error: 'You cannot record evaluations for this thesis from your coordinator scope.' });
        }
      }
    }

    // Capability-based verification based on component.evaluatorRole (for non-coordinators):
    const groupIdNum = groupId ? parseInt(groupId) : null;
    const thesisIdNum = thesisId ? parseInt(thesisId) : null;

    if (req.user.role !== 'COORDINATOR') {
      if (component.evaluatorRole === 'SUPERVISOR') {
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
      } else if (component.evaluatorRole === 'EXTERNAL_EXAMINER') {
        if (groupIdNum) {
          const assigned = await prisma.examinerAssignment.findFirst({
            where: { externalExaminerId: req.user.id, groupId: groupIdNum },
          });
          if (!assigned) return res.status(403).json({ error: 'You are not assigned as examiner for this group' });
        } else if (thesisIdNum) {
          const thesis = await prisma.thesis.findUnique({
            where: { id: thesisIdNum },
            select: { externalMidTermId: true, externalFinalId: true },
          });
          const isAssigned = (thesis && (thesis.externalMidTermId === req.user.id || thesis.externalFinalId === req.user.id)) ||
            await prisma.examinerAssignment.findFirst({
              where: { externalExaminerId: req.user.id, thesisId: thesisIdNum },
            });
          if (!isAssigned) return res.status(403).json({ error: 'You are not assigned as examiner for this thesis' });
        }
      }
    }

    // Validate marks (allow null to clear)
    const marksValidation = validateMarks(marks, component.maxMarks);
    if (!marksValidation.valid) return res.status(400).json({ error: marksValidation.error });

    const scopeWhere = groupId ? { groupId: parseInt(groupId, 10) } : { thesisId: parseInt(thesisId, 10) };
    const existing = await prisma.evaluation.findFirst({
      where: { componentId: component.id, ...scopeWhere },
    });

    const data = {
      componentId: component.id,
      stage: component.evaluationType === 'MIDTERM_DEFENSE' ? 'MID_TERM'
        : component.evaluationType === 'PROPOSAL_DEFENSE' ? 'PROPOSAL' : 'FINAL',
      evaluationType: component.evaluationType,
      marks: marks !== null && marks !== undefined && marks !== '' ? parseFloat(marks) : null,
      comment: comment || null,
      comments: comments || null,
      suggestions: suggestions || null,
      // Preserve the original evaluator when a coordinator corrects a saved mark.
      submittedById: existing?.submittedById || req.user.id,
      ...(groupId ? { groupId: parseInt(groupId) } : {}),
      ...(thesisId ? { thesisId: parseInt(thesisId) } : {}),
    };

    const isUpdate = !!existing;
    const evaluation = await (isUpdate
      ? prisma.evaluation.update({ where: { id: existing.id }, data })
      : prisma.evaluation.create({ data }));

    // Batched, readable audit entry naming the item instead of one row per component
    try {
      const itemTitle = groupId
        ? (await prisma.projectGroup.findUnique({ where: { id: parseInt(groupId) }, select: { projectTitle: true } }))?.projectTitle
        : (await prisma.thesis.findUnique({ where: { id: parseInt(thesisId) }, select: { title: true } }))?.title;
      audit.logMarks({
        groupId: groupId ? parseInt(groupId) : undefined,
        thesisId: thesisId ? parseInt(thesisId) : undefined,
        title: itemTitle || 'project',
        performedById: req.user.id,
        isUpdate,
      });
    } catch (e) { logger.error('audit marks error:', e.message); }

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
      const ths = await prisma.thesis.findUnique({ where: { id: parseInt(thesisId) }, select: { projectType: true } });
      projectType = ths?.projectType || 'THESIS';
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
    } catch (e) { logger.error('notifyMarksSubmitted:', e.message); }

    res.status(existing ? 200 : 201).json({ evaluation, summary });
  } catch (error) {
    logger.error('submitComponentMarks error:', error);
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
    logger.error('submitFeedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getGroupEvaluations = async (req, res) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    if (req.user.role === 'COORDINATOR') {
      const scope = await resolveCoordinatorScope(req.user);
      const group = await prisma.projectGroup.findUnique({
        where: { id },
        select: { id: true, programId: true, supervisorId: true, examinerAssignments: { select: { externalExaminerId: true } } },
      });
      if (!await isGroupVisibleToCoordinator(group, scope, req.user)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
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
  res.json({ evaluations, components, summary });
  } catch (error) {
    logger.error('getGroupEvaluations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getThesisEvaluations = async (req, res) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    if (req.user.role === 'COORDINATOR') {
      const scope = await resolveCoordinatorScope(req.user);
      const thesis = await prisma.thesis.findUnique({
        where: { id },
        select: {
          id: true, programId: true, supervisorId: true, externalMidTermId: true, externalFinalId: true,
          student: { select: { programId: true } },
          examinerAssignments: { select: { externalExaminerId: true } },
        },
      });
      if (!await isThesisVisibleToCoordinator(thesis, scope, req.user)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
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
    const thesis2 = await prisma.thesis.findUnique({ where: { id }, select: { projectType: true } });
    const summary = computeSummary(evaluations, components, thesis2?.projectType || 'THESIS');
    res.json({ evaluations, components, summary });
  } catch (error) {
    logger.error('getThesisEvaluations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// Mark an evaluation (component) as COMPLETED — evaluator cannot edit after
exports.completeEvaluation = async (req, res) => {
  try {
    const componentId = parseId(req, res);
    if (componentId === null) return;
    const { groupId, thesisId } = req.body;

    if (!groupId && !thesisId) {
      return res.status(400).json({ error: 'groupId or thesisId is required' });
    }

    // Scope the query to the specific group or thesis
    const scopeWhere = groupId ? { groupId: parseInt(groupId) } : { thesisId: parseInt(thesisId) };

    const evaluation = await prisma.evaluation.findFirst({
      where: { componentId, ...scopeWhere },
      include: { component: true },
    });
    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found. Submit marks first.' });
    }

    if (evaluation.marks === null || evaluation.marks === undefined) {
      return res.status(400).json({ error: 'Submit marks before completing this evaluation.' });
    }

    // Reject if the project's total marks would exceed the scheme maximum
    const where = groupId ? { groupId: parseInt(groupId) } : { thesisId: parseInt(thesisId) };
    const [components, allEvals] = await Promise.all([
      prisma.evaluationComponent.findMany({ where }),
      prisma.evaluation.findMany({ where }),
    ]);
    const projectType = groupId
      ? (await prisma.projectGroup.findUnique({ where: { id: parseInt(groupId) }, select: { projectType: true } }))?.projectType
      : (await prisma.thesis.findUnique({ where: { id: parseInt(thesisId) }, select: { projectType: true } }))?.projectType || 'THESIS';
    const summary = computeSummary(allEvals, components, projectType);
    if (summary.total > summary.maxTotal) {
      return res.status(400).json({
        error: `Total marks (${summary.total}) exceed the maximum allowed (${summary.maxTotal}).`,
      });
    }

    // Prevent re-completing an already completed evaluation
    if (evaluation.status === GROUP_STATUS.COMPLETED && !['COORDINATOR', 'MAINTAINER'].includes(req.user.role)) {
      return res.status(400).json({ error: 'Evaluation already completed.' });
    }
    if (!['COORDINATOR', 'MAINTAINER'].includes(req.user.role) && req.user.role !== evaluation.component.evaluatorRole) {
      return res.status(403).json({ error: 'You cannot complete this evaluation.' });
    }

    // Coordinators can only complete evaluations on items inside their scope, or their own supervised/examiner evaluations
    if (req.user.role === 'COORDINATOR') {
      const scope = await resolveCoordinatorScope(req.user);
      if (groupId) {
        const group = await prisma.projectGroup.findUnique({
          where: { id: parseInt(groupId) },
          select: { id: true, programId: true, supervisorId: true, examinerAssignments: { select: { externalExaminerId: true } } },
        });
        const canManage = await canManageGroupAsCoordinator(group, scope, req.user);
        const ownSupervisorComponent = group?.supervisorId === req.user.id && evaluation.component?.evaluatorRole === 'SUPERVISOR';
        const isAssignedExaminer = evaluation.component?.evaluatorRole === 'EXTERNAL_EXAMINER' &&
          group?.examinerAssignments?.some(ea => ea.externalExaminerId === req.user.id);
        if (!canManage && !ownSupervisorComponent && !isAssignedExaminer) {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else {
        const thesis = await prisma.thesis.findUnique({
          where: { id: parseInt(thesisId) },
          select: {
            id: true, programId: true, supervisorId: true, externalMidTermId: true, externalFinalId: true,
            student: { select: { programId: true } },
            examinerAssignments: { select: { externalExaminerId: true } },
          },
        });
        const canManage = await canManageThesisAsCoordinator(thesis, scope, req.user);
        const ownSupervisorComponent = thesis?.supervisorId === req.user.id && evaluation.component?.evaluatorRole === 'SUPERVISOR';
        const isAssignedExaminer = (
          (thesis?.externalMidTermId === req.user.id && (evaluation.component?.evaluationType === 'EXTERNAL_MIDTERM' || evaluation.component?.evaluationType === 'MIDTERM_DEFENSE' || evaluation.component?.evaluatorRole === 'EXTERNAL_MIDTERM' || evaluation.component?.evaluatorRole === 'EXTERNAL_EXAMINER')) ||
          (thesis?.externalFinalId === req.user.id && (evaluation.component?.evaluationType === 'EXTERNAL_FINAL' || evaluation.component?.evaluationType === 'FINAL_DEFENSE' || evaluation.component?.evaluatorRole === 'EXTERNAL_FINAL' || evaluation.component?.evaluatorRole === 'EXTERNAL_EXAMINER')) ||
          (thesis?.examinerAssignments?.some(ea => ea.externalExaminerId === req.user.id))
        );
        if (!canManage && !ownSupervisorComponent && !isAssignedExaminer) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
    }

    await prisma.evaluation.update({
      where: { id: evaluation.id },
      data: { status: 'COMPLETED' },
    });
    const itemTitle = groupId
      ? (await prisma.projectGroup.findUnique({ where: { id: parseInt(groupId) }, select: { projectTitle: true } }))?.projectTitle
      : (await prisma.thesis.findUnique({ where: { id: parseInt(thesisId) }, select: { title: true } }))?.title;
    audit.log({ action: 'COMPLETE_EVALUATION', entity: 'Project', entityId: groupId || thesisId, details: `Completed "${evaluation.component.name}" evaluation for "${itemTitle || 'project'}"`, performedById: req.user.id });

    res.json({ message: 'Evaluation completed successfully' });
  } catch (error) {
    logger.error('completeEvaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
