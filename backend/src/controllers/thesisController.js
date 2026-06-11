const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

exports.getTheses = async (req, res) => {
  try {
    const theses = await prisma.thesis.findMany({
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
        academicYear: { include: { department: true } },
        evaluations: true,
        evaluationComponents: true,
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
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
        academicYear: { include: { department: true } },
        evaluations: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } } },
        evaluationComponents: true,
        proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } } },
        recommendations: true,
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
    const thesis = await prisma.thesis.create({
      data: {
        title,
        studentId: parseInt(studentId),
        academicYearId: parseInt(academicYearId),
        supervisorId: supervisorId ? parseInt(supervisorId) : null,
        status: supervisorId ? 'ACTIVE' : 'PENDING',
      },
    });
    const defaults = [
      { name: 'Supervisor', maxMarks: 25 },
      { name: 'Proposal Defense', maxMarks: 5 },
      { name: 'Mid-Term Defense', maxMarks: 5 },
      { name: 'Final Defense', maxMarks: 5 },
      { name: 'Internal Examiner', maxMarks: 10 },
    ];
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
        data: { title, studentId: student.id, academicYearId: parseInt(academicYearId) },
      });
      const defaults = [
        { name: 'Supervisor', maxMarks: 25 },
        { name: 'Proposal Defense', maxMarks: 5 },
        { name: 'Mid-Term Defense', maxMarks: 5 },
        { name: 'Final Defense', maxMarks: 5 },
        { name: 'Internal Examiner', maxMarks: 10 },
      ];
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
    const thesis = await prisma.thesis.update({
      where: { id: parseInt(req.params.id) },
      data: { status: req.body.status },
    });
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
    res.json(thesis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
