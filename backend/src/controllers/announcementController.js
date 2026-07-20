const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const audit = require('../services/auditService');
const notifSvc = require('../services/notificationService');
const { resolveAudience, listEligibleAnnouncementsForStudent, isStudentAlreadyInAGroupAnnouncement } = require('../services/announcementService');
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
    const { title, message, type, audience, degreeType, programIds, studentIds, academicYearId, allowGroupFormation, groupSizeMin, groupSizeMax, startDate, expirationDate, expiresAt } = body;

    if (!title?.trim() || !message?.trim() || !academicYearId) {
      return res.status(400).json({ error: 'title, message, and academicYearId are required' });
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

    const computedMax = groupSizeMax ?? (type === 'THESIS' ? 1 : 4);
    const computedMin = groupSizeMin ?? 1;

    if (req.user.role === 'COORDINATOR' && !req.user.departmentId) {
      return res.status(400).json({ error: 'Coordinator has no department' });
    }
    const departmentId = req.user.role === 'COORDINATOR' ? req.user.departmentId : body.departmentId;
    if (!departmentId) return res.status(400).json({ error: 'departmentId required' });

    const recipients = await resolveAudience({
      type, degreeType, programIds, studentIds,
      departmentId, academicYearId: Number(academicYearId),
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
        academicYearId: Number(academicYearId),
        departmentId,
        allowGroupFormation: !!allowGroupFormation,
        groupSizeMin: computedMin,
        groupSizeMax: type === 'THESIS' ? 1 : Math.max(1, Math.min(4, Number(computedMax))),
        startDate: startDate ? new Date(startDate) : new Date(),
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdById: req.user.id,
      },
    });

    if (recipients.length) {
      const notifType = allowGroupFormation ? 'GROUP_FORMATION_OPENED' : 'BULK_ANNOUNCEMENT';
      const msgSuffix = allowGroupFormation ? ' You can now form/join a group.' : '';
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

exports.list = async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'COORDINATOR') {
      where.departmentId = req.user.departmentId;
    }
    const items = await prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { academicYear: { select: { id: true, year: true } } },
    });
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
      flagged.push({ ...a, alreadyInAGroup: alreadyIn });
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
