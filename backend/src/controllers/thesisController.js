const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
const notifSvc = require('../services/notificationService');
const audit = require('../services/auditService');
const { getDefaultComponents } = require('../config/evaluationScheme');

exports.getTheses = async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'COORDINATOR') {
      const dept = await prisma.department.findUnique({ where: { coordinatorId: req.user.id } });
      if (dept) where.academicYear = { departmentId: dept.id };
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
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
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
      const dept = await prisma.department.findUnique({ where: { coordinatorId: req.user.id } });
      if (dept && thesis.academicYear?.departmentId !== dept.id) {
        return res.status(403).json({ error: 'Access denied. Thesis belongs to another department.' });
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
    const thesis = await prisma.thesis.create({
      data: {
        title,
        projectType: 'MASTER',
        studentId: parseInt(studentId),
        academicYearId: parseInt(academicYearId),
        supervisorId: supervisorId ? parseInt(supervisorId) : null,
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

exports.uploadExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    const { academicYearId } = req.body;
    const created = [];
    for (const row of data) {
      const title = row['Project Title'] || row['title'] || row['projectTitle'];
      const studentName = (row['Member Names'] || row['studentName'] || '').toString();
      const rollNumber = (row['Roll Numbers'] || row['rollNumbers'] || '').toString();
      const nameParts = studentName.split(' ');
      const firstName = nameParts[0] || studentName;
      const lastName = nameParts.slice(1).join(' ') || '';
      let student = await prisma.user.findFirst({
        where: { lastName, firstName, role: 'STUDENT' },
      });
      if (!student) {
        student = await prisma.user.create({
          data: {
            email: `${rollNumber.toLowerCase()}@university.edu`,
            password: await bcrypt.hash('student123', 10),
            firstName,
            lastName,
            role: 'STUDENT',
          },
        });
      }
      const thesis = await prisma.thesis.create({
        data: { title, projectType: 'MASTER', studentId: student.id, academicYearId: parseInt(academicYearId) },
      });
      const defaults = getDefaultComponents('MASTER');
      for (const comp of defaults) {
        await prisma.evaluationComponent.create({
          data: { ...comp, thesisId: thesis.id, createdById: req.user.id },
        });
      }
      created.push(thesis);
    }
    audit.log({ action: 'CREATE', entity: 'Thesis', details: `Imported ${created.length} theses via Excel`, performedById: req.user.id });
    res.status(201).json({ message: `${created.length} theses created`, theses: created });
  } catch (error) {
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
      const dept = await prisma.department.findUnique({ where: { coordinatorId: req.user.id } });
      if (dept) where.academicYear = { departmentId: dept.id };
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
