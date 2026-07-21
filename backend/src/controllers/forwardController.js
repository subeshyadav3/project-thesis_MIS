const audit = require('../services/auditService');
const notifSvc = require('../services/notificationService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.forwardToExamDept = async (req, res) => {
  try {
    // Scope to coordinator's program or department
    let programId = null;
    let departmentId = null;
    if (req.user.role === 'COORDINATOR') {
      const program = await prisma.program.findUnique({ where: { coordinatorId: req.user.id } });
      if (program) {
        programId = program.id;
      } else {
        const dept = await prisma.department.findUnique({ where: { coordinatorId: req.user.id } });
        if (dept) departmentId = dept.id;
      }
    }

    const groupWhere = { status: 'COMPLETED' };
    const thesisWhere = { status: 'COMPLETED' };
    if (programId) {
      groupWhere.programId = programId;
      thesisWhere.student = { programId };
    } else if (departmentId) {
      const years = await prisma.academicYear.findMany({
        where: { departmentId }, select: { id: true },
      });
      const yearIds = years.map(y => y.id);
      groupWhere.academicYearId = { in: yearIds };
      thesisWhere.student = { program: { departmentId } };
    }

    const groups = await prisma.projectGroup.findMany({
      where: groupWhere,
      include: {
        members: { include: { student: { select: { firstName: true, lastName: true, email: true } } } },
        evaluations: { where: { status: 'COMPLETED' }, include: { component: { select: { name: true, maxMarks: true } } } },
        supervisor: { select: { firstName: true, lastName: true, active: true } },
      },
    });
    const theses = await prisma.thesis.findMany({
      where: thesisWhere,
      include: {
        student: { select: { firstName: true, lastName: true, email: true } },
        evaluations: { where: { status: 'COMPLETED' }, include: { component: { select: { name: true, maxMarks: true } } } },
        supervisor: { select: { firstName: true, lastName: true, active: true } },
      },
    });

    const payload = {
      department: req.body.departmentName || 'Unknown',
      forwardedBy: req.user.email,
      timestamp: new Date().toISOString(),
      results: [
        ...groups.map(g => ({
          type: 'BACHELOR',
          groupName: g.name,
          projectTitle: g.projectTitle,
          supervisor: g.supervisor ? `${g.supervisor.firstName} ${g.supervisor.lastName}` : 'N/A',
          members: g.members.map(m => `${m.student.firstName} ${m.student.lastName}`),
          evaluations: g.evaluations,
        })),
        ...theses.map(t => ({
          type: 'MASTER',
          studentName: `${t.student.firstName} ${t.student.lastName}`,
          title: t.title,
          supervisor: t.supervisor ? `${t.supervisor.firstName} ${t.supervisor.lastName}` : 'N/A',
          evaluations: t.evaluations,
        })),
      ],
    };

    const apiUrl = process.env.EXAM_DEPT_API_URL;
    if (!apiUrl) {
      console.warn('EXAM_DEPT_API_URL not set — results not forwarded to external endpoint');
      audit.log({ action: 'FORWARD_SKIPPED', entity: 'Results', details: 'EXAM_DEPT_API_URL not configured, results saved locally', performedById: req.user.id });
      // Still log the forward locally
      const coordinatorIds = await notifSvc.getCoordinatorIds();
      await notifSvc.notifyMany(coordinatorIds, 'RESULTS_FORWARDED', `Results prepared for forwarding (${payload.results.length} items). Exam Dept API not configured.`);
      return res.json({ message: 'Results processed locally', items: payload.results.length, forwarded: false });
    }

    const axios = require('axios');
    const response = await axios.post(apiUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    audit.log({ action: 'FORWARD', entity: 'Results', details: 'Forwarded results to Examination Department', performedById: req.user.id });
    const coordinatorIds = await notifSvc.getCoordinatorIds();
    await notifSvc.notifyMany(coordinatorIds, 'RESULTS_FORWARDED', `Results have been forwarded to the Examination Department`);
    res.json({ message: 'Results forwarded successfully', response: response.data });
  } catch (error) {
    console.error('forwardToExamDept error:', error);
    res.status(500).json({ error: 'Failed to forward results' });
  }
};
