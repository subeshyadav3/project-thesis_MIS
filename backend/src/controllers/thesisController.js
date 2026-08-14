const bcrypt = require('bcryptjs');

const XLSX = require('xlsx');
const prisma = require('../utils/prisma');
const emailService = require('../services/emailService');
const notifSvc = require('../services/notificationService');
const audit = require('../services/auditService');
const { getDefaultComponents } = require('../config/evaluationScheme');
const fuzzyMatch = require('../utils/fuzzyMatch');
const { markOverdueItems } = require('../utils/checkOverdue');
const { buildThesisWhereForCoordinator, resolveCoordinatorScope, isThesisVisibleToCoordinator, canManageThesisAsCoordinator } = require('../utils/coordinatorScope');
const { assertValidStatusTransition } = require('../utils/statusTransitions');
const { getEngagement } = require('../services/engagementGuard');

const normalizeBatch = (batch) => {
  if (!batch) return batch;
  const digits = batch.toString().replace(/\D/g, '');
  if (!digits) return batch;
  if (digits.length >= 3) return digits.slice(-3);
  return digits.padStart(3, '0');
};

exports.getTheses = async (req, res) => {
  try {
    // Check for overdue items before fetching
    await markOverdueItems().catch(e => console.error('markOverdueItems error:', e.message));
    const where = {};
    if (req.query.announcementId) where.announcementId = Number(req.query.announcementId);
    if (req.query.status) where.status = req.query.status;
    if (req.user.role === 'COORDINATOR') {
      const { where: scopedWhere } = await buildThesisWhereForCoordinator(req.user, where);
      Object.assign(where, scopedWhere);
    }
    const theses = await prisma.thesis.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true, rollNumber: true, programId: true } },
        program: { select: { id: true, name: true, code: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
        externalMidTerm: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
        externalFinal: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
        evaluations: true,
        evaluationComponents: true,
        proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } }, commentedBy: { select: { id: true, firstName: true, lastName: true, role: true } } }, orderBy: { createdAt: 'desc' } },
        examinerAssignments: { include: { externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true, active: true } } } },
      },
    });
    if (req.user.role === 'COORDINATOR') {
      const scope = await resolveCoordinatorScope(req.user);
      for (const t of theses) {
        t.canManage = await canManageThesisAsCoordinator(t, scope, req.user);
      }
    }
    res.json(theses);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getThesis = async (req, res) => {
  try {
    await markOverdueItems().catch(e => console.error('markOverdueItems error:', e.message));
    const thesis = await prisma.thesis.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true, rollNumber: true, programId: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
        externalMidTerm: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
        externalFinal: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
        evaluations: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } } },
        evaluationComponents: true,
        proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } }, commentedBy: { select: { id: true, firstName: true, lastName: true, role: true } } }, orderBy: { createdAt: 'desc' } },
        recommendations: true,
        examinerAssignments: { include: { externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true, active: true } } } },
      },
    });
    if (!thesis) return res.status(404).json({ error: 'Thesis not found' });

    // Auto-initialize default evaluation components if missing
    if (!thesis.evaluationComponents || thesis.evaluationComponents.length === 0) {
      try {
        const { getDefaultComponents } = require('../config/evaluationScheme');
        const defaults = getDefaultComponents('MASTER');
        for (const comp of defaults) {
          await prisma.evaluationComponent.create({
            data: { ...comp, thesisId: thesis.id, createdById: req.user.id },
          });
        }
        thesis.evaluationComponents = await prisma.evaluationComponent.findMany({ where: { thesisId: thesis.id } });
      } catch (e) {
        console.error('Auto-create evaluation components error:', e.message);
      }
    }

    if (req.user.role === 'COORDINATOR') {
      const scope = await resolveCoordinatorScope(req.user);
      if (!await isThesisVisibleToCoordinator(thesis, scope, req.user)) {
        return res.status(403).json({ error: 'Access denied. Thesis belongs to another program.' });
      }
      // Tell the frontend whether the coordinator may act as coordinator on
      // this thesis (in-scope) or only as the assigned supervisor.
      thesis.canManage = await canManageThesisAsCoordinator(thesis, scope, req.user);
    }
    res.json(thesis);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createThesis = async (req, res) => {
  try {
    const { title, studentId, supervisorId, status } = req.body;
    if (!title || !studentId) {
      return res.status(400).json({ error: 'title and studentId are required' });
    }
    const student = await prisma.user.findUnique({ where: { id: parseInt(studentId) }, include: { program: true } });
    if (!student || student.role !== 'STUDENT' || student.degreeType !== 'MASTER') {
      return res.status(400).json({ error: 'studentId must belong to a master student' });
    }
    const engagement = await getEngagement(student.id);
    if (engagement.engaged) {
      return res.status(409).json({
        error: `Student is already engaged in a ${engagement.type === 'thesis' ? 'thesis' : 'group project'} (${engagement.status}): "${engagement.title}". A student cannot be part of two projects.`,
      });
    }

    // Check if cross-program (student belongs to a different program than the requesting coordinator)
    let isCrossProgram = false;
    let studentCoordinator = null;
    let requestingCoordinatorProgram = null;

    if (req.user.role === 'COORDINATOR') {
      requestingCoordinatorProgram = await prisma.program.findUnique({ where: { coordinatorId: req.user.id } });
      if (requestingCoordinatorProgram && student.programId !== requestingCoordinatorProgram.id) {
        isCrossProgram = true;
        // Find the student's program coordinator (for notification only)
        const studentProgram = await prisma.program.findUnique({ where: { id: student.programId } });
        if (studentProgram?.coordinatorId) {
          studentCoordinator = await prisma.user.findUnique({ where: { id: studentProgram.coordinatorId } });
        }
      }
    }

    // Derive batch from body, student.batch, or student roll number
    let derivedBatch = req.body.batch || student.batch || null;
    if (!derivedBatch && student.rollNumber) {
      const match = student.rollNumber.match(/^(\d{2,3})/);
      if (match) derivedBatch = match[1];
    }

    const supId = supervisorId ? parseInt(supervisorId) : null;
    const thesis = await prisma.thesis.create({
      data: {
        title,
        projectType: 'MASTER',
        studentId: parseInt(studentId),
        supervisorId: supId,
        supervisorAssignmentStatus: supId ? 'PENDING' : null,
        programId: student.programId || requestingCoordinatorProgram?.id || null,
        crossProgramRequestedById: isCrossProgram ? req.user.id : null,
        createdVia: 'MANUAL',
        batch: derivedBatch,
        cluster: req.body.cluster || student.program?.cluster || null,
        startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
        status: status || 'ACTIVE',
      },
    });

    if (supId) {
      try {
        const assignerName = `${req.user.firstName} ${req.user.lastName}`.trim() || 'Coordinator';
        await notifSvc.notify(supId, 'SUPERVISOR_ASSIGNMENT',
          `${assignerName} assigned you as supervisor for "${thesis.title}" (Master Thesis) — pending your acceptance.`, `/theses/${thesis.id}`);
      } catch (e) { console.error('notify supervisor error:', e.message); }
    }
    const defaults = getDefaultComponents('MASTER');
    for (const comp of defaults) {
      await prisma.evaluationComponent.create({
        data: { ...comp, thesisId: thesis.id, createdById: req.user.id },
      });
    }
    // Check if the linked announcement's expirationDate has passed
    if (thesis.announcementId) {
      await markOverdueItems().catch(e => console.error('markOverdueItems error:', e.message));
    }

    // If cross-program, notify the student's coordinator (notification only — no approval)
    if (isCrossProgram && studentCoordinator) {
      const requester = await prisma.user.findUnique({ where: { id: req.user.id } });
      const msg = `${requester.firstName} ${requester.lastName}${requestingCoordinatorProgram ? ` (${requestingCoordinatorProgram.code} coordinator)` : ''} has created a thesis for your student ${student.firstName} ${student.lastName} — "${thesis.title}".`;
      await notifSvc.notify(studentCoordinator.id, 'CROSS_PROGRAM_THESIS_CREATED', msg, `/theses/${thesis.id}`);

      audit.log({ action: 'CROSS_PROGRAM_THESIS', entity: 'Thesis', entityId: thesis.id, details: `Cross-program thesis created for student from ${student.program?.code || 'another program'} by ${requestingCoordinatorProgram?.code || 'another'} coordinator`, performedById: req.user.id });

      return res.status(201).json({ ...thesis, crossProgram: true });
    }

    audit.log({ action: 'CREATE', entity: 'Thesis', entityId: thesis.id, details: `Created thesis "${thesis.title}"`, performedById: req.user.id });
    res.status(201).json(thesis);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Helper: parse a full name string into { firstName, lastName }.
 * e.g. "Dr. Ram Acharya" → { firstName: "Ram", lastName: "Acharya" }
 *      "Hari Pd. Poudel" → { firstName: "Hari", lastName: "Pd. Poudel" }
 */
function parseName(inputName) {
  if (!inputName || !inputName.trim()) return { firstName: '', lastName: '' };
  const titleRegex = /^((Assoc\.\s*Prof\.|Asst\.\s*Prof\.|Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.|Er\.)\s*\.?\s*)/i;
  let cleaned = inputName.trim();
  let title = '';
  let m;
  while ((m = titleRegex.exec(cleaned)) !== null) {
    title += m[1];
    cleaned = cleaned.slice(m[0].length).trim();
  }
  if (!cleaned) return { firstName: title.trim() || inputName.trim(), lastName: '' };
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/**
 * Helper: generate a simple email from a name for auto-created users.
 */
function generateEmail(firstName, lastName, role) {
  const parsed = parseName(`${firstName} ${lastName || ''}`.trim());
  const fn = (parsed.firstName || firstName).toLowerCase().replace(/[^a-z]/g, '');
  const ln = (parsed.lastName || lastName || fn).toLowerCase().replace(/[^a-z]/g, '');
  return `${fn}.${ln}@pcampus.edu.np`;
}

// Step 1: Parse Excel + fuzzy match → return preview
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
    const [allStudents, allSupervisors, allExternals, programs, existingTheses] = await Promise.all([
      prisma.user.findMany({ where: { role: 'STUDENT', departmentId: deptId }, select: { id: true, firstName: true, lastName: true, email: true, rollNumber: true, programId: true } }),
      prisma.user.findMany({ where: { role: 'SUPERVISOR', departmentId: deptId }, select: { id: true, firstName: true, lastName: true, email: true } }),
      prisma.user.findMany({ where: { role: 'EXTERNAL_EXAMINER', departmentId: deptId }, select: { id: true, firstName: true, lastName: true, email: true } }),
      prisma.program.findMany({ where: { departmentId: deptId }, select: { id: true, name: true, code: true, degreeType: true, cluster: true } }),
      prisma.thesis.findMany({
        where: { status: { in: ['PENDING', 'ACTIVE'] } },
        select: { id: true, title: true, studentId: true },
      }),
    ]);

    const preview = [];
    let matchCount = 0;
    let unmatchCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = (row['Name'] || row['name'] || '').toString().trim();
      const roll = (row['Roll'] || row['roll'] || row['Roll Numbers'] || '').toString().trim();
      const title = (row['Title'] || row['title'] || row['Project Title'] || '').toString().trim();
      let batch = (row['Batch'] || row['batch'] || row['Academic Year'] || row['academicYear'] || '').toString().trim();
      const cluster = (row['Cluster'] || row['cluster'] || '').toString().trim();
      const programValue = (row['Program'] || row['program'] || '').toString().trim();
      const supervisorName = (row['Supervisor'] || row['supervisor'] || '').toString().trim();
      const externalMidTermName = (row['External_mid_term'] || row['externalMidTerm'] || '').toString().trim();
      const externalFinalName = (row['External_final'] || row['externalFinal'] || '').toString().trim();

      if (!name && !roll && !title) continue; // skip blank rows

      const warnings = [];
      const importedProgram = programValue
        ? programs.find(p => p.code.toLowerCase() === programValue.toLowerCase() || p.name.toLowerCase() === programValue.toLowerCase())
        : null;
      if (programValue && !importedProgram) warnings.push(`Program not found for "${programValue}"`);

      // Match student by roll only
      let studentMatch = null;
      if (roll) {
        const byRoll = allStudents.find(s => s.rollNumber && s.rollNumber.toLowerCase() === roll.toLowerCase());
        if (byRoll) studentMatch = { user: byRoll, score: 1.0, method: 'roll' };
      }
      if (!studentMatch) {
        unmatchCount++;
      } else {
        matchCount++;
        if (importedProgram && studentMatch.user.programId !== importedProgram.id) {
          warnings.push('Program does not match the matched student');
        }
        if (!batch && studentMatch.user.rollNumber) {
          const rollMatch = studentMatch.user.rollNumber.match(/^(\d{2,3})/);
          if (rollMatch) batch = rollMatch[1];
        }
      }
      if (!batch && roll) {
        const rollMatch = roll.match(/^(\d{2,3})/);
        if (rollMatch) batch = rollMatch[1];
      }
      batch = normalizeBatch(batch);
      // Cross-program detection: roll prefix vs Program column (applies to all rows)
      if (importedProgram && roll) {
        const rollProg = roll.replace(/^\d{2,3}/, '').replace(/\d+$/, '');
        if (rollProg && !rollProg.startsWith(importedProgram.code)) {
          warnings.push(`Roll "${roll}" program code (${rollProg}) does not match selected program (${importedProgram.code})`);
        }
      }
      // Student has no program assigned — e.g. auto-created without programId
      if (coordinatorProgram && studentMatch && !studentMatch.user.programId) {
        warnings.push('Student program not set — will be assigned during import');
      }

      // Match supervisor — if not found, mark for auto-create
      let supervisorMatch = null;
      let supervisorWillCreate = null;
      if (supervisorName) {
        supervisorMatch = fuzzyMatch(supervisorName, allSupervisors, 0.5);
        if (!supervisorMatch) {
          const parsed = parseName(supervisorName);
          supervisorWillCreate = {
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            name: supervisorName,
            designation: parsed.designation,
          };
          warnings.push(`Supervisor "${supervisorName}" will be auto-created`);
        }
      }

      // Match external mid-term — if not found, mark for auto-create
      let externalMidTermMatch = null;
      let externalMidTermWillCreate = null;
      if (externalMidTermName) {
        externalMidTermMatch = fuzzyMatch(externalMidTermName, allExternals, 0.5);
        if (!externalMidTermMatch) {
          const parsed = parseName(externalMidTermName);
          externalMidTermWillCreate = {
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            name: externalMidTermName,
            designation: parsed.designation,
          };
          warnings.push(`External Mid-Term "${externalMidTermName}" will be auto-created`);
        }
      }

      // Match external final — if not found, mark for auto-create
      let externalFinalMatch = null;
      let externalFinalWillCreate = null;
      if (externalFinalName) {
        externalFinalMatch = fuzzyMatch(externalFinalName, allExternals, 0.5);
        if (!externalFinalMatch) {
          const parsed = parseName(externalFinalName);
          externalFinalWillCreate = {
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            name: externalFinalName,
            designation: parsed.designation,
          };
          warnings.push(`External Final "${externalFinalName}" will be auto-created`);
        }
      }

      // ── Anomaly detection ────────────────────────────────
      const anomalies = [];
      if (studentMatch) {
        const sid = studentMatch.user.id;
        const existingDup = existingTheses.find(t => t.studentId === sid && t.title.toLowerCase() === title.toLowerCase());
        if (existingDup) {
          anomalies.push({ type: 'exact_duplicate', existingId: existingDup.id, message: `Exact duplicate — student already has thesis "${existingDup.title}"` });
        } else {
          const existingThesis = existingTheses.find(t => t.studentId === sid);
          if (existingThesis) {
            anomalies.push({ type: 'student_in_thesis', existingId: existingThesis.id, existingTitle: existingThesis.title, message: `Student already has active thesis "${existingThesis.title}"` });
          }
        }
      }

      if (anomalies.length) {
        warnings.push(...anomalies.map(a => a.message));
      }

      preview.push({
        row: i + 1,
        name,
        roll,
        title,
        batch,
        cluster,
        program: importedProgram ? { id: importedProgram.id, code: importedProgram.code, name: importedProgram.name, cluster: importedProgram.cluster } : null,
        programId: studentMatch?.user?.programId || null,
        studentMatch: studentMatch ? { id: studentMatch.user.id, name: `${studentMatch.user.firstName} ${studentMatch.user.lastName}`, score: studentMatch.score, status: 'matched' } : null,
        supervisorMatch: supervisorMatch ? { id: supervisorMatch.user.id, name: `${supervisorMatch.user.firstName} ${supervisorMatch.user.lastName}`, score: supervisorMatch.score, status: 'matched' } : null,
        supervisorWillCreate,
        externalMidTermMatch: externalMidTermMatch ? { id: externalMidTermMatch.user.id, name: `${externalMidTermMatch.user.firstName} ${externalMidTermMatch.user.lastName}`, score: externalMidTermMatch.score, status: 'matched' } : null,
        externalMidTermWillCreate,
        externalFinalMatch: externalFinalMatch ? { id: externalFinalMatch.user.id, name: `${externalFinalMatch.user.firstName} ${externalFinalMatch.user.lastName}`, score: externalFinalMatch.score, status: 'matched' } : null,
        externalFinalWillCreate,
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

// Step 2: Confirm import → create theses + assignments
exports.bulkImportConfirm = async (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows array is required' });
    }

    const created = [];
    const skipped = [];
    const coordinatorProgram = req.user.role === 'COORDINATOR'
      ? await prisma.program.findUnique({ where: { coordinatorId: req.user.id } })
      : null;

    for (const row of rows) {
      const {
        _action,
        _edits,
        studentMatch, supervisorMatch, supervisorWillCreate,
        externalMidTermMatch, externalMidTermWillCreate,
        externalFinalMatch, externalFinalWillCreate,
        title: origTitle, batch: origBatch, cluster: origCluster,
      } = row;

      // Respect skip / delete action
      if (_action === 'skip') {
        skipped.push({ row: row.row, reason: 'Skipped by user' });
        continue;
      }

      // Apply edits
      const title = _edits?.title ?? origTitle;
      const batch = normalizeBatch(_edits?.batch ?? origBatch);
      const cluster = _edits?.cluster ?? origCluster;

      if (!studentMatch?.id && !row.studentMatch?.id) {
        // Try auto-creating the student from _edits.student or row.name
        const willCreate = _edits?.student || (row.name ? parseName(row.name) : null);
        const roll = _edits?.roll || row.roll;
        if (willCreate?.firstName && willCreate?.lastName && roll) {
          const email = roll.toLowerCase() + '@pcampus.edu.np';
          const hash = await bcrypt.hash('Test@123', 10);
          // Derive programId from roll prefix
          const rollProg = roll.replace(/^\d{2,3}/, '').replace(/\d+$/, '');
          const prog = rollProg ? await prisma.program.findFirst({ where: { code: { equals: rollProg, mode: 'insensitive' } } }) : null;
          const newStudent = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
              email,
              password: hash,
              firstName: willCreate.firstName,
              lastName: willCreate.lastName,
              role: 'STUDENT',
              rollNumber: roll,
              degreeType: 'MASTER',
              programId: prog?.id || undefined,
              departmentId: req.user.departmentId,
              active: true,
            },
          }).catch(() => null);
          if (newStudent) {
            row.studentMatch = { id: newStudent.id, name: `${willCreate.firstName} ${willCreate.lastName}` };
            audit.log({ action: 'AUTO_CREATE', entity: 'User', entityId: newStudent.id, details: `Auto-created MASTER student via thesis bulk import` });
            emailService.notifyUserCreated(email, willCreate.firstName, 'STUDENT', email, 'Test@123');
          } else {
            skipped.push({ row: row.row, reason: 'Student could not be auto-created' });
            continue;
          }
        } else {
          skipped.push({ row: row.row, reason: 'No student matched' });
          continue;
        }
      }
      if (!title) {
        skipped.push({ row: row.row, reason: 'No thesis title' });
        continue;
      }

      const effectiveStudentId = studentMatch?.id || row.studentMatch?.id;

      // Helper to auto-create a user and return the ID
      const autoCreateUser = async (willCreate, role) => {
        if (!willCreate) return null;
        try {
          const email = generateEmail(willCreate.firstName, willCreate.lastName, role === 'SUPERVISOR' ? 'SUPERVISOR' : 'EXTERNAL_EXAMINER');
          const hash = await bcrypt.hash('Test@123', 10);
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
            emailService.notifyUserCreated(email, willCreate.firstName, role, email, 'Test@123');
            return newUser.id;
          }
        } catch (e) {
          console.error(`auto-create ${role} error:`, e.message);
        }
        return null;
      };

      // Resolve supervisor: auto-create if needed
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

      // Resolve external mid-term: auto-create if needed
      let resolvedMidTermId = externalMidTermMatch?.id || null;
      if (resolvedMidTermId) {
        const exam = await prisma.user.findUnique({ where: { id: resolvedMidTermId }, select: { role: true } });
        if (exam && exam.role !== 'EXTERNAL_EXAMINER') {
          skipped.push({ row: row.row, reason: `Matched mid-term examiner "${externalMidTermMatch?.name}" is not an EXTERNAL_EXAMINER` });
          continue;
        }
      }
      if (!resolvedMidTermId && externalMidTermWillCreate) {
        resolvedMidTermId = await autoCreateUser(externalMidTermWillCreate, 'EXTERNAL_EXAMINER');
      }

      // Resolve external final: auto-create if needed
      let resolvedFinalId = externalFinalMatch?.id || null;
      if (resolvedFinalId) {
        const exam = await prisma.user.findUnique({ where: { id: resolvedFinalId }, select: { role: true } });
        if (exam && exam.role !== 'EXTERNAL_EXAMINER') {
          skipped.push({ row: row.row, reason: `Matched final examiner "${externalFinalMatch?.name}" is not an EXTERNAL_EXAMINER` });
          continue;
        }
      }
      if (!resolvedFinalId && externalFinalWillCreate) {
        resolvedFinalId = await autoCreateUser(externalFinalWillCreate, 'EXTERNAL_EXAMINER');
      }

      // Wrap the race-condition-prone check+create in a transaction
      const thesis = await prisma.$transaction(async (tx) => {
        const student = await tx.user.findUnique({ where: { id: effectiveStudentId }, include: { program: true } });
        if (!student || student.role !== 'STUDENT' || student.degreeType !== 'MASTER') {
          skipped.push({ row: row.row, reason: 'Matched user is not a master student' });
          return null;
        }

        // Fix student without a programId — derive from roll prefix
        if (!student.programId) {
          const roll = _edits?.roll || row.roll;
          if (roll) {
            const rollProg = roll.replace(/^\d{2,3}/, '').replace(/\d+$/, '');
            if (rollProg) {
              const prog = await tx.program.findFirst({ where: { code: { equals: rollProg, mode: 'insensitive' } } });
              if (prog) {
                await tx.user.update({ where: { id: student.id }, data: { programId: prog.id } });
                student.programId = prog.id;
              }
            }
          }
        }

        // Check for active engagement within the transaction (thesis or group project)
        const activeThesis = await tx.thesis.findFirst({
          where: { studentId: effectiveStudentId, status: { in: ['PENDING', 'ACTIVE', 'OVERDUE'] } },
        });
        const activeMembership = await tx.groupMember.findFirst({
          where: { studentId: effectiveStudentId, group: { status: { in: ['PENDING', 'ACTIVE', 'OVERDUE'] } } },
          select: { group: { select: { id: true, projectTitle: true, status: true } } },
        });
        if (activeThesis || activeMembership) {
          skipped.push({
            row: row.row,
            studentId: effectiveStudentId,
            reason: activeThesis
              ? `Already engaged in thesis: "${activeThesis.title}"`
              : `Already engaged in project: "${activeMembership.group.projectTitle}"`,
          });
          return null;
        }

        // Check for duplicate within the transaction
        const duplicate = await tx.thesis.findFirst({
          where: { title, studentId: effectiveStudentId },
        });
        if (duplicate) {
          skipped.push({ row: row.row, studentId: effectiveStudentId, reason: `Duplicate thesis: "${title}"` });
          return null;
        }

        // All checks passed — create thesis
        const newThesis = await tx.thesis.create({
          data: {
            title,
            projectType: 'MASTER',
            studentId: effectiveStudentId,
            status: 'ACTIVE',
            supervisorId: resolvedSupervisorId,
            externalMidTermId: resolvedMidTermId,
            externalFinalId: resolvedFinalId,
            programId: student.programId || undefined,
            cluster: cluster || student.program?.cluster || null,
            batch: batch || student.batch || null,
            createdVia: 'BULK',
          },
        });

        // Create default evaluation components
        const defaults = getDefaultComponents('MASTER');
        for (const comp of defaults) {
          await tx.evaluationComponent.create({
            data: { ...comp, thesisId: newThesis.id, createdById: req.user.id },
          });
        }

        // Create ExaminerAssignment records for externals
        if (resolvedMidTermId) {
          await tx.examinerAssignment.upsert({
            where: { externalExaminerId_thesisId: { externalExaminerId: resolvedMidTermId, thesisId: newThesis.id } },
            update: {},
            create: { externalExaminerId: resolvedMidTermId, thesisId: newThesis.id, assignedById: req.user.id },
          }).catch(() => {});
        }
        if (resolvedFinalId) {
          await tx.examinerAssignment.upsert({
            where: { externalExaminerId_thesisId: { externalExaminerId: resolvedFinalId, thesisId: newThesis.id } },
            update: {},
            create: { externalExaminerId: resolvedFinalId, thesisId: newThesis.id, assignedById: req.user.id },
          }).catch(() => {});
        }

        // Auto-link to active THESIS announcement
        try {
          const activeAnnouncement = await tx.announcement.findFirst({
            where: { type: 'THESIS', degreeType: 'MASTER' },
            orderBy: { createdAt: 'desc' },
          });
          if (activeAnnouncement) {
            await tx.thesis.update({
              where: { id: newThesis.id },
              data: { announcementId: activeAnnouncement.id },
            });
          }
        } catch (e) { /* ignore announcement linking errors */ }

        created.push(newThesis);
        return newThesis;
      });

      // --- Notifications ---
      if (thesis) {
        try {
          const student = await prisma.user.findUnique({
            where: { id: effectiveStudentId },
            select: { id: true, email: true, firstName: true, lastName: true },
          });
          const studentEmail = student?.email;
          const assignerName = `${req.user.firstName} ${req.user.lastName}`.trim() || 'Coordinator';

          // In-app
          if (student) {
            notifSvc.notify(student.id, 'THESIS_CREATED',
              `Your thesis "${title}" has been created.`);
          }

          if (resolvedSupervisorId) {
            notifSvc.notify(resolvedSupervisorId, 'SUPERVISOR_ASSIGNMENT',
              `${assignerName} assigned you as supervisor for thesis "${title}" — student: ${student?.firstName} ${student?.lastName}.`);
          }

          if (resolvedMidTermId) {
            notifSvc.notify(resolvedMidTermId, 'EXAMINER_ASSIGNMENT',
              `${assignerName} assigned you as Mid-Term Examiner for thesis "${title}" — student: ${student?.firstName} ${student?.lastName}.`);
          }

          if (resolvedFinalId) {
            notifSvc.notify(resolvedFinalId, 'EXAMINER_ASSIGNMENT',
              `${assignerName} assigned you as Final Examiner for thesis "${title}" — student: ${student?.firstName} ${student?.lastName}.`);
          }

          // Emails
          const studentName = student ? `${student.firstName} ${student.lastName}` : '';

          if (studentEmail) {
            let supName = null;
            if (resolvedSupervisorId) {
              if (supervisorMatch) supName = supervisorMatch.name;
              else if (supervisorWillCreate) supName = `${supervisorWillCreate.firstName} ${supervisorWillCreate.lastName}`.trim();
            }
            emailService.notifyThesisCreated(studentEmail, studentName, title, supName, cluster);
          }

          if (resolvedSupervisorId) {
            const sup = await prisma.user.findUnique({ where: { id: resolvedSupervisorId }, select: { email: true, firstName: true, lastName: true } });
            if (sup) {
              emailService.notifySupervisorAssigned(
                sup.email, `${sup.firstName} ${sup.lastName}`,
                studentName, title,
                [{ firstName: student?.firstName || '', lastName: student?.lastName || '', rollNumber: '' }]
              );
            }
          }

          if (resolvedMidTermId) {
            const exam = await prisma.user.findUnique({ where: { id: resolvedMidTermId }, select: { email: true, firstName: true, lastName: true } });
            if (exam) {
              emailService.notifyExaminerAssigned(exam.email, `${exam.firstName} ${exam.lastName}`, title, studentName, 'thesis');
            }
          }

          if (resolvedFinalId) {
            const exam = await prisma.user.findUnique({ where: { id: resolvedFinalId }, select: { email: true, firstName: true, lastName: true } });
            if (exam) {
              emailService.notifyExaminerAssigned(exam.email, `${exam.firstName} ${exam.lastName}`, title, studentName, 'thesis');
            }
          }
        } catch (e) {
          console.error('notifications for thesis:', title, e.message);
        }
      }
    }

    audit.log({ action: 'CREATE', entity: 'Thesis', details: `Bulk imported ${created.length} theses${skipped.length ? `, ${skipped.length} skipped` : ''}`, performedById: req.user.id });

    res.status(201).json({
      message: `${created.length} theses imported${skipped.length ? `, ${skipped.length} skipped` : ''}`,
      created: created.length,
      skipped: skipped.length ? skipped : undefined,
    });
  } catch (error) {
    console.error('bulkImportConfirm error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateThesisStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.thesis.findUnique({ where: { id }, include: { student: true } });
    if (!existing) return res.status(404).json({ error: 'Thesis not found' });
    if (req.user.role === 'COORDINATOR') {
      const scope = await resolveCoordinatorScope(req.user);
      if (!await canManageThesisAsCoordinator(existing, scope, req.user)) {
        return res.status(403).json({ error: 'Access denied. Thesis belongs to another program.' });
      }
    }
    const oldThesis = await prisma.thesis.findUnique({ where: { id }, select: { status: true, title: true } });
    const transition = assertValidStatusTransition('thesis', oldThesis?.status, req.body.status);
    if (!transition.valid) return res.status(400).json({ error: transition.error });
    const thesis = await prisma.thesis.update({
      where: { id: parseInt(req.params.id) },
      data: { status: req.body.status },
    });
    if (oldThesis && oldThesis.status !== req.body.status) {
      try {
        await notifSvc.notifyStatusChange({
          thesisId: thesis.id, oldStatus: oldThesis.status, newStatus: req.body.status,
          itemTitle: oldThesis.title, changerId: req.user.id,
        });
      } catch (e) { console.error('notifyStatusChange:', e.message); }
    }
    audit.log({ action: 'UPDATE_STATUS', entity: 'Thesis', entityId: thesis.id, details: `Status updated for thesis "${thesis.title}"`, performedById: req.user.id });
    res.json(thesis);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.assignSupervisor = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.thesis.findUnique({ where: { id }, include: { student: true } });
    if (!existing) return res.status(404).json({ error: 'Thesis not found' });
    if (req.user.role === 'COORDINATOR') {
      const scope = await resolveCoordinatorScope(req.user);
      if (!await canManageThesisAsCoordinator(existing, scope, req.user)) {
        return res.status(403).json({ error: 'Access denied. Thesis belongs to another program.' });
      }
    }

    const oldSupervisorId = existing.supervisorId;
    const rawSupId = req.body.supervisorId;
    const isRemoving = !rawSupId || rawSupId === 'NONE' || rawSupId === 'CLEAR' || isNaN(parseInt(rawSupId));

    if (isRemoving) {
      const thesis = await prisma.thesis.update({
        where: { id },
        data: { supervisorId: null, supervisorAssignmentStatus: null },
        include: { student: true, supervisor: true },
      });

      if (oldSupervisorId) {
        try {
          const assigner = await prisma.user.findUnique({ where: { id: req.user.id }, select: { firstName: true, lastName: true } });
          const assignerName = assigner ? `${assigner.firstName} ${assigner.lastName}` : 'Coordinator';
          await notifSvc.notify(oldSupervisorId, 'SUPERVISOR_REMOVED',
            `${assignerName} unassigned you as supervisor for thesis "${thesis.title}".`, `/theses/${thesis.id}`);
        } catch (e) { console.error('notify unassign error:', e.message); }
      }

      audit.log({ action: 'UNASSIGN_SUPERVISOR', entity: 'Thesis', entityId: thesis.id, details: `Unassigned supervisor from "${thesis.title}"`, performedById: req.user.id });
      return res.json(thesis);
    }

    const supervisorId = parseInt(rawSupId);
    const thesis = await prisma.thesis.update({
      where: { id },
      data: { supervisorId, supervisorAssignmentStatus: 'PENDING' },
      include: { student: true, supervisor: true },
    });

    if (oldSupervisorId && oldSupervisorId !== supervisorId) {
      try {
        const assigner = await prisma.user.findUnique({ where: { id: req.user.id }, select: { firstName: true, lastName: true } });
        const assignerName = assigner ? `${assigner.firstName} ${assigner.lastName}` : 'Coordinator';
        await notifSvc.notify(oldSupervisorId, 'SUPERVISOR_REMOVED',
          `${assignerName} unassigned you as supervisor for thesis "${thesis.title}".`, `/theses/${thesis.id}`);
      } catch (e) { console.error('notify old supervisor error:', e.message); }
    }

    const sup = thesis.supervisor;
    if (sup) {
      const emailService = require('../services/emailService');
      emailService.notifySupervisorAssigned(
        sup.email, `${sup.firstName} ${sup.lastName}`,
        `${thesis.student.firstName} ${thesis.student.lastName} (Master's)`,
        thesis.title, [{ firstName: thesis.student.firstName, lastName: thesis.student.lastName, rollNumber: '' }]
      );
    }
    // In-app notification
    try {
      const assigner = await prisma.user.findUnique({ where: { id: req.user.id }, select: { firstName: true, lastName: true } });
      const assignerName = assigner ? `${assigner.firstName} ${assigner.lastName}` : 'Coordinator';
      await notifSvc.notifySupervisorAssignment({
        supervisorId: sup?.id, itemTitle: thesis.title, type: 'thesis', assignerName,
        studentIds: thesis.studentId ? [thesis.studentId] : [],
      });
    } catch (e) { console.error('notifySupervisorAssignment:', e.message); }
    audit.log({ action: 'ASSIGN_SUPERVISOR', entity: 'Thesis', entityId: thesis.id, details: `Assigned supervisor to "${thesis.title}" (pending acceptance)`, performedById: req.user.id });
    res.json(thesis);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.exportTheses = async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const where = {};
    if (req.user.role === 'COORDINATOR') {
      const { where: scopedWhere } = await buildThesisWhereForCoordinator(req.user, where);
      Object.assign(where, scopedWhere);
    }
    const theses = await prisma.thesis.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    const rows = theses.map(t => ({
      'Project Title': t.title,
      'Project Type': t.projectType,
      Status: t.status,
      Student: `${t.student.firstName} ${t.student.lastName}`,
      Supervisor: t.supervisor ? `${t.supervisor.firstName} ${t.supervisor.lastName}` : 'Not assigned',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Theses');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=theses.xlsx');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.send(buf);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.deleteThesis = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const thesis = await prisma.thesis.findUnique({
      where: { id },
      include: { student: true, proposals: true, evaluations: true },
    });
    if (!thesis) return res.status(404).json({ error: 'Thesis not found' });
    if (req.user.role === 'COORDINATOR') {
      const scope = await resolveCoordinatorScope(req.user);
      if (!await canManageThesisAsCoordinator(thesis, scope, req.user)) {
        return res.status(403).json({ error: 'Access denied. Thesis belongs to another program.' });
      }
    }
    const hasNonZeroEvaluations = thesis.evaluations.some(e => e.marks && e.marks > 0);
    if (thesis.status === 'COMPLETED' || hasNonZeroEvaluations) {
      return res.status(400).json({ error: 'Cannot delete: thesis has completed non-zero evaluations or is finalized' });
    }
    await prisma.$transaction([
      prisma.evaluation.deleteMany({ where: { thesisId: id } }),
      prisma.evaluationComponent.deleteMany({ where: { thesisId: id } }),
      prisma.proposal.deleteMany({ where: { thesisId: id } }),
      prisma.examinerAssignment.deleteMany({ where: { thesisId: id } }),
      prisma.thesis.delete({ where: { id } }),
    ]);
    audit.log({ action: 'DELETE', entity: 'Thesis', entityId: id, details: `Deleted thesis "${thesis.title}"`, performedById: req.user.id });
    res.json({ message: 'Thesis deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.assignMidTermExternal = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { externalExaminerId } = req.body;
    const thesis = await prisma.thesis.findUnique({ where: { id }, include: { student: true } });
    if (!thesis) return res.status(404).json({ error: 'Thesis not found' });
    if (req.user.role === 'COORDINATOR') {
      const scope = await resolveCoordinatorScope(req.user);
      if (!await canManageThesisAsCoordinator(thesis, scope, req.user)) {
        return res.status(403).json({ error: 'Access denied. Thesis belongs to another program.' });
      }
    }

    // Remove old examiner assignment if exists
    if (thesis.externalMidTermId) {
      await prisma.examinerAssignment.deleteMany({
        where: { externalExaminerId: thesis.externalMidTermId, thesisId: id },
      }).catch(() => {});
    }

    if (externalExaminerId) {
      const extId = parseInt(externalExaminerId);
      // Create new examiner assignment
      await prisma.examinerAssignment.create({
        data: { externalExaminerId: extId, thesisId: id, assignedById: req.user.id },
      }).catch((err) => {
        if (err.code === 'P2002') {
          // Reassign — update instead
          return prisma.examinerAssignment.upsert({
            where: { externalExaminerId_thesisId: { externalExaminerId: extId, thesisId: id } },
            update: { assignedById: req.user.id },
            create: { externalExaminerId: extId, thesisId: id, assignedById: req.user.id },
          });
        }
        throw err;
      });
      // Update thesis
      await prisma.thesis.update({
        where: { id },
        data: { externalMidTermId: extId },
      });
    } else {
      // Remove midterm external
      await prisma.thesis.update({
        where: { id },
        data: { externalMidTermId: null },
      });
    }

    audit.log({ action: 'ASSIGN_MIDTERM_EXTERNAL', entity: 'Thesis', entityId: id, details: `Mid-term external examiner ${externalExaminerId ? 'assigned' : 'removed'} for thesis "${thesis.title}"`, performedById: req.user.id });
    res.json({ message: externalExaminerId ? 'Mid-term external examiner assigned' : 'Mid-term external examiner removed' });
  } catch (error) {
    console.error('assignMidTermExternal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.assignFinalExternal = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { externalExaminerId } = req.body;
    const thesis = await prisma.thesis.findUnique({ where: { id }, include: { student: true } });
    if (!thesis) return res.status(404).json({ error: 'Thesis not found' });
    if (req.user.role === 'COORDINATOR') {
      const scope = await resolveCoordinatorScope(req.user);
      if (!await canManageThesisAsCoordinator(thesis, scope, req.user)) {
        return res.status(403).json({ error: 'Access denied. Thesis belongs to another program.' });
      }
    }

    // Remove old examiner assignment if exists
    if (thesis.externalFinalId) {
      await prisma.examinerAssignment.deleteMany({
        where: { externalExaminerId: thesis.externalFinalId, thesisId: id },
      }).catch(() => {});
    }

    if (externalExaminerId) {
      const extId = parseInt(externalExaminerId);
      // Create new examiner assignment
      await prisma.examinerAssignment.create({
        data: { externalExaminerId: extId, thesisId: id, assignedById: req.user.id },
      }).catch((err) => {
        if (err.code === 'P2002') {
          return prisma.examinerAssignment.upsert({
            where: { externalExaminerId_thesisId: { externalExaminerId: extId, thesisId: id } },
            update: { assignedById: req.user.id },
            create: { externalExaminerId: extId, thesisId: id, assignedById: req.user.id },
          });
        }
        throw err;
      });
      // Update thesis
      await prisma.thesis.update({
        where: { id },
        data: { externalFinalId: extId },
      });
    } else {
      // Remove final external
      await prisma.thesis.update({
        where: { id },
        data: { externalFinalId: null },
      });
    }

    audit.log({ action: 'ASSIGN_FINAL_EXTERNAL', entity: 'Thesis', entityId: id, details: `Final external examiner ${externalExaminerId ? 'assigned' : 'removed'} for thesis "${thesis.title}"`, performedById: req.user.id });
    res.json({ message: externalExaminerId ? 'Final external examiner assigned' : 'Final external examiner removed' });
  } catch (error) {
    console.error('assignFinalExternal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateThesis = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.thesis.findUnique({ where: { id }, include: { student: true } });
    if (!existing) return res.status(404).json({ error: 'Thesis not found' });
    if (req.user.role === 'COORDINATOR') {
      const scope = await resolveCoordinatorScope(req.user);
      if (!await canManageThesisAsCoordinator(existing, scope, req.user)) {
        return res.status(403).json({ error: 'Access denied. Thesis belongs to another program.' });
      }
    }
    const { title, description, startDate, endDate, cluster, status } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
    if (cluster !== undefined) data.cluster = cluster;
    if (status !== undefined) data.status = status;
    const thesis = await prisma.thesis.update({
      where: { id },
      data,
    });
    audit.log({ action: 'UPDATE', entity: 'Thesis', entityId: id, details: `Updated thesis "${thesis.title}"`, performedById: req.user.id });
    res.json({ message: 'Thesis updated', thesis });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
