
const prisma = require('../utils/prisma');
const audit = require('../services/auditService');
const pdfService = require('../services/pdfService');
const notifSvc = require('../services/notificationService');

async function findCoordinatorIdsForStudent(studentId, programId, departmentId, thesisId) {
  const ids = [];
  try {
    if (studentId) {
      const student = await prisma.user.findUnique({ where: { id: studentId }, select: { programId: true, departmentId: true } });
      if (student?.programId) {
        const prog = await prisma.program.findUnique({ where: { id: student.programId }, select: { coordinatorId: true } });
        if (prog?.coordinatorId && !ids.includes(prog.coordinatorId)) ids.push(prog.coordinatorId);
      }
      if (student?.departmentId && !departmentId) departmentId = student.departmentId;
    }
    if (programId) {
      const prog = await prisma.program.findUnique({ where: { id: programId }, select: { coordinatorId: true } });
      if (prog?.coordinatorId && !ids.includes(prog.coordinatorId)) ids.push(prog.coordinatorId);
    }
    if (thesisId) {
      const thesis = await prisma.thesis.findUnique({ where: { id: thesisId }, select: { crossProgramRequestedById: true } });
      if (thesis?.crossProgramRequestedById && !ids.includes(thesis.crossProgramRequestedById)) {
        ids.push(thesis.crossProgramRequestedById);
      }
    }
    if (departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: departmentId }, select: { coordinatorId: true } });
      if (dept?.coordinatorId && !ids.includes(dept.coordinatorId)) ids.push(dept.coordinatorId);
    }
    // Fallback: Notify all coordinators in department if no specific program coordinator found
    if (ids.length === 0 && departmentId) {
      const deptCoords = await prisma.user.findMany({ where: { role: 'COORDINATOR', departmentId }, select: { id: true } });
      deptCoords.forEach(c => { if (!ids.includes(c.id)) ids.push(c.id); });
    }
  } catch (e) { console.error('findCoordinatorIdsForStudent error:', e.message); }
  return ids;
}

async function acceptAssignment({ type, id, user }) {
  const data = { supervisorAssignmentStatus: 'ACCEPTED', status: 'ACTIVE' };
  if (type === 'thesis') {
    const thesis = await prisma.thesis.findUnique({ where: { id: parseInt(id) }, include: { student: true } });
    if (!thesis) return { error: 'Thesis not found', code: 404 };
    if (thesis.supervisorId !== user.id) return { error: 'This thesis is not assigned to you', code: 403 };
    if (thesis.supervisorAssignmentStatus === 'ACCEPTED') return { error: 'Assignment already accepted', code: 400 };
    const updated = await prisma.thesis.update({ where: { id: thesis.id }, data });
    const coordIds = await findCoordinatorIdsForStudent(thesis.studentId, thesis.programId, thesis.student?.departmentId, thesis.id);
    const supervisorName = `${user.firstName} ${user.lastName}`.trim() || 'A supervisor';
    await notifSvc.notifySupervisorAccepted({ supervisorName, itemTitle: thesis.title, type: 'thesis', studentIds: [thesis.studentId], coordinatorIds: coordIds });
    audit.log({ action: 'SUPERVISOR_ACCEPT', entity: 'Thesis', entityId: thesis.id, details: `Supervisor accepted "${thesis.title}"`, performedById: user.id });
    return { data: updated };
  }
  const group = await prisma.projectGroup.findUnique({ where: { id: parseInt(id) }, include: { members: true } });
  if (!group) return { error: 'Group not found', code: 404 };
  if (group.supervisorId !== user.id) return { error: 'This group is not assigned to you', code: 403 };
  if (group.supervisorAssignmentStatus === 'ACCEPTED') return { error: 'Assignment already accepted', code: 400 };
  const updated = await prisma.projectGroup.update({ where: { id: group.id }, data });
  const coordIds = await findCoordinatorIdsForStudent(group.members?.[0]?.studentId, group.programId, group.members?.[0]?.studentId ? (await prisma.user.findUnique({ where: { id: group.members[0].studentId }, select: { departmentId: true } }))?.departmentId : null);
  const supervisorName = `${user.firstName} ${user.lastName}`.trim() || 'A supervisor';
  await notifSvc.notifySupervisorAccepted({ supervisorName, itemTitle: group.projectTitle || group.name, type: 'group', studentIds: group.members?.map(m => m.studentId) || [], coordinatorIds: coordIds });
  audit.log({ action: 'SUPERVISOR_ACCEPT', entity: 'ProjectGroup', entityId: group.id, details: `Supervisor accepted "${group.projectTitle || group.name}"`, performedById: user.id });
  return { data: updated };
}

