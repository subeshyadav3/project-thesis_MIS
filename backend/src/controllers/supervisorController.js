const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const audit = require('../services/auditService');
const pdfService = require('../services/pdfService');

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
    // Generate PDF
    try {
      const supervisor = await prisma.user.findUnique({ where: { id: req.user.id } });
      const pdf = await pdfService.generateRecommendationPDF({
        studentName: groupId
          ? group.members.map(m => `${m.student.firstName} ${m.student.lastName}`).join(', ')
          : `${thesis.student.firstName} ${thesis.student.lastName}`,
        projectTitle: groupId ? group.projectTitle : undefined,
        thesisTitle: thesisId ? thesis.title : undefined,
        supervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
        supervisorDesignation: supervisor.designation || null,
        content: content,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        type: thesisId ? 'thesis' : 'project',
      });
      // Store reference to PDF path or update storage reference
      // For simplicity we'll generate on-the-fly via download endpoint
    } catch (e) { console.error('PDF generation error:', e.message); }

    audit.log({ action: 'ISSUE_RECOMMENDATION', entity: 'Recommendation', entityId: recommendation.id, details: 'Issued recommendation letter', performedById: req.user.id });
    res.status(201).json(recommendation);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.downloadRecommendation = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rec = await prisma.recommendation.findUnique({
      where: { id },
      include: {
        issuedBy: { select: { id: true, firstName: true, lastName: true, designation: true } },
        group: {
          include: { members: { include: { student: { select: { firstName: true, lastName: true } } } } },
        },
        thesis: { include: { student: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });

    // Verify access: the issuing supervisor, the student, or coordinator/maintainer
    if (req.user.role === 'SUPERVISOR' && rec.issuedById !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'STUDENT') {
      const isMember = rec.group?.members?.some(m => m.studentId === req.user.id);
      const isThesisStudent = rec.thesis?.studentId === req.user.id;
      if (!isMember && !isThesisStudent) return res.status(403).json({ error: 'Access denied' });
    }

    const studentName = rec.group
      ? rec.group.members.map(m => `${m.student.firstName} ${m.student.lastName}`).join(', ')
      : `${rec.thesis.student.firstName} ${rec.thesis.student.lastName}`;

    const pdf = await pdfService.generateRecommendationPDF({
      studentName,
      projectTitle: rec.group?.projectTitle,
      thesisTitle: rec.thesis?.title,
      supervisorName: `${rec.issuedBy.firstName} ${rec.issuedBy.lastName}`,
      supervisorDesignation: rec.issuedBy.designation || null,
      content: rec.content,
      date: new Date(rec.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      type: rec.thesisId ? 'thesis' : 'project',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recommendation_${id}.pdf`);
    res.send(pdf);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
