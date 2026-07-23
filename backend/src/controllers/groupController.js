
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const emailService = require('../services/emailService');
const notifSvc = require('../services/notificationService');
const audit = require('../services/auditService');
const { getDefaultComponents } = require('../config/evaluationScheme');
const fuzzyMatch = require('../utils/fuzzyMatch');
const { markOverdueItems } = require('../utils/checkOverdue');
const { buildGroupWhereForCoordinator } = require('../utils/coordinatorScope');
const { computeCurrentYearSemesterFromBatch } = require('../utils/computeYearSemester');

const normalizeBatch = (batch) => {
  if (!batch) return batch;
  const digits = batch.toString().replace(/\D/g, '');
  if (!digits) return batch;
  if (digits.length >= 3) return digits.slice(-3);
  return digits.padStart(3, '0');
};

exports.getGroups = async (req, res) => {
  try {
    await markOverdueItems().catch(e => console.error('markOverdueItems error:', e.message));
    const where = {};
    if (req.user.role === 'COORDINATOR') {
      const { where: scopedWhere } = await buildGroupWhereForCoordinator(req.user, where);
      Object.assign(where, scopedWhere);
    }
    if (req.query.announcementId) where.announcementId = Number(req.query.announcementId);
    if (req.query.status) where.status = req.query.status;
    const groups = await prisma.projectGroup.findMany({
      where,
      include: {
        members: { include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
        evaluations: true,
        evaluationComponents: true,
        proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } }, commentedBy: { select: { id: true, firstName: true, lastName: true, role: true } } }, orderBy: { createdAt: 'desc' } },
        examinerAssignments: { include: { externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true, active: true } } } },
      },
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getGroup = async (req, res) => {
  try {
    await markOverdueItems().catch(e => console.error('markOverdueItems error:', e.message));
    const group = await prisma.projectGroup.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        members: { include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
        evaluations: {
          include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } },
        },
        evaluationComponents: true,
        proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } }, commentedBy: { select: { id: true, firstName: true, lastName: true, role: true } } }, orderBy: { createdAt: 'desc' } },
        recommendations: true,
        examinerAssignments: { include: { externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true, active: true } } } },
      },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (req.user.role === 'COORDINATOR') {
      const { scope } = await buildGroupWhereForCoordinator(req.user);
      if (scope.kind === 'program') {
        if (group.programId !== scope.program.id) {
          return res.status(403).json({ error: 'Access denied. Group belongs to another program.' });
        }
      } else if (scope.kind === 'department') {
        const programIds = scope.programs.map(p => p.id);
        if (!programIds.includes(group.programId)) {
          return res.status(403).json({ error: 'Access denied. Group belongs to another department program.' });
        }
      } else if (scope.kind === 'none') {
        return res.status(403).json({ error: 'Access denied. No coordinator scope.' });
      }
    }
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createGroup = async (req, res) => {
  try {
    const { name, projectTitle, supervisorId, students, projectType, programId, batch, status } = req.body;
    if (!name || !projectTitle) {
      return res.status(400).json({ error: 'name and projectTitle are required' });
    }
    if (typeof name !== 'string' || name.length > 100) {
      return res.status(400).json({ error: 'name must be a string with max 100 characters' });
    }

    let resolvedProgramId = programId ? parseInt(programId) : null;
    if (students && students.length > 0 && !resolvedProgramId) {
      const firstStudentId = students.find(s => s.studentId);
      if (firstStudentId) {
        const firstUser = await prisma.user.findUnique({ where: { id: parseInt(firstStudentId.studentId) }, select: { programId: true } });
        resolvedProgramId = firstUser?.programId;
      }
    }

    const group = await prisma.projectGroup.create({
      data: {
        name,
        projectTitle,
        projectType: projectType || 'MINOR',
        batch: batch || null,
        startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
        supervisorId: supervisorId ? parseInt(supervisorId) : null,
        programId: resolvedProgramId,
        status: status || 'ACTIVE',
      },
    });
    if (students && students.length > 0) {
      let groupProgram = null;
      if (resolvedProgramId) {
        groupProgram = await prisma.program.findUnique({ where: { id: resolvedProgramId } });
      }
      for (const st of students) {
        const fn = (st.firstName || '').trim();
        const ln = (st.lastName || '').trim();
        const roll = (st.rollNumber || '').trim();
        if (!fn && !roll && !st.studentId) continue;

        let student;
        if (st.studentId) {
          student = await prisma.user.findUnique({ where: { id: parseInt(st.studentId) } });
          if (!student) return res.status(400).json({ error: `Student with id ${st.studentId} not found` });
          if (groupProgram && student.programId && student.programId !== groupProgram.id) {
            return res.status(400).json({
              error: `Student ${student.firstName} ${student.lastName} is from program ${student.programId} but group is from program ${groupProgram.code}. Same-program grouping required.`,
            });
          }
        } else {
          const email = `${roll.toLowerCase() || `${fn.toLowerCase()}.${ln.toLowerCase()}`}@pcampus.edu.np`;
          student = await prisma.user.findFirst({ where: { email } });
          if (!student) {
            const nameWhere = { firstName: fn, lastName: ln, role: 'STUDENT', active: true };
            if (groupProgram) nameWhere.programId = groupProgram.id;
            const matched = await prisma.user.findFirst({ where: nameWhere, orderBy: { createdAt: 'asc' } });
            if (matched) {
              student = matched;
            } else {
              const hash = await bcrypt.hash('subesh', 10);
              student = await prisma.user.create({
                data: { email, password: hash, firstName: fn || 'Student', lastName: ln || roll, role: 'STUDENT', degreeType: 'BACHELOR', programId: resolvedProgramId, departmentId: req.user.departmentId },
              });
            }
          }
        }
        await prisma.groupMember.create({
          data: { studentId: student.id, groupId: group.id, rollNumber: roll || `R${student.id}` },
        });
      }
    }
    const defaults = getDefaultComponents(projectType || 'MINOR');
    for (const comp of defaults) {
      await prisma.evaluationComponent.create({
        data: { ...comp, groupId: group.id, createdById: req.user.id },
      });
    }
    const created = await prisma.projectGroup.findUnique({
      where: { id: group.id },
      include: {
        members: { include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
    });
    if (group.announcementId) {
      await markOverdueItems().catch(e => console.error('markOverdueItems error:', e.message));
    }
    audit.log({ action: 'CREATE', entity: 'ProjectGroup', entityId: group.id, details: `Created group "${group.name}"`, performedById: req.user.id });
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

function parseName(inputName) {
  if (!inputName || !inputName.trim()) return { firstName: '', lastName: '', designation: '' };
  const titleRegex = /^((Assoc\.\s*Prof\.|Asst\.\s*Prof\.|Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.|Er\.)\s*\.?\s*)/i;
  let cleaned = inputName.trim();
  let title = '';
  let m;
  while ((m = titleRegex.exec(cleaned)) !== null) {
    title += m[1];
    cleaned = cleaned.slice(m[0].length).trim();
  }
  const designation = title.trim().replace(/\.\s+/g, '. ').trim();
  if (!cleaned) return { firstName: title.trim() || inputName.trim(), lastName: '', designation };
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '', designation };
  return { firstName: parts[0], lastName: parts.slice(1).join(' '), designation };
}

function generateEmail(firstName, lastName, role) {
  const ln = lastName || firstName;
  const base = `${firstName.toLowerCase()}.${ln.toLowerCase()}`.replace(/[^a-z.]/g, '');
  const suffix = role === 'SUPERVISOR' ? 'sup' : 'ext';
  return `${base}.${suffix}@pcampus.edu.np`;
}

exports.bulkImportPreview = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const deptId = req.user.departmentId;
    const coordinatorProgram = req.user.role === 'COORDINATOR'
      ? await prisma.program.findUnique({ where: { coordinatorId: req.user.id } })
      : null;
    const [allStudents, allSupervisors, allExaminers, existingGroups] = await Promise.all([
      prisma.user.findMany({ where: { role: 'STUDENT', departmentId: deptId }, select: { id: true, firstName: true, lastName: true, email: true, rollNumber: true, programId: true } }),
      prisma.user.findMany({ where: { role: 'SUPERVISOR', departmentId: deptId }, select: { id: true, firstName: true, lastName: true, email: true } }),
      prisma.user.findMany({ where: { role: 'EXTERNAL_EXAMINER', departmentId: deptId }, select: { id: true, firstName: true, lastName: true, email: true } }),
      prisma.projectGroup.findMany({
        where: { status: { not: 'COMPLETED' } },
        select: {
          id: true,
          name: true,
          projectTitle: true,
          members: { select: { studentId: true } },
        },
      }),
    ]);

    const preview = [];
    let matchCount = 0;
    let unmatchCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const groupName = (row['Group Name'] || row['groupName'] || '').toString().trim();
      const projectTitle = (row['Project Title'] || row['projectTitle'] || '').toString().trim();
      const memberNames = (row['Members'] || row['memberNames'] || '').toString().trim();
      const rollNumbers = (row['Roll Numbers'] || row['rollNumbers'] || '').toString().trim();
      let batch = (row['Batch'] || row['batch'] || row['Academic Year'] || row['academicYear'] || row['Academic Year'] || '').toString().trim();
      const supervisorName = (row['Supervisor'] || row['supervisor'] || '').toString().trim();
      const examinerName = (row['External Examiner'] || row['examiner'] || '').toString().trim();

      if (!groupName && !projectTitle && !memberNames) continue;

      const warnings = [];
      const names = memberNames.split(',').map(s => s.trim()).filter(Boolean);
      const rolls = rollNumbers.split(',').map(s => s.trim()).filter(Boolean);

      const studentMatches = [];
      for (let j = 0; j < Math.max(names.length, rolls.length); j++) {
        const name = names[j] || '';
        const roll = rolls[j] || '';
        let match = null;
        if (roll) {
          const byRoll = allStudents.find(s => s.rollNumber && s.rollNumber.toLowerCase() === roll.toLowerCase());
          if (byRoll) match = { user: byRoll, score: 1.0, method: 'roll' };
        }
        if (match) {
          studentMatches.push(match);
          matchCount++;
          if (coordinatorProgram && match.user.programId && match.user.programId !== coordinatorProgram.id) {
            warnings.push(`Student "${name}" belongs to another program`);
          }
        } else {
          studentMatches.push(null);
          unmatchCount++;
          warnings.push(`Student not found for "${name}" (roll: ${roll})`);
        }
      }

      let resolvedProgramId = null;
      if (studentMatches.length > 0) {
        const firstMatch = studentMatches.find(m => m);
        if (firstMatch) resolvedProgramId = firstMatch.user.programId;
      }
      if (!resolvedProgramId && rolls.length > 0) {
        const rollMatch = rolls[0].match(/^\d{3}([A-Za-z.]+)\d{3}$/);
        if (rollMatch) {
          const progCode = rollMatch[1].toUpperCase();
          const prog = await prisma.program.findFirst({ where: { code: progCode } });
          if (prog) resolvedProgramId = prog.id;
        }
      }

      if (!batch) {
        const firstMatch = studentMatches.find(m => m);
        if (firstMatch?.user?.rollNumber) {
          const rollMatch = firstMatch.user.rollNumber.match(/^(\d{2,3})/);
          if (rollMatch) batch = rollMatch[1];
        } else if (rolls.length > 0) {
          const rollMatch = rolls[0].match(/^(\d{2,3})/);
          if (rollMatch) batch = rollMatch[1];
        }
      }
      batch = normalizeBatch(batch);

      let supervisorMatch = null;
      let supervisorWillCreate = null;
      if (supervisorName) {
        supervisorMatch = fuzzyMatch(supervisorName, allSupervisors, 0.5);
        if (!supervisorMatch) {
          const parsed = parseName(supervisorName);
          supervisorWillCreate = { firstName: parsed.firstName, lastName: parsed.lastName, name: supervisorName, designation: parsed.designation };
          warnings.push(`Supervisor "${supervisorName}" will be auto-created`);
        }
      }

      let examinerMatch = null;
      let examinerWillCreate = null;
      if (examinerName) {
        examinerMatch = fuzzyMatch(examinerName, allExaminers, 0.5);
        if (!examinerMatch) {
          const parsed = parseName(examinerName);
          examinerWillCreate = { firstName: parsed.firstName, lastName: parsed.lastName, name: examinerName, designation: parsed.designation };
          warnings.push(`External Examiner "${examinerName}" will be auto-created`);
        }
      }

      // Auto-detect project type from student batch/year
      const { currentYear } = batch ? computeCurrentYearSemesterFromBatch(batch, 'BACHELOR') : { currentYear: null };
      let projectType = (currentYear && currentYear >= 4) ? 'MAJOR' : 'MINOR';

      // ── Anomaly detection ────────────────────────────────
      const anomalies = [];
      const matchedIds = studentMatches.filter(Boolean).map(m => m.user.id);

      // Check intra-upload: does this student appear in an earlier row?
      for (const sid of matchedIds) {
        const earlierRow = preview.find(p =>
          p.studentMatches?.some(sm => sm?.id === sid)
        );
        if (earlierRow) {
          anomalies.push({ type: 'student_in_group', studentId: sid, existingGroupName: earlierRow.groupName, message: `Student (ID: ${sid}) also appears in row ${earlierRow.row} — group "${earlierRow.groupName}"` });
        }
      }

      if (groupName) {
        const nameDup = existingGroups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
        if (nameDup) {
          const sameMembers = nameDup.members.every(m => matchedIds.includes(m.studentId)) && matchedIds.every(id => nameDup.members.some(m => m.studentId === id));
          const sameTitle = nameDup.projectTitle?.toLowerCase() === projectTitle.toLowerCase();
          if (sameMembers && sameTitle) {
            anomalies.push({ type: 'exact_duplicate', existingId: nameDup.id, message: `Exact duplicate of existing group "${nameDup.name}"` });
          } else {
            anomalies.push({ type: 'group_name_exists', existingId: nameDup.id, existingName: nameDup.name, message: `Group name "${groupName}" already exists (ID: ${nameDup.id})` });
          }
        }
      }

      // Check if any student is already in another active group
      for (const sid of matchedIds) {
        const otherGroup = existingGroups.find(g => g.members.some(m => m.studentId === sid) && g.name.toLowerCase() !== (groupName || '').toLowerCase());
        if (otherGroup) {
          anomalies.push({ type: 'student_in_group', studentId: sid, existingGroupName: otherGroup.name, message: `Student (ID: ${sid}) is already in group "${otherGroup.name}"` });
        }
      }

      const orgWarnings = [...warnings];
      if (anomalies.length) {
        warnings.push(...anomalies.map(a => a.message));
      }

      preview.push({
        row: i + 1,
        groupName: groupName || '(unnamed)',
        projectTitle,
        projectType,
        members: names,
        rolls,
        batch,
        programId: resolvedProgramId,
        studentMatches: studentMatches.map(m => m ? { id: m.user.id, name: `${m.user.firstName} ${m.user.lastName}`, score: m.score, status: 'matched' } : null),
        supervisorMatch: supervisorMatch ? { id: supervisorMatch.user.id, name: `${supervisorMatch.user.firstName} ${supervisorMatch.user.lastName}`, score: supervisorMatch.score, status: 'matched' } : null,
        supervisorWillCreate,
        examinerMatch: examinerMatch ? { id: examinerMatch.user.id, name: `${examinerMatch.user.firstName} ${examinerMatch.user.lastName}`, score: examinerMatch.score, status: 'matched' } : null,
        examinerWillCreate,
        warnings,
        anomalies,
      });
    }

    res.json({
      preview,
      stats: { total: preview.length, matched: matchCount, unmatched: unmatchCount },
    });
  } catch (error) {
    console.error('bulkImportPreview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.bulkImportConfirm = async (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows array is required' });
    }

    const created = [];
    const skipped = [];

    const autoCreateUser = async (willCreate, role) => {
      if (!willCreate) return null;
      try {
        const email = generateEmail(willCreate.firstName, willCreate.lastName, role === 'SUPERVISOR' ? 'SUPERVISOR' : 'EXTERNAL_EXAMINER');
        const hash = await bcrypt.hash('subesh', 10);
        const newUser = await prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            email,
            password: hash,
            firstName: willCreate.firstName,
            lastName: willCreate.lastName || willCreate.firstName,
            role,
            designation: willCreate.designation || null,
            departmentId: req.user.departmentId,
            active: true,
          },
        }).catch(() => null);
        if (newUser) {
          audit.log({ action: 'AUTO_CREATE', entity: 'User', entityId: newUser.id, details: `Auto-created ${role} via bulk import` });
          emailService.notifyUserCreated(email, willCreate.firstName, role, email, 'subesh');
          return newUser.id;
        }
      } catch (e) {
        console.error(`auto-create ${role} error:`, e.message);
      }
      return null;
    };

    for (const row of rows) {
      const {
        _action,
        _edits,
        groupName: origGroupName,
        projectTitle: origProjectTitle,
        projectType: origProjectType,
        members, rolls,
        batch: origBatch,
        programId: origProgramId,
        studentMatches, supervisorMatch, supervisorWillCreate,
        examinerMatch, examinerWillCreate,
      } = row;

      // Respect skip / delete action
      if (_action === 'skip') {
        skipped.push({ row: row.row, reason: 'Skipped by user' });
        continue;
      }

      // Apply edits
      const groupName = _edits?.groupName ?? origGroupName;
      const projectTitle = _edits?.projectTitle ?? origProjectTitle;
      const projectType = _edits?.projectType ?? origProjectType;
      const batch = normalizeBatch(_edits?.batch ?? origBatch);
      const programId = _edits?.programId ?? origProgramId;

      if (!groupName || !projectTitle) {
        skipped.push({ row: row.row, reason: 'No group name or project title' });
        continue;
      }

      const matchedStudents = [];
      const resolvedRolls = [...(rolls || [])];
      const studentWillCreate = _edits?.students || {};
      for (let j = 0; j < (studentMatches || []).length; j++) {
        const sm = studentMatches[j];
        const se = studentWillCreate[j];
        if (se?.roll && resolvedRolls[j] !== se.roll) {
          resolvedRolls[j] = se.roll;
        }
        if (sm?.id) {
          matchedStudents.push(sm.id);
        } else if (se?.firstName && se?.lastName && resolvedRolls[j]) {
          const email = resolvedRolls[j].toLowerCase() + '@pcampus.edu.np';
          const hash = await bcrypt.hash('subesh', 10);
          const batchMatch = resolvedRolls[j].match(/^(\d{2,3})/);
          const newStudent = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
              email,
              password: hash,
              firstName: se.firstName,
              lastName: se.lastName,
              role: 'STUDENT',
              rollNumber: resolvedRolls[j],
              batch: batchMatch ? batchMatch[1] : null,
              degreeType: 'BACHELOR',
              programId: programId || undefined,
              departmentId: req.user.departmentId,
              active: true,
            },
          }).catch(() => null);
          if (newStudent) {
            matchedStudents.push(newStudent.id);
            audit.log({ action: 'AUTO_CREATE', entity: 'User', entityId: newStudent.id, details: `Auto-created STUDENT via bulk import` });
            emailService.notifyUserCreated(email, se.firstName, 'STUDENT', email, 'subesh');
          } else {
            skipped.push({ row: row.row, reason: `Student at position ${j + 1} could not be created` });
          }
        } else {
          skipped.push({ row: row.row, reason: `Student at position ${j + 1} could not be matched` });
        }
      }

      if (matchedStudents.length === 0) {
        skipped.push({ row: row.row, reason: 'No students could be matched' });
        continue;
      }

      let resolvedSupervisorId = supervisorMatch?.id || null;
      if (resolvedSupervisorId) {
        const sup = await prisma.user.findUnique({ where: { id: resolvedSupervisorId }, select: { role: true } });
        if (sup && sup.role !== 'SUPERVISOR') {
          skipped.push({ row: row.row, reason: `Matched supervisor "${supervisorMatch?.name}" is not a SUPERVISOR` });
          continue;
        }
      }
      if (!resolvedSupervisorId && supervisorWillCreate) {
        resolvedSupervisorId = await autoCreateUser(supervisorWillCreate, 'SUPERVISOR');
      }

      let resolvedExaminerId = examinerMatch?.id || null;
      if (resolvedExaminerId) {
        const exam = await prisma.user.findUnique({ where: { id: resolvedExaminerId }, select: { role: true } });
        if (exam && exam.role !== 'EXTERNAL_EXAMINER') {
          skipped.push({ row: row.row, reason: `Matched examiner "${examinerMatch?.name}" is not an EXTERNAL_EXAMINER` });
          continue;
        }
      }
      if (!resolvedExaminerId && examinerWillCreate) {
        resolvedExaminerId = await autoCreateUser(examinerWillCreate, 'EXTERNAL_EXAMINER');
      }

      const group = await prisma.$transaction(async (tx) => {
        const dup = await tx.projectGroup.findFirst({
          where: { name: { equals: groupName.trim(), mode: 'insensitive' } },
        });
        if (dup) {
          skipped.push({ row: row.row, reason: `Group "${groupName}" already exists` });
          return null;
        }

        // Re-check that no matched student is already in another active group
        const existingMemberships = await tx.groupMember.findMany({
          where: { studentId: { in: matchedStudents }, group: { status: { not: 'COMPLETED' } } },
          include: { group: { select: { name: true } } },
        });
        if (existingMemberships.length > 0) {
          const names = existingMemberships.map(m => `student ${m.studentId} in "${m.group.name}"`).join(', ');
          skipped.push({ row: row.row, reason: `Student(s) already in another active group: ${names}` });
          return null;
        }

        const pt = (projectType === 'MAJOR' || projectType === 'MINOR') ? projectType : 'MINOR';
        const newGroup = await tx.projectGroup.create({
          data: {
            name: groupName,
            projectTitle,
            projectType: pt,
            status: 'ACTIVE',
            batch: batch || null,
            programId: programId || null,
            supervisorId: resolvedSupervisorId,
          },
        });

        const defaults = getDefaultComponents(pt);
        for (const comp of defaults) {
          await tx.evaluationComponent.create({
            data: { ...comp, groupId: newGroup.id, createdById: req.user.id },
          });
        }

        for (let j = 0; j < matchedStudents.length; j++) {
          const studentId = matchedStudents[j];
          const roll = (resolvedRolls && resolvedRolls[j]) || `R${studentId}`;
          await tx.groupMember.create({
            data: { studentId, groupId: newGroup.id, rollNumber: roll },
          });
        }

        if (resolvedExaminerId) {
          await tx.examinerAssignment.create({
            data: {
              externalExaminerId: resolvedExaminerId,
              groupId: newGroup.id,
              assignedById: req.user.id,
            },
          }).catch(() => {});
        }

        try {
          const activeAnnouncement = await tx.announcement.findFirst({
            where: { type: { in: ['MINOR', 'MAJOR', 'GROUP'] } },
            orderBy: { createdAt: 'desc' },
          });
          if (activeAnnouncement) {
            await tx.projectGroup.update({
              where: { id: newGroup.id },
              data: { announcementId: activeAnnouncement.id },
            });
          }
        } catch (e) { /* ignore */ }

        created.push(newGroup);
        return newGroup;
      });

      // --- Notifications ---
      if (group) {
        try {
          const studentRecords = await prisma.user.findMany({
            where: { id: { in: matchedStudents } },
            select: { id: true, email: true, firstName: true, lastName: true },
          });
          const studentEmails = studentRecords.map(s => s.email).filter(Boolean);
          const memberDetails = studentRecords.map((s, idx) =>
            `${s.firstName} ${s.lastName} (${(rolls && rolls[idx]) || ''})`
          ).join(', ');

          const assignerName = `${req.user.firstName} ${req.user.lastName}`.trim() || 'Coordinator';

          // In-app
          notifSvc.notifyMany(matchedStudents, 'GROUP_CREATED',
            `Your group "${groupName}" for project "${projectTitle}" has been created.`);

          if (resolvedSupervisorId) {
            notifSvc.notify(resolvedSupervisorId, 'SUPERVISOR_ASSIGNMENT',
              `${assignerName} assigned you as supervisor for group "${groupName}" — project "${projectTitle}". Members: ${memberDetails}`);
          }

          if (resolvedExaminerId) {
            notifSvc.notify(resolvedExaminerId, 'EXAMINER_ASSIGNMENT',
              `${assignerName} assigned you as Internal Examiner for group "${groupName}" — project "${projectTitle}".`);
          }

          // Emails
          if (studentEmails.length) {
            let supName = null;
            if (resolvedSupervisorId) {
              if (supervisorMatch) supName = supervisorMatch.name;
              else if (supervisorWillCreate) supName = `${supervisorWillCreate.firstName} ${supervisorWillCreate.lastName}`.trim();
            }
            emailService.notifyGroupCreated(studentEmails, groupName, projectTitle, supName, memberDetails);
          }

          if (resolvedSupervisorId) {
            const sup = await prisma.user.findUnique({ where: { id: resolvedSupervisorId }, select: { email: true, firstName: true, lastName: true } });
            if (sup) {
              emailService.notifySupervisorAssigned(
                sup.email, `${sup.firstName} ${sup.lastName}`, groupName, projectTitle,
                studentRecords.map((s, idx) => ({ firstName: s.firstName, lastName: s.lastName, rollNumber: (rolls && rolls[idx]) || '' }))
              );
            }
          }

          if (resolvedExaminerId) {
            const exam = await prisma.user.findUnique({ where: { id: resolvedExaminerId }, select: { email: true, firstName: true, lastName: true } });
            if (exam) {
              emailService.notifyExaminerAssigned(exam.email, `${exam.firstName} ${exam.lastName}`, projectTitle, groupName, 'group');
            }
          }
        } catch (e) {
          console.error('notifications for group:', groupName, e.message);
        }
      }
    }

    audit.log({ action: 'CREATE', entity: 'ProjectGroup', details: `Bulk imported ${created.length} groups${skipped.length ? `, ${skipped.length} skipped` : ''}`, performedById: req.user.id });

    res.status(201).json({
      message: `${created.length} groups imported${skipped.length ? `, ${skipped.length} skipped` : ''}`,
      created: created.length,
      skipped: skipped.length ? skipped : undefined,
    });
  } catch (error) {
    console.error('bulkImportConfirm error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.assignSupervisor = async (req, res) => {
  try {
    const { id } = req.params;
    const { supervisorId } = req.body;
    const group = await prisma.projectGroup.update({
      where: { id: parseInt(id) },
      data: { supervisorId: parseInt(supervisorId) },
      include: {
        members: { include: { student: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
      },
    });
    const sup = group.supervisor;
    if (sup) {
      emailService.notifySupervisorAssigned(
        sup.email, `${sup.firstName} ${sup.lastName}`, group.name, group.projectTitle, group.members.map(m => ({ firstName: m.student.firstName, lastName: m.student.lastName, rollNumber: m.rollNumber }))
      );
    }
    const studentEmails = group.members.map(m => m.student.email).filter(Boolean);
    if (studentEmails.length && sup) {
      emailService.notifyStudentsSupervisorAssigned(
        studentEmails, group.name, group.projectTitle, `${sup.firstName} ${sup.lastName}`
      );
    }
    try {
      const assigner = await prisma.user.findUnique({ where: { id: req.user.id }, select: { firstName: true, lastName: true } });
      const assignerName = assigner ? `${assigner.firstName} ${assigner.lastName}` : 'Coordinator';
      const studentIds = group.members.map(m => m.studentId);
      await notifSvc.notifySupervisorAssignment({
        supervisorId: sup?.id, itemTitle: group.projectTitle, type: 'group', assignerName, studentIds,
      });
    } catch (e) { console.error('notifySupervisorAssignment:', e.message); }
    audit.log({ action: 'ASSIGN_SUPERVISOR', entity: 'ProjectGroup', entityId: group.id, details: `Assigned supervisor to "${group.projectTitle}"`, performedById: req.user.id });
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateGroupStatus = async (req, res) => {
  try {
    const oldGroup = await prisma.projectGroup.findUnique({ where: { id: parseInt(req.params.id) }, select: { status: true, projectTitle: true } });
    const group = await prisma.projectGroup.update({
      where: { id: parseInt(req.params.id) },
      data: { status: req.body.status },
    });
    if (oldGroup && oldGroup.status !== req.body.status) {
      try {
        await notifSvc.notifyStatusChange({
          groupId: group.id, oldStatus: oldGroup.status, newStatus: req.body.status,
          itemTitle: oldGroup.projectTitle, changerId: req.user.id,
        });
      } catch (e) { console.error('notifyStatusChange:', e.message); }
    }
    audit.log({ action: 'UPDATE_STATUS', entity: 'ProjectGroup', entityId: group.id, details: `Status ${oldGroup?.status} → ${group.status} for "${oldGroup?.projectTitle}"`, performedById: req.user.id });
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateEvaluationComponent = async (req, res) => {
  try {
    const component = await prisma.evaluationComponent.update({
      where: { id: parseInt(req.params.id) },
      data: { name: req.body.name, maxMarks: parseFloat(req.body.maxMarks) },
    });
    audit.log({ action: 'UPDATE', entity: 'EvaluationComponent', entityId: component.id, details: `Updated component "${component.name}"`, performedById: req.user.id });
    res.json(component);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.exportGroups = async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const where = {};
    if (req.user.role === 'COORDINATOR') {
      const { where: scopedWhere } = await buildGroupWhereForCoordinator(req.user, where);
      Object.assign(where, scopedWhere);
    }
    const groups = await prisma.projectGroup.findMany({
      where,
      include: {
        members: { include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    const rows = groups.map(g => ({
      'Group Name': g.name,
      'Project Title': g.projectTitle,
      'Project Type': g.projectType,
      Status: g.status,
      Supervisor: g.supervisor ? `${g.supervisor.firstName} ${g.supervisor.lastName}` : 'Not assigned',
      Batch: g.batch || '',
      Students: g.members.map(m => `${m.student.firstName} ${m.student.lastName}`).join(', '),
      RollNumbers: g.members.map(m => m.rollNumber).join(', '),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Groups');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=groups.xlsx');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.send(buf);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.bulkAssignSupervisor = async (req, res) => {
  try {
    const { groupIds, supervisorId } = req.body;
    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      return res.status(400).json({ success: false, error: 'groupIds must be a non-empty array' });
    }
    if (!supervisorId) return res.status(400).json({ success: false, error: 'supervisorId is required' });
    const ids = groupIds.map(id => parseInt(id));
    const supId = parseInt(supervisorId);
    const supervisor = await prisma.user.findUnique({ where: { id: supId } });
    if (!supervisor || supervisor.role !== 'SUPERVISOR') {
      return res.status(400).json({ success: false, error: 'Invalid supervisor' });
    }

    // Fetch groups with members before update
    const groups = await prisma.projectGroup.findMany({
      where: { id: { in: ids } },
      include: { members: { include: { student: true } } },
    });

    const result = await prisma.projectGroup.updateMany({
      where: { id: { in: ids } },
      data: { supervisorId: supId },
    });

    // Notifications per group
    const assignerName = `${req.user.firstName} ${req.user.lastName}`.trim() || 'Coordinator';
    for (const group of groups) {
      const studentIds = group.members.map(m => m.studentId);
      const studentEmails = group.members.map(m => m.student.email).filter(Boolean);
      const memberDetails = group.members.map(m =>
        `${m.student.firstName} ${m.student.lastName} (${m.rollNumber || ''})`
      ).join(', ');

      // In-app
      notifSvc.notifyMany(studentIds, 'SUPERVISOR_ASSIGNMENT',
        `${assignerName} assigned supervisor "${supervisor.firstName} ${supervisor.lastName}" to group "${group.name}".`);
      notifSvc.notify(supId, 'SUPERVISOR_ASSIGNMENT',
        `${assignerName} assigned you as supervisor for group "${group.name}". Members: ${memberDetails}`);

      // Emails
      emailService.notifySupervisorAssigned(
        supervisor.email, `${supervisor.firstName} ${supervisor.lastName}`,
        group.name, group.projectTitle,
        group.members.map(m => ({ firstName: m.student.firstName, lastName: m.student.lastName, rollNumber: m.rollNumber || '' }))
      );
      if (studentEmails.length) {
        emailService.notifyStudentsSupervisorAssigned(
          studentEmails, group.name, group.projectTitle,
          `${supervisor.firstName} ${supervisor.lastName}`
        );
      }
    }

    audit.log({ action: 'BULK_ASSIGN_SUPERVISOR', entity: 'ProjectGroup', details: `Assigned supervisor ${supId} to ${ids.length} groups`, performedById: req.user.id });
    res.json({ success: true, data: { updated: result.count } });
  } catch (error) {
    console.error('bulkAssignSupervisor error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const group = await prisma.projectGroup.findUnique({
      where: { id },
      include: {
        proposals: true,
        evaluations: true,
        members: { include: { student: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        examinerAssignments: { include: { externalExaminer: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.status !== 'PENDING' && (group.proposals.length > 0 || group.evaluations.length > 0)) {
      return res.status(400).json({ error: 'Cannot delete: group has files uploaded or evaluations completed' });
    }

    // Notify before deletion
    const studentIds = group.members.map(m => m.studentId);
    notifSvc.notifyMany(studentIds, 'GROUP_DELETED', `Your group "${group.name}" has been deleted by coordinator.`);
    if (group.supervisorId) {
      notifSvc.notify(group.supervisorId, 'GROUP_DELETED', `Group "${group.name}" you supervised has been deleted.`);
    }
    for (const ea of group.examinerAssignments) {
      notifSvc.notify(ea.externalExaminer.id, 'EXAMINER_REMOVED', `Your assignment to group "${group.name}" has been removed.`);
    }

    await prisma.$transaction([
      prisma.groupMember.deleteMany({ where: { groupId: id } }),
      prisma.evaluation.deleteMany({ where: { groupId: id } }),
      prisma.evaluationComponent.deleteMany({ where: { groupId: id } }),
      prisma.proposal.deleteMany({ where: { groupId: id } }),
      prisma.examinerAssignment.deleteMany({ where: { groupId: id } }),
      prisma.groupInvitation.deleteMany({ where: { groupId: id } }),
      prisma.recommendation.deleteMany({ where: { groupId: id } }),
      prisma.projectGroup.delete({ where: { id } }),
    ]);
    audit.log({ action: 'DELETE', entity: 'ProjectGroup', entityId: id, details: `Deleted group "${group.name}"`, performedById: req.user.id });
    res.json({ message: 'Group deleted' });
  } catch (error) {
    console.error('deleteGroup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateGroup = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { projectTitle, description, startDate, endDate } = req.body;
    const data = {};
    if (projectTitle !== undefined) data.projectTitle = projectTitle;
    if (description !== undefined) data.description = description;
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
    const group = await prisma.projectGroup.update({
      where: { id },
      data,
    });
    audit.log({ action: 'UPDATE', entity: 'ProjectGroup', entityId: id, details: `Updated group "${group.name}"`, performedById: req.user.id });
    res.json({ message: 'Group updated', group });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
