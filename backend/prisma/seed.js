const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
const { getDefaultComponents } = require('../src/config/evaluationScheme');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

const hash = bcrypt.hashSync('subesh', 10);

function getProgramFromRoll(roll) {
  const match = roll.match(/^\d{3}([A-Za-z.]+)\d{3}$/);
  return match ? match[1].toUpperCase() : null;
}

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
  await prisma.program.deleteMany();
  await prisma.department.deleteMany();
  await prisma.externalExaminer.deleteMany();
  await prisma.user.deleteMany();

  // ============================================================
  // DEPARTMENTS & PROGRAMS
  // ============================================================
  const ceeDept = await prisma.department.create({
    data: { name: 'Bachelor in Computer & Electronics Engineering', code: 'CEE' },
  });
  const belDept = await prisma.department.create({
    data: { name: 'Bachelor in Electrical Engineering', code: 'BEL' },
  });

  const programs = {};
  const progDefs = [
    { code: 'BCT', name: 'Computer Engineering', departmentId: ceeDept.id },
    { code: 'BEI', name: 'Electronics & Information Engineering', departmentId: ceeDept.id },
    { code: 'BEL', name: 'Electrical Engineering', departmentId: belDept.id },
  ];
  for (const p of progDefs) {
    programs[p.code] = await prisma.program.create({ data: p });
  }
  console.log(`Created ${progDefs.length} programs under 2 departments`);

  // ============================================================
  // ACADEMIC YEARS (for CEE department)
  // ============================================================
  const ay = {};
  const ayDefs = [
    { year: '2078', semester: 'Regular', departmentId: ceeDept.id, isActive: false },
    { year: '2080', semester: 'Regular', departmentId: ceeDept.id, isActive: true },
    { year: '2081', semester: 'Regular', departmentId: ceeDept.id, isActive: false },
  ];
  for (const a of ayDefs) {
    ay[a.year] = await prisma.academicYear.create({ data: a });
  }
  console.log('Created academic years (2078, 2080, 2081)');

  // ============================================================
  // USERS
  // ============================================================
  // Maintainer
  const maintainer = await prisma.user.create({
    data: { email: 'subeshgaming@gmail.com', password: hash, firstName: 'Subesh', lastName: 'Gaming', role: 'MAINTAINER' },
  });

  // Coordinator for CEE department
  const coordCEE = await prisma.user.create({
    data: { email: 'coordinator@pcampus.edu.np', password: hash, firstName: 'Ram', lastName: 'Prasad', role: 'COORDINATOR', departmentId: ceeDept.id },
  });
  await prisma.department.update({ where: { id: ceeDept.id }, data: { coordinatorId: coordCEE.id } });
  console.log('Created COORDINATOR for CEE: coordinator@pcampus.edu.np / subesh');

  // Coordinator for BEL department
  const coordBEL = await prisma.user.create({
    data: { email: 'coord.bel@pcampus.edu.np', password: hash, firstName: 'Sita', lastName: 'Devi', role: 'COORDINATOR', departmentId: belDept.id },
  });
  await prisma.department.update({ where: { id: belDept.id }, data: { coordinatorId: coordBEL.id } });
  console.log('Created COORDINATOR for BEL: coord.bel@pcampus.edu.np / subesh');

  // Supervisors (all under CEE)
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
    supervisors.push(await prisma.user.create({
      data: { email: sup.email, password: hash, firstName: sup.fn, lastName: sup.ln, role: 'SUPERVISOR', departmentId: ceeDept.id },
    }));
  }
  console.log(`Created ${supervisors.length} supervisors`);

  // External Examiners
  const externalExamDefs = [
    { fn: 'Dr. Hari', ln: 'Adhikari', email: 'hari.adhikari@ioe.edu.np' },
    { fn: 'Prof. Suman', ln: 'Bhattarai', email: 'suman.bhattarai@ioe.edu.np' },
  ];
  const externalExaminers = [];
  for (const ex of externalExamDefs) {
    externalExaminers.push(await prisma.user.create({
      data: { email: ex.email, password: hash, firstName: ex.fn, lastName: ex.ln, role: 'EXTERNAL_EXAMINER', departmentId: ceeDept.id },
    }));
  }
  console.log(`Created ${externalExamDefs.length} external examiners`);

  // Students
  const studentDefs = [
    // ── BCT BACHELOR students (indices 0-24) ──
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
    // ── BEI BACHELOR students (indices 25-29) ──
    { fn: 'Kabita', ln: 'Bista', roll: '080BEI001', degreeType: 'BACHELOR' },
    { fn: 'Yubaraj', ln: 'Dhakal', roll: '080BEI002', degreeType: 'BACHELOR' },
    { fn: 'Sarita', ln: 'Oli', roll: '080BEI003', degreeType: 'BACHELOR' },
    { fn: 'Nabin', ln: 'Chalise', roll: '080BEI004', degreeType: 'BACHELOR' },
    { fn: 'Reema', ln: 'Pathak', roll: '080BEI005', degreeType: 'BACHELOR' },
    // ── MASTER STUDENTS (indices 30-35) ──
    { fn: 'Anup', ln: 'Baral', roll: '081BCT001', degreeType: 'MASTER' },
    { fn: 'Bhawana', ln: 'Sapkota', roll: '081BCT002', degreeType: 'MASTER' },
    { fn: 'Dinesh', ln: 'Parajuli', roll: '081BCT003', degreeType: 'MASTER' },
    { fn: 'Elina', ln: 'Maskey', roll: '081BCT004', degreeType: 'MASTER' },
    { fn: 'Firoj', ln: 'Ansari', roll: '081BCT005', degreeType: 'MASTER' },
    { fn: 'Gita', ln: 'Neupane', roll: '081BCT006', degreeType: 'MASTER' },
    // ── UNASSIGNED (indices 36-39) ──
    { fn: 'Hari', ln: 'Bohora', roll: '081BCT007', degreeType: 'BACHELOR' },
    { fn: 'Isha', ln: 'Adhikari', roll: '081BCT008', degreeType: 'BACHELOR' },
    { fn: 'Jeevan', ln: 'Bhandari', roll: '081BCT009', degreeType: 'BACHELOR' },
    { fn: 'Kamala', ln: 'Poudel', roll: '081BCT010', degreeType: 'BACHELOR' },
  ];

  const students = [];
  for (const s of studentDefs) {
    const progCode = getProgramFromRoll(s.roll);
    const program = programs[progCode];
    students.push(await prisma.user.create({
      data: {
        email: `${s.roll.toLowerCase()}@pcampus.edu.np`,
        password: hash,
        firstName: s.fn,
        lastName: s.ln,
        role: 'STUDENT',
        degreeType: s.degreeType,
        departmentId: program.departmentId,
        programId: program.id,
      },
    }));
  }
  console.log(`Created ${students.length} students`);

  // Helper
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
  // BACHELOR GROUPS (BCT students 0-24 → 8 groups × 3, with leftover)
  // ============================================================
  const groupDefs = [
    { name: 'AlphaDev', title: 'AI-Powered Code Review Assistant for Nepali Developers', ay: ay['2080'] },
    { name: 'CloudNine', title: 'Multi-Cloud Cost Optimization Dashboard for SMEs', ay: ay['2080'] },
    { name: 'DataPulse', title: 'Real-Time Data Analytics for IoT-enabled Hydropower Plants', ay: ay['2080'] },
    { name: 'EduBridge', title: 'Online Learning Platform with Nepali Language AI Tutor', ay: ay['2080'] },
    { name: 'KisanAI', title: 'Smart Agriculture Advisory System for Nepali Farmers', ay: ay['2080'] },
    { name: 'HealthLink', title: 'Telemedicine Appointment & Record System for Rural Nepal', ay: ay['2078'] },
    { name: 'SafeKhadya', title: 'Blockchain-based Food Supply Chain Traceability', ay: ay['2078'] },
    { name: 'GreenCompute', title: 'Energy-Efficient Edge Computing Framework', ay: ay['2078'] },
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
        programId: programs.BCT.id,
        academicYearId: g.ay.id,
      },
    });

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
  console.log(`Created ${createdGroups.length} bachelor groups (BCT)`);

  // ============================================================
  // BEI BACHELOR GROUP (students 25-29)
  // ============================================================
  const beiGroup = await prisma.projectGroup.create({
    data: {
      name: 'ElectroLabs',
      projectTitle: 'IoT-based Smart Monitoring System for Electronics Labs',
      projectType: 'MINOR',
      status: 'ACTIVE',
      supervisorId: supervisors[0].id,
      programId: programs.BEI.id,
      academicYearId: ay['2080'].id,
    },
  });
  for (let m = 0; m < 5; m++) {
    const si = 25 + m;
    const student = students[si];
    const studentDef = studentDefs[si];
    await prisma.groupMember.create({
      data: { studentId: student.id, groupId: beiGroup.id, rollNumber: studentDef.roll },
    });
  }
  await attachComponents({ groupId: beiGroup.id, projectType: 'MINOR' });
  createdGroups.push(beiGroup);
  console.log('Created 1 BEI bachelor group (5 students)');

  // ============================================================
  // MASTER THESES
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
    const student = students[30 + i];
    const thesis = await prisma.thesis.create({
      data: {
        title: t.title,
        projectType: 'MASTER',
        studentId: student.id,
        status: 'ACTIVE',
        supervisorId: supervisors[t.supIdx].id,
        academicYearId: ay['2080'].id,
      },
    });
    await attachComponents({ thesisId: thesis.id, projectType: 'MASTER' });
    createdTheses.push(thesis);
  }
  console.log(`Created ${thesisDefs.length} master theses`);

  // ============================================================
  // SAMPLE EVALUATIONS (first 5 groups)
  // ============================================================
  for (let i = 0; i < 5 && i < createdGroups.length; i++) {
    const g = createdGroups[i];
    if (!g.supervisorId) continue;

    const components = await prisma.evaluationComponent.findMany({ where: { groupId: g.id } });
    const compByType = Object.fromEntries(components.map(c => [c.evaluationType, c]));

    const leadStudent = students[i * 3];
    await prisma.proposal.create({
      data: { stage: 'PROPOSAL', documentUrl: '/api/files/groups/sample_proposal.pdf', submittedById: leadStudent.id, groupId: g.id },
    });
    await prisma.evaluation.create({
      data: { componentId: compByType.PROPOSAL_DEFENSE.id, stage: 'PROPOSAL', evaluationType: 'PROPOSAL_DEFENSE', marks: 4.0, comment: 'Strong defense presentation.', status: 'COMPLETED', submittedById: coordCEE.id, groupId: g.id },
    });
    await prisma.evaluation.create({
      data: { componentId: compByType.MIDTERM_DEFENSE.id, stage: 'MID_TERM', evaluationType: 'MIDTERM_DEFENSE', marks: 3.5, comment: 'Progress is on track.', status: 'COMPLETED', submittedById: coordCEE.id, groupId: g.id },
    });
    await prisma.evaluation.create({
      data: { componentId: compByType.SUPERVISOR.id, stage: 'FINAL', evaluationType: 'SUPERVISOR', marks: 21.5, comment: 'Well-structured proposal.', status: 'COMPLETED', submittedById: g.supervisorId, groupId: g.id },
    });
    const examiner = externalExaminers[i % externalExaminers.length];
    await prisma.evaluation.create({
      data: { componentId: compByType.EXTERNAL_EXAMINER.id, stage: 'FINAL', evaluationType: 'EXTERNAL_EXAMINER', marks: 8.0, comment: 'Solid technical implementation.', status: 'COMPLETED', submittedById: examiner.id, groupId: g.id },
    });
    await prisma.evaluation.create({
      data: { componentId: compByType.FINAL_DEFENSE.id, stage: 'FINAL', evaluationType: 'FINAL_DEFENSE', marks: 4.5, comment: 'Confident final defense.', status: 'COMPLETED', submittedById: coordCEE.id, groupId: g.id },
    });
  }
  for (let i = 0; i < 5 && i < createdGroups.length; i++) {
    await prisma.projectGroup.update({ where: { id: createdGroups[i].id }, data: { status: 'COMPLETED' } });
  }
  console.log('Created sample evaluations for first 5 groups');

  // Examiner assignments
  for (let i = 0; i < 5 && i < createdGroups.length; i++) {
    const examiner = externalExaminers[i % externalExaminers.length];
    await prisma.examinerAssignment.create({ data: { externalExaminerId: examiner.id, groupId: createdGroups[i].id, assignedById: coordCEE.id } });
  }
  for (let i = 0; i < Math.min(3, createdTheses.length); i++) {
    const examiner = externalExaminers[i % externalExaminers.length];
    await prisma.examinerAssignment.create({ data: { externalExaminerId: examiner.id, thesisId: createdTheses[i].id, assignedById: coordCEE.id } });
  }
  console.log('Created examiner assignments');

  // Notifications
  await prisma.notification.create({ data: { type: 'SUPERVISOR_ASSIGNED', message: 'Supervisor Prabesh Bhattarai has been assigned to your group AlphaDev.', userId: students[0].id } });
  await prisma.notification.create({ data: { type: 'FEEDBACK', message: 'Supervisor provided feedback on your Proposal stage.', userId: students[0].id } });
  await prisma.notification.create({ data: { type: 'SUPERVISOR_ASSIGNED', message: 'Supervisor Prabesh Bhattarai has been assigned to your thesis.', userId: students[30].id } });

  // ExternalExaminer ref records
  await prisma.externalExaminer.create({ data: { name: 'Dr. Hari Adhikari', email: 'hari.adhikari@ioe.edu.np', phone: '9851122334', department: 'Computer Engineering' } });
  await prisma.externalExaminer.create({ data: { name: 'Prof. Suman Bhattarai', email: 'suman.bhattarai@ioe.edu.np', phone: '9845566778', department: 'Computer Engineering' } });

  // ============================================================
  // TEST USERS
  // ============================================================
  const testSup = await prisma.user.create({ data: { email: 'supervisor@test.com', password: hash, firstName: 'Test', lastName: 'Supervisor', role: 'SUPERVISOR', departmentId: ceeDept.id } });
  const testExaminer = await prisma.user.create({ data: { email: 'examiner@test.com', password: hash, firstName: 'Test', lastName: 'Examiner', role: 'EXTERNAL_EXAMINER', departmentId: ceeDept.id } });
  const testBachelorStu = await prisma.user.create({ data: { email: 'bachelor@test.com', password: hash, firstName: 'Bach', lastName: 'Student', role: 'STUDENT', degreeType: 'BACHELOR', departmentId: ceeDept.id, programId: programs.BCT.id } });
  const testMasterStu = await prisma.user.create({ data: { email: 'master@test.com', password: hash, firstName: 'Mast', lastName: 'Student', role: 'STUDENT', degreeType: 'MASTER', departmentId: ceeDept.id, programId: programs.BCT.id } });

  // MAJOR project group
  const majorGroup = await prisma.projectGroup.create({
    data: { name: 'MajorTest', projectTitle: 'Major Project Test — Advanced ML System', projectType: 'MAJOR', status: 'ACTIVE', supervisorId: testSup.id, programId: programs.BCT.id, academicYearId: ay['2080'].id },
  });
  for (const s of [testBachelorStu, students[students.length - 1]]) {
    await prisma.groupMember.create({ data: { studentId: s.id, groupId: majorGroup.id, rollNumber: s === testBachelorStu ? 'TEST001' : 'TEST002' } });
  }
  const majorComponents = await attachComponents({ groupId: majorGroup.id, projectType: 'MAJOR' });
  await prisma.examinerAssignment.create({ data: { externalExaminerId: testExaminer.id, groupId: majorGroup.id, assignedById: coordCEE.id } });

  // Test master thesis
  const testThesis = await prisma.thesis.create({
    data: { title: 'Test Master Thesis — AI in Healthcare', projectType: 'MASTER', studentId: testMasterStu.id, status: 'ACTIVE', supervisorId: testSup.id, academicYearId: ay['2080'].id },
  });
  await attachComponents({ thesisId: testThesis.id, projectType: 'MASTER' });
  await prisma.examinerAssignment.create({ data: { externalExaminerId: testExaminer.id, thesisId: testThesis.id, assignedById: coordCEE.id } });

  // Sample evaluations
  await prisma.evaluation.create({ data: { componentId: majorComponents.SUPERVISOR.id, stage: 'FINAL', evaluationType: 'SUPERVISOR', marks: 42, comment: 'Good progress on the major project.', status: 'COMPLETED', submittedById: testSup.id, groupId: majorGroup.id } });
  const masterComponents = await prisma.evaluationComponent.findMany({ where: { thesisId: testThesis.id } });
  const masterSupComp = masterComponents.find(c => c.evaluatorRole === 'SUPERVISOR');
  if (masterSupComp) {
    await prisma.evaluation.create({ data: { componentId: masterSupComp.id, stage: 'FINAL', evaluationType: 'SUPERVISOR', marks: 85, comment: 'Excellent thesis work with thorough research.', status: 'COMPLETED', submittedById: testSup.id, thesisId: testThesis.id } });
  }

  console.log('\n=== SEED COMPLETE ===');
  console.log('Login credentials (all use password: subesh):');
  console.log('  MAINTAINER:          subeshgaming@gmail.com');
  console.log('  COORDINATOR (CEE):   coordinator@pcampus.edu.np');
  console.log('  COORDINATOR (BEL):   coord.bel@pcampus.edu.np');
  console.log('  SUPERVISOR:          supervisor@test.com');
  console.log('  EXAMINER:            examiner@test.com');
  console.log('  BACHELOR STUDENT:    bachelor@test.com');
  console.log('  MASTER STUDENT:      master@test.com');
  console.log(`\nDepartments: CEE (BCT, BEI), BEL (BEL)`);
  console.log(`${students.length} students, ${createdGroups.length} groups, ${createdTheses.length} theses`);
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
