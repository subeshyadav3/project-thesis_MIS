const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
const notifSvc = require('../services/notificationService');
const { getDefaultComponents } = require('../config/evaluationScheme');

exports.getTheses = async (req, res) => {
  try {
    const theses = await prisma.thesis.findMany({
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
    res.status(500).json({ error: error.message });
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
    res.json(thesis);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(201).json(thesis);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(201).json({ message: `${created.length} theses created`, theses: created });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.json(thesis);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.json(thesis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
