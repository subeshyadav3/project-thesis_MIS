
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const { computeSummary } = require('../config/evaluationScheme');
const notifSvc = require('../services/notificationService');
const audit = require('../services/auditService');

exports.getAssignedGroups = async (req, res) => {
  try {
    const assignments = await prisma.examinerAssignment.findMany({
      where: { externalExaminerId: req.user.id },
      include: {
        group: {
          include: {
            members: { include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } } },
            supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
            evaluations: {
              include: { submittedBy: { select: { firstName: true, lastName: true } } },
            },
            evaluationComponents: true,
            proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } }, commentedBy: { select: { id: true, firstName: true, lastName: true, role: true } } }, orderBy: { createdAt: 'desc' } },
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
    const thesisInclude = {
      student: { select: { id: true, firstName: true, lastName: true, email: true } },
      supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true, designation: true } },
      evaluations: {
        include: { submittedBy: { select: { firstName: true, lastName: true } } },
      },
      evaluationComponents: true,
      proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } }, commentedBy: { select: { id: true, firstName: true, lastName: true, role: true } } }, orderBy: { createdAt: 'desc' } },
    };

    // Include theses where this user is mid-term and/or final external (or has a legacy assignment row)
    const theses = await prisma.thesis.findMany({
      where: {
        OR: [
          { externalMidTermId: req.user.id },
          { externalFinalId: req.user.id },
          { examinerAssignments: { some: { externalExaminerId: req.user.id } } },
        ],
      },
      include: thesisInclude,
      orderBy: { updatedAt: 'desc' },
    });

    res.json(theses.map(t => {
      const isMid = t.externalMidTermId === req.user.id;
      const isFinal = t.externalFinalId === req.user.id;
      let externalRole = null;
      if (isMid && isFinal) externalRole = 'BOTH';
      else if (isMid) externalRole = 'MIDTERM';
      else if (isFinal) externalRole = 'FINAL';
      return { ...t, externalRole };
    }));
  } catch (error) {
    logger.error('getAssignedTheses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

