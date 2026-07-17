const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
const { getDefaultComponents } = require('../src/config/evaluationScheme');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

const hash = bcrypt.hashSync('subesh', 10);

function getProgramFromRoll(roll) {
  const match = roll.match(/^\d{3}([A-Za-z.]+)\d{3}$/);
  if (!match) return null;
  return match[1].toUpperCase();
}

async function main() {
  console.log('Seeding database...');

  await prisma.recommendation.deleteMany();
  await prisma.examinerAssignment.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.evaluationComponent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.groupInvitation.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.projectGroup.deleteMany();
  await prisma.thesis.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.program.deleteMany();
  await prisma.department.deleteMany();
  await prisma.externalExaminer.deleteMany();
  await prisma.user.deleteMany();

  // ============================================================
  // DEPARTMENT
  // ============================================================
  const eceDept = await prisma.department.create({
    data: { name: 'Electronics and Computer Engineering', code: 'ECE' },
  });

  // ============================================================
  // PROGRAMS (6 — all under ECE)
  // ============================================================
  const programs = {};
  const progDefs = [
    { code: 'BCT', name: 'Bachelor of Computer Engineering', degreeType: 'BACHELOR', departmentId: eceDept.id },
    { code: 'BEI', name: 'Bachelor of Electronics and Information Engineering', degreeType: 'BACHELOR', departmentId: eceDept.id },
    { code: 'MSNCS', name: 'MSc in Network and Cyber Security', degreeType: 'MASTER', cluster: 'Cluster 1', departmentId: eceDept.id },
    { code: 'MSICE', name: 'MSc in Information and Communication Engineering', degreeType: 'MASTER', cluster: 'Cluster 2', departmentId: eceDept.id },
    { code: 'MSDSA', name: 'MSc in Data Science and Analytics', degreeType: 'MASTER', cluster: 'Cluster 3', departmentId: eceDept.id },
    { code: 'MSCSKE', name: 'MSc in Computer Science and Knowledge Engineering', degreeType: 'MASTER', cluster: 'Cluster 4', departmentId: eceDept.id },
  ];
  for (const p of progDefs) {
    programs[p.code] = await prisma.program.create({ data: p });
  }
  console.log(`Created ${progDefs.length} programs (${progDefs.filter(p => p.degreeType === 'BACHELOR').length} bachelor, ${progDefs.filter(p => p.degreeType === 'MASTER').length} master) under ECE department`);

  // ============================================================
  // ACADEMIC YEARS (all under ECE)
  // ============================================================
  const ay = {};
  const ayDefs = [
    { year: '2078', semester: 'Regular', departmentId: eceDept.id, isActive: false },
    { year: '2080', semester: 'Regular', departmentId: eceDept.id, isActive: true },
    { year: '2081', semester: 'Regular', departmentId: eceDept.id, isActive: false },
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

  // Coordinators — one per program, with designations
  const coordDefs = [
    { code: 'BCT', fn: 'Ram', ln: 'Prasad', email: 'bct.coordinator@pcampus.edu.np', designation: 'Asst. Prof.' },
    { code: 'BEI', fn: 'Sita', ln: 'Devi', email: 'bei.coordinator@pcampus.edu.np', designation: 'Asst. Prof. Dr.' },
    { code: 'MSNCS', fn: 'Anil', ln: 'Thapa', email: 'msncs.coordinator@pcampus.edu.np', designation: 'Assoc. Prof. Dr.' },
    { code: 'MSICE', fn: 'Pooja', ln: 'Sharma', email: 'msice.coordinator@pcampus.edu.np', designation: 'Assoc. Prof.' },
    { code: 'MSDSA', fn: 'Gopal', ln: 'Adhikari', email: 'msdsa.coordinator@pcampus.edu.np', designation: 'Asst. Prof. Dr.' },
    { code: 'MSCSKE', fn: 'Meera', ln: 'Joshi', email: 'mscske.coordinator@pcampus.edu.np', designation: 'Prof. Dr.' },
  ];
  const coordinators = {};
  for (const cd of coordDefs) {
    const user = await prisma.user.create({
      data: { email: cd.email, password: hash, firstName: cd.fn, lastName: cd.ln, role: 'COORDINATOR', designation: cd.designation, departmentId: eceDept.id },
    });
    coordinators[cd.code] = user;
    await prisma.program.update({ where: { code: cd.code }, data: { coordinatorId: user.id } });
  }
  console.log(`Created ${coordDefs.length} program coordinators`);

  // Supervisors (all under ECE)
  const supDefs = [
    { fn: 'Prabesh', ln: 'Bhattarai', email: 'prabeshbchettri25@gmail.com', designation: 'Assoc. Prof. Dr.' },
    { fn: 'Ramesh', ln: 'Sharma', email: 'ramesh.sharma@pcampus.edu.np', designation: 'Assoc. Prof.' },
    { fn: 'Anita', ln: 'Gurung', email: 'anita.gurung@pcampus.edu.np', designation: 'Asst. Prof. Dr.' },
    { fn: 'Bishnu', ln: 'Tamang', email: 'bishnu.tamang@pcampus.edu.np', designation: 'Asst. Prof.' },
    { fn: 'Sagar', ln: 'Acharya', email: 'sagar.acharya@pcampus.edu.np', designation: 'Prof. Dr.' },
    { fn: 'Maya', ln: 'Khadka', email: 'maya.khadka@pcampus.edu.np', designation: 'Asst. Prof. Dr.' },
    { fn: 'Rajendra', ln: 'Neupane', email: 'rajendra.neupane@pcampus.edu.np', designation: 'Assoc. Prof. Dr.' },
    { fn: 'Sarita', ln: 'Poudel', email: 'sarita.poudel@pcampus.edu.np', designation: 'Asst. Prof.' },
  ];
  const supervisors = [];
  for (const sup of supDefs) {
    supervisors.push(await prisma.user.create({
      data: { email: sup.email, password: hash, firstName: sup.fn, lastName: sup.ln, role: 'SUPERVISOR', designation: sup.designation, departmentId: eceDept.id },
    }));
  }
  console.log(`Created ${supervisors.length} supervisors`);

  // External Examiners
  const externalExamDefs = [
    { fn: 'Hari', ln: 'Adhikari', email: 'hari.adhikari@ioe.edu.np', designation: 'Prof. Dr.' },
    { fn: 'Suman', ln: 'Bhattarai', email: 'suman.bhattarai@ioe.edu.np', designation: 'Assoc. Prof. Dr.' },
    { fn: 'Rita', ln: 'Sharma', email: 'rita.sharma@ioe.edu.np', designation: 'Asst. Prof. Dr.' },
    { fn: 'Kiran', ln: 'Mainali', email: 'kiran.mainali@ioe.edu.np', designation: 'Prof. Dr.' },
  ];
  const externalExaminers = [];
  for (const ex of externalExamDefs) {
    externalExaminers.push(await prisma.user.create({
      data: { email: ex.email, password: hash, firstName: ex.fn, lastName: ex.ln, role: 'EXTERNAL_EXAMINER', designation: ex.designation, departmentId: eceDept.id },
    }));
  }
  console.log(`Created ${externalExamDefs.length} external examiners`);

  // Students
  const studentDefs = [
    // ── BCT (indices 0-24) ──
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
    // ── BEI (indices 25-29) ──
    { fn: 'Kabita', ln: 'Bista', roll: '080BEI001', degreeType: 'BACHELOR' },
    { fn: 'Yubaraj', ln: 'Dhakal', roll: '080BEI002', degreeType: 'BACHELOR' },
    { fn: 'Sarita', ln: 'Oli', roll: '080BEI003', degreeType: 'BACHELOR' },
    { fn: 'Nabin', ln: 'Chalise', roll: '080BEI004', degreeType: 'BACHELOR' },
    { fn: 'Reema', ln: 'Pathak', roll: '080BEI005', degreeType: 'BACHELOR' },
    // ── MSNCS (indices 30-39) ──
    { fn: 'Anup', ln: 'Baral', roll: '080MSNCS001', degreeType: 'MASTER' },
    { fn: 'Bhawana', ln: 'Sapkota', roll: '080MSNCS002', degreeType: 'MASTER' },
    { fn: 'Dinesh', ln: 'Parajuli', roll: '080MSNCS003', degreeType: 'MASTER' },
    { fn: 'Kabita', ln: 'Aryal', roll: '080MSNCS004', degreeType: 'MASTER' },
    { fn: 'Rajan', ln: 'Bhandari', roll: '080MSNCS005', degreeType: 'MASTER' },
    { fn: 'Sushila', ln: 'Dhakal', roll: '080MSNCS006', degreeType: 'MASTER' },
    { fn: 'Tulasi', ln: 'Gautam', roll: '080MSNCS007', degreeType: 'MASTER' },
    { fn: 'Uttam', ln: 'Karki', roll: '080MSNCS008', degreeType: 'MASTER' },
    { fn: 'Bimal', ln: 'Pandey', roll: '080MSNCS009', degreeType: 'MASTER' },
    { fn: 'Deepak', ln: 'Bista', roll: '080MSNCS010', degreeType: 'MASTER' },
    // ── MSICE (indices 40-49) ──
    { fn: 'Elina', ln: 'Maskey', roll: '080MSICE001', degreeType: 'MASTER' },
    { fn: 'Firoj', ln: 'Ansari', roll: '080MSICE002', degreeType: 'MASTER' },
    { fn: 'Gita', ln: 'Neupane', roll: '080MSICE003', degreeType: 'MASTER' },
    { fn: 'Hari', ln: 'Bastola', roll: '080MSICE004', degreeType: 'MASTER' },
    { fn: 'Indira', ln: 'Chalise', roll: '080MSICE005', degreeType: 'MASTER' },
    { fn: 'Janak', ln: 'Dhami', roll: '080MSICE006', degreeType: 'MASTER' },
    { fn: 'Krishna', ln: 'Joshi', roll: '080MSICE007', degreeType: 'MASTER' },
    { fn: 'Lalita', ln: 'Khadka', roll: '080MSICE008', degreeType: 'MASTER' },
    { fn: 'Mohan', ln: 'Lama', roll: '080MSICE009', degreeType: 'MASTER' },
    { fn: 'Narayan', ln: 'Magar', roll: '080MSICE010', degreeType: 'MASTER' },
    // ── MSDSA (indices 50-59) ──
    { fn: 'Roshan', ln: 'Koirala', roll: '080MSDSA001', degreeType: 'MASTER' },
    { fn: 'Sunita', ln: 'Thapa', roll: '080MSDSA002', degreeType: 'MASTER' },
    { fn: 'Manoj', ln: 'Acharya', roll: '080MSDSA003', degreeType: 'MASTER' },
    { fn: 'Pabitra', ln: 'Neupane', roll: '080MSDSA004', degreeType: 'MASTER' },
    { fn: 'Rabi', ln: 'Ojha', roll: '080MSDSA005', degreeType: 'MASTER' },
    { fn: 'Sita', ln: 'Pathak', roll: '080MSDSA006', degreeType: 'MASTER' },
    { fn: 'Umesh', ln: 'Pokharel', roll: '080MSDSA007', degreeType: 'MASTER' },
    { fn: 'Yamuna', ln: 'Regmi', roll: '080MSDSA008', degreeType: 'MASTER' },
    { fn: 'Arun', ln: 'Thakur', roll: '080MSDSA009', degreeType: 'MASTER' },
    { fn: 'Binod', ln: 'Wagle', roll: '080MSDSA010', degreeType: 'MASTER' },
    // ── MSCSKE (indices 60-69) ──
    { fn: 'Samjhana', ln: 'Rai', roll: '080MSCSKE001', degreeType: 'MASTER' },
    { fn: 'Prakash', ln: 'Ghimire', roll: '080MSCSKE002', degreeType: 'MASTER' },
    { fn: 'Nirmala', ln: 'Sharma', roll: '080MSCSKE003', degreeType: 'MASTER' },
    { fn: 'Amrit', ln: 'Gurung', roll: '080MSCSKE004', degreeType: 'MASTER' },
    { fn: 'Bishnu', ln: 'Koirala', roll: '080MSCSKE005', degreeType: 'MASTER' },
    { fn: 'Chandra', ln: 'Adhikari', roll: '080MSCSKE006', degreeType: 'MASTER' },
    { fn: 'Durga', ln: 'Bhattarai', roll: '080MSCSKE007', degreeType: 'MASTER' },
    { fn: 'Ganesh', ln: 'Shrestha', roll: '080MSCSKE008', degreeType: 'MASTER' },
    { fn: 'Ishwor', ln: 'Poudel', roll: '080MSCSKE009', degreeType: 'MASTER' },
    { fn: 'Rama', ln: 'Dahal', roll: '080MSCSKE010', degreeType: 'MASTER' },
    // ── UNASSIGNED (indices 42-45) ──
    { fn: 'Hari', ln: 'Bohora', roll: '081BCT007', degreeType: 'BACHELOR' },
    { fn: 'Isha', ln: 'Adhikari', roll: '081BCT008', degreeType: 'BACHELOR' },
    { fn: 'Jeevan', ln: 'Bhandari', roll: '081BCT009', degreeType: 'BACHELOR' },
    { fn: 'Kamala', ln: 'Poudel', roll: '081BCT010', degreeType: 'BACHELOR' },
  ];

  const students = [];
  for (const s of studentDefs) {
    const progCode = getProgramFromRoll(s.roll);
    const program = programs[progCode];
    // Derive batch from roll number prefix (e.g., "080BCT001" → "2080")
    const rollMatch = s.roll.match(/^(\d{3})/);
    const batch = rollMatch ? `20${rollMatch[1]}` : null;
    students.push(await prisma.user.create({
      data: {
        email: `${s.roll.toLowerCase()}@pcampus.edu.np`,
        password: hash,
        firstName: s.fn,
        lastName: s.ln,
        role: 'STUDENT',
        degreeType: s.degreeType,
        rollNumber: s.roll,
        batch,
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
  // BACHELOR GROUPS — BCT (students 0-24 → 8 groups × 3)
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
  // MASTER THESES (covering all 4 master programs)
  // ============================================================
  const thesisDefs = [
    // MSNCS — 5 theses (students 30-34)
    { title: 'Deep Learning for Nepali Handwriting Recognition', supIdx: 0, studentOffset: 30 },
    { title: 'Optimizing Transformer Models for Low-Resource Nepali Languages', supIdx: 1, studentOffset: 31 },
    { title: 'Federated Learning for Privacy-Preserving Healthcare in Nepal', supIdx: 2, studentOffset: 32 },
    { title: 'Intrusion Detection System using Deep Learning for Nepali Networks', supIdx: 3, studentOffset: 33 },
    { title: 'Zero Trust Security Architecture for Cloud-Based Government Services', supIdx: 4, studentOffset: 34 },
    // MSICE — 5 theses (students 40-44)
    { title: 'Explainable AI for Credit Risk Assessment in Nepali Banks', supIdx: 5, studentOffset: 40 },
    { title: 'Autonomous Navigation using Reinforcement Learning for Nepali Terrain', supIdx: 0, studentOffset: 41 },
    { title: 'GAN-based Medical Image Augmentation for Rural Diagnostics', supIdx: 1, studentOffset: 42 },
    { title: '5G Network Slicing for Smart City Applications in Nepal', supIdx: 2, studentOffset: 43 },
    { title: 'IoMT-based Remote Patient Monitoring System for Rural Nepal', supIdx: 3, studentOffset: 44 },
    // MSDSA — 5 theses (students 50-54)
    { title: 'Predictive Analytics for Crop Yield Optimization using Satellite Data', supIdx: 4, studentOffset: 50 },
    { title: 'Natural Language Processing for Nepali Legal Document Summarization', supIdx: 5, studentOffset: 51 },
    { title: 'Real-Time Sentiment Analysis of Nepali Social Media using Transformers', supIdx: 0, studentOffset: 52 },
    { title: 'Big Data Pipeline for Earthquake Early Warning System in Nepal', supIdx: 1, studentOffset: 53 },
    { title: 'Recommendation System for E-Learning Platforms using Collaborative Filtering', supIdx: 2, studentOffset: 54 },
    // MSCSKE — 5 theses (students 60-64)
    { title: 'Knowledge Graph Construction from Nepali Academic Publications', supIdx: 3, studentOffset: 60 },
    { title: 'Semantic Web Framework for Nepali Cultural Heritage Preservation', supIdx: 4, studentOffset: 61 },
    { title: 'Multi-Agent Reinforcement Learning for Traffic Optimization in Kathmandu', supIdx: 5, studentOffset: 62 },
    { title: 'Ontology-Based Question Answering System for Nepali Medical Domain', supIdx: 0, studentOffset: 63 },
    { title: 'Automated Essay Scoring using BERT for Nepali Language Education', supIdx: 1, studentOffset: 64 },
  ];

  const createdTheses = [];
  for (let i = 0; i < thesisDefs.length; i++) {
    const t = thesisDefs[i];
    const student = students[t.studentOffset];
    // Derive program cluster from student's roll number (Prisma create doesn't return relations)
    const studentDef = studentDefs[t.studentOffset];
    const progCode = getProgramFromRoll(studentDef?.roll || '');
    const cluster = (progCode && programs[progCode]?.cluster) || null;
    const thesis = await prisma.thesis.create({
      data: {
        title: t.title,
        projectType: 'MASTER',
        studentId: student.id,
        status: 'ACTIVE',
        supervisorId: supervisors[t.supIdx % supervisors.length].id,
        academicYearId: ay['2080'].id,
        batch: student.batch || null,
        cluster,
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
      data: { componentId: compByType.PROPOSAL_DEFENSE.id, stage: 'PROPOSAL', evaluationType: 'PROPOSAL_DEFENSE', marks: 4.0, comment: 'Strong defense presentation.', comments: 'Proposal was well prepared and clearly presented.', suggestions: 'Consider adding more technical depth to the methodology section.', status: 'COMPLETED', submittedById: coordinators.BCT.id, groupId: g.id },
    });
    await prisma.evaluation.create({
      data: { componentId: compByType.MIDTERM_DEFENSE.id, stage: 'MID_TERM', evaluationType: 'MIDTERM_DEFENSE', marks: 3.5, comment: 'Progress is on track.', comments: 'Good progress shown during midterm review.', suggestions: 'Focus on completing the implementation phase before the final defense.', status: 'COMPLETED', submittedById: coordinators.BCT.id, groupId: g.id },
    });
    await prisma.evaluation.create({
      data: { componentId: compByType.SUPERVISOR.id, stage: 'FINAL', evaluationType: 'SUPERVISOR', marks: 21.5, comment: 'Well-structured proposal.', comments: 'The student showed consistent effort throughout the project.', suggestions: 'Document the code more thoroughly for future reference.', status: 'COMPLETED', submittedById: g.supervisorId, groupId: g.id },
    });
    const examiner = externalExaminers[i % externalExaminers.length];
    await prisma.evaluation.create({
      data: { componentId: compByType.EXTERNAL_EXAMINER.id, stage: 'FINAL', evaluationType: 'EXTERNAL_EXAMINER', marks: 8.0, comment: 'Solid technical implementation.', comments: 'Technical implementation was solid and well-tested.', suggestions: 'Improve the user interface for better usability.', status: 'COMPLETED', submittedById: examiner.id, groupId: g.id },
    });
    await prisma.evaluation.create({
      data: { componentId: compByType.FINAL_DEFENSE.id, stage: 'FINAL', evaluationType: 'FINAL_DEFENSE', marks: 4.5, comment: 'Confident final defense.', comments: 'Confident and well-articulated final defense presentation.', suggestions: 'Prepare more detailed slides for complex topics.', status: 'COMPLETED', submittedById: coordinators.BCT.id, groupId: g.id },
    });
  }
  for (let i = 0; i < 5 && i < createdGroups.length; i++) {
    await prisma.projectGroup.update({ where: { id: createdGroups[i].id }, data: { status: 'COMPLETED' } });
  }
  // Set batch on groups from first member's roll number
  for (const g of createdGroups) {
    const members = await prisma.groupMember.findMany({ where: { groupId: g.id }, include: { student: true } });
    const batch = members.map(m => m.student.batch).find(Boolean);
    if (batch) await prisma.projectGroup.update({ where: { id: g.id }, data: { batch } });
  }
  console.log('Created sample evaluations for first 5 groups');

  // Examiner assignments
  for (let i = 0; i < 5 && i < createdGroups.length; i++) {
    const examiner = externalExaminers[i % externalExaminers.length];
    await prisma.examinerAssignment.create({ data: { externalExaminerId: examiner.id, groupId: createdGroups[i].id, assignedById: coordinators.BCT.id } });
  }
  for (let i = 0; i < Math.min(20, createdTheses.length); i++) {
    const examiner = externalExaminers[i % externalExaminers.length];
    const progCode = studentDefs[thesisDefs[i].studentOffset]?.roll?.match(/^\d{3}([A-Za-z.]+)\d{3}$/)?.[1]?.toUpperCase() || 'MSNCS';
    await prisma.examinerAssignment.create({ data: { externalExaminerId: examiner.id, thesisId: createdTheses[i].id, assignedById: (coordinators[progCode] || coordinators.MSNCS).id } });
  }
  console.log('Created examiner assignments');

  // Notifications
  await prisma.notification.create({ data: { type: 'SUPERVISOR_ASSIGNED', message: 'Supervisor Prabesh Bhattarai has been assigned to your group AlphaDev.', userId: students[0].id } });
  await prisma.notification.create({ data: { type: 'FEEDBACK', message: 'Supervisor provided feedback on your Proposal stage.', userId: students[0].id } });
  await prisma.notification.create({ data: { type: 'SUPERVISOR_ASSIGNED', message: 'Supervisor Prabesh Bhattarai has been assigned to your thesis.', userId: students[thesisDefs[0].studentOffset].id } });

  // ExternalExaminer ref records
  await prisma.externalExaminer.create({ data: { name: 'Dr. Hari Adhikari', email: 'hari.adhikari@ioe.edu.np', phone: '9851122334', department: 'Computer Engineering' } });
  await prisma.externalExaminer.create({ data: { name: 'Prof. Suman Bhattarai', email: 'suman.bhattarai@ioe.edu.np', phone: '9845566778', department: 'Computer Engineering' } });

  // ============================================================
  // TEST USERS
  // ============================================================
  const testSup1 = await prisma.user.create({ data: { email: 'supervisor@test.com', password: hash, firstName: 'Test', lastName: 'Supervisor', role: 'SUPERVISOR', designation: 'Asst. Prof. Dr.', departmentId: eceDept.id } });
  const testSup2 = await prisma.user.create({ data: { email: 'supervisor2@test.com', password: hash, firstName: 'Second', lastName: 'Supervisor', role: 'SUPERVISOR', designation: 'Assoc. Prof.', departmentId: eceDept.id } });
  const testExaminer1 = await prisma.user.create({ data: { email: 'examiner@test.com', password: hash, firstName: 'Test', lastName: 'Examiner', role: 'EXTERNAL_EXAMINER', designation: 'Prof. Dr.', departmentId: eceDept.id } });
  const testExaminer2 = await prisma.user.create({ data: { email: 'examiner2@test.com', password: hash, firstName: 'Second', lastName: 'Examiner', role: 'EXTERNAL_EXAMINER', designation: 'Asst. Prof.', departmentId: eceDept.id } });
  const testBachelorStu = await prisma.user.create({ data: { email: 'bachelor@test.com', password: hash, firstName: 'Bach', lastName: 'Student', role: 'STUDENT', degreeType: 'BACHELOR', departmentId: eceDept.id, programId: programs.BCT.id, rollNumber: 'TEST001' } });
  const testMasterStu = await prisma.user.create({ data: { email: 'master@test.com', password: hash, firstName: 'Mast', lastName: 'Student', role: 'STUDENT', degreeType: 'MASTER', departmentId: eceDept.id, programId: programs.MSNCS.id, rollNumber: '080MSNCS099' } });

  // ── SUPERVISOR 1 ────────────────────────────────────
  const majorGroup = await prisma.projectGroup.create({
    data: { name: 'MajorTest', projectTitle: 'Major Project Test — Advanced ML System', projectType: 'MAJOR', status: 'ACTIVE', supervisorId: testSup1.id, programId: programs.BCT.id, academicYearId: ay['2080'].id },
  });
  for (const s of [testBachelorStu, students[students.length - 1]]) {
    await prisma.groupMember.create({ data: { studentId: s.id, groupId: majorGroup.id, rollNumber: s === testBachelorStu ? 'TEST001' : 'TEST002' } });
  }
  const majorComponents = await attachComponents({ groupId: majorGroup.id, projectType: 'MAJOR' });
  await prisma.examinerAssignment.create({ data: { externalExaminerId: testExaminer1.id, groupId: majorGroup.id, assignedById: coordinators.BCT.id } });
  await prisma.evaluation.create({ data: { componentId: majorComponents.SUPERVISOR.id, stage: 'FINAL', evaluationType: 'SUPERVISOR', marks: 42, comment: 'Good progress on the major project.', status: 'COMPLETED', submittedById: testSup1.id, groupId: majorGroup.id } });

  // Master thesis — sup1 + masterStu → examiner1
  const testThesis = await prisma.thesis.create({
    data: { title: 'Test Master Thesis — AI in Healthcare', projectType: 'MASTER', studentId: testMasterStu.id, status: 'ACTIVE', supervisorId: testSup1.id, academicYearId: ay['2080'].id, batch: testMasterStu.batch || '2080', cluster: programs.MSNCS.cluster },
  });
  await attachComponents({ thesisId: testThesis.id, projectType: 'MASTER' });
  await prisma.examinerAssignment.create({ data: { externalExaminerId: testExaminer1.id, thesisId: testThesis.id, assignedById: coordinators.MSNCS.id } });
  const masterComps = await prisma.evaluationComponent.findMany({
    where: { thesisId: testThesis.id },
    orderBy: { id: 'asc' },
  });
  const supCritMarks = [18, 17, 18, 16, 16];
  const supComps = masterComps.filter(c => c.evaluatorRole === 'SUPERVISOR');
  for (let i = 0; i < supComps.length; i++) {
    const comp = supComps[i];
    await prisma.evaluation.create({
      data: { componentId: comp.id, stage: 'FINAL', evaluationType: 'SUPERVISOR', marks: supCritMarks[i], comment: i === 1 ? 'All chapters completed well.' : '', comments: 'The student worked diligently on the thesis. All chapters are well structured.', suggestions: 'Consider publishing the findings in a conference paper.', status: 'COMPLETED', submittedById: testSup1.id, thesisId: testThesis.id },
    });
  }
  const extCritMarks = [16, 15, 16, 16, 15];
  const extComps = masterComps.filter(c => c.evaluatorRole === 'EXTERNAL_EXAMINER');
  for (let i = 0; i < extComps.length; i++) {
    const comp = extComps[i];
    await prisma.evaluation.create({
      data: { componentId: comp.id, stage: 'FINAL', evaluationType: 'EXTERNAL_EXAMINER', marks: extCritMarks[i], comment: i === 0 ? 'Good presentation.' : '', comments: 'The research methodology was sound and results are reproducible.', suggestions: 'Expand the literature review to include more recent publications.', status: 'COMPLETED', submittedById: testExaminer1.id, thesisId: testThesis.id },
    });
  }

  // ── SUPERVISOR 2 ────────────────────────────────────
  const sup2bachelor = students.find(s => s.rollNumber === '081BCT010') || students[students.length - 1];
  const sup2Group = await prisma.projectGroup.create({
    data: { name: 'Sup2Group', projectTitle: 'IoT-Enabled Smart Campus System', projectType: 'MINOR', status: 'ACTIVE', supervisorId: testSup2.id, programId: programs.BCT.id, academicYearId: ay['2080'].id },
  });
  await prisma.groupMember.create({ data: { studentId: sup2bachelor.id, groupId: sup2Group.id, rollNumber: sup2bachelor.rollNumber || 'TEST003' } });
  await attachComponents({ groupId: sup2Group.id, projectType: 'MINOR' });
  await prisma.examinerAssignment.create({ data: { externalExaminerId: testExaminer2.id, groupId: sup2Group.id, assignedById: coordinators.BCT.id } });

  const sup2masterStu = students[32];
  const sup2ProgCode = getProgramFromRoll(studentDefs[32]?.roll || '');
  const sup2Cluster = sup2ProgCode ? programs[sup2ProgCode]?.cluster : null;
  const sup2Thesis = await prisma.thesis.create({
    data: { title: 'Blockchain-based Academic Credential Verification', projectType: 'MASTER', studentId: sup2masterStu.id, status: 'ACTIVE', supervisorId: testSup2.id, academicYearId: ay['2080'].id, batch: sup2masterStu.batch || '2080', cluster: sup2Cluster || programs.MSNCS.cluster },
  });
  await attachComponents({ thesisId: sup2Thesis.id, projectType: 'MASTER' });
  await prisma.examinerAssignment.create({ data: { externalExaminerId: testExaminer2.id, thesisId: sup2Thesis.id, assignedById: coordinators.MSNCS.id } });
  // Create sample evaluations with per-role comments/suggestions for sup2Thesis
  const sup2Comps = await prisma.evaluationComponent.findMany({ where: { thesisId: sup2Thesis.id }, orderBy: { id: 'asc' } });
  const sup2SupComps = sup2Comps.filter(c => c.evaluatorRole === 'SUPERVISOR');
  const sup2ExtComps = sup2Comps.filter(c => c.evaluatorRole === 'EXTERNAL_EXAMINER');
  for (let i = 0; i < sup2SupComps.length; i++) {
    await prisma.evaluation.create({
      data: { componentId: sup2SupComps[i].id, stage: 'FINAL', evaluationType: 'SUPERVISOR', marks: 16 + i, comment: 'Good progress.', comments: 'The student showed consistent dedication.', suggestions: 'Improve the evaluation section.', status: 'COMPLETED', submittedById: testSup2.id, thesisId: sup2Thesis.id },
    });
  }
  for (let i = 0; i < sup2ExtComps.length; i++) {
    await prisma.evaluation.create({
      data: { componentId: sup2ExtComps[i].id, stage: 'FINAL', evaluationType: 'EXTERNAL_EXAMINER', marks: 14 + i, comment: 'Adequate.', comments: 'The thesis meets the required standards.', suggestions: 'Add more comparative analysis.', status: 'COMPLETED', submittedById: testExaminer2.id, thesisId: sup2Thesis.id },
    });
  }

  // Per-criteria sample evaluations for other master theses
  const thesisEvalPatterns = [];
  for (let i = 0; i < createdTheses.length; i++) {
    thesisEvalPatterns.push(
      i < 5
        ? { sup: [16, 15, 17, 15, 16], ext: [15, 14, 15, 14, 15] }
        : i < 10
        ? { sup: [14, 13, 15, 14, 13], ext: null }
        : i < 15
        ? { sup: [12, 11, null, null, null], ext: null }
        : { sup: null, ext: null },
    );
  }
  for (let i = 0; i < createdTheses.length; i++) {
    const thesis = createdTheses[i];
    const comps = await prisma.evaluationComponent.findMany({
      where: { thesisId: thesis.id },
      orderBy: { id: 'asc' },
    });
    const supComps = comps.filter(c => c.evaluatorRole === 'SUPERVISOR');
    const extComps = comps.filter(c => c.evaluatorRole === 'EXTERNAL_EXAMINER');
    const pattern = thesisEvalPatterns[i];
    if (pattern.sup) {
      for (let j = 0; j < supComps.length; j++) {
        const marks = pattern.sup[j];
        if (marks !== null) {
          await prisma.evaluation.create({
            data: { componentId: supComps[j].id, stage: 'FINAL', evaluationType: 'SUPERVISOR', marks, comment: '', comments: 'Submitted marks per criteria.', suggestions: '', status: 'COMPLETED', submittedById: supervisors[i % supervisors.length].id, thesisId: thesis.id },
          });
        }
      }
    }
    if (pattern.ext) {
      const examiner = externalExaminers[i % externalExaminers.length];
      for (let j = 0; j < extComps.length; j++) {
        await prisma.evaluation.create({
          data: { componentId: extComps[j].id, stage: 'FINAL', evaluationType: 'EXTERNAL_EXAMINER', marks: pattern.ext[j], comment: '', comments: 'External evaluation completed.', suggestions: 'Further improvements recommended.', status: 'COMPLETED', submittedById: examiner.id, thesisId: thesis.id },
        });
      }
    }
  }

  console.log('\n=== SEED COMPLETE ===');
  console.log('Login credentials (all use password: subesh):');
  console.log('  MAINTAINER:                  subeshgaming@gmail.com');
  console.log('  COORDINATOR (BCT):           bct.coordinator@pcampus.edu.np');
  console.log('  COORDINATOR (BEI):           bei.coordinator@pcampus.edu.np');
  console.log('  COORDINATOR (MSNCS):         msncs.coordinator@pcampus.edu.np');
  console.log('  COORDINATOR (MSICE):         msice.coordinator@pcampus.edu.np');
  console.log('  COORDINATOR (MSDSA):         msdsa.coordinator@pcampus.edu.np');
  console.log('  COORDINATOR (MSCSKE):        mscske.coordinator@pcampus.edu.np');
  console.log('  SUPERVISOR (Prabesh):        prabeshbchettri25@gmail.com');
  console.log('  SUPERVISOR (Ramesh):         ramesh.sharma@pcampus.edu.np');
  console.log('  SUPERVISOR (Test/Sup1):      supervisor@test.com');
  console.log('  SUPERVISOR (Test/Sup2):      supervisor2@test.com');
  console.log('  EXAMINER (Hari):             hari.adhikari@ioe.edu.np');
  console.log('  EXAMINER (Suman):            suman.bhattarai@ioe.edu.np');
  console.log('  EXAMINER (Rita):             rita.sharma@ioe.edu.np');
  console.log('  EXAMINER (Kiran):            kiran.mainali@ioe.edu.np');
  console.log('  BACHELOR STUDENT:            bachelor@test.com');
  console.log('  MASTER STUDENT:              master@test.com');
  console.log(`\nDepartment: ECE — Programs: BCT, BEI (Bachelor) | MSNCS, MSICE, MSDSA, MSCSKE (Master)`);
  console.log(`${students.length} students (${studentDefs.filter(s => s.degreeType === 'BACHELOR').length} bachelor, ${studentDefs.filter(s => s.degreeType === 'MASTER').length} master), ${createdGroups.length} groups, ${createdTheses.length} theses`);
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
