const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const audit = require('../services/auditService');
const notifSvc = require('../services/notificationService');

const USER_SELECT = {
  id: true, email: true, firstName: true, lastName: true,
  role: true, degreeType: true, active: true,
  departmentId: true, programId: true,
  createdAt: true, updatedAt: true,
};

const VALID_ROLES = ['MAINTAINER', 'COORDINATOR', 'SUPERVISOR', 'STUDENT', 'EXTERNAL_EXAMINER'];
const VALID_DEGREE_TYPES = ['BACHELOR', 'MASTER'];

exports.getUsers = async (req, res) => {
  try {
    const where = {};
    // Coordinator can only see users in their department
    if (req.user.role === 'COORDINATOR') {
      where.departmentId = req.user.departmentId;
    }
    const users = await prisma.user.findMany({
      where,
      select: USER_SELECT,
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, degreeType, departmentId, programId } = req.body;
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'email, password, firstName, lastName, and role are required' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
    }
    if (degreeType && !VALID_DEGREE_TYPES.includes(degreeType)) {
      return res.status(400).json({ error: `Invalid degreeType. Must be one of: ${VALID_DEGREE_TYPES.join(', ')}` });
    }
    // Coordinator can only create users in their own department
    const targetDeptId = departmentId || req.user.departmentId;
    if (req.user.role === 'COORDINATOR' && targetDeptId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Cannot create users outside your department' });
    }
    // Coordinator cannot create MAINTAINER or COORDINATOR roles
    if (req.user.role === 'COORDINATOR' && !['SUPERVISOR', 'EXTERNAL_EXAMINER', 'STUDENT'].includes(role)) {
      return res.status(403).json({ error: 'Coordinator can only create supervisors, examiners, and students' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hash, firstName, lastName, role, degreeType, departmentId: targetDeptId, programId },
      select: USER_SELECT,
    });
  audit.log({ action: 'CREATE', entity: 'User', entityId: user.id, details: `Created ${role} ${email}`, performedById: req.user.id });
  try { notifSvc.notify(user.id, 'USER_CREATED', `Your account has been created with role ${role}`); } catch (e) { console.error(e.message); }
  res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    // Coordinator can only edit users in their department
    if (req.user.role === 'COORDINATOR' && existing.departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Cannot edit users outside your department' });
    }
    // Coordinator cannot edit MAINTAINER or COORDINATOR roles
    if (req.user.role === 'COORDINATOR' && !['SUPERVISOR', 'EXTERNAL_EXAMINER', 'STUDENT'].includes(existing.role)) {
      return res.status(403).json({ error: 'Cannot edit this user role' });
    }
    // Coordinator cannot change role field
    if (req.user.role === 'COORDINATOR' && req.body.role && req.body.role !== existing.role) {
      return res.status(403).json({ error: 'Cannot change user role' });
    }
    // Coordinator cannot change degreeType for non-students
    if (req.user.role === 'COORDINATOR' && req.body.degreeType && existing.role !== 'STUDENT') {
      return res.status(403).json({ error: 'Cannot change degree type for this user' });
    }

    const data = {};
    if (req.body.firstName !== undefined) data.firstName = req.body.firstName;
    if (req.body.lastName !== undefined) data.lastName = req.body.lastName;
    if (req.body.email !== undefined) data.email = req.body.email;
    if (req.body.role) data.role = req.body.role;
    if (req.body.degreeType) data.degreeType = req.body.degreeType;
    if (req.body.programId) data.programId = req.body.programId;
    if (req.body.password) data.password = await bcrypt.hash(req.body.password, 10);

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: USER_SELECT,
    });
    const changedFields = Object.keys(data).join(', ');
  audit.log({ action: 'UPDATE', entity: 'User', entityId: user.id, details: `Updated fields: ${changedFields}`, performedById: req.user.id });
  try { notifSvc.notify(user.id, 'USER_UPDATED', 'Your profile has been updated'); } catch (e) { console.error(e.message); }
  res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) return res.status(404).json({ error: 'User not found' });
    // Coordinator can only delete users in their department
    if (req.user.role === 'COORDINATOR' && existing.departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Cannot delete users outside your department' });
    }
    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getUsersByRole = async (req, res) => {
  try {
    const where = { role: req.params.role.toUpperCase() };
    if (req.query.all !== 'true') {
      where.active = true;
    }
    if (req.query.degreeType) {
      where.degreeType = req.query.degreeType.toUpperCase();
    }
    // Coordinator can only see users in their department
    if (req.user.role === 'COORDINATOR') {
      where.departmentId = req.user.departmentId;
    }
    const users = await prisma.user.findMany({
      where,
      select: USER_SELECT,
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.toggleActive = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Coordinator can only toggle users in their department
    if (req.user.role === 'COORDINATOR' && user.departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Cannot toggle users outside your department' });
    }

    if (!['SUPERVISOR', 'EXTERNAL_EXAMINER'].includes(user.role)) {
      return res.status(400).json({ error: 'Can only toggle active status for supervisors and external examiners' });
    }

    const activating = !user.active;

    if (!activating) {
      // Check for non-completed groups (PENDING or ACTIVE status)
      const activeGroups = await prisma.projectGroup.count({
        where: {
          supervisorId: userId,
          status: { in: ['PENDING', 'ACTIVE'] },
        },
      });
      const activeTheses = await prisma.thesis.count({
        where: {
          supervisorId: userId,
          status: { in: ['PENDING', 'ACTIVE'] },
        },
      });
      const examinerActiveAssignments = await prisma.examinerAssignment.count({
        where: {
          externalExaminerId: userId,
          OR: [
            { group: { status: { in: ['PENDING', 'ACTIVE'] } } },
            { thesis: { status: { in: ['PENDING', 'ACTIVE'] } } },
          ],
        },
      });

      if (activeGroups + activeTheses + examinerActiveAssignments > 0) {
        return res.status(400).json({
          error: 'Cannot deactivate this user. They have active non-completed projects/theses assigned.',
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { active: activating },
      select: USER_SELECT,
    });

    const action = activating ? 'ACTIVATE' : 'DEACTIVATE';
  audit.log({ action: 'DEACTIVATE', entity: 'User', entityId: user.id, details: `${action}d user ${user.email}`, performedById: req.user.id });
  try { notifSvc.notify(user.id, 'USER_STATUS_CHANGED', `Your account has been ${action.toLowerCase()}d`); } catch (e) { console.error(e.message); }
  res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const where = {};
    if (req.query.entity) where.entity = req.query.entity;
    if (req.query.entityId) where.entityId = parseInt(req.query.entityId);
    // Coordinator can only see logs for their department users
    if (req.user.role === 'COORDINATOR') {
      const deptUserIds = await prisma.user.findMany({ where: { departmentId: req.user.departmentId }, select: { id: true } });
      where.performedById = { in: deptUserIds.map(u => u.id) };
    }
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(req.query.limit) || 100,
      skip: parseInt(req.query.offset) || 0,
      include: { performedBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    const total = await prisma.auditLog.count({ where });
    res.json({ success: true, data: { logs, total } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