async function rejectAssignment({ type, id, user, reason }) {
  if (type === 'thesis') {
    const thesis = await prisma.thesis.findUnique({ where: { id: parseInt(id) }, include: { student: true } });
    if (!thesis) return { error: 'Thesis not found', code: 404 };
    if (thesis.supervisorId !== user.id) return { error: 'This thesis is not assigned to you', code: 403 };
    const updated = await prisma.thesis.update({
      where: { id: thesis.id },
      data: { supervisorId: null, supervisorAssignmentStatus: 'REJECTED' },
    });
    const coordIds = await findCoordinatorIdsForStudent(thesis.studentId, thesis.programId, thesis.student?.departmentId, thesis.id);
    const supervisorName = `${user.firstName} ${user.lastName}`.trim() || 'A supervisor';
    await notifSvc.notifySupervisorRejected({ supervisorName, itemTitle: thesis.title, type: 'thesis', reason, studentIds: [thesis.studentId], coordinatorIds: coordIds });
    audit.log({ action: 'SUPERVISOR_REJECT', entity: 'Thesis', entityId: thesis.id, details: `Supervisor rejected "${thesis.title}" — ${reason || 'no reason'}`, performedById: user.id });
    return { data: updated };
  }
  const group = await prisma.projectGroup.findUnique({ where: { id: parseInt(id) }, include: { members: true } });
  if (!group) return { error: 'Group not found', code: 404 };
  if (group.supervisorId !== user.id) return { error: 'This group is not assigned to you', code: 403 };
  const updated = await prisma.projectGroup.update({
    where: { id: group.id },
    data: { supervisorId: null, supervisorAssignmentStatus: 'REJECTED' },
  });
  const coordIds = await findCoordinatorIdsForStudent(group.members?.[0]?.studentId, group.programId, null);
  const supervisorName = `${user.firstName} ${user.lastName}`.trim() || 'A supervisor';
  await notifSvc.notifySupervisorRejected({ supervisorName, itemTitle: group.projectTitle || group.name, type: 'group', reason, studentIds: group.members?.map(m => m.studentId) || [], coordinatorIds: coordIds });
  audit.log({ action: 'SUPERVISOR_REJECT', entity: 'ProjectGroup', entityId: group.id, details: `Supervisor rejected "${group.projectTitle || group.name}" — ${reason || 'no reason'}`, performedById: user.id });
  return { data: updated };
}

