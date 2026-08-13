
const prisma = require('../utils/prisma');
const path = require('path');
const fs = require('fs');
const notifSvc = require('../services/notificationService');
const audit = require('../services/auditService');
const { getEngagement } = require('../services/engagementGuard');

/**
 * Fire the unified ai_chatbot pipeline in the background.
 * Reuses the same endpoint the legacy embed routine did, but the new service
 * performs extract -> chunk -> embed -> store -> analyze -> persist + summary
 * + evaluation automatically. Failures are non-blocking.
 */
function triggerAIPipeline({ proposalId, documentUrl, documentType, authToken }) {
  const base = (process.env.AI_CHATBOT_URL || 'http://localhost:8001').replace(/\/$/, '');
  const url = `${base}/api/ai/analyze`;
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = authToken;
  const fire = async () => {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ proposal_id: proposalId, document_url: documentUrl, document_type: documentType }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) {
        console.warn(`[ai_chatbot] analyze returned ${resp.status} for proposal ${proposalId}`);
      } else {
        console.log(`[ai_chatbot] analyze queued for proposal ${proposalId}`);
      }
    } catch (e) {
      console.warn(`[ai_chatbot] unreachable for proposal ${proposalId}:`, e.message);
    }
  };
  setImmediate(fire);
}

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { stage, type } = req.body;
    const allowedStages = ['PROPOSAL', 'MID_TERM', 'FINAL'];
    if (!allowedStages.includes(stage)) return res.status(400).json({ error: 'Invalid stage' });

    const documentUrl = `/api/files/${type === 'thesis' ? 'theses' : 'groups'}/${req.file.filename}`;

    let whereClause = {};
    if (type === 'group') {
      let group;
      if (req.body.groupId) {
        const groupId = parseInt(req.body.groupId);
        if (isNaN(groupId)) return res.status(400).json({ error: 'Invalid group ID' });
        const member = await prisma.groupMember.findFirst({
          where: { studentId: req.user.id, groupId },
          include: { group: { select: { id: true, status: true } } },
        });
        if (!member) return res.status(403).json({ error: 'You are not a member of this group' });
        group = member.group;
      } else {
        const member = await prisma.groupMember.findFirst({
          where: { studentId: req.user.id },
          include: { group: { select: { id: true, status: true } } },
        });
        if (!member) return res.status(404).json({ error: 'You are not in any group' });
        group = member.group;
      }
      if (group && group.status === 'COMPLETED') {
        return res.status(403).json({ error: 'This project has been completed and is no longer accepting document uploads' });
      }
      whereClause = { groupId: group.id, stage };
    } else {
      let thesis;
      if (req.body.thesisId) {
        const thesisId = parseInt(req.body.thesisId);
        if (isNaN(thesisId)) return res.status(400).json({ error: 'Invalid thesis ID' });
        thesis = await prisma.thesis.findFirst({
          where: { id: thesisId, studentId: req.user.id },
          select: { id: true, status: true },
        });
        if (!thesis) return res.status(403).json({ error: 'This thesis does not belong to you' });
      } else {
        thesis = await prisma.thesis.findFirst({
          where: { studentId: req.user.id },
          select: { id: true, status: true },
        });
        if (!thesis) return res.status(404).json({ error: 'You have no thesis' });
      }
      if (thesis.status === 'COMPLETED') {
        return res.status(403).json({ error: 'This thesis has been completed and is no longer accepting document uploads' });
      }
      whereClause = { thesisId: thesis.id, stage };
    }

    // Always create a new Proposal record — keep full version history.
    const parentId = whereClause.groupId || whereClause.thesisId;
    const proposal = await prisma.proposal.create({
      data: {
        stage,
        documentType: 'PROPOSAL',
        documentUrl,
        submittedById: req.user.id,
        ...(type === 'group' ? { groupId: whereClause.groupId } : { thesisId: whereClause.thesisId }),
      },
    });

    // Fire-and-forget embedding generation so the user doesn't wait.
    triggerAIPipeline({
      proposalId: proposal.id,
      documentUrl: proposal.documentUrl,
      documentType: stage,
      authToken: req.headers.authorization,
    });

    // Notify supervisor + coordinators (not the student)
    try {
      const uploader = await prisma.user.findUnique({ where: { id: req.user.id }, select: { firstName: true, lastName: true } });
      const studentName = uploader ? `${uploader.firstName} ${uploader.lastName}` : 'A student';
      const itemTitle = type === 'group'
        ? (await prisma.projectGroup.findUnique({ where: { id: whereClause.groupId }, select: { projectTitle: true } }))?.projectTitle
        : (await prisma.thesis.findUnique({ where: { id: whereClause.thesisId }, select: { title: true } }))?.title;
      await notifSvc.notifyProposalUpload({
        groupId: type === 'group' ? whereClause.groupId : undefined,
        thesisId: type === 'thesis' ? whereClause.thesisId : undefined,
        stage,
        uploaderId: req.user.id,
        studentName,
        itemTitle: itemTitle || 'project',
      });
    } catch (e) {
      console.error('notifyProposalUpload error:', e.message);
    }

    const stageLabel = stage;
  audit.log({ action: 'UPLOAD', entity: 'Document', details: `Uploaded ${stageLabel} document`, performedById: req.user.id });
    res.json({ message: 'Document uploaded successfully', documentUrl, proposal });
  } catch (error) {
    console.error('uploadDocument error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

exports.submitFormResponse = async (req, res) => {
  try {
    const announcementId = parseInt(req.body.announcementId);
    const formData = (req.body.formData && typeof req.body.formData === 'object') ? req.body.formData : {};
    if (!announcementId) return res.status(400).json({ error: 'announcementId is required' });

    const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!announcement) return res.status(404).json({ error: 'Announcement not found' });
    if (!announcement.formEnabled) return res.status(400).json({ error: 'This announcement does not accept form submissions' });
    if (announcement.type !== 'THESIS') return res.status(400).json({ error: 'Only thesis announcements accept form submissions' });
    if (announcement.expiresAt && new Date() > announcement.expiresAt) {
      return res.status(403).json({ error: 'This form is no longer accepting submissions' });
    }

    // Eligibility checks — mirrors listEligibleAnnouncementsForStudent
    if (announcement.departmentId !== req.user.departmentId) return res.status(403).json({ error: 'You are not eligible for this announcement' });
    if (announcement.degreeType && announcement.degreeType !== req.user.degreeType) return res.status(403).json({ error: 'You are not eligible for this announcement' });
    if (announcement.programIds?.length && (!req.user.programId || !announcement.programIds.includes(req.user.programId))) {
      return res.status(403).json({ error: 'You are not eligible for this announcement' });
    }
    if (announcement.studentIds?.length && !announcement.studentIds.includes(req.user.id)) {
      return res.status(403).json({ error: 'You are not eligible for this announcement' });
    }

    const existing = await prisma.formResponse.findUnique({
      where: { announcementId_studentId: { announcementId, studentId: req.user.id } },
    });
    if (existing) return res.status(409).json({ error: 'You have already submitted this form' });

    const engagement = await getEngagement(req.user.id);
    if (engagement.engaged) {
      return res.status(409).json({
        error: `You are already engaged in a ${engagement.type === 'thesis' ? 'thesis' : 'group project'} (${engagement.status}): "${engagement.title}". A student cannot be part of two projects.`,
      });
    }

    const title = String(formData.title || '').trim();
    const description = String(formData.description || '').trim();

    // Validate required fields dynamically from the announcement's field definitions
    const fieldDefs = (Array.isArray(announcement.formFields) ? announcement.formFields : []).filter(f => f && f.key);
    const coreDefs = { title: { label: 'Thesis Title', required: true }, description: { label: 'Abstract / Description', required: true } };
    const defByKey = {};
    fieldDefs.forEach(f => { defByKey[f.key] = f; });
    const requiredByKey = (key) => (defByKey[key] ? !!defByKey[key].required : (coreDefs[key] ? coreDefs[key].required : false));
    const missing = [];
    for (const key of ['title', 'description']) {
      if (requiredByKey(key) && !String(formData[key] || '').trim()) {
        missing.push(defByKey[key]?.label || coreDefs[key].label);
      }
    }
    for (const f of fieldDefs) {
      if (f.key === 'title' || f.key === 'description') continue;
      if (f.required && !String(formData[f.key] || '').trim()) missing.push(f.label || f.key);
    }
    if (missing.length) {
      return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
    }

    const late = !!(announcement.expirationDate && new Date() > announcement.expirationDate);

    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { program: { select: { id: true, code: true, name: true, cluster: true } } },
    });

    // Auto-generate the proposal PDF from the submitted form data
    const { generateFormProposalPDF } = require('../services/pdfService');
    const pdfBuffer = await generateFormProposalPDF({
      title,
      description,
      studentName: student ? `${student.firstName} ${student.lastName}` : '',
      rollNumber: student?.rollNumber,
      programName: student?.program ? (student.program.name || student.program.code) : undefined,
      batch: student?.batch,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    });
    const storageDir = path.join(__dirname, '..', '..', 'storage', 'theses');
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
    const filename = `form_proposal_${Date.now()}.pdf`;
    fs.writeFileSync(path.join(storageDir, filename), pdfBuffer);
    const documentUrl = `/api/files/theses/${filename}`;

    let thesis, proposal, formResponse;
    await prisma.$transaction(async (tx) => {
      thesis = await tx.thesis.create({
        data: {
          title,
          description,
          projectType: 'MASTER',
          studentId: req.user.id,
          status: 'PENDING',
          createdVia: 'FORM',
          supervisorAssignmentStatus: 'PENDING',
          programId: student?.programId || null,
          cluster: student?.program?.cluster || null,
          batch: req.user.batch || student?.batch || null,
          startDate: new Date(),
          announcementId,
        },
      });
      proposal = await tx.proposal.create({
        data: {
          stage: 'PROPOSAL',
          documentType: 'PROPOSAL',
          documentUrl,
          status: late ? 'PENDING_APPROVAL' : 'VISIBLE',
          thesisId: thesis.id,
          submittedById: req.user.id,
        },
      });
      formResponse = await tx.formResponse.create({
        data: {
          announcementId,
          studentId: req.user.id,
          thesisId: thesis.id,
          formData,
          status: late ? 'LATE_SUBMITTED' : 'SUBMITTED',
        },
      });
    });

    // Notify program + department coordinators
    try {
      const coordinatorIds = [];
      const prog = await prisma.program.findUnique({ where: { id: student?.programId }, select: { coordinatorId: true } });
      const dept = await prisma.department.findUnique({ where: { id: req.user.departmentId }, select: { coordinatorId: true } });
      if (prog?.coordinatorId) coordinatorIds.push(prog.coordinatorId);
      if (dept?.coordinatorId && !coordinatorIds.includes(dept.coordinatorId)) coordinatorIds.push(dept.coordinatorId);
      if (coordinatorIds.length) {
        const studentName = student ? `${student.firstName} ${student.lastName}` : 'A student';
        await notifSvc.notifyMany(
          coordinatorIds,
          'THESIS_FORM_SUBMITTED',
          `${studentName} submitted the thesis form "${title}"${late ? ' (late submission — proposal requires approval)' : ''}. Report: ${description.slice(0, 120)}${description.length > 120 ? '…' : ''}`
        );
      }
    } catch (e) { console.error('notify coordinators error:', e.message); }

    audit.log({ action: 'CREATE', entity: 'Thesis', entityId: thesis.id, details: `Thesis created via form submission for "${title}"${late ? ' (late)' : ''}`, performedById: req.user.id });

    res.status(201).json({ message: 'Form submitted successfully', formResponse, thesis, proposal, late });
  } catch (e) {
    console.error('submitFormResponse error:', e);
    res.status(500).json({ error: 'Internal server error', details: e.message });
  }
};

