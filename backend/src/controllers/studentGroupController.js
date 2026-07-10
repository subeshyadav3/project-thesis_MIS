const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const audit = require('../services/auditService');
const notifSvc = require('../services/notificationService');
const { getDefaultComponents } = require('../config/evaluationScheme');
const {
  listEligibleAnnouncementsForStudent,
  isStudentAlreadyInAGroupAnnouncement,
} = require('../services/announcementService');

module.exports = {};
const ctrl = module.exports;

const GROUP_INCLUDES = {
  members: {
    include: {
      student: { select: { id: true, firstName: true, lastName: true, email: true, rollNumber: true } },
    },
  },
  supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
  academicYear: { select: { id: true, year: true, semester: true } },
  program: { select: { id: true, name: true, code: true } },
  announcement: { select: { id: true, title: true, type: true, groupSizeMin: true, groupSizeMax: true } },
};

ctrl.create = async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ error: 'Only students can create groups' });

    const { announcementId, name, projectTitle, programId, memberIds } = req.body;

    const ann = await prisma.announcement.findUnique({ where: { id: Number(announcementId) } });
    if (!ann) return res.status(404).json({ error: 'Announcement not found' });
    if (!ann.allowGroupFormation) return res.status(400).json({ error: 'Group formation not allowed for this announcement' });
    if (ann.expiresAt && new Date(ann.expiresAt) < new Date()) return res.status(400).json({ error: 'Announcement has expired' });

    const eligible = await listEligibleAnnouncementsForStudent(req.user);
    if (!eligible.find(a => a.id === ann.id)) return res.status(403).json({ error: 'You are not eligible for this announcement' });

    const alreadyIn = await isStudentAlreadyInAGroupAnnouncement(req.user, ann);
    if (alreadyIn) return res.status(400).json({ error: 'You are already in a group/thesis for this announcement type' });

    const isThesisAnnouncement = ann.type === 'THESIS';
    const projectType = ann.type === 'MAJOR' ? 'MAJOR' : 'MINOR';
    const resolvedProgramId = programId ? Number(programId) : req.user.programId;
    if (!resolvedProgramId) return res.status(400).json({ error: 'Program ID required' });

    // Validate group size
    const maxMembers = ann.groupSizeMax || 4;
    const invitedIds = Array.isArray(memberIds) ? memberIds : [];
    if (!isThesisAnnouncement && invitedIds.length > maxMembers - 1) {
      return res.status(400).json({ error: `Maximum ${maxMembers} members allowed for this announcement` });
    }

    if (isThesisAnnouncement) {
      // Master thesis: single student, no group members/invitations
      const thesis = await prisma.thesis.create({
        data: {
          title: projectTitle?.trim() || ann.title,
          projectType: 'MASTER',
          status: 'PENDING',
          studentId: req.user.id,
          academicYearId: ann.academicYearId,
          announcementId: ann.id,
        },
      });

      const defaults = getDefaultComponents('MASTER');
      for (const comp of defaults) {
        await prisma.evaluationComponent.create({
          data: { ...comp, thesisId: thesis.id, createdById: req.user.id },
        });
      }

      const created = await prisma.thesis.findUnique({
        where: { id: thesis.id },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, email: true } },
          supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
          academicYear: { include: { department: true } },
          evaluationComponents: true,
          announcement: { select: { id: true, title: true, type: true } },
        },
      });

      audit.log({ action: 'CREATE', entity: 'Thesis', entityId: thesis.id, details: `Student submitted thesis "${created.title}" via announcement #${ann.id}`, performedById: req.user.id });

      return res.status(201).json({ ...created, _type: 'THESIS' });
    }

    const group = await prisma.projectGroup.create({
      data: {
        name: name?.trim() || `Group of ${req.user.firstName} ${req.user.lastName}`,
        projectTitle: projectTitle?.trim() || ann.title,
        projectType,
        status: 'PENDING',
        programId: resolvedProgramId,
        academicYearId: ann.academicYearId,
        announcementId: ann.id,
        formedById: req.user.id,
        joinPolicy: 'INVITE_ONLY',
      },
    });

    await prisma.groupMember.create({
      data: { studentId: req.user.id, groupId: group.id, rollNumber: req.user.rollNumber || `R${req.user.id}` },
    });

    // Add invited members
    if (invitedIds.length > 0) {
      const students = await prisma.user.findMany({
        where: { id: { in: invitedIds }, role: 'STUDENT', programId: resolvedProgramId, active: true },
        select: { id: true, rollNumber: true },
      });
      for (const s of students) {
        await prisma.groupMember.create({
          data: { studentId: s.id, groupId: group.id, rollNumber: s.rollNumber || `R${s.id}` },
        });
      }
    }

    const defaults = getDefaultComponents(projectType);
    for (const comp of defaults) {
      await prisma.evaluationComponent.create({
        data: { ...comp, groupId: group.id, createdById: req.user.id },
      });
    }

    const created = await prisma.projectGroup.findUnique({ where: { id: group.id }, include: GROUP_INCLUDES });

    audit.log({ action: 'CREATE', entity: 'ProjectGroup', entityId: group.id, details: `Student formed group "${created.name}" via announcement #${ann.id}`, performedById: req.user.id });

    res.status(201).json({ ...created, _type: 'GROUP' });
  } catch (e) {
    console.error('student create group error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

ctrl.listMyGroups = async (req, res) => {
  try {
    const memberships = await prisma.groupMember.findMany({
      where: { studentId: req.user.id },
      include: { group: { include: GROUP_INCLUDES } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(memberships.map(m => ({ ...m.group, _memberRoll: m.rollNumber })));
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

ctrl.getMyGroupByAnnouncement = async (req, res) => {
  try {
    const annId = Number(req.params.announcementId);
    const member = await prisma.groupMember.findFirst({
      where: { studentId: req.user.id, group: { announcementId: annId } },
      include: { group: { include: GROUP_INCLUDES } },
    });
    if (!member) return res.json(null);
    res.json({ ...member.group, _memberRoll: member.rollNumber });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

ctrl.getMyGroupById = async (req, res) => {
  try {
    const member = await prisma.groupMember.findFirst({
      where: { studentId: req.user.id, groupId: Number(req.params.id) },
      include: { group: { include: GROUP_INCLUDES } },
    });
    if (!member) return res.status(404).json({ error: 'Group not found or not your group' });
    res.json({ ...member.group, _memberRoll: member.rollNumber });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

ctrl.availableGroups = async (req, res) => {
  try {
    const announcementId = req.query.announcementId ? Number(req.query.announcementId) : null;
    const where = { status: 'PENDING' };
    if (announcementId) where.announcementId = announcementId;
    if (req.user.role === 'STUDENT' && req.user.programId) {
      where.programId = req.user.programId;
    }

    const groups = await prisma.projectGroup.findMany({
      where,
      include: { ...GROUP_INCLUDES, formedBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const myGroupIds = (await prisma.groupMember.findMany({
      where: { studentId: req.user.id },
      select: { groupId: true },
    })).map(m => m.groupId);

    const available = groups
      .filter(g => !myGroupIds.includes(g.id))
      .map(g => ({
        ...g,
        currentMemberCount: g.members.length,
        slotsRemaining: Math.max(0, (g.announcement?.groupSizeMax || 4) - g.members.length),
      }))
      .filter(g => g.slotsRemaining > 0);

    res.json(available);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

ctrl.invite = async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const { inviteeId } = req.body;
    if (!inviteeId) return res.status(400).json({ error: 'inviteeId required' });

    const member = await prisma.groupMember.findFirst({
      where: { studentId: req.user.id, groupId },
      include: { group: { include: { announcement: true, members: true } } },
    });
    if (!member) return res.status(403).json({ error: 'You are not a member of this group' });
    if (member.group.status !== 'PENDING') return res.status(400).json({ error: 'Group is not open for new members' });

    const ann = member.group.announcement;
    if (ann && ann.type === 'THESIS') return res.status(400).json({ error: 'Thesis groups cannot have additional members' });
    if (ann && member.group.members.length >= ann.groupSizeMax) return res.status(400).json({ error: 'Group is full' });
    if (!ann && member.group.members.length >= 4) return res.status(400).json({ error: 'Group is full' });

    const alreadyInvited = await prisma.groupInvitation.findFirst({
      where: { groupId, inviteeId: Number(inviteeId), status: 'PENDING' },
    });
    if (alreadyInvited) return res.status(400).json({ error: 'Already invited this student' });

    const invitee = await prisma.user.findUnique({ where: { id: Number(inviteeId) } });
    if (!invitee || invitee.role !== 'STUDENT') return res.status(400).json({ error: 'Invalid invitee' });

    const existingMember = await prisma.groupMember.findFirst({
      where: { studentId: Number(inviteeId), groupId },
    });
    if (existingMember) return res.status(400).json({ error: 'Already a member' });

    const invitation = await prisma.groupInvitation.create({
      data: {
        groupId,
        announcementId: member.group.announcementId,
        inviterId: req.user.id,
        inviteeId: Number(inviteeId),
      },
    });

    await notifSvc.notify(invitee.id, 'GROUP_INVITATION', `You've been invited to join "${member.group.name}" by ${req.user.firstName} ${req.user.lastName}`);

    res.status(201).json(invitation);
  } catch (e) {
    console.error('invite error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

ctrl.joinOpenGroup = async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const group = await prisma.projectGroup.findUnique({
      where: { id: groupId },
      include: { announcement: true, members: true },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.status !== 'PENDING') return res.status(400).json({ error: 'Group is not open' });

    if (group.joinPolicy !== 'OPEN') return res.status(400).json({ error: 'Group is invite-only' });

    const ann = group.announcement;
    if (ann) {
      const eligible = await listEligibleAnnouncementsForStudent(req.user);
      if (!eligible.find(a => a.id === ann.id)) return res.status(403).json({ error: 'Not eligible for this group' });
      if (ann.type === 'THESIS') return res.status(400).json({ error: 'Thesis groups are single-member' });
      if (group.members.length >= ann.groupSizeMax) return res.status(400).json({ error: 'Group is full' });
    } else {
      if (group.members.length >= 4) return res.status(400).json({ error: 'Group is full' });
    }

    const alreadyMember = await prisma.groupMember.findFirst({ where: { studentId: req.user.id, groupId } });
    if (alreadyMember) return res.status(400).json({ error: 'Already a member' });

    await prisma.groupMember.create({
      data: { studentId: req.user.id, groupId, rollNumber: req.user.rollNumber || `R${req.user.id}` },
    });

    const updated = await prisma.projectGroup.findUnique({ where: { id: groupId }, include: GROUP_INCLUDES });

    const notice = `${updated.name}: ${req.user.firstName} ${req.user.lastName} joined the group.`;
    const memberIds = updated.members.filter(m => m.studentId !== req.user.id).map(m => m.studentId);
    if (memberIds.length) await notifSvc.notifyMany(memberIds, 'GROUP_MEMBER_JOINED', notice);

    res.json(updated);
  } catch (e) {
    console.error('join error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

ctrl.respondToInvitation = async (req, res) => {
  try {
    const invitationId = Number(req.params.id);
    const { action } = req.body;
    if (!['ACCEPT', 'DECLINE'].includes(action)) return res.status(400).json({ error: 'action must be ACCEPT or DECLINE' });

    const invitation = await prisma.groupInvitation.findUnique({
      where: { id: invitationId },
      include: { group: { include: { announcement: true, members: true } } },
    });
    if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
    if (invitation.inviteeId !== req.user.id) return res.status(403).json({ error: 'Not your invitation' });
    if (invitation.status !== 'PENDING') return res.status(400).json({ error: 'Already responded' });

    if (action === 'ACCEPT') {
      const ann = invitation.group.announcement;
      if (ann && invitation.group.members.length >= ann.groupSizeMax) return res.status(400).json({ error: 'Group is full' });
      if (!ann && invitation.group.members.length >= 4) return res.status(400).json({ error: 'Group is full' });
      if (invitation.group.status !== 'PENDING') return res.status(400).json({ error: 'Group is no longer open' });
      if (ann) {
        const eligible = await listEligibleAnnouncementsForStudent(req.user);
        if (!eligible.find(a => a.id === ann.id)) return res.status(403).json({ error: 'You are no longer eligible' });
      }

      await prisma.groupMember.create({
        data: { studentId: req.user.id, groupId: invitation.groupId, rollNumber: req.user.rollNumber || `R${req.user.id}` },
      });
      await prisma.groupInvitation.update({ where: { id: invitationId }, data: { status: 'ACCEPTED', respondedAt: new Date() } });

      const notice = `${req.user.firstName} ${req.user.lastName} accepted the invitation to "${invitation.group.name}".`;
      const memberIds = invitation.group.members.map(m => m.studentId);
      await notifSvc.notifyMany(memberIds, 'GROUP_INVITATION_ACCEPTED', notice);
    } else {
      await prisma.groupInvitation.update({ where: { id: invitationId }, data: { status: 'DECLINED', respondedAt: new Date() } });
    }

    const updated = await prisma.projectGroup.findUnique({ where: { id: invitation.groupId }, include: GROUP_INCLUDES });
    res.json(updated);
  } catch (e) {
    console.error('respond invitation error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

ctrl.myInvitations = async (req, res) => {
  try {
    const invitations = await prisma.groupInvitation.findMany({
      where: { inviteeId: req.user.id, status: 'PENDING' },
      include: {
        group: { include: { ...GROUP_INCLUDES, formedBy: { select: { id: true, firstName: true, lastName: true } } } },
        inviter: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(invitations);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

ctrl.deleteGroup = async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const group = await prisma.projectGroup.findUnique({
      where: { id: groupId },
      include: { members: true, announcement: true },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Only allow deletion if group is in PENDING status and user is the creator (first member)
    if (group.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending groups can be deleted' });
    }
    if (group.members[0]?.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Only the group creator can delete the group' });
    }

    await prisma.groupInvitation.deleteMany({ where: { groupId } });
    await prisma.groupMember.deleteMany({ where: { groupId } });
    await prisma.projectGroup.delete({ where: { id: groupId } });

    res.json({ message: 'Group deleted' });
  } catch (e) {
    console.error('deleteGroup error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

ctrl.getStudentsByProgram = async (req, res) => {
  try {
    const { programId, year } = req.query;
    if (!programId) return res.status(400).json({ error: 'programId required' });

    const where = { role: 'STUDENT', programId: Number(programId), active: true };
    if (year) {
      where.rollNumber = { startsWith: String(year) };
    }

    const students = await prisma.user.findMany({
      where,
      select: {
        id: true, firstName: true, lastName: true, email: true, rollNumber: true, programId: true,
        program: { select: { id: true, name: true, code: true } }
      },
      orderBy: { firstName: 'asc' }
    });
    res.json(students);
  } catch (e) {
    console.error('getStudentsByProgram error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = ctrl;
