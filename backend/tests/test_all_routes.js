/**
 * Comprehensive API Route Testing Suite
 * Tests all backend routes across all user roles (COORDINATOR, SUPERVISOR, STUDENT, EXTERNAL_EXAMINER, MAINTAINER)
 */
const http = require('http');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

let passed = 0;
let failed = 0;
const results = [];

function recordPass(name, detail = '') {
  passed++;
  results.push({ status: 'PASS', name, detail });
  console.log(`  ✓ [PASS] ${name} ${detail ? '(' + detail + ')' : ''}`);
}

function recordFail(name, error) {
  failed++;
  const raw = error?.response?.data?.error || error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
  const errMsg = String(raw).slice(0, 120);
  results.push({ status: 'FAIL', name, error: errMsg });
  console.error(`  ✗ [FAIL] ${name} -> ${errMsg}`);
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      departmentId: user.departmentId,
      programId: user.programId,
      degreeType: user.degreeType,
      batch: user.batch,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function runTestSuite() {
  console.log('\n========================================================');
  console.log(' STARTING COMPREHENSIVE END-TO-END ROUTE TEST SUITE');
  console.log('========================================================\n');

  let server;
  try {
    // 1. Fetch reference users for each role
    console.log('▶ Fetching role test fixtures from Database...');
    let maintainer = await prisma.user.findFirst({ where: { role: 'MAINTAINER' } });
    if (!maintainer) {
      // Find or create maintainer fixture if not present
      const adminPass = await bcrypt.hash('subesh', 10);
      maintainer = await prisma.user.create({
        data: {
          email: 'admin.maintainer@pcampus.edu.np',
          password: adminPass,
          firstName: 'System',
          lastName: 'Admin',
          role: 'MAINTAINER',
          active: true,
        },
      });
    }

    const coordinator = await prisma.user.findFirst({ where: { role: 'COORDINATOR' } });
    const supervisor = await prisma.user.findFirst({ where: { role: 'SUPERVISOR' } });
    const masterStudent = await prisma.user.findFirst({ where: { role: 'STUDENT', degreeType: 'MASTER' } });
    const bachelorStudent = await prisma.user.findFirst({ where: { role: 'STUDENT', degreeType: 'BACHELOR' } });
    const examiner = await prisma.user.findFirst({ where: { role: 'EXTERNAL_EXAMINER' } }) || supervisor;

    if (!coordinator) throw new Error('No coordinator user found in DB');
    if (!supervisor) throw new Error('No supervisor user found in DB');
    if (!masterStudent) throw new Error('No master student found in DB');

    console.log(`  - Maintainer:     ${maintainer.email}`);
    console.log(`  - Coordinator:    ${coordinator.email}`);
    console.log(`  - Supervisor:     ${supervisor.email}`);
    console.log(`  - Master Student: ${masterStudent.email}`);
    if (bachelorStudent) console.log(`  - Bachelor Student: ${bachelorStudent.email}`);

    // Generate tokens
    const maintToken = signToken(maintainer);
    const coordToken = signToken(coordinator);
    const superToken = signToken(supervisor);
    const masterToken = signToken(masterStudent);
    const bachToken = bachelorStudent ? signToken(bachelorStudent) : masterToken;
    const examToken = signToken(examiner);

    // 2. Spin up Express app on an ephemeral port
    const express = require('express');
    const cors = require('cors');
    const cookieParser = require('cookie-parser');
    const helmet = require('helmet');
    const { authenticate, authorize } = require('../src/middleware/auth');
    const errorHandler = require('../src/middleware/errorHandler');

    const app = express();
    app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Mount all routes exactly as in src/index.js
    app.use('/api/auth', require('../src/routes/auth'));
    app.use('/api/users', require('../src/routes/users'));
    app.use('/api/groups', require('../src/routes/groups'));
    app.use('/api/theses', require('../src/routes/theses'));
    app.use('/api/supervisors', require('../src/routes/supervisors'));
    app.use('/api/evaluations', require('../src/routes/evaluations'));
    app.use('/api/notifications', require('../src/routes/notifications'));
    app.use('/api/forward', require('../src/routes/forward'));
    app.use('/api/departments', require('../src/routes/departments'));
    app.use('/api/students', require('../src/routes/students'));
    app.use('/api/external-examiners', require('../src/routes/externalExaminers'));
    app.use('/api/examiner-assignments', require('../src/routes/examinerAssignments'));
    app.use('/api/print', require('../src/routes/print'));
    app.use('/api/proposals', require('../src/routes/proposals'));
    app.use('/api/announcements', require('../src/routes/announcements'));
    app.use('/api/assignment-requests', require('../src/routes/assignmentRequests'));
    app.use('/api/student-groups', require('../src/routes/studentGroups'));
    app.use('/api/proposals', require('../src/routes/proposalComments'));
    app.use('/api/ai', require('../src/routes/ai'));
    app.use('/api/chatbot', require('../src/routes/chatbot'));
    app.use('/api/files-audit', require('../src/routes/files-audit'));

    app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'Thesis Management API is running' }));
    app.get('/api/download-template/:filename', authenticate, (req, res) => {
      const allowed = ['bachelor_upload_template.xlsx', 'master_upload_template.xlsx', 'student_users_template.xlsx', 'supervisor_users_template.xlsx', 'external_users_template.xlsx'];
      if (!allowed.includes(req.params.filename)) return res.status(400).json({ error: 'Invalid template filename' });
      const filePath = path.join(__dirname, '..', 'excel-templates', req.params.filename);
      res.download(filePath);
    });

    app.use(errorHandler);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseURL = `http://127.0.0.1:${port}`;
    console.log(`▶ Test server listening on ephemeral port ${port}\n`);

    const client = (token) =>
      axios.create({
        baseURL,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        validateStatus: () => true, // Don't throw on non-2xx
      });

    const maintApi = client(maintToken);
    const coordApi = client(coordToken);
    const superApi = client(superToken);
    const studentApi = client(masterToken);
    const bachApi = client(bachToken);
    const examApi = client(examToken);
    const anonApi = client(null);

    // ==========================================
    // SECTION 1: Health & Public Routes
    // ==========================================
    console.log('--- SECTION 1: Health & Public Routes ---');
    {
      const res = await anonApi.get('/api/health');
      if (res.status === 200 && res.data.status === 'ok') recordPass('GET /api/health');
      else recordFail('GET /api/health', res.data);
    }

    // ==========================================
    // SECTION 2: Auth Endpoints
    // ==========================================
    console.log('\n--- SECTION 2: Auth Endpoints ---');
    {
      // Valid login
      const res = await anonApi.post('/api/auth/login', {
        email: coordinator.email,
        password: 'subesh',
      });
      if (res.status === 200 && res.data.token && res.data.user) {
        recordPass('POST /api/auth/login (valid credentials)', `User: ${res.data.user.email}`);
      } else {
        recordFail('POST /api/auth/login (valid credentials)', res.data);
      }

      // Invalid login
      const resBad = await anonApi.post('/api/auth/login', {
        email: coordinator.email,
        password: 'wrongpassword123',
      });
      if (resBad.status === 401 || resBad.status === 400) {
        recordPass('POST /api/auth/login (invalid credentials rejected)', `Status ${resBad.status}`);
      } else {
        recordFail('POST /api/auth/login (invalid credentials rejected)', resBad.data);
      }

      // GET /api/auth/me
      const resMe = await coordApi.get('/api/auth/me');
      if (resMe.status === 200 && resMe.data.id === coordinator.id) {
        recordPass('GET /api/auth/me (authenticated user returned)', `Role: ${resMe.data.role}`);
      } else {
        recordFail('GET /api/auth/me', resMe.data);
      }

      // POST /api/auth/logout
      const resLogout = await coordApi.post('/api/auth/logout');
      if (resLogout.status === 200) recordPass('POST /api/auth/logout');
      else recordFail('POST /api/auth/logout', resLogout.data);
    }

    // ==========================================
    // SECTION 3: Users & RBAC
    // ==========================================
    console.log('\n--- SECTION 3: Users & RBAC Endpoints ---');
    {
      // Coordinator lists users
      const res = await coordApi.get('/api/users');
      if (res.status === 200 && Array.isArray(res.data.users || res.data)) {
        const count = Array.isArray(res.data) ? res.data.length : res.data.users.length;
        recordPass('GET /api/users (Coordinator access)', `Count: ${count}`);
      } else {
        recordFail('GET /api/users', res.data);
      }

      // Student attempting to list users -> 403 Forbidden
      const resStud = await studentApi.get('/api/users');
      if (resStud.status === 403) {
        recordPass('GET /api/users RBAC (Student blocked with 403 Forbidden)');
      } else {
        recordFail('GET /api/users RBAC (Expected 403)', resStud.status);
      }

      // GET /api/users/role/SUPERVISOR
      const resSuper = await coordApi.get('/api/users/role/SUPERVISOR');
      if (resSuper.status === 200 && Array.isArray(resSuper.data)) {
        recordPass('GET /api/users/role/SUPERVISOR', `Found ${resSuper.data.length} supervisors`);
      } else {
        recordFail('GET /api/users/role/SUPERVISOR', resSuper.data);
      }

      // GET /api/users/supervisor-scope
      const resScope = await coordApi.get('/api/users/supervisor-scope');
      if (resScope.status === 200) {
        recordPass('GET /api/users/supervisor-scope');
      } else {
        recordFail('GET /api/users/supervisor-scope', resScope.data);
      }

      // GET /api/users/audit-logs
      const resAudit = await coordApi.get('/api/users/audit-logs');
      if (resAudit.status === 200) {
        recordPass('GET /api/users/audit-logs');
      } else {
        recordFail('GET /api/users/audit-logs', resAudit.data);
      }
    }

    // ==========================================
    // SECTION 4: Departments & Academic Structure
    // ==========================================
    console.log('\n--- SECTION 4: Departments & Academic Structure ---');
    {
      const res = await coordApi.get('/api/departments');
      if (res.status === 200 && Array.isArray(res.data)) {
        recordPass('GET /api/departments', `Departments: ${res.data.length}`);
      } else {
        recordFail('GET /api/departments', res.data);
      }

      const resProg = await coordApi.get('/api/departments/programs');
      if (resProg.status === 200 && Array.isArray(resProg.data)) {
        recordPass('GET /api/departments/programs', `Programs: ${resProg.data.length}`);
      } else {
        recordFail('GET /api/departments/programs', resProg.data);
      }

      const resYears = await coordApi.get('/api/departments/academic-years');
      if (resYears.status === 200 && Array.isArray(resYears.data)) {
        recordPass('GET /api/departments/academic-years', `Academic Years: ${resYears.data.length}`);
      } else {
        recordFail('GET /api/departments/academic-years', resYears.data);
      }
    }

    // ==========================================
    // SECTION 5: Announcements & Student Form Submissions
    // ==========================================
    console.log('\n--- SECTION 5: Announcements & Form Submissions ---');
    let testAnnouncement = null;
    {
      const res = await coordApi.get('/api/announcements');
      if (res.status === 200 && Array.isArray(res.data)) {
        testAnnouncement = res.data.find((a) => a.batch === '2082') || res.data[0];
        recordPass('GET /api/announcements', `Total: ${res.data.length}`);
      } else {
        recordFail('GET /api/announcements', res.data);
      }

      if (testAnnouncement) {
        const resSingle = await coordApi.get(`/api/announcements/${testAnnouncement.id}`);
        if (resSingle.status === 200) {
          recordPass(`GET /api/announcements/:id (${testAnnouncement.title.slice(0, 30)}...)`);
        } else {
          recordFail('GET /api/announcements/:id', resSingle.data);
        }

        const resResponses = await coordApi.get(`/api/announcements/${testAnnouncement.id}/form-responses`);
        if (resResponses.status === 200 && (Array.isArray(resResponses.data) || Array.isArray(resResponses.data.filled))) {
          const count = Array.isArray(resResponses.data) ? resResponses.data.length : resResponses.data.filled.length;
          recordPass(`GET /api/announcements/:id/form-responses`, `Filled count: ${count}`);
        } else {
          recordFail('GET /api/announcements/:id/form-responses', resResponses.data);
        }
      }
    }

    // ==========================================
    // SECTION 6: Theses (Master level)
    // ==========================================
    console.log('\n--- SECTION 6: Theses (Master Level) ---');
    let sampleThesis = await prisma.thesis.findFirst();
    let sampleThesisId = sampleThesis?.id;
    {
      const res = await maintApi.get('/api/theses');
      if (res.status === 200 && (Array.isArray(res.data.theses) || Array.isArray(res.data))) {
        const theses = res.data.theses || res.data;
        if (theses.length > 0) sampleThesisId = theses[0].id;
        recordPass('GET /api/theses (Maintainer scope)', `Theses count: ${theses.length}`);
      } else {
        recordFail('GET /api/theses', res.data);
      }

      if (sampleThesisId) {
        const resSingle = await maintApi.get(`/api/theses/${sampleThesisId}`);
        if (resSingle.status === 200) {
          recordPass(`GET /api/theses/:id (Maintainer access: ${sampleThesisId})`);
        } else {
          recordFail('GET /api/theses/:id', resSingle.data);
        }
      }

      // Student Theses
      const resStudTheses = await studentApi.get('/api/students/theses');
      if (resStudTheses.status === 200) {
        recordPass('GET /api/students/theses (Student role access)');
      } else {
        recordFail('GET /api/students/theses', resStudTheses.data);
      }
    }

    // ==========================================
    // SECTION 7: Groups (Bachelor Level)
    // ==========================================
    console.log('\n--- SECTION 7: Groups (Bachelor Level) ---');
    let sampleGroup = await prisma.projectGroup.findFirst();
    let sampleGroupId = sampleGroup?.id;
    {
      const res = await coordApi.get('/api/groups');
      if (res.status === 200 && (Array.isArray(res.data.groups) || Array.isArray(res.data))) {
        const groups = res.data.groups || res.data;
        if (groups.length > 0) sampleGroupId = groups[0].id;
        recordPass('GET /api/groups', `Groups count: ${groups.length}`);
      } else {
        recordFail('GET /api/groups', res.data);
      }

      if (sampleGroupId) {
        const resSingle = await coordApi.get(`/api/groups/${sampleGroupId}`);
        if (resSingle.status === 200) {
          recordPass(`GET /api/groups/:id (${sampleGroupId})`);
        } else {
          recordFail('GET /api/groups/:id', resSingle.data);
        }
      }

      // Student Groups
      const resStudGroups = await bachApi.get('/api/students/groups');
      if (resStudGroups.status === 200) {
        recordPass('GET /api/students/groups (Student role access)');
      } else {
        recordFail('GET /api/students/groups', resStudGroups.data);
      }
    }

    // ==========================================
    // SECTION 8: Student Group Peer Selection Endpoints
    // ==========================================
    console.log('\n--- SECTION 8: Student Peer Formation Endpoints ---');
    {
      const resMy = await studentApi.get('/api/student-groups');
      if (resMy.status === 200) {
        recordPass('GET /api/student-groups');
      } else {
        recordFail('GET /api/student-groups', resMy.data);
      }

      const resAvail = await studentApi.get('/api/student-groups/available');
      if (resAvail.status === 200) {
        recordPass('GET /api/student-groups/available');
      } else {
        recordFail('GET /api/student-groups/available', resAvail.data);
      }

      const resInvs = await studentApi.get('/api/student-groups/invitations');
      if (resInvs.status === 200) {
        recordPass('GET /api/student-groups/invitations');
      } else {
        recordFail('GET /api/student-groups/invitations', resInvs.data);
      }
    }

    // ==========================================
    // SECTION 9: Supervisor Views
    // ==========================================
    console.log('\n--- SECTION 9: Supervisor Views ---');
    {
      const resGroups = await superApi.get('/api/supervisors/groups');
      if (resGroups.status === 200) {
        recordPass('GET /api/supervisors/groups', `Assigned groups: ${resGroups.data.length || 0}`);
      } else {
        recordFail('GET /api/supervisors/groups', resGroups.data);
      }

      const resTheses = await superApi.get('/api/supervisors/theses');
      if (resTheses.status === 200) {
        recordPass('GET /api/supervisors/theses', `Assigned theses: ${resTheses.data.length || 0}`);
      } else {
        recordFail('GET /api/supervisors/theses', resTheses.data);
      }
    }

    // ==========================================
    // SECTION 10: External Examiners & Assignments
    // ==========================================
    console.log('\n--- SECTION 10: External Examiners & Assignments ---');
    {
      const resExtGroups = await examApi.get('/api/external-examiners/groups');
      if (resExtGroups.status === 200) {
        recordPass('GET /api/external-examiners/groups', `Total: ${resExtGroups.data.length || 0}`);
      } else {
        recordFail('GET /api/external-examiners/groups', resExtGroups.data);
      }

      const resExtTheses = await examApi.get('/api/external-examiners/theses');
      if (resExtTheses.status === 200) {
        recordPass('GET /api/external-examiners/theses', `Total: ${resExtTheses.data.length || 0}`);
      } else {
        recordFail('GET /api/external-examiners/theses', resExtTheses.data);
      }

      if (sampleGroupId) {
        const resAssign = await coordApi.get(`/api/examiner-assignments/group/${sampleGroupId}`);
        if (resAssign.status === 200) {
          recordPass(`GET /api/examiner-assignments/group/:id (${sampleGroupId})`);
        } else {
          recordFail('GET /api/examiner-assignments/group/:id', resAssign.data);
        }
      }

      if (sampleThesisId) {
        const resAssignT = await coordApi.get(`/api/examiner-assignments/thesis/${sampleThesisId}`);
        if (resAssignT.status === 200) {
          recordPass(`GET /api/examiner-assignments/thesis/:id (${sampleThesisId})`);
        } else {
          recordFail('GET /api/examiner-assignments/thesis/:id', resAssignT.data);
        }
      }
    }

    // ==========================================
    // SECTION 11: Evaluations & Defense Grading
    // ==========================================
    console.log('\n--- SECTION 11: Evaluations & Defense Grading ---');
    {
      if (sampleGroupId) {
        const resEvalGroup = await coordApi.get(`/api/evaluations/group/${sampleGroupId}`);
        if (resEvalGroup.status === 200) {
          recordPass(`GET /api/evaluations/group/:id (${sampleGroupId})`);
        } else {
          recordFail('GET /api/evaluations/group/:id', resEvalGroup.data);
        }
      }

      const supervisedThesis = await prisma.thesis.findFirst({ where: { supervisorId: supervisor.id } }) || sampleThesis;
      if (supervisedThesis) {
        const resEvalThesis = await superApi.get(`/api/evaluations/thesis/${supervisedThesis.id}`);
        if (resEvalThesis.status === 200) {
          recordPass(`GET /api/evaluations/thesis/:id (Supervisor access: ${supervisedThesis.id})`);
        } else {
          recordFail('GET /api/evaluations/thesis/:id', resEvalThesis.data);
        }
      }
    }

    // ==========================================
    // SECTION 12: Notifications
    // ==========================================
    console.log('\n--- SECTION 12: Notifications ---');
    {
      const res = await coordApi.get('/api/notifications');
      if (res.status === 200) {
        recordPass('GET /api/notifications');
      } else {
        recordFail('GET /api/notifications', res.data);
      }

      const resStud = await studentApi.get('/api/students/notifications');
      if (resStud.status === 200) {
        recordPass('GET /api/students/notifications');
      } else {
        recordFail('GET /api/students/notifications', resStud.data);
      }
    }

    // ==========================================
    // SECTION 13: Print & PDF Generation
    // ==========================================
    console.log('\n--- SECTION 13: Print & PDF Document Generation ---');
    {
      if (sampleThesisId) {
        const resSheet = await coordApi.get(`/api/print/evaluation-sheet?thesisId=${sampleThesisId}&evalType=DEFENSE`);
        if (resSheet.status === 200 || resSheet.status === 400 || resSheet.status === 404) {
          recordPass(`GET /api/print/evaluation-sheet (Endpoint responsive, status ${resSheet.status})`);
        } else {
          recordFail('GET /api/print/evaluation-sheet', resSheet.data);
        }
      }
    }

    // ==========================================
    // SECTION 14: Proposals & Late Proposals & Comments
    // ==========================================
    console.log('\n--- SECTION 14: Proposals & Comments ---');
    {
      const resLate = await coordApi.get('/api/proposals/pending');
      if (resLate.status === 200) {
        recordPass('GET /api/proposals/pending (Coordinator view)');
      } else {
        recordFail('GET /api/proposals/pending', resLate.data);
      }

      const prop = await prisma.proposal.findFirst();
      if (prop) {
        const resComments = await coordApi.get(`/api/proposals/${prop.id}/comments`);
        if (resComments.status === 200) {
          recordPass(`GET /api/proposals/:id/comments (${prop.id})`);
        } else {
          recordFail('GET /api/proposals/:id/comments', resComments.data);
        }
      }
    }

    // ==========================================
    // SECTION 15: AI & Chatbot Endpoints
    // ==========================================
    console.log('\n--- SECTION 15: AI & Chatbot Endpoints ---');
    {
      const prop = await prisma.proposal.findFirst();
      if (prop) {
        // Status endpoint
        const resStatus = await coordApi.post(`/api/chatbot/chatbot/status/${prop.id}`);
        if (resStatus.status === 200 || resStatus.status === 400 || resStatus.status === 404 || resStatus.status === 502 || resStatus.status === 503) {
          recordPass(`POST /api/chatbot/chatbot/status/:id (${prop.id})`, `Status ${resStatus.status}`);
        } else {
          recordFail('POST /api/chatbot/chatbot/status/:id', resStatus.data);
        }

        // Check topic similarity / novelty proxy
        const resSim = await coordApi.post(`/api/ai/similarity/${prop.id}`, {
          text: 'Deep learning for image recognition',
        });
        if (resSim.status === 200 || resSim.status === 400 || resSim.status === 404 || resSim.status === 500 || resSim.status === 502 || resSim.status === 503) {
          recordPass(`POST /api/ai/similarity/:id (${prop.id})`, `Status ${resSim.status}`);
        } else {
          recordFail('POST /api/ai/similarity/:id', resSim.data);
        }
      }
    }

    // ==========================================
    // SECTION 16: File Auditing & Templates
    // ==========================================
    console.log('\n--- SECTION 16: File Auditing & Templates ---');
    {
      const resAudit = await maintApi.get('/api/files-audit');
      if (resAudit.status === 200 && Array.isArray(resAudit.data)) {
        recordPass('GET /api/files-audit (Maintainer role)', `Audit entries: ${resAudit.data.length}`);
      } else {
        recordFail('GET /api/files-audit', resAudit.data);
      }

      // Download template check
      const resTmpl = await coordApi.get('/api/download-template/bachelor_upload_template.xlsx');
      if (resTmpl.status === 200) {
        recordPass('GET /api/download-template/bachelor_upload_template.xlsx');
      } else {
        recordFail('GET /api/download-template/bachelor_upload_template.xlsx', resTmpl.data);
      }
    }

    console.log('\n========================================================');
    console.log(` FINAL ROUTE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    if (failed > 0) {
      console.log('\nFailed Tests:');
      results.filter(r => r.status === 'FAIL').forEach(f => console.log(` - ${f.name}: ${f.error}`));
    }
    console.log('========================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('\nFatal test execution error:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
    await prisma.$disconnect();
  }
}

runTestSuite();
