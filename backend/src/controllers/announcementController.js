
const XLSX = require('xlsx');
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
      setImmediate(async () => {
        try {
          const notifType = allowGroupFormation ? 'GROUP_FORMATION_OPENED' : 'BULK_ANNOUNCEMENT';
          const msgSuffix = allowGroupFormation ? ' You can now form/join a group.' : (announcement.formEnabled ? ' You can now submit the thesis form.' : '');
          await notifSvc.notifyMany(
            recipients.map(r => r.id),
            notifType,
            `${announcement.title}: ${announcement.message}${msgSuffix}`
          );

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
        } catch (e) {
          console.error('announcement background notification/email error:', e.message);
        }
      });
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
    setImmediate(async () => {
      try {
        const notifType = announcement.allowGroupFormation ? 'GROUP_FORMATION_OPENED' : 'BULK_ANNOUNCEMENT';
        const msgSuffix = announcement.allowGroupFormation ? ' You can now form/join a group.' : (announcement.formEnabled ? ' You can now submit the thesis form.' : '');
        await notifSvc.notifyMany(
          recipients.map(r => r.id),
          notifType,
          `${announcement.title}: ${announcement.message}${msgSuffix}`
        );

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
      } catch (e) {
        console.error('announcement update background email error:', e.message);
      }
    });
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
        thesis: {
          select: { id: true, title: true, status: true, supervisorId: true, supervisor: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    const responseByStudent = new Map(responses.map(r => [r.studentId, r]));

    if (ann.degreeType === 'BACHELOR' || ['MINOR', 'MAJOR'].includes(ann.type) || req.user.program?.degreeType === 'BACHELOR') {
      const groupWhere = [{ announcementId: id }];
      if (ann.batch) {
        const typeFilter = ann.type === 'MINOR' ? 'MINOR' : ann.type === 'MAJOR' ? 'MAJOR' : null;
        if (typeFilter) {
          groupWhere.push({ batch: ann.batch, projectType: typeFilter });
        } else {
          groupWhere.push({ batch: ann.batch });
        }
      }

      const projectGroups = await prisma.projectGroup.findMany({
        where: { OR: groupWhere },
        include: {
          supervisor: { select: { id: true, firstName: true, lastName: true } },
          members: { select: { student: { select: { id: true, firstName: true, lastName: true, rollNumber: true, email: true, program: true } } } },
          proposals: { select: { id: true, documentUrl: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        }
      });

      projectGroups.forEach(g => {
        const validMembers = (g.members || []).filter(m => m && m.student);
        const memberNames = validMembers.map(m => `${m.student.firstName} ${m.student.lastName}${m.student.rollNumber ? ` (${m.student.rollNumber})` : ''}`).join(', ');
        const pdfUrl = g.proposals?.[0]?.documentUrl || null;
        validMembers.forEach(m => {
          if (!responseByStudent.has(m.student.id)) {
            responseByStudent.set(m.student.id, {
              id: `group_${g.id}_${m.student.id}`,
              studentId: m.student.id,
              announcementId: id,
              status: g.status === 'ACTIVE' ? 'APPROVED' : 'SUBMITTED',
              formData: {
                title: g.projectTitle,
                groupName: g.name,
                members: memberNames,
                cluster: g.cluster || '',
                pdfUrl,
                finalSupervisorId: g.supervisorId ? g.supervisorId.toString() : '',
              },
              groupId: g.id,
              thesis: g.supervisor ? { id: g.id, title: g.projectTitle, status: g.status, supervisorId: g.supervisorId, supervisor: g.supervisor } : null,
              createdAt: g.createdAt
            });
          }
        });
      });
    }

    let filled = students
      .filter(s => responseByStudent.has(s.id))
      .map(s => ({ student: s, response: responseByStudent.get(s.id) }));

    if (ann.degreeType === 'BACHELOR' || ['MINOR', 'MAJOR'].includes(ann.type) || req.user.program?.degreeType === 'BACHELOR') {
      const seenGroups = new Set();
      filled = filled.filter(item => {
        if (item.response.groupId) {
          if (seenGroups.has(item.response.groupId)) return false;
          seenGroups.add(item.response.groupId);
        }
        return true;
      });
    }

    const remaining = students.filter(s => !responseByStudent.has(s.id));

    res.json({ announcement: ann, total: students.length, filled, remaining });
  } catch (e) {
    console.error('getFormResponses error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.exportFormResponses = async (req, res) => {
  try {
    const announcementId = parseInt(req.params.id);
    const responses = await prisma.formResponse.findMany({
      where: { announcementId },
      include: {
        student: { include: { program: true } },
        thesis: { include: { supervisor: true } },
      },
    });

    const rows = responses.map(({ student, formData, status, thesis, createdAt }) => {
      const d = formData || {};
      const sup = thesis?.supervisor ? `${thesis.supervisor.firstName} ${thesis.supervisor.lastName}` : '';
      return {
        'Student Name': `${student.firstName} ${student.lastName}`,
        'Roll Number': student.rollNumber || '',
        'Program': student.program?.code || '',
        'Email': student.email || '',
        'Thesis Title': d.title || '',
        'Research Cluster': d.cluster || '',
        'Guided Proposal': d.is_guided || '',
        'Primary Supervisor Preference': d.primary_supervisor || '',
        'Secondary Supervisor Preference': d.secondary_supervisor || '',
        'Remarks / Feedback': d.remarks || d.description || d.feedback || '',
        'Final Assigned Supervisor': sup,
        'PDF Proposal Document': d.pdfUrl || d.pdf_document || '',
        'Submission Status': status,
        'Submitted At': new Date(createdAt).toLocaleString(),
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Form Responses');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Form_Responses_${announcementId}.xlsx`);
    res.send(buf);
  } catch (err) {
    console.error('exportFormResponses error:', err);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
};

exports.updateFormResponse = async (req, res) => {
  try {
    if (typeof req.params.responseId === 'string' && req.params.responseId.startsWith('group_')) {
      const groupId = parseInt(req.params.responseId.split('_')[1]);
      const incoming = (req.body.formData && typeof req.body.formData === 'object') ? req.body.formData : {};
      const updates = {};
      if (incoming.title && incoming.title.trim()) updates.projectTitle = incoming.title.trim();
      if (incoming.cluster !== undefined) updates.cluster = incoming.cluster || null;
      if (incoming.finalSupervisorId !== undefined) {
        updates.supervisorId = incoming.finalSupervisorId ? parseInt(incoming.finalSupervisorId) : null;
        updates.supervisorAssignmentStatus = incoming.finalSupervisorId ? 'PENDING' : null;
      }
      if (Object.keys(updates).length) {
        await prisma.projectGroup.update({ where: { id: groupId }, data: updates });
      }
      return res.json({ success: true, groupId });
    }

    const responseId = parseInt(req.params.responseId);
    const existing = await prisma.formResponse.findUnique({
      where: { id: responseId },
      include: { student: true, announcement: true, thesis: true },
    });
    if (!existing) return res.status(404).json({ error: 'Form response not found' });

    // Scope guard: coordinators may only manage responses within their department
    if (req.user.role === 'COORDINATOR' && existing.announcement?.departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Forbidden: this response belongs to another department' });
    }

    const incoming = (req.body.formData && typeof req.body.formData === 'object') ? req.body.formData : {};

    // Merge with existing formData instead of replacing (preserves student-submitted fields)
    const mergedFormData = { ...(existing.formData || {}), ...incoming };
    // finalSupervisorId is a coordinator-only control field — never part of the form submission
    delete mergedFormData.finalSupervisorId;

    const updated = await prisma.formResponse.update({
      where: { id: responseId },
      data: { formData: mergedFormData },
      include: { student: true, thesis: true },
    });

    // If a thesis already exists, apply the editable matrix changes to the thesis record too
    if (existing.thesis) {
      const thesisUpdates = {};
      if (incoming.title && incoming.title.trim()) thesisUpdates.title = incoming.title.trim();
      if (incoming.cluster !== undefined) thesisUpdates.cluster = incoming.cluster || null;
      if (incoming.finalSupervisorId !== undefined) {
        const nextSupId = incoming.finalSupervisorId ? parseInt(incoming.finalSupervisorId) : null;
        const prevSupId = existing.thesis.supervisorId || null;
        thesisUpdates.supervisorId = nextSupId;
        thesisUpdates.supervisorAssignmentStatus = nextSupId ? 'PENDING' : null;
        // Notify only when a supervisor was newly assigned or changed
        if (nextSupId && nextSupId !== prevSupId) {
          try {
            const assignerName = `${req.user.firstName} ${req.user.lastName}`.trim() || 'Coordinator';
            await notifSvc.notify(nextSupId, 'SUPERVISOR_ASSIGNMENT',
              `${assignerName} assigned you as supervisor for "${existing.thesis.title}" (Master Thesis) — pending your acceptance.`, `/theses/${existing.thesis.id}`);
          } catch (e) { console.error('notify supervisor error:', e.message); }
        }
      }
      if (Object.keys(thesisUpdates).length) {
        await prisma.thesis.update({ where: { id: existing.thesis.id }, data: thesisUpdates });
      }
    }

    audit.log({ action: 'UPDATE_FORM_RESPONSE', entity: 'FormResponse', entityId: responseId, details: `Updated form response for student ${existing.studentId}`, performedById: req.user.id });
    res.json(updated);
  } catch (e) {
    console.error('updateFormResponse error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.finalizeFormResponse = async (req, res) => {
  try {
    if (typeof req.params.responseId === 'string' && req.params.responseId.startsWith('group_')) {
      const groupId = parseInt(req.params.responseId.split('_')[1]);
      const { supervisorId, title, cluster } = req.body;
      const selectedSupId = supervisorId ? parseInt(supervisorId) : null;
      const updates = { status: 'ACTIVE' };
      if (title && title.trim()) updates.projectTitle = title.trim();
      if (cluster !== undefined) updates.cluster = cluster || null;
      if (selectedSupId) {
        updates.supervisorId = selectedSupId;
        updates.supervisorAssignmentStatus = 'PENDING';
      }
      const { getDefaultComponents } = require('../config/evaluationScheme');
      const group = await prisma.projectGroup.update({ where: { id: groupId }, data: updates });

      const existingComp = await prisma.evaluationComponent.count({ where: { groupId } });
      if (existingComp === 0) {
        const defaults = getDefaultComponents(group.projectType || 'MINOR');
        for (const comp of defaults) {
          await prisma.evaluationComponent.create({
            data: { ...comp, groupId: group.id, createdById: req.user.id }
          });
        }
      }

      await prisma.proposal.updateMany({
        where: { groupId, status: 'PENDING' },
        data: { status: 'APPROVED' },
      });

      return res.json({ success: true, group });
    }

    const responseId = parseInt(req.params.responseId);
    const { supervisorId, title, cluster, programId, batch } = req.body;

    const existing = await prisma.formResponse.findUnique({
      where: { id: responseId },
      include: { student: { include: { program: true } }, announcement: true, thesis: true },
    });
    if (!existing) return res.status(404).json({ error: 'Form response not found' });

    // Scope guard: coordinators may only finalize responses within their department
    if (req.user.role === 'COORDINATOR' && existing.announcement?.departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Forbidden: this response belongs to another department' });
    }

    const student = existing.student;
    const finalTitle = title || existing.formData?.title || 'Master Thesis';
    const finalCluster = cluster || existing.formData?.cluster || null;
    const finalProgramId = programId ? parseInt(programId) : (student.programId || null);
    const finalBatch = batch || student.batch || null;
    const selectedSupId = supervisorId ? parseInt(supervisorId) : null;
    const previousSupId = existing.thesis?.supervisorId || null;

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
      const { getDefaultComponents } = require('../config/evaluationScheme');
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

    // Notify only when a supervisor was newly assigned or changed
    if (selectedSupId && (!existing.thesis || selectedSupId !== previousSupId)) {
      try {
        const assignerName = `${req.user.firstName} ${req.user.lastName}`.trim() || 'Coordinator';
        await notifSvc.notify(selectedSupId, 'SUPERVISOR_ASSIGNMENT',
          `${assignerName} assigned you as supervisor for "${thesis.title}" (Master Thesis) — pending your acceptance.`, `/theses/${thesis.id}`);
      } catch (e) { console.error('notify supervisor error:', e.message); }
    }

    // Reflect the official title/cluster back into the response formData (merge, don't overwrite)
    const officialData = { ...(existing.formData || {}) };
    if (title) officialData.title = title;
    if (cluster) officialData.cluster = cluster;
    delete officialData.finalSupervisorId;

    const updatedResponse = await prisma.formResponse.update({
      where: { id: responseId },
      data: { thesisId: thesis.id, status: 'APPROVED', formData: officialData },
      include: { student: true, thesis: true },
    });

    audit.log({ action: 'FINALIZE_FORM_RESPONSE', entity: 'FormResponse', entityId: responseId, details: `Finalized thesis "${thesis.title}" for student ${student.id}`, performedById: req.user.id });
    res.json({ message: 'Thesis finalized successfully', response: updatedResponse, thesis });
  } catch (e) {
    console.error('finalizeFormResponse error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteFormResponse = async (req, res) => {
  try {
    const responseId = req.params.responseId;

    if (typeof responseId === 'string' && responseId.startsWith('group_')) {
      const groupId = parseInt(responseId.split('_')[1]);
      const group = await prisma.projectGroup.findUnique({
        where: { id: groupId },
        include: { announcement: true }
      });
      if (!group) return res.status(404).json({ error: 'Group not found' });

      if (req.user.role === 'COORDINATOR' && group.announcement?.departmentId && group.announcement.departmentId !== req.user.departmentId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await prisma.groupMember.deleteMany({ where: { groupId } });
      await prisma.groupInvitation.deleteMany({ where: { groupId } });
      await prisma.examinerAssignment.deleteMany({ where: { groupId } });
      await prisma.proposal.deleteMany({ where: { groupId } });
      await prisma.recommendation.deleteMany({ where: { groupId } });
      await prisma.evaluation.deleteMany({ where: { groupId } });
      await prisma.evaluationComponent.deleteMany({ where: { groupId } });
      await prisma.projectGroup.delete({ where: { id: groupId } });

      audit.log({ action: 'DELETE', entity: 'ProjectGroup', entityId: groupId, details: `Coordinator deleted project group "${group.name}"`, performedById: req.user.id });
      return res.json({ message: 'Project group deleted successfully' });
    }

    const numericId = parseInt(responseId);
    const existing = await prisma.formResponse.findUnique({
      where: { id: numericId },
      include: { announcement: true, thesis: true }
    });
    if (!existing) return res.status(404).json({ error: 'Form response not found' });

    if (req.user.role === 'COORDINATOR' && existing.announcement?.departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (existing.thesis) {
      await prisma.examinerAssignment.deleteMany({ where: { thesisId: existing.thesis.id } });
      await prisma.assignmentRequest.deleteMany({ where: { thesisId: existing.thesis.id } });
      await prisma.proposal.deleteMany({ where: { thesisId: existing.thesis.id } });
      await prisma.evaluation.deleteMany({ where: { thesisId: existing.thesis.id } });
      await prisma.evaluationComponent.deleteMany({ where: { thesisId: existing.thesis.id } });
      await prisma.thesis.delete({ where: { id: existing.thesis.id } });
    }

    await prisma.formResponse.delete({ where: { id: numericId } });

    audit.log({ action: 'DELETE', entity: 'FormResponse', entityId: numericId, details: `Coordinator deleted form response #${numericId}`, performedById: req.user.id });
    res.json({ message: 'Response deleted successfully' });
  } catch (e) {
    console.error('deleteFormResponse error:', e);
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
