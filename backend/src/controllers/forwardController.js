const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.forwardToExamDept = async (req, res) => {
  try {
    const groups = await prisma.projectGroup.findMany({
      where: { status: 'COMPLETED' },
      include: {
        members: { include: { student: { select: { firstName: true, lastName: true, email: true } } } },
        evaluations: true,
        supervisor: { select: { firstName: true, lastName: true } },
      },
    });
    const theses = await prisma.thesis.findMany({
      where: { status: 'COMPLETED' },
      include: {
        student: { select: { firstName: true, lastName: true, email: true } },
        evaluations: true,
        supervisor: { select: { firstName: true, lastName: true } },
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
    const axios = require('axios');
    const apiUrl = process.env.EXAM_DEPT_API_URL || 'https://exam-dept-api.university.edu/api/results';
    const response = await axios.post(apiUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    res.json({ message: 'Results forwarded successfully', response: response.data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to forward results: ' + error.message });
  }
};