exports.acceptThesisSupervision = async (req, res) => {
  try {
    const result = await acceptAssignment({ type: 'thesis', id: req.params.id, user: req.user });
    if (result.error) return res.status(result.code || 400).json({ error: result.error });
    res.json({ message: 'Supervision accepted', data: result.data });
  } catch (e) {
    console.error('acceptThesisSupervision error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.rejectThesisSupervision = async (req, res) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    const result = await rejectAssignment({ type: 'thesis', id: req.params.id, user: req.user, reason });
    if (result.error) return res.status(result.code || 400).json({ error: result.error });
    res.json({ message: 'Supervision declined', data: result.data });
  } catch (e) {
    console.error('rejectThesisSupervision error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.acceptGroupSupervision = async (req, res) => {
  try {
    const result = await acceptAssignment({ type: 'group', id: req.params.id, user: req.user });
    if (result.error) return res.status(result.code || 400).json({ error: result.error });
    res.json({ message: 'Supervision accepted', data: result.data });
  } catch (e) {
    console.error('acceptGroupSupervision error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.rejectGroupSupervision = async (req, res) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    const result = await rejectAssignment({ type: 'group', id: req.params.id, user: req.user, reason });
    if (result.error) return res.status(result.code || 400).json({ error: result.error });
    res.json({ message: 'Supervision declined', data: result.data });
  } catch (e) {
    console.error('rejectGroupSupervision error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getMyGroups = async (req, res) => {
  try {
    const groups = await prisma.projectGroup.findMany({
      where: { supervisorId: req.user.id },
      include: {
        members: { include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        evaluations: { include: { submittedBy: { select: { firstName: true, lastName: true } } } },
        evaluationComponents: true,
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
      },
    });
    res.json(theses);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.issueRecommendation = async (req, res) => {
  try {
    const { groupId, thesisId, content: explicitContent } = req.body;

    // Resolve the item and check access
    let resolvedContent = explicitContent || '';
    let supervisorName = '';
    let supervisorDesignation = '';
    let studentName = '';
    let itemTitle = '';
    let itemType = 'project';

    if (groupId) {
      const gid = parseInt(groupId);
      const group = await prisma.projectGroup.findUnique({
        where: { id: gid },
        include: {
          supervisor: { select: { id: true, firstName: true, lastName: true, designation: true } },
          members: { include: { student: { select: { firstName: true, lastName: true } } } },
        },
      });
      if (!group) return res.status(404).json({ error: 'Group not found' });

      // Check access: supervisor of the group OR coordinator of the department
      if (req.user.role === 'SUPERVISOR' && group.supervisorId !== req.user.id) {
        return res.status(403).json({ error: 'You are not the supervisor of this group' });
      }
      if (req.user.role === 'COORDINATOR' && req.user.departmentId) {
        const prog = await prisma.program.findUnique({ where: { coordinatorId: req.user.id } });
        if (prog && group.programId && group.programId !== prog.id) {
          return res.status(403).json({ error: 'This group belongs to another program' });
        }
      }

      studentName = group.members.map(m => `${m.student.firstName} ${m.student.lastName}`).join(', ');
      itemTitle = group.projectTitle;
      supervisorName = group.supervisor
        ? `${group.supervisor.firstName} ${group.supervisor.lastName}`
        : `${req.user.firstName} ${req.user.lastName}`;
      supervisorDesignation = group.supervisor?.designation || req.user.designation || '';
    } else if (thesisId) {
      const tid = parseInt(thesisId);
      const thesis = await prisma.thesis.findUnique({
        where: { id: tid },
        include: {
          supervisor: { select: { id: true, firstName: true, lastName: true, designation: true } },
          student: { select: { id: true, firstName: true, lastName: true, programId: true } },
        },
      });
      if (!thesis) return res.status(404).json({ error: 'Thesis not found' });

      // Check access: supervisor of the thesis OR coordinator of the program
      if (req.user.role === 'SUPERVISOR' && thesis.supervisorId !== req.user.id) {
        return res.status(403).json({ error: 'You are not the supervisor of this thesis' });
      }
      if (req.user.role === 'COORDINATOR' && req.user.departmentId) {
        const prog = await prisma.program.findUnique({ where: { coordinatorId: req.user.id } });
        if (prog && thesis.student?.programId && thesis.student.programId !== prog.id) {
          return res.status(403).json({ error: 'This thesis belongs to another program' });
        }
      }

      studentName = `${thesis.student.firstName} ${thesis.student.lastName}`;
      itemTitle = thesis.title;
      supervisorName = thesis.supervisor
        ? `${thesis.supervisor.firstName} ${thesis.supervisor.lastName}`
        : `${req.user.firstName} ${req.user.lastName}`;
      supervisorDesignation = thesis.supervisor?.designation || req.user.designation || '';
      itemType = 'thesis';
    }

    // Auto-generate content if not provided
    if (!resolvedContent) {
      const itemLabel = itemType === 'thesis' ? 'Master Thesis' : 'Project';
      resolvedContent = [
        `I am pleased to recommend ${studentName}, who has successfully completed the ${itemLabel.toLowerCase()} titled "${itemTitle}" under my supervision at the Department of Electronics and Computer Engineering, Institute of Engineering, Pulchowk Campus.`,
        '',
        `During the course of the ${itemLabel.toLowerCase()}, ${studentName} demonstrated strong dedication, technical proficiency, and a professional attitude. The final deliverables reflect a high standard of academic rigor and originality.`,
        '',
        'I recommend this student without reservation and am confident that they will excel in their future academic and professional endeavors.',
      ].join('\n');
    }

    const recommendation = await prisma.recommendation.create({
      data: {
        content: resolvedContent,
        issuedById: req.user.id,
        groupId: groupId ? parseInt(groupId) : null,
        thesisId: thesisId ? parseInt(thesisId) : null,
      },
    });
    // Notify students
    try {
      const emailService = require('../services/emailService');
      if (groupId) {
        const group = await prisma.projectGroup.findUnique({
          where: { id: parseInt(groupId) },
          include: { members: { include: { student: true } }, supervisor: true },
        });
        if (group?.members) {
          const studentEmails = group.members.map(m => m.student.email).filter(Boolean);
          const supName = group.supervisor ? `${group.supervisor.firstName} ${group.supervisor.lastName}` : supervisorName;
          emailService.notifyRecommendationIssued(
            studentEmails, group.members.map(m => `${m.student.firstName} ${m.student.lastName}`).join(', '),
            group.projectTitle, supName
          );
        }
      } else if (thesisId) {
        const thesis = await prisma.thesis.findUnique({
          where: { id: parseInt(thesisId) },
          include: { student: true, supervisor: true },
        });
        if (thesis?.student) {
          const supName = thesis.supervisor ? `${thesis.supervisor.firstName} ${thesis.supervisor.lastName}` : supervisorName;
          emailService.notifyRecommendationIssued(
            [thesis.student.email], `${thesis.student.firstName} ${thesis.student.lastName}`,
            thesis.title, supName
          );
        }
      }
    } catch (e) { console.error('recommendation email error:', e.message); }

    // Generate PDF preview (generated on-the-fly during download)
    try {
      await pdfService.generateRecommendationPDF({
        studentName,
        projectTitle: itemType === 'project' ? itemTitle : undefined,
        thesisTitle: itemType === 'thesis' ? itemTitle : undefined,
        supervisorName,
        supervisorDesignation: supervisorDesignation || null,
        content: resolvedContent,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        type: itemType,
      });
    } catch (e) { console.error('PDF generation error:', e.message); }

    const issuerLabel = req.user.role === 'SUPERVISOR' ? 'Supervisor' : 'Coordinator';
    audit.log({ action: 'ISSUE_RECOMMENDATION', entity: 'Recommendation', entityId: recommendation.id, details: `${issuerLabel} issued recommendation letter`, performedById: req.user.id });
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

    const isDownload = req.query.download === 'true';
    res.setHeader('Content-Type', 'application/pdf');
    if (isDownload) {
      res.setHeader('Content-Disposition', `attachment; filename=recommendation_${id}.pdf`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename=recommendation_${id}.pdf`);
    }
    res.send(pdf);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteRecommendation = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rec = await prisma.recommendation.findUnique({
      where: { id },
      select: { id: true, issuedById: true, groupId: true, thesisId: true },
    });
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });

    // Only the issuer, or a coordinator/maintainer can delete
    if (req.user.role === 'SUPERVISOR' && rec.issuedById !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own recommendations' });
    }
    if (req.user.role === 'STUDENT') {
      return res.status(403).json({ error: 'Students cannot delete recommendations' });
    }
    if (req.user.role === 'COORDINATOR' && req.user.departmentId) {
      const prog = await prisma.program.findUnique({ where: { coordinatorId: req.user.id } });
      if (prog) {
        let itemProgramId = null;
        if (rec.groupId) {
          const g = await prisma.projectGroup.findUnique({ where: { id: rec.groupId }, select: { programId: true } });
          itemProgramId = g?.programId;
        } else if (rec.thesisId) {
          const t = await prisma.thesis.findUnique({ where: { id: rec.thesisId }, include: { student: { select: { programId: true } } } });
          itemProgramId = t?.student?.programId;
        }
        if (itemProgramId && itemProgramId !== prog.id) {
          return res.status(403).json({ error: 'This recommendation belongs to another program' });
        }
      }
    }

    await prisma.recommendation.delete({ where: { id } });
    const issuerLabel = req.user.role === 'SUPERVISOR' ? 'Supervisor' : 'Coordinator';
    audit.log({ action: 'DELETE_RECOMMENDATION', entity: 'Recommendation', entityId: id, details: `${issuerLabel} deleted recommendation letter`, performedById: req.user.id });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
