const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, role: true, degreeType: true, createdAt: true },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const VALID_ROLES = ['MAINTAINER', 'COORDINATOR', 'SUPERVISOR', 'STUDENT', 'EXTERNAL_EXAMINER'];
const VALID_DEGREE_TYPES = ['BACHELOR', 'MASTER'];

exports.createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, degreeType } = req.body;
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'email, password, firstName, lastName, and role are required' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
    }
    if (degreeType && !VALID_DEGREE_TYPES.includes(degreeType)) {
      return res.status(400).json({ error: `Invalid degreeType. Must be one of: ${VALID_DEGREE_TYPES.join(', ')}` });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hash, firstName, lastName, role, degreeType },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, degreeType: true },
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const data = {};
    if (req.body.email) data.email = req.body.email;
    if (req.body.firstName) data.firstName = req.body.firstName;
    if (req.body.lastName) data.lastName = req.body.lastName;
    if (req.body.role) data.role = req.body.role;
    if (req.body.degreeType) data.degreeType = req.body.degreeType;
    if (req.body.password) data.password = await bcrypt.hash(req.body.password, 10);
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, degreeType: true },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUsersByRole = async (req, res) => {
  try {
    const where = { role: req.params.role.toUpperCase() };
    if (req.query.all !== 'true') {
      where.active = true;
    }
    const users = await prisma.user.findMany({
      where,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, degreeType: true, active: true },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.toggleActive = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!['SUPERVISOR', 'EXTERNAL_EXAMINER'].includes(user.role)) {
      return res.status(400).json({ error: 'Can only toggle active status for supervisors and external examiners' });
    }

    const activating = !user.active;

    if (!activating) {
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
          error: 'Cannot deactivate this user. They have active projects/theses assigned.',
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { active: activating },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, active: true },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
