
const prisma = require('../utils/prisma');
const audit = require('../services/auditService');
const notifSvc = require('../services/notificationService');
const { resolveAudience, listEligibleAnnouncementsForStudent, isStudentAlreadyInAGroupAnnouncement, isStudentSubmittedForm } = require('../services/announcementService');
const { markOverdueForAnnouncement } = require('../utils/checkOverdue');
const { RULES } = require('../config/yearSemesterRules');

function asCleanAudience(body) {
  const out = { ...body };
  for (const k of ['programIds', 'studentIds']) {
    if (typeof out[k] === 'string') {
      try { out[k] = JSON.parse(out[k]); } catch { out[k] = []; }
    }
    if (!Array.isArray(out[k])) out[k] = [];
  }
  return out;
}

exports.create = async (req, res) => {
  try {
    const body = asCleanAudience(req.body);
    const { title, message, type, audience, degreeType, programIds, studentIds, academicYearId, allowGroupFormation, groupSizeMin, groupSizeMax, startDate, expirationDate, expiresAt, batch, formEnabled, formFields } = body;

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'title and message are required' });
    }
    if (!['GENERAL', 'MINOR', 'MAJOR', 'THESIS'].includes(type)) {
      return res.status(400).json({ error: 'invalid type' });
    }
    if (!degreeType && ['MINOR', 'MAJOR', 'THESIS'].includes(type)) {
      return res.status(400).json({ error: 'degreeType is required' });
    }
    if (allowGroupFormation) {
      if (!['MINOR', 'MAJOR', 'THESIS'].includes(type)) {
        return res.status(400).json({ error: 'allowGroupFormation requires type MINOR/MAJOR/THESIS' });
      }
    }
    if (formEnabled && type !== 'THESIS') {
      return res.status(400).json({ error: 'formEnabled requires type THESIS' });
    }

    const computedMax = groupSizeMax ?? (type === 'THESIS' ? 1 : 4);
    const computedMin = groupSizeMin ?? 1;

    if (req.user.role === 'COORDINATOR' && !req.user.departmentId) {
      return res.status(400).json({ error: 'Coordinator has no department' });
    }
    const departmentId = req.user.role === 'COORDINATOR' ? req.user.departmentId : body.departmentId;
    if (!departmentId) return res.status(400).json({ error: 'departmentId required' });

    // Auto-resolve academic year if not provided
    let resolvedAcademicYearId = academicYearId ? Number(academicYearId) : null;
    if (!resolvedAcademicYearId) {
      const firstYear = await prisma.academicYear.findFirst({
        where: { departmentId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      resolvedAcademicYearId = firstYear?.id;
      if (!resolvedAcademicYearId) {
        return res.status(400).json({ error: 'No academic year found for your department. Please contact an administrator.' });
      }
    }

    const recipients = await resolveAudience({
      type, degreeType, programIds, studentIds,
      departmentId, academicYearId: resolvedAcademicYearId,
      batch,
    });

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        message: message.trim(),
        type,
        audience: audience || 'ALL',
        degreeType: degreeType || null,
        programIds: programIds?.length ? programIds.map(Number) : [],
        studentIds: studentIds?.length ? studentIds.map(Number) : [],
        batch: batch?.trim() || null,
        academicYearId: resolvedAcademicYearId,
        departmentId,
        allowGroupFormation: !!allowGroupFormation,
        groupSizeMin: computedMin,
        groupSizeMax: type === 'THESIS' ? 1 : Math.max(1, Math.min(4, Number(computedMax))),
        startDate: startDate ? new Date(startDate) : new Date(),
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        formEnabled: !!formEnabled,
        formFields: formEnabled ? (formFields || []) : undefined,
        createdById: req.user.id,
      },
    });

    if (recipients.length) {
      const notifType = allowGroupFormation ? 'GROUP_FORMATION_OPENED' : 'BULK_ANNOUNCEMENT';
      const msgSuffix = allowGroupFormation ? ' You can now form/join a group.' : (announcement.formEnabled ? ' You can now submit the thesis form.' : '');
      await notifSvc.notifyMany(
        recipients.map(r => r.id),
        notifType,
        `${announcement.title}: ${announcement.message}${msgSuffix}`
      );

      // Send email notifications
      try {
        const emailService = require('../services/emailService');
        const studentEmails = await prisma.user.findMany({
          where: { id: { in: recipients.map(r => r.id) } },
          select: { email: true },
        });
        const emails = studentEmails.map(u => u.email).filter(Boolean);
        if (emails.length) {
          const typeLabels = { GENERAL: 'General Announcement', MINOR: 'Minor Project', MAJOR: 'Major Project', THESIS: 'Master Thesis' };
          const annTypeLabel = typeLabels[announcement.type] || 'Announcement';
          await emailService.sendEmail({
            to: emails,
            subject: `${annTypeLabel}: ${announcement.title}`,
            title: annTypeLabel,
            contentLines: [
              `A new ${annTypeLabel.toLowerCase()} has been published:`,
              `<strong>Title:</strong> ${announcement.title}`,
              `<strong>Message:</strong> ${announcement.message}`,
              allowGroupFormation ? `<strong>Group Formation:</strong> You can now form/join a group for this announcement.` : '',
              `Please log in to the system for more details.`,
            ].filter(Boolean),
          });
        }
      } catch (e) { console.error('announcement email error:', e.message); }
    }

    audit.log({ action: 'CREATE', entity: 'Announcement', entityId: announcement.id, details: `Announcement "${announcement.title}" (${type})`, performedById: req.user.id });
    res.status(201).json({ ...announcement, recipientCount: recipients.length });
  } catch (e) {
    console.error('create announcement error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Reusable helper: resolve recipients and send notifications for an announcement.
 */
async function notifyForAnnouncement(announcement, departmentId) {
  const recipients = await resolveAudience({
    type: announcement.type,
    degreeType: announcement.degreeType,
    programIds: announcement.programIds,
    studentIds: announcement.studentIds,
    departmentId,
    academicYearId: announcement.academicYearId,
    batch: announcement.batch,
  });

  if (recipients.length) {
      const notifType = announcement.allowGroupFormation ? 'GROUP_FORMATION_OPENED' : 'BULK_ANNOUNCEMENT';
    const msgSuffix = announcement.allowGroupFormation ? ' You can now form/join a group.' : (announcement.formEnabled ? ' You can now submit the thesis form.' : '');
    await notifSvc.notifyMany(
      recipients.map(r => r.id),
      notifType,
      `${announcement.title}: ${announcement.message}${msgSuffix}`
    );

    try {
      const emailService = require('../services/emailService');
      const studentEmails = await prisma.user.findMany({
        where: { id: { in: recipients.map(r => r.id) } },
        select: { email: true },
      });
      const emails = studentEmails.map(u => u.email).filter(Boolean);
      if (emails.length) {
        const typeLabels = { GENERAL: 'General Announcement', MINOR: 'Minor Project', MAJOR: 'Major Project', THESIS: 'Master Thesis' };
        const annTypeLabel = typeLabels[announcement.type] || 'Announcement';
        await emailService.sendEmail({
          to: emails,
          subject: `[Updated] ${annTypeLabel}: ${announcement.title}`,
          title: annTypeLabel,
          contentLines: [
            `A ${annTypeLabel.toLowerCase()} has been updated:`,
            `<strong>Title:</strong> ${announcement.title}`,
            `<strong>Message:</strong> ${announcement.message}`,
            announcement.allowGroupFormation ? `<strong>Group Formation:</strong> You can now form/join a group for this announcement.` : '',
            `Please log in to the system for more details.`,
          ].filter(Boolean),
        });
      }
    } catch (e) { console.error('announcement email error:', e.message); }
  }

  return recipients;
}

exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = asCleanAudience(req.body);
    const { title, message, type, audience, degreeType, programIds, studentIds, batch, academicYearId, allowGroupFormation, startDate, expirationDate, expiresAt, formEnabled, formFields } = body;

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'COORDINATOR' && existing.departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        title: title?.trim() ?? existing.title,
        message: message?.trim() ?? existing.message,
        type: type ?? existing.type,
        audience: audience ?? existing.audience,
        degreeType: degreeType ?? existing.degreeType,
        programIds: programIds !== undefined ? programIds.map(Number) : existing.programIds,
        studentIds: studentIds !== undefined ? studentIds.map(Number) : existing.studentIds,
        batch: batch?.trim() ?? existing.batch,
        academicYearId: academicYearId ? Number(academicYearId) : existing.academicYearId,
        allowGroupFormation: allowGroupFormation !== undefined ? !!allowGroupFormation : existing.allowGroupFormation,
        formEnabled: formEnabled !== undefined ? !!formEnabled : existing.formEnabled,
        formFields: formFields !== undefined ? (formFields || []) : existing.formFields,
        startDate: startDate ? new Date(startDate) : existing.startDate,
        expirationDate: expirationDate ? new Date(expirationDate) : existing.expirationDate,
        expiresAt: expiresAt ? new Date(expiresAt) : existing.expiresAt,
      },
    });

    // Re-send notification to the updated audience
    await notifyForAnnouncement(updated, existing.departmentId);

    audit.log({ action: 'UPDATE', entity: 'Announcement', entityId: id, details: `Updated announcement "${updated.title}"`, performedById: req.user.id });
    res.json(updated);
  } catch (e) {
    console.error('update announcement error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'COORDINATOR' && existing.departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Delete associated groups/theses/invitations first (cascade should handle this, but be safe)
    await prisma.announcement.delete({ where: { id } });

    audit.log({ action: 'DELETE', entity: 'Announcement', entityId: id, details: `Deleted announcement "${existing.title}"`, performedById: req.user.id });
    res.json({ message: 'Announcement deleted' });
  } catch (e) {
    console.error('delete announcement error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.list = async (req, res) => {
  try {
    const where = {};
    let coordProgramId = null;
    if (req.user.role === 'COORDINATOR') {
      where.departmentId = req.user.departmentId;
      // Resolve coordinator's program/degree type from their own field or their program
      const prog = await prisma.program.findUnique({ where: { coordinatorId: req.user.id }, select: { id: true, degreeType: true } });
      coordProgramId = req.user.programId ?? prog?.id ?? null;
      const coordDegreeType = req.user.degreeType ?? prog?.degreeType;
      if (coordDegreeType) {
        where.OR = [
          { degreeType: coordDegreeType },
          { degreeType: null }, // GENERAL announcements have no degree type
        ];
      }
    }
    let items = await prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        academicYear: { select: { id: true, year: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    // Coordinators only see "All" announcements or ones targeting their own program
    if (req.user.role === 'COORDINATOR' && coordProgramId) {
      items = items.filter(a => !a.programIds?.length || a.programIds.includes(coordProgramId));
    }
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.listEligible = async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') return res.json([]);
    const items = await listEligibleAnnouncementsForStudent(req.user);
    const flagged = [];
    for (const a of items) {
      const alreadyIn = await isStudentAlreadyInAGroupAnnouncement(req.user, a);
      const formStatus = a.formEnabled ? await isStudentSubmittedForm(req.user, a.id) : null;
      flagged.push({ ...a, alreadyInAGroup: alreadyIn, formSubmitted: formStatus });
    }
    res.json(flagged);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.get = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const ann = await prisma.announcement.findUnique({
      where: { id },
      include: {
        academicYear: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!ann) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'COORDINATOR' && ann.departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(ann);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getFormResponses = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const ann = await prisma.announcement.findUnique({ where: { id } });
    if (!ann) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'COORDINATOR' && ann.departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const audience = await resolveAudience({
      type: ann.type,
      degreeType: ann.degreeType,
      programIds: ann.programIds,
      studentIds: ann.studentIds,
      departmentId: ann.departmentId,
      academicYearId: ann.academicYearId,
      batch: ann.batch,
    });

    const students = await prisma.user.findMany({
      where: { id: { in: audience.map(s => s.id) } },
      select: {
        id: true, firstName: true, lastName: true, email: true, rollNumber: true, batch: true,
        program: { select: { id: true, code: true, name: true } },
      },
    });

    const responses = await prisma.formResponse.findMany({
      where: { announcementId: id },
      include: {
        thesis: { select: { id: true, title: true, status: true } },
      },
    });
    const responseByStudent = new Map(responses.map(r => [r.studentId, r]));

    const filled = students
      .filter(s => responseByStudent.has(s.id))
      .map(s => ({ student: s, response: responseByStudent.get(s.id) }));
    const remaining = students.filter(s => !responseByStudent.has(s.id));

    res.json({ announcement: ann, total: students.length, filled, remaining });
  } catch (e) {
    console.error('getFormResponses error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateFormResponse = async (req, res) => {
  try {
    const responseId = parseInt(req.params.responseId);
    const existing = await prisma.formResponse.findUnique({
      where: { id: responseId },
      include: { student: true, announcement: true },
    });
    if (!existing) return res.status(404).json({ error: 'Form response not found' });

    const { formData } = req.body;
    const updated = await prisma.formResponse.update({
      where: { id: responseId },
      data: { formData: formData !== undefined ? formData : existing.formData },
      include: { student: true, thesis: true },
    });

    audit.log({ action: 'UPDATE_FORM_RESPONSE', entity: 'FormResponse', entityId: responseId, details: `Updated form response for student ${existing.studentId}`, performedById: req.user.id });
    res.json(updated);
  } catch (e) {
    console.error('updateFormResponse error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.finalizeFormResponse = async (req, res) => {
  try {
    const responseId = parseInt(req.params.responseId);
    const { supervisorId, title, cluster, programId, batch } = req.body;

    const existing = await prisma.formResponse.findUnique({
      where: { id: responseId },
      include: { student: { include: { program: true } }, announcement: true, thesis: true },
    });
    if (!existing) return res.status(404).json({ error: 'Form response not found' });

    const student = existing.student;
    const finalTitle = title || existing.formData?.title || 'Master Thesis';
    const finalCluster = cluster || existing.formData?.cluster || null;
    const finalProgramId = programId ? parseInt(programId) : (student.programId || null);
    const finalBatch = batch || student.batch || null;
    const selectedSupId = supervisorId ? parseInt(supervisorId) : null;

    let thesis = existing.thesis;
    if (thesis) {
      thesis = await prisma.thesis.update({
        where: { id: thesis.id },
        data: {
          title: finalTitle,
          cluster: finalCluster,
          programId: finalProgramId,
          batch: finalBatch,
          supervisorId: selectedSupId,
          supervisorAssignmentStatus: selectedSupId ? 'PENDING' : null,
          status: 'ACTIVE',
        },
      });
    } else {
      thesis = await prisma.thesis.create({
        data: {
          title: finalTitle,
          projectType: 'MASTER',
          studentId: student.id,
          supervisorId: selectedSupId,
          supervisorAssignmentStatus: selectedSupId ? 'PENDING' : null,
          programId: finalProgramId,
          batch: finalBatch,
          cluster: finalCluster,
          createdVia: 'FORM',
          announcementId: existing.announcementId,
          status: 'ACTIVE',
        },
      });

      // Create default evaluation components
      const { getDefaultComponents } = require('../config/defaultComponents');
      const defaults = getDefaultComponents('MASTER');
      for (const comp of defaults) {
        await prisma.evaluationComponent.create({
          data: { ...comp, thesisId: thesis.id, createdById: req.user.id },
        });
      }

      // Link PDF proposal document if present in formData
      const pdfUrl = existing.formData?.pdfUrl || existing.formData?.fileUrl;
      if (pdfUrl) {
        await prisma.proposal.create({
          data: {
            stage: 'PROPOSAL',
            documentUrl: pdfUrl,
            documentType: 'PROPOSAL',
            status: 'VISIBLE',
            thesisId: thesis.id,
            submittedById: student.id,
          },
        });
      }
    }

    if (selectedSupId) {
      try {
        const assignerName = `${req.user.firstName} ${req.user.lastName}`.trim() || 'Coordinator';
        await notifSvc.notify(selectedSupId, 'SUPERVISOR_ASSIGNMENT',
          `${assignerName} assigned you as supervisor for "${thesis.title}" (Master Thesis) — pending your acceptance.`, `/theses/${thesis.id}`);
      } catch (e) { console.error('notify supervisor error:', e.message); }
    }

    const updatedResponse = await prisma.formResponse.update({
      where: { id: responseId },
      data: { thesisId: thesis.id, status: 'APPROVED' },
      include: { student: true, thesis: true },
    });

    audit.log({ action: 'FINALIZE_FORM_RESPONSE', entity: 'FormResponse', entityId: responseId, details: `Finalized thesis "${thesis.title}" for student ${student.id}`, performedById: req.user.id });
    res.json({ message: 'Thesis finalized successfully', response: updatedResponse, thesis });
  } catch (e) {
    console.error('finalizeFormResponse error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deactivate = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const ann = await prisma.announcement.findUnique({ where: { id } });
    if (!ann) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'COORDINATOR' && ann.departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await prisma.announcement.update({ where: { id }, data: { expiresAt: new Date() } });
    // Mark all associated PENDING/ACTIVE groups and theses as OVERDUE
    await markOverdueForAnnouncement(id).catch(e => console.error('markOverdueForAnnouncement error:', e.message));
    audit.log({ action: 'UPDATE', entity: 'Announcement', entityId: id, details: 'Announcement deactivated', performedById: req.user.id });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
