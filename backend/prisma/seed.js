const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
const { getDefaultComponents } = require('../src/config/evaluationScheme');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

// The 5 evaluation components for the minor project. Each component declares
// which role is responsible for filling it in. This is the single source of
// truth that mirrors the academic regulation table (50 marks total).
const EVALUATION_COMPONENTS = [
  { name: 'Supervisor',         evaluationType: 'SUPERVISOR',        evaluatorRole: 'SUPERVISOR',        maxMarks: 25 },
  { name: 'Proposal Defense',   evaluationType: 'PROPOSAL_DEFENSE',  evaluatorRole: 'COORDINATOR',       maxMarks: 5 },
  { name: 'Mid-Term Defense',   evaluationType: 'MIDTERM_DEFENSE',   evaluatorRole: 'COORDINATOR',       maxMarks: 5 },
  { name: 'Final Defense',      evaluationType: 'FINAL_DEFENSE',     evaluatorRole: 'COORDINATOR',       maxMarks: 5 },
  { name: 'Internal Examiner',  evaluationType: 'EXTERNAL_EXAMINER', evaluatorRole: 'EXTERNAL_EXAMINER', maxMarks: 10 },
];

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.recommendation.deleteMany();
  await prisma.examinerAssignment.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.evaluationComponent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.projectGroup.deleteMany();
  await prisma.thesis.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.department.deleteMany();
  await prisma.externalExaminer.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash('subesh', 10);

  // ============================================================
  // DEPARTMENTS
  // ============================================================
  const depts = {};
  const deptDefs = [
    { name: 'Computer Engineering', code: 'BCT' },
    { name: 'Electronics & Communication Engineering', code: 'BEX' },
    { name: 'Electrical Engineering', code: 'BEL' },
    { name: 'Civil Engineering', code: 'BCE' },
    { name: 'Mechanical Engineering', code: 'BME' },
    { name: 'Architecture', code: 'B.Arch' },
  ];
  for (const d of deptDefs) {
    depts[d.code] = await prisma.department.create({ data: d });
  }
  console.log(`Created ${deptDefs.length} departments`);

  // ============================================================
  // ACADEMIC YEARS
  // ============================================================
  const ayBCT = {};
  const ayDefs = [
    { year: '2078', semester: 'Regular', departmentId: depts.BCT.id, isActive: false },
    { year: '2080', semester: 'Regular', departmentId: depts.BCT.id, isActive: true },
    { year: '2081', semester: 'Regular', departmentId: depts.BCT.id, isActive: false },
  ];
  for (const a of ayDefs) {
    const created = await prisma.academicYear.create({ data: a });
    ayBCT[a.year] = created;
  }
  const ayBEX = await prisma.academicYear.create({
    data: { year: '2080', semester: 'Regular', departmentId: depts.BEX.id, isActive: false },
  });
  console.log('Created academic years (2078, 2080, 2081)');

  // ============================================================
  // USERS
  // ============================================================
  // Maintainer
  const maintainer = await prisma.user.create({
    data: { email: 'subeshgaming@gmail.com', password: hash, firstName: 'Subesh', lastName: 'Gaming', role: 'MAINTAINER' },
  });
  console.log('Created MAINTAINER: subeshgaming@gmail.com / subesh');

  // Coordinator
  const coord = await prisma.user.create({
    data: { email: 'coordinator@pcampus.edu.np', password: hash, firstName: 'Ram', lastName: 'Prasad', role: 'COORDINATOR' },
  });
  console.log('Created COORDINATOR: coordinator@pcampus.edu.np / subesh');

  // Supervisors
  const supDefs = [
    { fn: 'Prabesh', ln: 'Bhattarai', email: 'prabeshbchettri25@gmail.com' },
    { fn: 'Ramesh', ln: 'Sharma', email: 'ramesh.sharma@pcampus.edu.np' },
    { fn: 'Anita', ln: 'Gurung', email: 'anita.gurung@pcampus.edu.np' },
    { fn: 'Bishnu', ln: 'Tamang', email: 'bishnu.tamang@pcampus.edu.np' },
    { fn: 'Sagar', ln: 'Acharya', email: 'sagar.acharya@pcampus.edu.np' },
    { fn: 'Maya', ln: 'Khadka', email: 'maya.khadka@pcampus.edu.np' },
  ];
  const supervisors = [];
  for (const sup of supDefs) {
    const s = await prisma.user.create({
      data: { email: sup.email, password: hash, firstName: sup.fn, lastName: sup.ln, role: 'SUPERVISOR' },
    });
    supervisors.push(s);
  }
  console.log(`Created ${supervisors.length} supervisors`);

  // External Examiners (these users fill the "Internal Examiner" component)
  const externalExamDefs = [
    { fn: 'Dr. Hari', ln: 'Adhikari', email: 'hari.adhikari@ioe.edu.np' },
    { fn: 'Prof. Suman', ln: 'Bhattarai', email: 'suman.bhattarai@ioe.edu.np' },
  ];
  const externalExaminers = [];
  for (const ex of externalExamDefs) {
    const u = await prisma.user.create({
      data: { email: ex.email, password: hash, firstName: ex.fn, lastName: ex.ln, role: 'EXTERNAL_EXAMINER' },
    });
    externalExaminers.push(u);
  }
  console.log(`Created ${externalExamDefs.length} external examiners (Internal Examiners)`);

  // Students — 44 total: 30 bachelor, 6 master, 4 unassigned, 2 test, 2 dummy
  const studentDefs = [
    // ── BACHELOR STUDENTS (indices 0-29) ──
    { fn: 'Aarav', ln: 'Khadka', roll: '078BCT001', degreeType: 'BACHELOR' },
    { fn: 'Binita', ln: 'Shrestha', roll: '078BCT002', degreeType: 'BACHELOR' },
    { fn: 'Chandra', ln: 'Thapa', roll: '078BCT003', degreeType: 'BACHELOR' },
    { fn: 'Deepa', ln: 'Poudel', roll: '078BCT004', degreeType: 'BACHELOR' },
    { fn: 'Ekaraj', ln: 'Rana', roll: '078BCT005', degreeType: 'BACHELOR' },
    { fn: 'Falguni', ln: 'Neupane', roll: '078BCT006', degreeType: 'BACHELOR' },
    { fn: 'Ganesh', ln: 'Bhandari', roll: '078BCT007', degreeType: 'BACHELOR' },
    { fn: 'Hima', ln: 'Acharya', roll: '078BCT008', degreeType: 'BACHELOR' },
    { fn: 'Indra', ln: 'Joshi', roll: '078BCT009', degreeType: 'BACHELOR' },
    { fn: 'Janaki', ln: 'Dahal', roll: '078BCT010', degreeType: 'BACHELOR' },
    { fn: 'Krishna', ln: 'Pokharel', roll: '078BCT011', degreeType: 'BACHELOR' },
    { fn: 'Laxmi', ln: 'Regmi', roll: '078BCT012', degreeType: 'BACHELOR' },
    { fn: 'Madhav', ln: 'Bastola', roll: '078BCT013', degreeType: 'BACHELOR' },
    { fn: 'Nisha', ln: 'Lama', roll: '078BCT014', degreeType: 'BACHELOR' },
    { fn: 'Om', ln: 'Pandey', roll: '078BCT015', degreeType: 'BACHELOR' },
    // BCT 2080 batch (roll: 080BCTXXX)
    { fn: 'Pooja', ln: 'Magar', roll: '080BCT001', degreeType: 'BACHELOR' },
    { fn: 'Rabi', ln: 'Koirala', roll: '080BCT002', degreeType: 'BACHELOR' },
    { fn: 'Sita', ln: 'Bhattarai', roll: '080BCT003', degreeType: 'BACHELOR' },
    { fn: 'Tika', ln: 'Adhikari', roll: '080BCT004', degreeType: 'BACHELOR' },
    { fn: 'Usha', ln: 'Dhami', roll: '080BCT005', degreeType: 'BACHELOR' },
    { fn: 'Bibek', ln: 'Chaudhary', roll: '080BCT006', degreeType: 'BACHELOR' },
    { fn: 'Muna', ln: 'Gautam', roll: '080BCT007', degreeType: 'BACHELOR' },
    { fn: 'Rajan', ln: 'Puri', roll: '080BCT008', degreeType: 'BACHELOR' },
    { fn: 'Sushma', ln: 'Karki', roll: '080BCT009', degreeType: 'BACHELOR' },
    { fn: 'Dipesh', ln: 'Giri', roll: '080BCT010', degreeType: 'BACHELOR' },
    // BEX 2080 batch
    { fn: 'Kabita', ln: 'Bista', roll: '080BEX001', degreeType: 'BACHELOR' },
    { fn: 'Yubaraj', ln: 'Dhakal', roll: '080BEX002', degreeType: 'BACHELOR' },
    { fn: 'Sarita', ln: 'Oli', roll: '080BEX003', degreeType: 'BACHELOR' },
    { fn: 'Nabin', ln: 'Chalise', roll: '080BEX004', degreeType: 'BACHELOR' },
    { fn: 'Reema', ln: 'Pathak', roll: '080BEX005', degreeType: 'BACHELOR' },
    // ── MASTER THESIS STUDENTS (indices 30-35) ──
    { fn: 'Anup', ln: 'Baral', roll: '081BCT001', degreeType: 'MASTER' },
    { fn: 'Bhawana', ln: 'Sapkota', roll: '081BCT002', degreeType: 'MASTER' },
    { fn: 'Dinesh', ln: 'Parajuli', roll: '081BCT003', degreeType: 'MASTER' },
    { fn: 'Elina', ln: 'Maskey', roll: '081BCT004', degreeType: 'MASTER' },
    { fn: 'Firoj', ln: 'Ansari', roll: '081BCT005', degreeType: 'MASTER' },
    { fn: 'Gita', ln: 'Neupane', roll: '081BCT006', degreeType: 'MASTER' },
    // ── UNASSIGNED STUDENTS (indices 36-39) ──
    { fn: 'Hari', ln: 'Bohora', roll: '081BCT007', degreeType: 'BACHELOR' },
    { fn: 'Isha', ln: 'Adhikari', roll: '081BCT008', degreeType: 'BACHELOR' },
    { fn: 'Jeevan', ln: 'Bhandari', roll: '081BCT009', degreeType: 'BACHELOR' },
    { fn: 'Kamala', ln: 'Poudel', roll: '081BCT010', degreeType: 'BACHELOR' },
  ];

  const students = [];
  for (const s of studentDefs) {
    const student = await prisma.user.create({
      data: {
        email: `${s.roll.toLowerCase()}@pcampus.edu.np`,
        password: hash,
        firstName: s.fn,
        lastName: s.ln,
        role: 'STUDENT',
        degreeType: s.degreeType,
      },
    });
    students.push(student);
  }
  console.log(`Created ${students.length} students (30 bachelor, 6 master, 4 unassigned)`);

  // Helper to attach default components based on project type
  async function attachComponents({ groupId, thesisId, projectType }) {
    const out = {};
    const defaults = getDefaultComponents(projectType || 'MINOR');
    for (const c of defaults) {
      const created = await prisma.evaluationComponent.create({
        data: { ...c, groupId, thesisId, createdById: maintainer.id },
      });
      out[c.evaluationType] = created;
    }
    return out;
  }

  // ============================================================
  // BACHELOR PROJECT GROUPS (10 groups × 3 students = 30 students)
  // ============================================================
  const groupDefs = [
    { name: 'AlphaDev', title: 'AI-Powered Code Review Assistant for Nepali Developers', ay: ayBCT['2080'] },
    { name: 'CloudNine', title: 'Multi-Cloud Cost Optimization Dashboard for SMEs', ay: ayBCT['2080'] },
    { name: 'DataPulse', title: 'Real-Time Data Analytics for IoT-enabled Hydropower Plants', ay: ayBCT['2080'] },
    { name: 'EduBridge', title: 'Online Learning Platform with Nepali Language AI Tutor', ay: ayBCT['2080'] },
    { name: 'KisanAI', title: 'Smart Agriculture Advisory System for Nepali Farmers', ay: ayBCT['2080'] },
    { name: 'HealthLink', title: 'Telemedicine Appointment & Record System for Rural Nepal', ay: ayBCT['2078'] },
    { name: 'SafeKhadya', title: 'Blockchain-based Food Supply Chain Traceability', ay: ayBCT['2078'] },
    { name: 'CyberShield', title: 'Network Intrusion Detection for Government ISPs', ay: ayBCT['2078'] },
    { name: 'GreenCompute', title: 'Energy-Efficient Edge Computing Framework', ay: ayBCT['2078'] },
    { name: 'AutoBibaran', title: 'Automated Report Generation for Local Wards using NLP', ay: ayBCT['2078'] },
  ];

  const createdGroups = [];
  for (let i = 0; i < groupDefs.length; i++) {
    const g = groupDefs[i];
    const sup = supervisors[i % supervisors.length];

    const group = await prisma.projectGroup.create({
      data: {
        name: g.name,
        projectTitle: g.title,
        projectType: 'MINOR',
        status: 'ACTIVE',
        supervisorId: sup.id,
        academicYearId: g.ay.id,
      },
    });

    // 3 bachelor students per group
    for (let m = 0; m < 3; m++) {
      const si = i * 3 + m;
      const student = students[si];
      const studentDef = studentDefs[si];
      await prisma.groupMember.create({
        data: { studentId: student.id, groupId: group.id, rollNumber: studentDef.roll },
      });
    }

    await attachComponents({ groupId: group.id, projectType: 'MINOR' });
    createdGroups.push(group);
  }
  console.log(`Created ${createdGroups.length} bachelor project groups (3 students each)`);

  // ============================================================
  // MASTER THESES (6 — students 30-35)
  // ============================================================
  const thesisDefs = [
    { title: 'Deep Learning for Nepali Handwriting Recognition', supIdx: 0 },
    { title: 'Optimizing Transformer Models for Low-Resource Nepali Languages', supIdx: 1 },
    { title: 'Federated Learning for Privacy-Preserving Healthcare in Nepal', supIdx: 2 },
    { title: 'Explainable AI for Credit Risk Assessment in Nepali Banks', supIdx: 3 },
    { title: 'Autonomous Navigation using Reinforcement Learning for Nepali Terrain', supIdx: 4 },
    { title: 'GAN-based Medical Image Augmentation for Rural Diagnostics', supIdx: 5 },
  ];

  const createdTheses = [];
  for (let i = 0; i < thesisDefs.length; i++) {
    const t = thesisDefs[i];
    const studentIdx = 30 + i;
    const thesis = await prisma.thesis.create({
      data: {
        title: t.title,
        projectType: 'MASTER',
        studentId: students[studentIdx].id,
        status: 'ACTIVE',
        supervisorId: supervisors[t.supIdx].id,
        academicYearId: ayBCT['2080'].id,
      },
    });
    await attachComponents({ thesisId: thesis.id, projectType: 'MASTER' });
    createdTheses.push(thesis);
  }
  console.log(`Created ${thesisDefs.length} master theses`);

  // ============================================================
  // SAMPLE SUBMISSIONS & EVALUATIONS for the first 5 groups
  // Each role evaluates its own component via componentId.
  // ============================================================
  for (let i = 0; i < 5 && i < createdGroups.length; i++) {
    const g = createdGroups[i];
    if (!g.supervisorId) continue;

    // Pull the components for this group
    const components = await prisma.evaluationComponent.findMany({ where: { groupId: g.id } });
    const compByType = Object.fromEntries(components.map(c => [c.evaluationType, c]));

    // 1. Student submits proposal document
    const groupMemberStudent = students[i * 3];
    await prisma.proposal.create({
      data: { stage: 'PROPOSAL', documentUrl: '/api/files/groups/sample_proposal.pdf', submittedById: groupMemberStudent.id, groupId: g.id },
    });

    // 2. Coordinator enters Proposal Defense marks (out of 5)
    await prisma.evaluation.create({
      data: {
        componentId: compByType.PROPOSAL_DEFENSE.id,
        stage: 'PROPOSAL',
        evaluationType: 'PROPOSAL_DEFENSE',
        marks: 4.0,
        comment: 'Strong defense presentation.',
        status: 'COMPLETED',
        submittedById: coord.id,
        groupId: g.id,
      },
    });

    // 3. Coordinator enters Mid-Term Defense marks (out of 5)
    await prisma.evaluation.create({
      data: {
        componentId: compByType.MIDTERM_DEFENSE.id,
        stage: 'MID_TERM',
        evaluationType: 'MIDTERM_DEFENSE',
        marks: 3.5,
        comment: 'Progress is on track.',
        status: 'COMPLETED',
        submittedById: coord.id,
        groupId: g.id,
      },
    });

    // 4. Supervisor enters Supervisor marks (out of 25) — single row per component
    await prisma.evaluation.create({
      data: {
        componentId: compByType.SUPERVISOR.id,
        stage: 'FINAL',
        evaluationType: 'SUPERVISOR',
        marks: 21.5,
        comment: 'Well-structured proposal. Consistently high performance throughout the semester.',
        status: 'COMPLETED',
        submittedById: g.supervisorId,
        groupId: g.id,
      },
    });

    // 5. Internal Examiner (EXTERNAL_EXAMINER) enters Internal Examiner marks (out of 10)
    const examiner = externalExaminers[i % externalExaminers.length];
    await prisma.evaluation.create({
      data: {
        componentId: compByType.EXTERNAL_EXAMINER.id,
        stage: 'FINAL',
        evaluationType: 'EXTERNAL_EXAMINER',
        marks: 8.0,
        comment: 'Solid technical implementation and well-written final report.',
        status: 'COMPLETED',
        submittedById: examiner.id,
        groupId: g.id,
      },
    });

    // 6. Coordinator enters Final Defense marks (out of 5)
    await prisma.evaluation.create({
      data: {
        componentId: compByType.FINAL_DEFENSE.id,
        stage: 'FINAL',
        evaluationType: 'FINAL_DEFENSE',
        marks: 4.5,
        comment: 'Confident final defense with clear demonstration.',
        status: 'COMPLETED',
        submittedById: coord.id,
        groupId: g.id,
      },
    });
  }
  // Mark first 5 groups as COMPLETED since all evaluations are done
  for (let i = 0; i < 5 && i < createdGroups.length; i++) {
    await prisma.projectGroup.update({
      where: { id: createdGroups[i].id },
      data: { status: 'COMPLETED' },
    });
  }
  console.log('Created sample submissions & feedback for first 5 groups');

  // ============================================================
  // EXAMINER ASSIGNMENTS (assign external examiners to first 5 groups + first 3 theses)
  // ============================================================
  for (let i = 0; i < 5 && i < createdGroups.length; i++) {
    const g = createdGroups[i];
    const examiner = externalExaminers[i % externalExaminers.length];
    await prisma.examinerAssignment.create({
      data: { externalExaminerId: examiner.id, groupId: g.id, assignedById: coord.id },
    });
  }
  for (let i = 0; i < Math.min(3, createdTheses.length); i++) {
    const thesis = createdTheses[i];
    const examiner = externalExaminers[i % externalExaminers.length];
    await prisma.examinerAssignment.create({
      data: { externalExaminerId: examiner.id, thesisId: thesis.id, assignedById: coord.id },
    });
  }
  console.log('Created examiner assignments');

  // ============================================================
  // NOTIFICATIONS for some students
  // ============================================================
  await prisma.notification.create({
    data: {
      type: 'SUPERVISOR_ASSIGNED',
      message: 'Supervisor Prabesh Bhattarai has been assigned to your group AlphaDev.',
      userId: students[0].id,
    },
  });
  await prisma.notification.create({
    data: {
      type: 'FEEDBACK',
      message: 'Supervisor provided feedback on your Proposal stage.',
      userId: students[0].id,
    },
  });
  await prisma.notification.create({
    data: {
      type: 'SUPERVISOR_ASSIGNED',
      message: 'Supervisor Prabesh Bhattarai has been assigned to your thesis.',
      userId: students[30].id,
    },
  });
  console.log('Created sample notifications');

  // ============================================================
  // EXTERNAL EXAMINER ENTRIES (reference records, separate from Users)
  // ============================================================
  await prisma.externalExaminer.create({
    data: { name: 'Dr. Hari Adhikari', email: 'hari.adhikari@ioe.edu.np', phone: '9851122334', department: 'Computer Engineering' },
  });
  await prisma.externalExaminer.create({
    data: { name: 'Prof. Suman Bhattarai', email: 'suman.bhattarai@ioe.edu.np', phone: '9845566778', department: 'Computer Engineering' },
  });

  // ============================================================
  // TEST USERS with simple emails for easy testing
  // ============================================================
  const testSup = await prisma.user.create({
    data: { email: 'supervisor@test.com', password: hash, firstName: 'Test', lastName: 'Supervisor', role: 'SUPERVISOR' },
  });
  const testExaminer = await prisma.user.create({
    data: { email: 'examiner@test.com', password: hash, firstName: 'Test', lastName: 'Examiner', role: 'EXTERNAL_EXAMINER' },
  });
  const testBachelorStu = await prisma.user.create({
    data: { email: 'bachelor@test.com', password: hash, firstName: 'Bach', lastName: 'Student', role: 'STUDENT', degreeType: 'BACHELOR' },
  });
  const testMasterStu = await prisma.user.create({
    data: { email: 'master@test.com', password: hash, firstName: 'Mast', lastName: 'Student', role: 'STUDENT', degreeType: 'MASTER' },
  });

  // Create a MAJOR project group to test 100-mark scheme
  const majorGroup = await prisma.projectGroup.create({
    data: {
      name: 'MajorTest',
      projectTitle: 'Major Project Test — Advanced ML System',
      projectType: 'MAJOR',
      status: 'ACTIVE',
      supervisorId: testSup.id,
      academicYearId: ayBCT['2080'].id,
    },
  });
  // Add 2 students to the major group
  for (const s of [testBachelorStu, students[students.length - 1]]) {
    await prisma.groupMember.create({
      data: { studentId: s.id, groupId: majorGroup.id, rollNumber: s.id === testBachelorStu.id ? 'TEST001' : 'TEST002' },
    });
  }
  // Attach MAJOR components (100 marks)
  const majorComponents = await attachComponents({ groupId: majorGroup.id, projectType: 'MAJOR' });

  // Assign external examiner to major group
  await prisma.examinerAssignment.create({
    data: { externalExaminerId: testExaminer.id, groupId: majorGroup.id, assignedById: coord.id },
  });

  // Create a master thesis for test master student
  const testThesis = await prisma.thesis.create({
    data: {
      title: 'Test Master Thesis — AI in Healthcare',
      projectType: 'MASTER',
      studentId: testMasterStu.id,
      status: 'ACTIVE',
      supervisorId: testSup.id,
      academicYearId: ayBCT['2080'].id,
    },
  });
  await attachComponents({ thesisId: testThesis.id, projectType: 'MASTER' });
  await prisma.examinerAssignment.create({
    data: { externalExaminerId: testExaminer.id, thesisId: testThesis.id, assignedById: coord.id },
  });

  // Sample evaluations for major group (some components filled)
  await prisma.evaluation.create({
    data: {
      componentId: majorComponents.SUPERVISOR.id, stage: 'FINAL', evaluationType: 'SUPERVISOR',
      marks: 42, comment: 'Good progress on the major project.', status: 'COMPLETED',
      submittedById: testSup.id, groupId: majorGroup.id,
    },
  });

  // Sample evaluation for master thesis (supervisor marks - partial)
  const masterComponents = await prisma.evaluationComponent.findMany({ where: { thesisId: testThesis.id } });
  const masterSupComp = masterComponents.find(c => c.evaluatorRole === 'SUPERVISOR');
  if (masterSupComp) {
    await prisma.evaluation.create({
      data: {
        componentId: masterSupComp.id, stage: 'FINAL', evaluationType: 'SUPERVISOR',
        marks: 85, comment: 'Excellent thesis work with thorough research.', status: 'COMPLETED',
        submittedById: testSup.id, thesisId: testThesis.id,
      },
    });
  }

  console.log('\n=== SEED COMPLETE ===');
  console.log('Login credentials (all use password: subesh):');
  console.log('  MAINTAINER:          subeshgaming@gmail.com');
  console.log('  COORDINATOR:         coordinator@pcampus.edu.np');
  console.log('  SUPERVISOR:          supervisor@test.com');
  console.log('  INTERNAL EXAMINER:   examiner@test.com');
  console.log('  BACHELOR STUDENT:    bachelor@test.com');
  console.log('  MASTER STUDENT:      master@test.com');
  console.log(`\nTotal: 1 maintainer, 1 coordinator, ${supervisors.length + 1} supervisors, 3 internal examiners`);
  console.log(`30 bachelor students (10 groups × 3), 6 master students, 4 unassigned + 2 test students`);
  console.log(`Bachelor Minor: Supervisor 25 + Proposal 5 + Mid-Term 5 + Final 5 + Internal Examiner 10 = 50 marks`);
  console.log(`Bachelor Major: Supervisor 50 + Proposal 10 + Mid-Term 10 + Final 10 + Internal Examiner 20 = 100 marks`);
  console.log(`Master Thesis: Supervisor 100 + External Examiner 100 = 200 marks`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
