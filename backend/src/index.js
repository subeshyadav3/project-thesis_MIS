const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const thesisRoutes = require('./routes/theses');
const supervisorRoutes = require('./routes/supervisors');
const evaluationRoutes = require('./routes/evaluations');
const notificationRoutes = require('./routes/notifications');
const forwardRoutes = require('./routes/forward');
const departmentRoutes = require('./routes/departments');
const studentRoutes = require('./routes/students');
const externalExaminerRoutes = require('./routes/externalExaminers');
const examinerAssignmentRoutes = require('./routes/examinerAssignments');

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/theses', thesisRoutes);
app.use('/api/supervisors', supervisorRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/forward', forwardRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/external-examiners', externalExaminerRoutes);
app.use('/api/examiner-assignments', examinerAssignmentRoutes);
app.use('/storage', express.static(path.join(__dirname, '..', 'storage')));

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

app.get('/api/stats', async (req, res) => {
  try {
    const totalGroups = await prisma.projectGroup.count();
    const totalTheses = await prisma.thesis.count();
    const totalSupervisors = await prisma.user.count({ where: { role: 'SUPERVISOR' } });
    const totalCoordinators = await prisma.user.count({ where: { role: 'COORDINATOR' } });
    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
    const pendingGroups = await prisma.projectGroup.count({ where: { status: 'PENDING' } });
    const activeGroups = await prisma.projectGroup.count({ where: { status: 'ACTIVE' } });
    const completedGroups = await prisma.projectGroup.count({ where: { status: 'COMPLETED' } });
    const pendingTheses = await prisma.thesis.count({ where: { status: 'PENDING' } });
    res.json({
      totalGroups, totalTheses, totalSupervisors, totalCoordinators, totalStudents,
      pendingGroups, activeGroups, completedGroups, pendingTheses,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Thesis Management API is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
