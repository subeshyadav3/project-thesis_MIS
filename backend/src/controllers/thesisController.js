const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const prisma = new PrismaClient();
const notifSvc = require('../services/notificationService');
const audit = require('../services/auditService');
const { getDefaultComponents } = require('../config/evaluationScheme');
const fuzzyMatch = require('../utils/fuzzyMatch');

exports.getTheses = async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'COORDINATOR') {
      const program = await prisma.program.findUnique({ where: { coordinatorId: req.user.id } });
      if (program) {
        where.student = { programId: program.id };
      } else {
        const dept = await prisma.department.findUnique({ where: { coordinatorId: req.user.id } });
        if (dept) where.academicYear = { departmentId: dept.id };
      }
    }
    if (req.query.announcementId) where.announcementId = Number(req.query.announcementId);
    if (req.query.status) where.status = req.query.status;
    const theses = await prisma.thesis.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
        academicYear: { include: { department: true } },
        evaluations: true,
        evaluationComponents: true,
        proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } },
        examinerAssignments: { include: { externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true, active: true } } } },
      },
    });
    res.json(theses);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getThesis = async (req, res) => {
  try {
    const thesis = await prisma.thesis.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true, programId: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
        academicYear: { include: { department: true } },
        evaluations: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } } },
        evaluationComponents: true,
        proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } },
        recommendations: true,
        examinerAssignments: { include: { externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true, active: true } } } },
      },
    });
    if (!thesis) return res.status(404).json({ error: 'Thesis not found' });
    if (req.user.role === 'COORDINATOR') {
      const program = await prisma.program.findUnique({ where: { coordinatorId: req.user.id } });
      if (program) {
        if (thesis.student?.programId !== program.id) {
          return res.status(403).json({ error: 'Access denied. Thesis belongs to another program.' });
        }
      } else {
        const dept = await prisma.department.findUnique({ where: { coordinatorId: req.user.id } });
        if (dept && thesis.academicYear?.departmentId !== dept.id) {
          return res.status(403).json({ error: 'Access denied. Thesis belongs to another department.' });
        }
      }
    }
    res.json(thesis);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createThesis = async (req, res) => {
  try {
    const { title, studentId, academicYearId, supervisorId } = req.body;
    if (!title || !studentId || !academicYearId) {
      return res.status(400).json({ error: 'title, studentId, and academicYearId are required' });
    }
    const student = await prisma.user.findUnique({ where: { id: parseInt(studentId) }, include: { program: true } });
    if (!student || student.role !== 'STUDENT' || student.degreeType !== 'MASTER') {
      return res.status(400).json({ error: 'studentId must belong to a master student' });
    }
    const thesis = await prisma.thesis.create({
      data: {
        title,
        projectType: 'MASTER',
        studentId: parseInt(studentId),
        academicYearId: parseInt(academicYearId),
        supervisorId: supervisorId ? parseInt(supervisorId) : null,
        batch: student.batch || null,
        cluster: student.program?.cluster || null,
        status: supervisorId ? 'ACTIVE' : 'PENDING',
      },
    });
    const defaults = getDefaultComponents('MASTER');
    for (const comp of defaults) {
      await prisma.evaluationComponent.create({
        data: { ...comp, thesisId: thesis.id, createdById: req.user.id },
      });
    }
    audit.log({ action: 'CREATE', entity: 'Thesis', entityId: thesis.id, details: `Created thesis "${thesis.title}"`, performedById: req.user.id });
    res.status(201).json(thesis);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Step 1: Parse Excel + fuzzy match → return preview
exports.bulkImportPreview = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const academicYearId = req.body.academicYearId ? parseInt(req.body.academicYearId) : null;
    if (!academicYearId) return res.status(400).json({ error: 'academicYearId is required' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // Load all candidates in the coordinator's department
    const deptId = req.user.departmentId;
    const coordinatorProgram = req.user.role === 'COORDINATOR'
      ? await prisma.program.findUnique({ where: { coordinatorId: req.user.id } })
      : null;
    const [allStudents, allSupervisors, allExternals, programs] = await Promise.all([
      prisma.user.findMany({ where: { role: 'STUDENT', departmentId: deptId }, select: { id: true, firstName: true, lastName: true, email: true, rollNumber: true, programId: true } }),
      prisma.user.findMany({ where: { role: 'SUPERVISOR', departmentId: deptId }, select: { id: true, firstName: true, lastName: true, email: true } }),
      prisma.user.findMany({ where: { role: 'EXTERNAL_EXAMINER', departmentId: deptId }, select: { id: true, firstName: true, lastName: true, email: true } }),
      prisma.program.findMany({ where: { departmentId: deptId }, select: { id: true, name: true, code: true, degreeType: true, cluster: true } }),
    ]);

    const preview = [];
    let matchCount = 0;
    let unmatchCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = (row['Name'] || row['name'] || '').toString().trim();
      const roll = (row['Roll'] || row['roll'] || row['Roll Numbers'] || '').toString().trim();
      const title = (row['Title'] || row['title'] || row['Project Title'] || '').toString().trim();
      const batch = (row['Batch'] || row['batch'] || '').toString().trim();
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

      // Match student
      let studentMatch = null;
      if (roll) {
        const byRoll = allStudents.find(s => s.rollNumber && s.rollNumber.toLowerCase() === roll.toLowerCase());
        if (byRoll) studentMatch = { user: byRoll, score: 1.0, method: 'roll' };
      }
      if (!studentMatch && name) {
        studentMatch = fuzzyMatch(name, allStudents, 0.5);
      }
      if (!studentMatch) {
        warnings.push(`Student not found for "${name}" (roll: ${roll})`);
        unmatchCount++;
      } else {
        matchCount++;
        if (coordinatorProgram && studentMatch.user.programId !== coordinatorProgram.id) {
          warnings.push('Student belongs to another program and cannot be imported by this coordinator');
        }
        if (importedProgram && studentMatch.user.programId !== importedProgram.id) {
          warnings.push('Program does not match the matched student');
        }
      }

      // Match supervisor
      const supervisorMatch = supervisorName ? fuzzyMatch(supervisorName, allSupervisors, 0.5) : null;
      if (supervisorName && !supervisorMatch) {
        warnings.push(`Supervisor not found for "${supervisorName}"`);
      }

      // Match external mid-term
      const externalMidTermMatch = externalMidTermName ? fuzzyMatch(externalMidTermName, allExternals, 0.5) : null;
      if (externalMidTermName && !externalMidTermMatch) {
        warnings.push(`External Mid-Term not found for "${externalMidTermName}"`);
      }

      // Match external final
      const externalFinalMatch = externalFinalName ? fuzzyMatch(externalFinalName, allExternals, 0.5) : null;
      if (externalFinalName && !externalFinalMatch) {
        warnings.push(`External Final not found for "${externalFinalName}"`);
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
        externalMidTermMatch: externalMidTermMatch ? { id: externalMidTermMatch.user.id, name: `${externalMidTermMatch.user.firstName} ${externalMidTermMatch.user.lastName}`, score: externalMidTermMatch.score, status: 'matched' } : null,
        externalFinalMatch: externalFinalMatch ? { id: externalFinalMatch.user.id, name: `${externalFinalMatch.user.firstName} ${externalFinalMatch.user.lastName}`, score: externalFinalMatch.score, status: 'matched' } : null,
        warnings,
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
    const { rows, academicYearId } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows array is required' });
    }
    if (!academicYearId) return res.status(400).json({ error: 'academicYearId is required' });

    const created = [];
    const skipped = [];
    const coordinatorProgram = req.user.role === 'COORDINATOR'
      ? await prisma.program.findUnique({ where: { coordinatorId: req.user.id } })
      : null;

    for (const row of rows) {
      const { studentMatch, supervisorMatch, externalMidTermMatch, externalFinalMatch, title, batch, cluster } = row;

      if (!studentMatch?.id) {
        skipped.push({ row: row.row, reason: 'No student matched' });
        continue;
      }
      if (!title) {
        skipped.push({ row: row.row, reason: 'No thesis title' });
        continue;
      }

      // Wrap the race-condition-prone check+create in a transaction
      const thesis = await prisma.$transaction(async (tx) => {
        const student = await tx.user.findUnique({ where: { id: studentMatch.id }, include: { program: true } });
        if (!student || student.role !== 'STUDENT' || student.degreeType !== 'MASTER') {
          skipped.push({ row: row.row, reason: 'Matched user is not a master student' });
          return null;
        }
        if (coordinatorProgram && student.programId !== coordinatorProgram.id) {
          skipped.push({ row: row.row, reason: 'Student belongs to another program' });
          return null;
        }

        // Check for active thesis within the transaction
        const activeThesis = await tx.thesis.findFirst({
          where: { studentId: studentMatch.id, status: { in: ['PENDING', 'ACTIVE'] } },
        });
        if (activeThesis) {
          skipped.push({ row: row.row, studentId: studentMatch.id, reason: `Already has active thesis: "${activeThesis.title}"` });
          return null;
        }

        // Check for duplicate within the transaction
        const duplicate = await tx.thesis.findFirst({
          where: { title, studentId: studentMatch.id, academicYearId: parseInt(academicYearId) },
        });
        if (duplicate) {
          skipped.push({ row: row.row, studentId: studentMatch.id, reason: `Duplicate thesis: "${title}"` });
          return null;
        }

        // All checks passed — create thesis
        const newThesis = await tx.thesis.create({
          data: {
            title,
            projectType: 'MASTER',
            studentId: studentMatch.id,
            status: supervisorMatch?.id ? 'ACTIVE' : 'PENDING',
            academicYearId: parseInt(academicYearId),
            supervisorId: supervisorMatch?.id || null,
            externalMidTermId: externalMidTermMatch?.id || null,
            externalFinalId: externalFinalMatch?.id || null,
            cluster: cluster || student.program?.cluster || null,
            batch: batch || student.batch || null,
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
        if (externalMidTermMatch?.id) {
          await tx.examinerAssignment.upsert({
            where: { externalExaminerId_thesisId: { externalExaminerId: externalMidTermMatch.id, thesisId: newThesis.id } },
            update: {},
            create: { externalExaminerId: externalMidTermMatch.id, thesisId: newThesis.id, assignedById: req.user.id },
          }).catch(() => {});
        }
        if (externalFinalMatch?.id) {
          await tx.examinerAssignment.upsert({
            where: { externalExaminerId_thesisId: { externalExaminerId: externalFinalMatch.id, thesisId: newThesis.id } },
            update: {},
            create: { externalExaminerId: externalFinalMatch.id, thesisId: newThesis.id, assignedById: req.user.id },
          }).catch(() => {});
        }

        // Auto-link to active THESIS announcement
        try {
          const activeAnnouncements = await tx.announcement.findMany({
            where: {
              type: 'THESIS',
              degreeType: 'MASTER',
              academicYearId: parseInt(academicYearId),
            },
          });
          if (activeAnnouncements.length > 0) {
            await tx.thesis.update({
              where: { id: newThesis.id },
              data: { announcementId: activeAnnouncements[0].id },
            });
          }
        } catch (e) { /* ignore announcement linking errors */ }

        created.push(newThesis);
        return newThesis;
      });
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
    const oldThesis = await prisma.thesis.findUnique({ where: { id: parseInt(req.params.id) }, select: { status: true, title: true } });
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
    const thesis = await prisma.thesis.update({
      where: { id: parseInt(req.params.id) },
      data: { supervisorId: parseInt(req.body.supervisorId), status: 'ACTIVE' },
      include: { student: true, supervisor: true },
    });
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
    audit.log({ action: 'ASSIGN_SUPERVISOR', entity: 'Thesis', entityId: thesis.id, details: `Assigned supervisor to "${thesis.title}"`, performedById: req.user.id });
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
      const program = await prisma.program.findUnique({ where: { coordinatorId: req.user.id } });
      if (program) {
        where.student = { programId: program.id };
      } else {
        const dept = await prisma.department.findUnique({ where: { coordinatorId: req.user.id } });
        if (dept) where.academicYear = { departmentId: dept.id };
      }
    }
    const theses = await prisma.thesis.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
        academicYear: true,
      },
    });
    const rows = theses.map(t => ({
      'Project Title': t.title,
      'Project Type': t.projectType,
      Status: t.status,
      Student: `${t.student.firstName} ${t.student.lastName}`,
      Supervisor: t.supervisor ? `${t.supervisor.firstName} ${t.supervisor.lastName}` : 'Not assigned',
      'Academic Year': t.academicYear ? `${t.academicYear.year} ${t.academicYear.semester}` : '',
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
      include: { proposals: true, evaluations: true },
    });
    if (!thesis) return res.status(404).json({ error: 'Thesis not found' });
    // Allow delete if PENDING, or if no files uploaded AND no evaluations done
    if (thesis.status !== 'PENDING' && (thesis.proposals.length > 0 || thesis.evaluations.length > 0)) {
      return res.status(400).json({ error: 'Cannot delete: thesis has files uploaded or evaluations completed' });
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

exports.updateThesis = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
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
