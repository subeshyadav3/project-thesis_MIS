const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const audit = require('../services/auditService');

exports.getMyGroups = async (req, res) => {
  try {
    const groups = await prisma.projectGroup.findMany({
      where: { supervisorId: req.user.id },
      include: {
        members: { include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        evaluations: { include: { submittedBy: { select: { firstName: true, lastName: true } } } },
        evaluationComponents: true,
        academicYear: true,
      },
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getMyTheses = async (req, res) => {
  try {
    const theses = await prisma.thesis.findMany({
      where: { supervisorId: req.user.id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        evaluations: { include: { submittedBy: { select: { firstName: true, lastName: true } } } },
        evaluationComponents: true,
        academicYear: true,
      },
    });
    res.json(theses);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.issueRecommendation = async (req, res) => {
  try {
    const { groupId, thesisId, content } = req.body;
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
    const recommendation = await prisma.recommendation.create({
      data: {
        content,
        issuedById: req.user.id,
        groupId: groupId ? parseInt(groupId) : null,
        thesisId: thesisId ? parseInt(thesisId) : null,
      },
    });
    if (groupId) {
      const group = await prisma.projectGroup.findUnique({
        where: { id: parseInt(groupId) },
        include: { members: { include: { student: true } }, supervisor: true },
      });
      if (group?.members) {
        const emailService = require('../services/emailService');
        const studentEmails = group.members.map(m => m.student.email).filter(Boolean);
        const supervisorName = group.supervisor ? `${group.supervisor.firstName} ${group.supervisor.lastName}` : req.user.firstName + ' ' + req.user.lastName;
        emailService.notifyRecommendationIssued(
          studentEmails, group.members.map(m => `${m.student.firstName} ${m.student.lastName}`).join(', '),
          group.projectTitle, supervisorName
        );
      }
    } else if (thesisId) {
      const thesis = await prisma.thesis.findUnique({
        where: { id: parseInt(thesisId) },
        include: { student: true, supervisor: true },
      });
      if (thesis?.student) {
        const emailService = require('../services/emailService');
        const supervisorName = thesis.supervisor ? `${thesis.supervisor.firstName} ${thesis.supervisor.lastName}` : req.user.firstName + ' ' + req.user.lastName;
        emailService.notifyRecommendationIssued(
          [thesis.student.email], `${thesis.student.firstName} ${thesis.student.lastName}`,
          thesis.title, supervisorName
        );
      }
    }
    audit.log({ action: 'ISSUE_RECOMMENDATION', entity: 'Recommendation', entityId: recommendation.id, details: 'Issued recommendation letter', performedById: req.user.id });
    res.status(201).json(recommendation);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
