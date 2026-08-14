const bcrypt = require('bcryptjs');

const prisma = require('../utils/prisma');
const audit = require('../services/auditService');
const emailService = require('../services/emailService');
const notifSvc = require('../services/notificationService');
const { computeCurrentYearSemesterFromBatch } = require('../utils/computeYearSemester');

const USER_SELECT = {
  id: true, email: true, firstName: true, lastName: true,
  role: true, degreeType: true, active: true,
  departmentId: true, programId: true,
  rollNumber: true, designation: true, batch: true,
  createdAt: true, updatedAt: true,
};

const VALID_ROLES = ['MAINTAINER', 'COORDINATOR', 'SUPERVISOR', 'STUDENT', 'EXTERNAL_EXAMINER'];
const VALID_DEGREE_TYPES = ['BACHELOR', 'MASTER'];

// Email policy:
//  - STUDENT emails are ALWAYS auto-derived from the roll number: {rollNumber}@pcampus.edu.np
//  - COORDINATOR / SUPERVISOR / EXTERNAL_EXAMINER emails must end with @pcampus.edu.np
//    (local part is free-form: ramyadav@pcampus.edu.np and ram.yadav@pcampus.edu.np are both valid)
const PCAMPUS_EMAIL_RE = /^[a-zA-Z0-9._%+-]+@pcampus\.edu\.np$/;
const PCAMPUS_DOMAIN_ROLES = ['COORDINATOR', 'SUPERVISOR', 'EXTERNAL_EXAMINER'];

function isPcampusEmail(email) {
  return PCAMPUS_EMAIL_RE.test(email || '');
}

/**
 * Extract batch from roll number. Roll "080BCT001" → "080".
 */
function extractBatchFromRoll(rollNumber) {
  if (!rollNumber) return null;
  const match = rollNumber.match(/^(\d{2,3})/);
  return match ? match[1] : null;
}

function extractProgramCodeFromRoll(roll) {
  if (!roll) return null;
  const code = roll.replace(/^\d{2,3}/, '').replace(/\d+$/, '');
  return code || null;
}

function enrichWithComputedYearSemester(user) {
  if (user.role !== 'STUDENT' || !user.batch) return user;
  const computed = computeCurrentYearSemesterFromBatch(user.batch, user.degreeType);
  if (computed.currentYear) {
    user.currentYear = computed.currentYear;
    user.currentSemester = computed.currentSemester;
  }
  return user;
}