exports.getMyGroups = async (req, res) => {
  try {
    const members = await prisma.groupMember.findMany({
      where: { studentId: req.user.id },
      include: {
        group: {
          include: {
            supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
            academicYear: { include: { department: { select: { id: true, name: true } } } },
            program: { include: { department: { select: { id: true, name: true } } } },
            members: {
              include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } },
            },
            evaluations: {
              include: { submittedBy: { select: { firstName: true, lastName: true } } },
            },
            evaluationComponents: true,
            proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } }, commentedBy: { select: { id: true, firstName: true, lastName: true, role: true } } }, orderBy: { createdAt: "desc" } },
            announcement: { select: { id: true, title: true, expirationDate: true, startDate: true } },
            examinerAssignments: { include: { externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true } } } },
          },
        },
      },
    });
    res.json(members.map(m => ({ ...m.group, _memberRoll: m.rollNumber })));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getMyTheses = async (req, res) => {
  try {
    const theses = await prisma.thesis.findMany({
      where: { studentId: req.user.id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true, rollNumber: true, program: { include: { department: { select: { id: true, name: true } } } } } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
        externalMidTerm: { select: { id: true, firstName: true, lastName: true, email: true } },
        externalFinal: { select: { id: true, firstName: true, lastName: true, email: true } },
        evaluations: {
          include: { submittedBy: { select: { firstName: true, lastName: true } } },
        },
        evaluationComponents: true,
        proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } }, commentedBy: { select: { id: true, firstName: true, lastName: true, role: true } } }, orderBy: { createdAt: "desc" } },
        announcement: { select: { id: true, title: true, expirationDate: true, startDate: true } },
        examinerAssignments: { include: { externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(theses);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getGroupById = async (req, res) => {
  try {
    const group = await prisma.projectGroup.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
        academicYear: { include: { department: { select: { id: true, name: true } } } },
        program: { include: { department: { select: { id: true, name: true } } } },
        members: {
          include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        evaluations: {
          include: { submittedBy: { select: { firstName: true, lastName: true } } },
        },
        evaluationComponents: true,
        proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } }, commentedBy: { select: { id: true, firstName: true, lastName: true, role: true } } }, orderBy: { createdAt: "desc" } },
        recommendations: {
          include: { issuedBy: { select: { id: true, firstName: true, lastName: true, role: true, designation: true } } },
          orderBy: { createdAt: 'desc' },
        },
        announcement: { select: { id: true, title: true, expirationDate: true, startDate: true } },
        examinerAssignments: { include: { externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    const isMember = group.members.some(m => m.studentId === req.user.id);
    if (!isMember) return res.status(403).json({ error: 'You are not a member of this group' });
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getThesisById = async (req, res) => {
  try {
    const thesis = await prisma.thesis.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true, rollNumber: true, program: { include: { department: { select: { id: true, name: true } } } } } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
        externalMidTerm: { select: { id: true, firstName: true, lastName: true, email: true } },
        externalFinal: { select: { id: true, firstName: true, lastName: true, email: true } },
        evaluations: {
          include: { submittedBy: { select: { firstName: true, lastName: true } } },
        },
        evaluationComponents: true,
        proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } }, commentedBy: { select: { id: true, firstName: true, lastName: true, role: true } } }, orderBy: { createdAt: "desc" } },
        recommendations: {
          include: { issuedBy: { select: { id: true, firstName: true, lastName: true, role: true, designation: true } } },
          orderBy: { createdAt: 'desc' },
        },
        announcement: { select: { id: true, title: true, expirationDate: true, startDate: true } },
        examinerAssignments: { include: { externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
    });
    if (!thesis) return res.status(404).json({ error: 'Thesis not found' });
    if (thesis.studentId !== req.user.id) return res.status(403).json({ error: 'This thesis does not belong to you' });
    res.json(thesis);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId, 10);
    const studentId = parseInt(req.params.studentId, 10);
    if (!groupId || !studentId) {
      return res.status(400).json({ error: 'groupId and studentId are required' });
    }

    const group = await prisma.projectGroup.findUnique({
      where: { id: groupId },
      include: {
        members: true,
        announcement: { select: { groupSizeMin: true, groupSizeMax: true } },
      },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isSelf = req.user.id === studentId;
    const isCreator = group.members[0]?.studentId === req.user.id;
    const canRemove = isSelf || isCreator || req.user.role === 'COORDINATOR' || req.user.role === 'MAINTAINER';
    if (!canRemove) return res.status(403).json({ error: 'Not allowed to remove this member' });

    const member = group.members.find((m) => m.studentId === studentId);
    if (!member) return res.status(404).json({ error: 'Member not in this group' });

    // Announcement-driven minimum size guard (defaults to 1 if no announcement)
    const minSize = group.announcement?.groupSizeMin ?? 1;
    if (group.members.length - 1 < minSize) {
      return res.status(400).json({
        error: `Cannot remove: this group requires a minimum of ${minSize} members.`,
      });
    }

    await prisma.groupMember.delete({ where: { id: member.id } });

    const remaining = await prisma.groupMember.count({ where: { groupId } });
    if (remaining === 0 && group.status === 'PENDING') {
      // No members left and group is still forming — clean it up.
      await prisma.projectGroup.delete({ where: { id: groupId } });
      return res.json({ message: 'Member removed and empty group deleted' });
    }

    audit.log({ action: 'REMOVE', entity: 'GroupMember', entityId: member.id, details: `Removed student ${studentId} from group ${groupId}`, performedById: req.user.id });
    res.json({ message: 'Member removed' });
  } catch (e) {
    console.error('removeMember error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: parseInt(req.params.id) },
      data: { read: true },
    });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteThesis = async (req, res) => {
  try {
    const thesisId = Number(req.params.id);
    const thesis = await prisma.thesis.findUnique({
      where: { id: thesisId },
      include: { evaluationComponents: true, proposals: true },
    });
    if (!thesis) return res.status(404).json({ error: 'Thesis not found' });
    if (thesis.studentId !== req.user.id) return res.status(403).json({ error: 'This thesis does not belong to you' });
    if (thesis.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending theses can be deleted' });
    }

    await prisma.proposal.deleteMany({ where: { thesisId } });
    await prisma.evaluationComponent.deleteMany({ where: { thesisId } });
    await prisma.thesis.delete({ where: { id: thesisId } });

    audit.log({ action: 'DELETE', entity: 'Thesis', entityId: thesisId, details: `Student deleted thesis "${thesis.title}"`, performedById: req.user.id });
    res.json({ message: 'Thesis deleted' });
  } catch (e) {
    console.error('deleteThesis error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};
