const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
const emailService = require('../services/emailService');
const notifSvc = require('../services/notificationService');

exports.getGroups = async (req, res) => {
  try {
    const groups = await prisma.projectGroup.findMany({
      include: {
        members: { include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
        academicYear: { include: { department: true } },
        evaluations: true,
        evaluationComponents: true,
        proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } },
        examinerAssignments: { include: { externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getGroup = async (req, res) => {
  try {
    const group = await prisma.projectGroup.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        members: { include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
        academicYear: { include: { department: true } },
        evaluations: {
          include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } },
        },
        evaluationComponents: true,
        proposals: { include: { submittedBy: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } },
        recommendations: true,
        examinerAssignments: { include: { externalExaminer: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createGroup = async (req, res) => {
  try {
    const { name, projectTitle, academicYearId, supervisorId, students } = req.body;
    const group = await prisma.projectGroup.create({
      data: {
        name,
        projectTitle,
        academicYearId: parseInt(academicYearId),
        supervisorId: supervisorId ? parseInt(supervisorId) : null,
        status: supervisorId ? 'ACTIVE' : 'PENDING',
      },
    });
    // Create or find students and add as members
    if (students && students.length > 0) {
      for (const st of students) {
        const fn = (st.firstName || '').trim();
        const ln = (st.lastName || '').trim();
        const roll = (st.rollNumber || '').trim();
        if (!fn && !roll) continue;
        const email = `${roll.toLowerCase() || `${fn.toLowerCase()}.${ln.toLowerCase()}`}@pcampus.edu.np`;
        let student = await prisma.user.findFirst({ where: { email } });
        if (!student) {
          const hash = await bcrypt.hash('subesh', 10);
          student = await prisma.user.create({
            data: { email, password: hash, firstName: fn || 'Student', lastName: ln || roll, role: 'STUDENT' },
          });
        }
        await prisma.groupMember.create({
          data: { studentId: student.id, groupId: group.id, rollNumber: roll || email },
        });
      }
    }
    // Create default evaluation components
    const defaults = [
      { name: 'Supervisor', maxMarks: 25, evaluationType: 'SUPERVISOR', evaluatorRole: 'SUPERVISOR' },
      { name: 'Proposal Defense', maxMarks: 5, evaluationType: 'PROPOSAL_DEFENSE', evaluatorRole: 'COORDINATOR' },
      { name: 'Mid-Term Defense', maxMarks: 5, evaluationType: 'MIDTERM_DEFENSE', evaluatorRole: 'COORDINATOR' },
      { name: 'Final Defense', maxMarks: 5, evaluationType: 'FINAL_DEFENSE', evaluatorRole: 'COORDINATOR' },
      { name: 'Internal Examiner', maxMarks: 10, evaluationType: 'EXTERNAL_EXAMINER', evaluatorRole: 'EXTERNAL_EXAMINER' },
    ];
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
    res.status(201).json(created);
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
      const groupName = row['Group Name'] || row['groupName'];
      const projectTitle = row['Project Title'] || row['projectTitle'];
      const memberNames = (row['Member Names'] || row['memberNames'] || '').toString();
      const rollNumbers = (row['Roll Numbers'] || row['rollNumbers'] || '').toString();
      const names = memberNames.split(',').map(s => s.trim()).filter(Boolean);
      const rolls = rollNumbers.split(',').map(s => s.trim()).filter(Boolean);
      const group = await prisma.projectGroup.create({
        data: {
          name: groupName,
          projectTitle,
          academicYearId: parseInt(academicYearId),
        },
      });
      // Create default evaluation components
      const defaults = [
        { name: 'Supervisor', maxMarks: 25, evaluationType: 'SUPERVISOR', evaluatorRole: 'SUPERVISOR' },
        { name: 'Proposal Defense', maxMarks: 5, evaluationType: 'PROPOSAL_DEFENSE', evaluatorRole: 'COORDINATOR' },
        { name: 'Mid-Term Defense', maxMarks: 5, evaluationType: 'MIDTERM_DEFENSE', evaluatorRole: 'COORDINATOR' },
        { name: 'Final Defense', maxMarks: 5, evaluationType: 'FINAL_DEFENSE', evaluatorRole: 'COORDINATOR' },
        { name: 'Internal Examiner', maxMarks: 10, evaluationType: 'EXTERNAL_EXAMINER', evaluatorRole: 'EXTERNAL_EXAMINER' },
      ];
      for (const comp of defaults) {
        await prisma.evaluationComponent.create({
          data: { ...comp, groupId: group.id, createdById: req.user.id },
        });
      }
      // Create or find students and add as members
      for (let i = 0; i < names.length; i++) {
        const nameParts = names[i].split(' ');
        const firstName = nameParts[0] || names[i];
        const lastName = nameParts.slice(1).join(' ') || '';
        const roll = rolls[i] || `R${Date.now()}${i}`;
        let student = await prisma.user.findFirst({
          where: { lastName: lastName, firstName: firstName, role: 'STUDENT' },
        });
        if (!student) {
          student = await prisma.user.create({
            data: {
              email: `${roll.toLowerCase()}@university.edu`,
              password: '$2a$10$placeholder', // needs reset
              firstName,
              lastName,
              role: 'STUDENT',
            },
          });
        }
        await prisma.groupMember.create({
          data: { studentId: student.id, groupId: group.id, rollNumber: roll },
        });
      }
      created.push(group);
    }
    res.status(201).json({ message: `${created.length} groups created`, groups: created });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Supervisor assignment with notification
exports.assignSupervisor = async (req, res) => {
  try {
    const { id } = req.params;
    const { supervisorId } = req.body;
    const group = await prisma.projectGroup.update({
      where: { id: parseInt(id) },
      data: { supervisorId: parseInt(supervisorId), status: 'ACTIVE' },
      include: {
        members: { include: { student: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    // Send emails
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
    // In-app notification
    try {
      const assigner = await prisma.user.findUnique({ where: { id: req.user.id }, select: { firstName: true, lastName: true } });
      const assignerName = assigner ? `${assigner.firstName} ${assigner.lastName}` : 'Coordinator';
      const studentIds = group.members.map(m => m.studentId);
      await notifSvc.notifySupervisorAssignment({
        supervisorId: sup?.id, itemTitle: group.projectTitle, type: 'group', assignerName, studentIds,
      });
    } catch (e) { console.error('notifySupervisorAssignment:', e.message); }
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateGroupStatus = async (req, res) => {
  try {
    const oldGroup = await prisma.projectGroup.findUnique({ where: { id: parseInt(req.params.id) }, select: { status: true, projectTitle: true } });
    const group = await prisma.projectGroup.update({
      where: { id: parseInt(req.params.id) },
      data: { status: req.body.status },
    });
    // In-app notification
    if (oldGroup && oldGroup.status !== req.body.status) {
      try {
        await notifSvc.notifyStatusChange({
          groupId: group.id, oldStatus: oldGroup.status, newStatus: req.body.status,
          itemTitle: oldGroup.projectTitle, changerId: req.user.id,
        });
      } catch (e) { console.error('notifyStatusChange:', e.message); }
    }
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateEvaluationComponent = async (req, res) => {
  try {
    const component = await prisma.evaluationComponent.update({
      where: { id: parseInt(req.params.id) },
      data: { name: req.body.name, maxMarks: parseFloat(req.body.maxMarks) },
    });
    res.json(component);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