exports.getUsers = async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'COORDINATOR') {
      const program = await prisma.program.findUnique({ where: { coordinatorId: req.user.id } });
      if (program) {
        where.OR = [
          { role: 'STUDENT', programId: program.id },
          { role: { in: ['SUPERVISOR', 'EXTERNAL_EXAMINER'] }, departmentId: req.user.departmentId },
        ];
      } else {
        where.role = { in: ['SUPERVISOR', 'EXTERNAL_EXAMINER', 'STUDENT'] };
        where.departmentId = req.user.departmentId;
      }
    }
    const users = await prisma.user.findMany({
      where,
      select: {
        ...USER_SELECT,
        program: { select: { id: true, name: true, code: true } },
      },
    });
    res.json(users.map(enrichWithComputedYearSemester));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createUser = async (req, res) => {
  try {
    let email = (req.body.email || '').toString().trim().toLowerCase();
    const { password, firstName, lastName, role, degreeType, departmentId, programId, designation, rollNumber } = req.body;
    if (!password || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'password, firstName, lastName, and role are required' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
    }

    // Student roll & email enforcement
    let resolvedRoll = (rollNumber || '').toString().trim();
    let resolvedEmail = email;
    let resolvedProgramId = programId ? parseInt(programId) : undefined;
    let resolvedDegreeType = degreeType;

    if (role === 'STUDENT') {
      if (!resolvedRoll) {
        return res.status(400).json({ error: 'rollNumber is required for students' });
      }
      // ── STUDENT EMAIL FORMAT (change here when needed) ───────────────
      // Current: {roll}@pcampus.edu.np → 080BCT001 → 080bct001@pcampus.edu.np
      // Want:    {roll}.{firstName}@pcampus.edu.np (roll any case, lowercased for consistency)
      // Regex:   /^[a-z0-9]+\.[a-z]+@pcampus\.edu\.np$/i  e.g. 080bct001.ram@pcampus.edu.np
      // Replace the line below with:
      //   resolvedEmail = `${resolvedRoll.toLowerCase()}.${(firstName || '').toLowerCase().replace(/[^a-z]/g, '')}@pcampus.edu.np`;
      // ───────────────────────────────────────────────────────────────────
      resolvedEmail = resolvedRoll.toLowerCase() + '@pcampus.edu.np';
      // Check roll uniqueness
      const existingByRoll = await prisma.user.findFirst({ where: { rollNumber: resolvedRoll } });
      if (existingByRoll) {
        return res.status(400).json({ error: `Roll number "${resolvedRoll}" is already assigned to another student` });
      }
      // Derive program from roll prefix if not provided
      if (!resolvedProgramId) {
        const progCode = extractProgramCodeFromRoll(resolvedRoll);
        if (progCode) {
          const prog = await prisma.program.findFirst({ where: { code: { equals: progCode, mode: 'insensitive' } } });
          if (prog) {
            resolvedProgramId = prog.id;
            if (!resolvedDegreeType) resolvedDegreeType = prog.degreeType;
          }
        }
      }
      // Fallback degree type
      if (!resolvedDegreeType) resolvedDegreeType = 'BACHELOR';
    }

    // Enforce @pcampus.edu.np domain for coordinator/supervisor/examiner accounts
    if (PCAMPUS_DOMAIN_ROLES.includes(role) && !isPcampusEmail(resolvedEmail)) {
      return res.status(400).json({ error: 'Email must end with @pcampus.edu.np (e.g. ram.yadav@pcampus.edu.np)' });
    }

    if (resolvedDegreeType && !VALID_DEGREE_TYPES.includes(resolvedDegreeType)) {
      return res.status(400).json({ error: `Invalid degreeType. Must be one of: ${VALID_DEGREE_TYPES.join(', ')}` });
    }

    // Check email uniqueness
    const existingByEmail = await prisma.user.findUnique({ where: { email: resolvedEmail } });
    if (existingByEmail) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Coordinator can only create users in their own department
    const targetDeptId = departmentId ? parseInt(departmentId) : req.user.departmentId;
    if (req.user.role === 'COORDINATOR' && targetDeptId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Cannot create users outside your department' });
    }
    // Coordinator cannot create MAINTAINER or COORDINATOR roles (MAINTAINER can create any role)
    if (req.user.role === 'COORDINATOR' && !['SUPERVISOR', 'EXTERNAL_EXAMINER', 'STUDENT'].includes(role)) {
      return res.status(403).json({ error: 'Coordinator can only create supervisors, examiners, and students' });
    }
    // Coordinator cannot place students in programs outside their department
    if (req.user.role === 'COORDINATOR' && resolvedProgramId) {
      const prog = await prisma.program.findUnique({ where: { id: resolvedProgramId }, select: { departmentId: true } });
      if (prog && prog.departmentId !== req.user.departmentId) {
        return res.status(403).json({ error: 'Cannot create users in a program outside your department' });
      }
    }

    const hash = await bcrypt.hash(password, 10);
    const batch = extractBatchFromRoll(resolvedRoll);
    const user = await prisma.user.create({
      data: {
        email: resolvedEmail, password: hash, firstName, lastName, role,
        degreeType: resolvedDegreeType,
        departmentId: targetDeptId, programId: resolvedProgramId,
        designation, rollNumber: resolvedRoll, batch,
      },
      select: USER_SELECT,
    });
  audit.log({ action: 'CREATE', entity: 'User', entityId: user.id, details: `Created ${role} ${resolvedEmail}`, performedById: req.user.id });
  try { notifSvc.notify(user.id, 'USER_CREATED', `Your account has been created with role ${role}`); } catch (e) { console.error(e.message); }
  res.status(201).json(user);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A user with this email or roll number already exists' });
    }
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

    const data = {};
    if (req.body.firstName !== undefined) data.firstName = req.body.firstName;
    if (req.body.lastName !== undefined) data.lastName = req.body.lastName;
    if (req.body.role && req.user.role === 'MAINTAINER') data.role = req.body.role;
    if (existing.role === 'STUDENT') {
      if (req.body.degreeType) data.degreeType = req.body.degreeType;
      if (req.body.programId) {
        const pid = parseInt(req.body.programId);
        if (req.user.role === 'COORDINATOR') {
          const prog = await prisma.program.findUnique({ where: { id: pid }, select: { departmentId: true } });
          if (prog && prog.departmentId !== req.user.departmentId) {
            return res.status(403).json({ error: 'Cannot move students to a program outside your department' });
          }
        }
        data.programId = pid;
      }
    }
    if (req.body.password) data.password = await bcrypt.hash(req.body.password, 10);
    if (req.body.designation !== undefined) data.designation = req.body.designation;

    // Resolve roll number first so a student's derived email stays in sync
    let effectiveRoll = existing.rollNumber;
    if (req.body.rollNumber !== undefined) {
      const newRoll = req.body.rollNumber.toString().trim();
      if (newRoll) {
        const dup = await prisma.user.findFirst({ where: { rollNumber: newRoll, id: { not: userId } } });
        if (dup) return res.status(400).json({ error: `Roll number "${newRoll}" is already assigned to another student` });
        data.rollNumber = newRoll;
        data.batch = extractBatchFromRoll(newRoll);
        effectiveRoll = newRoll;
      } else {
        data.rollNumber = null;
        data.batch = null;
        effectiveRoll = null;
      }
    }

    // Email rules:
    //  - STUDENT: always auto-derived from roll number, never free-form.
    //  - COORDINATOR / SUPERVISOR / EXTERNAL_EXAMINER: must end with @pcampus.edu.np.
    if (existing.role === 'STUDENT') {
      if (req.body.email !== undefined || req.body.rollNumber !== undefined) {
        if (!effectiveRoll) {
          return res.status(400).json({ error: 'rollNumber is required for students' });
        }
        // ── STUDENT EMAIL FORMAT (change here when needed) ───────────────
        // Current: {roll}@pcampus.edu.np → 080BCT001 → 080bct001@pcampus.edu.np
        // Want:    {roll}.{firstName}@pcampus.edu.np (roll any case, lowercased for consistency)
        // Regex:   /^[a-z0-9]+\.[a-z]+@pcampus\.edu\.np$/i  e.g. 080bct001.ram@pcampus.edu.np
        // Replace the line below with:
        //   data.email = `${effectiveRoll.toLowerCase()}.${((req.body.firstName || existing.firstName) || '').toLowerCase().replace(/[^a-z]/g, '')}@pcampus.edu.np`;
        // ───────────────────────────────────────────────────────────────────
        data.email = effectiveRoll.toLowerCase() + '@pcampus.edu.np';
      }
    } else if (req.body.email !== undefined) {
      const newEmail = (req.body.email || '').toString().trim().toLowerCase();
      if (PCAMPUS_DOMAIN_ROLES.includes(existing.role) && !isPcampusEmail(newEmail)) {
        return res.status(400).json({ error: 'Email must end with @pcampus.edu.np (e.g. ram.yadav@pcampus.edu.np)' });
      }
      data.email = newEmail;
    }

    // Friendly uniqueness check for changed emails (avoids raw P2002 500 error)
    if (data.email && data.email !== existing.email) {
      const dupEmail = await prisma.user.findUnique({ where: { email: data.email } });
      if (dupEmail) return res.status(400).json({ error: 'Email already in use' });
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: USER_SELECT,
    });
    // Keep Thesis.programId in sync with the student's program (it mirrors the
    // student's program at creation time and goes stale when the student moves).
    if (existing.role === 'STUDENT' && data.programId && data.programId !== existing.programId) {
      try {
        await prisma.thesis.updateMany({
          where: { studentId: user.id },
          data: { programId: data.programId },
        });
      } catch (e) { console.error('sync thesis programId error:', e.message); }
    }
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
    if (req.user.role === 'COORDINATOR' && !['SUPERVISOR', 'EXTERNAL_EXAMINER', 'STUDENT'].includes(existing.role)) {
      return res.status(403).json({ error: 'Cannot delete this user role' });
    }

    // Check if user has active links
    let groupCount = 0, thesisCount = 0, supervisedGroupCount = 0, supervisedThesisCount = 0, examAssignCount = 0;
    
    if (existing.role === 'STUDENT') {
      [groupCount, thesisCount] = await Promise.all([
        prisma.groupMember.count({ where: { studentId: userId } }),
        prisma.thesis.count({ where: { studentId: userId } }),
      ]);
    } else if (existing.role === 'SUPERVISOR') {
      [supervisedGroupCount, supervisedThesisCount] = await Promise.all([
        prisma.projectGroup.count({ where: { supervisorId: userId } }),
        prisma.thesis.count({ where: { supervisorId: userId } }),
      ]);
    } else if (existing.role === 'EXTERNAL_EXAMINER') {
      examAssignCount = await prisma.examinerAssignment.count({ where: { externalExaminerId: userId } });
    }

    if (groupCount > 0 || thesisCount > 0 || supervisedGroupCount > 0 || supervisedThesisCount > 0 || examAssignCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete user with active assignments',
        details: {
          groups: groupCount,
          theses: thesisCount,
          supervisedGroups: supervisedGroupCount,
          supervisedTheses: supervisedThesisCount,
          examinerAssignments: examAssignCount,
        },
      });
    }

    audit.log({ action: 'DELETE', entity: 'User', entityId: userId, details: `Deleted ${existing.role} ${existing.email}`, performedById: req.user.id });
    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { userId: userId } }),
      prisma.auditLog.deleteMany({ where: { performedById: userId } }),
      prisma.evaluation.deleteMany({ where: { submittedById: userId } }),
      prisma.evaluationComponent.deleteMany({ where: { createdById: userId } }),
      prisma.recommendation.deleteMany({ where: { issuedById: userId } }),
      prisma.assignmentRequest.deleteMany({ where: { fromCoordinatorId: userId } }),
      prisma.assignmentRequest.deleteMany({ where: { toCoordinatorId: userId } }),
      prisma.assignmentRequest.deleteMany({ where: { supervisorId: userId } }),
      prisma.groupInvitation.deleteMany({ where: { inviterId: userId } }),
      prisma.groupInvitation.deleteMany({ where: { inviteeId: userId } }),
      prisma.announcement.deleteMany({ where: { createdById: userId } }),
      prisma.examinerAssignment.deleteMany({ where: { assignedById: userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('deleteUser error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

exports.getSupervisorScope = async (req, res) => {
  try {
    const [ownProgram, theses, groups] = await Promise.all([
      prisma.program.findFirst({ where: { coordinatorId: req.user.id }, select: { id: true } }),
      prisma.thesis.findMany({ where: { supervisorId: req.user.id }, select: { programId: true } }),
      prisma.projectGroup.findMany({ where: { supervisorId: req.user.id }, select: { programId: true } }),
    ]);
    const ownProgramId = req.user.programId ?? ownProgram?.id ?? null;
    const assignments = [...theses, ...groups];
    res.json({
      ownProgramId,
      hasSupervisorAssignments: assignments.length > 0,
      hasOtherProgramAssignments: assignments.some(t => t.programId && t.programId !== ownProgramId),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getUsersByRole = async (req, res) => {
  try {
    const role = (req.params.role || '').toUpperCase();
    // Supervisor lookups include coordinators (they can supervise too)
    // Examiner lookups include supervisors and coordinators (faculty can examine other projects)
    const where = role === 'SUPERVISOR'
      ? { role: { in: ['SUPERVISOR', 'COORDINATOR'] } }
      : role === 'EXTERNAL_EXAMINER'
        ? { role: { in: ['EXTERNAL_EXAMINER', 'SUPERVISOR', 'COORDINATOR'] } }
        : { role };
    if (req.query.all !== 'true') {
      where.active = true;
    }
    if (req.query.degreeType) {
      where.degreeType = req.query.degreeType.toUpperCase();
    }
    if (req.query.programId) {
      where.programId = parseInt(req.query.programId);
    }
    if (req.user.role === 'COORDINATOR' && req.user.departmentId) {
      where.departmentId = req.user.departmentId;
      // Bachelor coordinators only see their own program's students.
      // Master coordinators see all dept students (they can supervise cross-program work)
      // unless the dashboard explicitly scopes with ?programId=
      if (role === 'STUDENT' && !req.query.programId) {
        const ownProgram = await prisma.program.findUnique({ where: { coordinatorId: req.user.id }, select: { id: true, degreeType: true } });
        const progId = req.user.programId ?? ownProgram?.id ?? null;
        if (progId && ownProgram?.degreeType !== 'MASTER') where.programId = progId;
      }
    }
    const users = await prisma.user.findMany({
      where,
      select: {
        ...USER_SELECT,
        program: { select: { id: true, name: true, code: true } },
      },
    });
    res.json(users.map(enrichWithComputedYearSemester));
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

    if (!['SUPERVISOR', 'EXTERNAL_EXAMINER', 'STUDENT'].includes(user.role)) {
      return res.status(400).json({ error: 'Can only toggle active status for supervisors, external examiners, and students' });
    }

    const activating = !user.active;

    if (!activating && ['SUPERVISOR', 'EXTERNAL_EXAMINER'].includes(user.role)) {
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

exports.bulkCreateUsers = async (req, res) => {
  try {
    const { users } = req.body;
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: 'users array is required and must not be empty' });
    }

    const created = [];
    const errors = [];

    if (req.user.role === 'COORDINATOR') {
      const deptPrograms = await prisma.program.findMany({
        where: { departmentId: req.user.departmentId },
        select: { id: true },
      });
      const deptProgramIds = new Set(deptPrograms.map(p => p.id));
      const canUseProgram = (pid) => !pid || deptProgramIds.has(pid);
      const canCreateRole = (role) => ['SUPERVISOR', 'EXTERNAL_EXAMINER', 'STUDENT'].includes(role);

      for (const u of users) {
        const role = (u.role || '').toUpperCase();
        const pid = u.programId ? parseInt(u.programId) : null;
        const did = u.departmentId ? parseInt(u.departmentId) : req.user.departmentId;
        if (!canCreateRole(role)) {
          errors.push({ email: u.email || 'unknown', error: 'Coordinator can only create supervisors, examiners, and students' });
          continue;
        }
        if (did && did !== req.user.departmentId) {
          errors.push({ email: u.email || 'unknown', error: 'Cannot create users outside your department' });
          continue;
        }
        if (!canUseProgram(pid)) {
          errors.push({ email: u.email || 'unknown', error: 'Cannot create users in a program outside your department' });
          continue;
        }
      }
    }

    for (const u of users) {
      const { password, firstName, lastName, role, degreeType, programId, departmentId, designation, rollNumber } = u;
      let email = (u.email || '').toString().trim().toLowerCase();
      if (!password || !firstName || !lastName || !role) {
        errors.push({ email: email || 'unknown', error: 'Missing required fields (password, firstName, lastName, role)' });
        continue;
      }
      if (!email && role !== 'STUDENT') {
        errors.push({ email: email || 'unknown', error: 'email is required for this role' });
        continue;
      }
      if (!VALID_ROLES.includes(role)) {
        errors.push({ email, error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
        continue;
      }
      if (degreeType && !VALID_DEGREE_TYPES.includes(degreeType)) {
        errors.push({ email, error: `Invalid degreeType. Must be one of: ${VALID_DEGREE_TYPES.join(', ')}` });
        continue;
      }

      // Enforce email patterns: students derive email from rollNumber; staff must use @pcampus.edu.np
      if (role === 'STUDENT') {
        if (!rollNumber) {
          errors.push({ email: email || 'unknown', error: 'rollNumber is required for students' });
          continue;
        }
        // ── STUDENT EMAIL FORMAT (change here when needed) ───────────────
        // Current: {roll}@pcampus.edu.np → 080BCT001 → 080bct001@pcampus.edu.np
        // Want:    {roll}.{firstName}@pcampus.edu.np (roll any case, lowercased for consistency)
        // Regex:   /^[a-z0-9]+\.[a-z]+@pcampus\.edu\.np$/i  e.g. 080bct001.ram@pcampus.edu.np
        // Replace the line below with:
        //   email = `${rollNumber.toString().trim().toLowerCase()}.${(firstName || '').toLowerCase().replace(/[^a-z]/g, '')}@pcampus.edu.np`;
        // ───────────────────────────────────────────────────────────────────
        email = rollNumber.toString().trim().toLowerCase() + '@pcampus.edu.np';
      } else if (PCAMPUS_DOMAIN_ROLES.includes(role) && !isPcampusEmail(email)) {
        errors.push({ email, error: 'Email must end with @pcampus.edu.np (e.g. ram.yadav@pcampus.edu.np)' });
        continue;
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        errors.push({ email, error: 'Duplicate email' });
        continue;
      }

      try {
        const hash = await bcrypt.hash(password, 10);
        const batch = extractBatchFromRoll(rollNumber);
        const user = await prisma.user.create({
          data: {
            email, password: hash, firstName, lastName, role,
            degreeType: degreeType || null,
            departmentId: departmentId ? parseInt(departmentId) : null,
            programId: programId ? parseInt(programId) : null,
            designation: designation || null,
            rollNumber: rollNumber || null,
            batch,
          },
          select: USER_SELECT,
        });
        created.push(user);
        audit.log({ action: 'CREATE', entity: 'User', entityId: user.id, details: `Bulk created ${role} ${email}`, performedById: req.user.id });
        try { notifSvc.notify(user.id, 'USER_CREATED', `Your account has been created with role ${role}`); } catch (e) { console.error(e.message); }
        try { emailService.notifyUserCreated(email, firstName, role, email, password); } catch (e) { console.error(e.message); }
      } catch (err) {
        errors.push({ email, error: err.message });
      }
    }

    res.status(201).json({
      message: `Successfully created ${created.length} user(s)`,
      created,
      createdCount: created.length,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const EXCEL_BULK_ROLES = ['STUDENT', 'SUPERVISOR', 'EXTERNAL_EXAMINER'];

/**
 * Excel bulk import for coordinators/maintainers.
 * Query/body field `role` must be STUDENT | SUPERVISOR | EXTERNAL_EXAMINER.
 * Columns depend on role (see generate-samples.js templates).
 */
exports.bulkImportUsersExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Excel file is required' });

    const role = (req.body.role || req.query.role || '').toString().toUpperCase();
    if (!EXCEL_BULK_ROLES.includes(role)) {
      return res.status(400).json({ error: 'role must be STUDENT, SUPERVISOR, or EXTERNAL_EXAMINER' });
    }

    if (req.user.role === 'COORDINATOR' && !EXCEL_BULK_ROLES.includes(role)) {
      return res.status(403).json({ error: 'Coordinator can only import students, supervisors, and examiners' });
    }

    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    if (!rows.length) return res.status(400).json({ error: 'Excel file has no data rows' });

    let coordinatorProgram = null;
    if (req.user.role === 'COORDINATOR') {
      coordinatorProgram = await prisma.program.findUnique({ where: { coordinatorId: req.user.id } });
    }

    const allPrograms = await prisma.program.findMany({ select: { id: true, code: true, name: true, degreeType: true } });
    const findProgram = (codeOrName) => {
      if (!codeOrName) return null;
      const q = codeOrName.toString().trim().toLowerCase();
      return allPrograms.find(p => p.code.toLowerCase() === q || p.name.toLowerCase() === q) || null;
    };

    // Pre-fetch all existing roll numbers for uniqueness check
    const existingRolls = new Set();
    if (role === 'STUDENT') {
      const existing = await prisma.user.findMany({ where: { rollNumber: { not: null } }, select: { rollNumber: true } });
      existing.forEach(u => existingRolls.add(u.rollNumber.toLowerCase()));
    }

    const created = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // header is row 1
      let email = (row.email || row.Email || '').toString().trim().toLowerCase();
      let password = (row.password || row.Password || '').toString().trim();
      const firstName = (row.firstName || row.FirstName || row['First Name'] || '').toString().trim();
      const lastName = (row.lastName || row.LastName || row['Last Name'] || '').toString().trim();
      const designation = (row.designation || row.Designation || '').toString().trim() || null;
      const rollNumber = (row.rollNumber || row.RollNumber || row.Roll || row.roll || '').toString().trim() || null;
      const programRaw = (row.programCode || row.ProgramCode || row.Program || row.program || '').toString().trim();
      let degreeType = (row.degreeType || row.DegreeType || row.Degree || '').toString().trim().toUpperCase() || null;
      let programId = row.programId ? parseInt(row.programId) : null;

      if (!password) {
        password = 'Test@123';
      }

      if (!email && (role === 'SUPERVISOR' || role === 'EXTERNAL_EXAMINER') && firstName && lastName) {
        const fn = firstName.toLowerCase().replace(/[^a-z]/g, '');
        const ln = lastName.toLowerCase().replace(/[^a-z]/g, '') || fn;
        email = `${fn}.${ln}@pcampus.edu.np`;
      }

      // Enforce @pcampus.edu.np domain for staff accounts
      if (role !== 'STUDENT' && email && !isPcampusEmail(email)) {
        errors.push({ row: rowNum, email, error: 'Email must end with @pcampus.edu.np (e.g. name@pcampus.edu.np)' });
        continue;
      }

      if (!email || !password || !firstName || !lastName) {
        if (role !== 'STUDENT' || !firstName || !lastName) {
          errors.push({ row: rowNum, email: email || 'unknown', error: 'Missing required fields (email, password, firstName, lastName)' });
          continue;
        }
      }

      if (role === 'STUDENT') {
        if (!rollNumber) {
          errors.push({ row: rowNum, email: email || 'unknown', error: 'rollNumber is required for students' });
          continue;
        }
        // ── STUDENT EMAIL FORMAT (change here when needed) ───────────────
        // Current: {roll}@pcampus.edu.np → 080BCT001 → 080bct001@pcampus.edu.np
        // Want:    {roll}.{firstName}@pcampus.edu.np (roll any case, lowercased for consistency)
        // Regex:   /^[a-z0-9]+\.[a-z]+@pcampus\.edu\.np$/i  e.g. 080bct001.ram@pcampus.edu.np
        // Replace the line below with:
        //   email = `${rollNumber.toLowerCase()}.${(firstName || '').toLowerCase().replace(/[^a-z]/g, '')}@pcampus.edu.np`;
        // ───────────────────────────────────────────────────────────────────
        email = rollNumber.toLowerCase() + '@pcampus.edu.np';
        // Roll uniqueness
        if (existingRolls.has(rollNumber.toLowerCase())) {
          errors.push({ row: rowNum, email, error: `Roll number "${rollNumber}" already exists` });
          continue;
        }
        existingRolls.add(rollNumber.toLowerCase());

        if (!programId && programRaw) {
          const prog = findProgram(programRaw);
          if (prog) programId = prog.id;
        }
        // Derive program from roll prefix if still not resolved
        if (!programId) {
          const progCode = extractProgramCodeFromRoll(rollNumber);
          if (progCode) {
            const prog = findProgram(progCode);
            if (prog) programId = prog.id;
          }
        }
        if (!programId && coordinatorProgram) {
          programId = coordinatorProgram.id;
        }
        if (!programId) {
          errors.push({ row: rowNum, email, error: 'programCode/programId is required for students' });
          continue;
        }
        if (!degreeType) {
          const prog = allPrograms.find(p => p.id === programId);
          degreeType = prog?.degreeType || (coordinatorProgram?.degreeType) || 'MASTER';
        }
        if (!VALID_DEGREE_TYPES.includes(degreeType)) {
          errors.push({ row: rowNum, email, error: `Invalid degreeType. Must be one of: ${VALID_DEGREE_TYPES.join(', ')}` });
          continue;
        }
        // Master coordinators: only MASTER students in this pass
        if (req.user.role === 'COORDINATOR' && coordinatorProgram?.degreeType && degreeType !== coordinatorProgram.degreeType) {
          errors.push({ row: rowNum, email, error: `degreeType must be ${coordinatorProgram.degreeType} for your program` });
          continue;
        }
        if (req.user.role === 'COORDINATOR' && coordinatorProgram && programId !== coordinatorProgram.id) {
          errors.push({ row: rowNum, email, error: 'Students must belong to your program' });
          continue;
        }
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        errors.push({ row: rowNum, email, error: 'Duplicate email' });
        continue;
      }

      try {
        const hash = await bcrypt.hash(password, 10);
        const batch = extractBatchFromRoll(rollNumber);
        const departmentId = req.user.departmentId || null;
        const user = await prisma.user.create({
          data: {
            email,
            password: hash,
            firstName,
            lastName,
            role,
            degreeType: role === 'STUDENT' ? degreeType : null,
            departmentId,
            programId: role === 'STUDENT' ? programId : null,
            designation: role === 'STUDENT' ? null : designation,
            rollNumber: role === 'STUDENT' ? rollNumber : null,
            batch: role === 'STUDENT' ? batch : null,
            active: true,
          },
          select: USER_SELECT,
        });
        created.push(user);
        audit.log({ action: 'CREATE', entity: 'User', entityId: user.id, details: `Excel bulk created ${role} ${email}`, performedById: req.user.id });
        try { notifSvc.notify(user.id, 'USER_CREATED', `Your account has been created with role ${role}`); } catch (e) { console.error(e.message); }
        try { emailService.notifyUserCreated(email, firstName, role, email, password); } catch (e) { console.error(e.message); }
      } catch (err) {
        errors.push({ row: rowNum, email, error: err.message });
      }
    }

    res.status(201).json({
      message: `Successfully created ${created.length} user(s)`,
      created: created.length,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    console.error('bulkImportUsersExcel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const where = {};
    if (req.query.entity) where.entity = req.query.entity;
    if (req.query.entityId) where.entityId = parseInt(req.query.entityId);
    if (req.query.action) where.action = req.query.action;

    // Scope audit logs to the coordinator's own program/department
    if (req.user.role === 'COORDINATOR') {
      const program = await prisma.program.findUnique({ where: { coordinatorId: req.user.id } });
      if (program) {
        // Program coordinator: only see logs belonging to their own program
        // (programId on the audit row, resolved at log time), plus their own
        // actions. Staff (supervisors/examiners) involved with this program's
        // items have no programId themselves, so their User-entity events
        // (login/logout/password) are included by involvement; their actions
        // on OTHER programs' items are NOT visible (item-scoped programId).
        const [groupSup, thesisSup, thesisExtMid, thesisExtFin, groupExam, thesisExam] = await Promise.all([
          prisma.projectGroup.findMany({ where: { programId: program.id, supervisorId: { not: null } }, select: { supervisorId: true } }),
          prisma.thesis.findMany({ where: { student: { programId: program.id }, supervisorId: { not: null } }, select: { supervisorId: true } }),
          prisma.thesis.findMany({ where: { student: { programId: program.id }, externalMidTermId: { not: null } }, select: { externalMidTermId: true } }),
          prisma.thesis.findMany({ where: { student: { programId: program.id }, externalFinalId: { not: null } }, select: { externalFinalId: true } }),
          prisma.examinerAssignment.findMany({ where: { group: { programId: program.id } }, select: { externalExaminerId: true } }),
          prisma.examinerAssignment.findMany({ where: { thesis: { student: { programId: program.id } } }, select: { externalExaminerId: true } }),
        ]);
        const staffIds = [...new Set([
          ...groupSup.map(r => r.supervisorId),
          ...thesisSup.map(r => r.supervisorId),
          ...thesisExtMid.map(r => r.externalMidTermId),
          ...thesisExtFin.map(r => r.externalFinalId),
          ...groupExam.map(r => r.externalExaminerId),
          ...thesisExam.map(r => r.externalExaminerId),
          req.user.id,
        ].filter(Boolean))];
        where.OR = [
          { programId: program.id },
          { performedById: req.user.id },
          { AND: [{ entity: 'User' }, { performedById: { in: staffIds } }] },
        ];
      } else {
        // Department-level coordinator: only see logs from their department
        const deptUserIds = await prisma.user.findMany({
          where: { departmentId: req.user.departmentId },
          select: { id: true },
        });
        const ids = deptUserIds.map(u => u.id);
        ids.push(req.user.id);
        where.performedById = { in: ids };
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(req.query.limit) || 100,
      skip: parseInt(req.query.offset) || 0,
      include: { performedBy: { select: { id: true, firstName: true, lastName: true, email: true } }, program: { select: { id: true, name: true, code: true } } },
    });
    const total = await prisma.auditLog.count({ where });
    res.json({ success: true, data: { logs, total } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
