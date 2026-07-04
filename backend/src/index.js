const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('./middleware/auth');

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

const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts, please try again later.' },
});
app.use('/api/auth/login', loginLimiter);

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

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

app.get('/api/files/:type/:filename', authenticate, async (req, res) => {
  try {
    const { type, filename } = req.params;
    const allowedTypes = ['groups', 'theses'];
    if (!allowedTypes.includes(type)) return res.status(400).json({ error: 'Invalid file type' });
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const filePath = path.join(__dirname, '..', 'storage', type, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats', authenticate, async (req, res) => {
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
    const minorGroups = await prisma.projectGroup.count({ where: { projectType: 'MINOR' } });
    const majorGroups = await prisma.projectGroup.count({ where: { projectType: 'MAJOR' } });
    res.json({
      totalGroups, totalTheses, totalSupervisors, totalCoordinators, totalStudents,
      pendingGroups, activeGroups, completedGroups, pendingTheses,
      minorGroups, majorGroups,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
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
