const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.recommendation.deleteMany();
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
  // DEPARTMENTS — Pulchowk Engineering Campus, IOE, Tribhuvan University
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
  // ACADEMIC YEARS — Nepali B.S. calendar
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
  // One for BEX
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

  // Supervisors — Pulchowk faculty
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

  // Students — 45 students across BCT and BEX (3 per group × 15 groups)
  const studentDefs = [
    // BCT 2078 batch — roll format: 078BCTXXX
    { fn: 'Aarav', ln: 'Khadka', roll: '078BCT001' },
    { fn: 'Binita', ln: 'Shrestha', roll: '078BCT002' },
    { fn: 'Chandra', ln: 'Thapa', roll: '078BCT003' },
    { fn: 'Deepa', ln: 'Poudel', roll: '078BCT004' },
    { fn: 'Ekaraj', ln: 'Rana', roll: '078BCT005' },
    { fn: 'Falguni', ln: 'Neupane', roll: '078BCT006' },
    { fn: 'Ganesh', ln: 'Bhandari', roll: '078BCT007' },
    { fn: 'Hima', ln: 'Acharya', roll: '078BCT008' },
    { fn: 'Indra', ln: 'Joshi', roll: '078BCT009' },
    { fn: 'Janaki', ln: 'Dahal', roll: '078BCT010' },
    { fn: 'Krishna', ln: 'Pokharel', roll: '078BCT011' },
    { fn: 'Laxmi', ln: 'Regmi', roll: '078BCT012' },
    { fn: 'Madhav', ln: 'Bastola', roll: '078BCT013' },
    { fn: 'Nisha', ln: 'Lama', roll: '078BCT014' },
    { fn: 'Om', ln: 'Pandey', roll: '078BCT015' },
    // BCT 2080 batch
    { fn: 'Pooja', ln: 'Magar', roll: '080BCT001' },
    { fn: 'Rabi', ln: 'Koirala', roll: '080BCT002' },
    { fn: 'Sita', ln: 'Bhattarai', roll: '080BCT003' },
    { fn: 'Tika', ln: 'Adhikari', roll: '080BCT004' },
    { fn: 'Usha', ln: 'Dhami', roll: '080BCT005' },
    { fn: 'Bibek', ln: 'Chaudhary', roll: '080BCT006' },
    { fn: 'Muna', ln: 'Gautam', roll: '080BCT007' },
    { fn: 'Rajan', ln: 'Puri', roll: '080BCT008' },
    { fn: 'Sushma', ln: 'Karki', roll: '080BCT009' },
    { fn: 'Dipesh', ln: 'Giri', roll: '080BCT010' },
    // BEX 2080 batch
    { fn: 'Kabita', ln: 'Bista', roll: '080BEX001' },
    { fn: 'Yubaraj', ln: 'Dhakal', roll: '080BEX002' },
    { fn: 'Sarita', ln: 'Oli', roll: '080BEX003' },
    { fn: 'Nabin', ln: 'Chalise', roll: '080BEX004' },
    { fn: 'Reema', ln: 'Pathak', roll: '080BEX005' },
    // BCT 2081 batch
    { fn: 'Anup', ln: 'Baral', roll: '081BCT001' },
    { fn: 'Bhawana', ln: 'Sapkota', roll: '081BCT002' },
    { fn: 'Dinesh', ln: 'Parajuli', roll: '081BCT003' },
    { fn: 'Elina', ln: 'Maskey', roll: '081BCT004' },
    { fn: 'Firoj', ln: 'Ansari', roll: '081BCT005' },
    { fn: 'Gita', ln: 'Neupane', roll: '081BCT006' },
    { fn: 'Hari', ln: 'Bohora', roll: '081BCT007' },
    { fn: 'Isha', ln: 'Adhikari', roll: '081BCT008' },
    { fn: 'Jeevan', ln: 'Bhandari', roll: '081BCT009' },
    { fn: 'Kamala', ln: 'Poudel', roll: '081BCT010' },
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
      },
    });
    students.push(student);
  }
  console.log(`Created ${students.length} students`);

  // ============================================================
  // PROJECT GROUPS — Bachelor (15 groups, 3 students each)
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
    { name: 'SwasthaSathi', title: 'Mental Health Chatbot in Nepali Language', ay: ayBCT['2081'] },
    { name: 'SmartClass', title: 'Classroom Attendance via Facial Recognition', ay: ayBCT['2081'] },
    { name: 'RouteOpt', title: 'GPS-based Route Optimization for Kathmandu Logistics', ay: ayBCT['2081'] },
    { name: 'Bibechana', title: 'Semantic Search Engine for Nepali Research Papers', ay: ayBCT['2081'] },
    { name: 'Samparka', title: 'Disaster Response Coordination Platform', ay: ayBEX },
  ];

  const createdGroups = [];
  for (let i = 0; i < groupDefs.length; i++) {
    const g = groupDefs[i];
    const sup = i < 12 ? supervisors[i % supervisors.length] : null;

    const group = await prisma.projectGroup.create({
      data: {
        name: g.name,
        projectTitle: g.title,
        status: sup ? 'ACTIVE' : 'PENDING',
        supervisorId: sup?.id || null,
        academicYearId: g.ay.id,
      },
    });

    // 3 students per group
    for (let m = 0; m < 3; m++) {
      const si = (i * 3 + m) % students.length;
      const student = students[si];
      const studentDef = studentDefs[si];
      await prisma.groupMember.create({
        data: {
          studentId: student.id,
          groupId: group.id,
          rollNumber: studentDef.roll,
        },
      });
    }

    // Default evaluation components
    const defaults = [
      { name: 'Supervisor', maxMarks: 25 },
      { name: 'Proposal Defense', maxMarks: 5 },
      { name: 'Mid-Term Defense', maxMarks: 5 },
      { name: 'Final Defense', maxMarks: 5 },
      { name: 'Internal Examiner', maxMarks: 10 },
    ];
    for (const comp of defaults) {
      await prisma.evaluationComponent.create({
        data: { ...comp, groupId: group.id, createdById: maintainer.id },
      });
    }
    createdGroups.push(group);
  }
  console.log(`Created ${createdGroups.length} project groups (3 students each)`);

  // ============================================================
  // MASTER THESES (6)
  // ============================================================
  // Use students 15-20 (080BCT001 to 080BCT006) for master theses
  const thesisDefs = [
    { title: 'Deep Learning for Nepali Handwriting Recognition', studentIdx: 15, supIdx: 0 },
    { title: 'Optimizing Transformer Models for Low-Resource Nepali Languages', studentIdx: 16, supIdx: 1 },
    { title: 'Federated Learning for Privacy-Preserving Healthcare in Nepal', studentIdx: 17, supIdx: 2 },
    { title: 'Explainable AI for Credit Risk Assessment in Nepali Banks', studentIdx: 18, supIdx: 3 },
    { title: 'Autonomous Navigation using Reinforcement Learning for Nepali Terrain', studentIdx: 19, supIdx: 4 },
    { title: 'GAN-based Medical Image Augmentation for Rural Diagnostics', studentIdx: 20, supIdx: 5 },
  ];

  for (const t of thesisDefs) {
    const thesis = await prisma.thesis.create({
      data: {
        title: t.title,
        studentId: students[t.studentIdx].id,
        status: 'ACTIVE',
        supervisorId: supervisors[t.supIdx].id,
        academicYearId: ayBCT['2080'].id,
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
        data: { ...comp, thesisId: thesis.id, createdById: maintainer.id },
      });
    }
  }
  console.log(`Created ${thesisDefs.length} master theses`);

  // ============================================================
  // SAMPLE EVALUATIONS (first 5 assigned groups)
  // ============================================================
  for (let i = 0; i < 5 && i < createdGroups.length; i++) {
    const g = createdGroups[i];
    if (g.supervisorId) {
      await prisma.evaluation.create({
        data: { stage: 'PROPOSAL', marks: 4.2, comment: 'Well-structured proposal. Refine methodology and add more references.', submittedById: g.supervisorId, groupId: g.id },
      });
      await prisma.evaluation.create({
        data: { stage: 'MID_TERM', marks: 3.8, comment: 'Good progress. Work on data collection and analysis.', submittedById: g.supervisorId, groupId: g.id },
      });
      await prisma.proposal.create({
        data: { stage: 'PROPOSAL', supervisorComment: 'Solid topic. Consider adding literature from Nepali context.', submittedById: g.supervisorId, groupId: g.id },
      });
    }
  }

  // ============================================================
  // EXTERNAL EXAMINERS
  // ============================================================
  await prisma.externalExaminer.create({
    data: { name: 'Dr. Hari Adhikari', email: 'hari.adhikari@ioe.edu.np', phone: '9851122334', department: 'Computer Engineering' },
  });
  await prisma.externalExaminer.create({
    data: { name: 'Prof. Suman Bhattarai', email: 'suman.bhattarai@ioe.edu.np', phone: '9845566778', department: 'Computer Engineering' },
  });

  console.log('\n=== SEED COMPLETE ===');
  console.log('Login credentials:');
  console.log('  MAINTAINER: subeshgaming@gmail.com / subesh');
  console.log('  COORDINATOR: coordinator@pcampus.edu.np / subesh');
  console.log('  SUPERVISORS: all use password subesh');
  console.log('  STUDENTS:    <roll>@pcampus.edu.np / subesh (e.g. 078bct001@pcampus.edu.np)');
  console.log(`\nTotal: 1 maintainer, 1 coordinator, ${supervisors.length} supervisors, ${students.length} students`);
  console.log(`${createdGroups.length} project groups (3 students each), ${thesisDefs.length} master theses`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
