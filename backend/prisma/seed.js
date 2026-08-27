const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { getDefaultComponents } = require('../src/config/evaluationScheme');
const {
  generateFormProposalPDF,
  generateRealisticProposalPDF,
  generateRealisticMidtermReportPDF,
  generateRealisticFinalReportPDF,
} = require('../src/services/pdfService');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();
const hash = bcrypt.hashSync('subesh', 10);

/** Extract program code from a roll number like "080BCT001" or "082MSNCS01" */
function getProgramFromRoll(roll) {
  const match = roll.match(/^\d{3}([A-Za-z.]+)\d{2,3}$/);
  if (!match) return null;
  return match[1].toUpperCase();
}

/** Generate a bachelor roll number: 3-digit batch + code + 3-digit serial */
function bachelorRoll(batch, code, serial) {
  return `${batch}${code}${String(serial).padStart(3, '0')}`;
}

/** Generate a master roll number: 3-digit batch + code + 2-digit serial */
function masterRoll(batch, code, serial) {
  return `${batch}${code}${String(serial).padStart(2, '0')}`;
}

// ── Program definitions ────────────────────────────────────────────────
const BACHELOR_PROGRAMS = [
  { code: 'BCT', name: 'Bachelor in Computer Engineering', maxStudents: 96 },
  { code: 'BEI', name: 'Bachelor in Electronics and Information Engineering', maxStudents: 48 },
];

const MASTER_PROGRAMS = [
  { code: 'MSNCS', name: 'MSc in Network and Cyber Security', cluster: 'Computer networks and security', maxStudents: 24 },
  { code: 'MSICE', name: 'MSc in Information and Communication Engineering', cluster: 'Electronic devices, circuits and communication', maxStudents: 20 },
  { code: 'MSDSA', name: 'MSc in Data Science and Analytics', cluster: 'AI/ML and image processing', maxStudents: 24 },
  { code: 'MSCSK', name: 'MSc in Computer Science and Knowledge Engineering', cluster: 'Audio, NLP and data/text analytics', maxStudents: 20 },
];

// ── Name pools ─────────────────────────────────────────────────────────
const firstNames = [
  'Aarav','Binita','Chandra','Deepa','Ekaraj','Falguni','Ganesh','Hima',
  'Indra','Janaki','Krishna','Laxmi','Madhav','Nisha','Om','Pooja',
  'Rabi','Sita','Tika','Usha','Bibek','Muna','Rajan','Sushma',
  'Dipesh','Kabita','Yubaraj','Sarita','Nabin','Reema','Anup','Bhawana',
  'Dinesh','Rajan','Sushila','Tulasi','Uttam','Bimal','Deepak','Elina',
  'Firoj','Gita','Hari','Indira','Janak','Lalita','Mohan','Narayan',
  'Roshan','Sunita','Manoj','Pabitra','Umesh','Yamuna','Arun','Binod',
  'Samjhana','Prakash','Nirmala','Amrit','Bishnu','Durga','Ishwor','Rama',
  'Prabesh','Anita','Sagar','Maya','Rajendra','Sarita','Gopal','Meera',
  'Anil','Pooja','Ram','Sita','Hari','Gita','Krishna','Arjun',
  'Pratik','Nabin','Amit','Deepak','Mohan','Prakash','Mina','Tara',
  'Reema','Anjana','Bishnu','Shyam','Roshan','Bibek','Sagar','Kabita',
  'Sunita','Umesh','Rajan','Pabitra','Jeevan','Kamala','Isha','Hari',
];

const lastNames = [
  'Acharya','Basnet','Chhetri','Dahal','Gurung','Khadka','Lama','Maharjan',
  'Neupane','Ojha','Pandey','Rai','Sharma','Thapa','Poudel','Pokhrel',
  'Adhikari','Bhandari','Bhattarai','Chaudhary','Dhakal','Gautam','Joshi','Karki',
  'Koirala','Magar','Maskey','Pathak','Regmi','Shrestha','Tamang','Thakur',
  'Bastola','Bista','Chalise','Dhami','Ghimire','Khadka','Lama','Neupane',
  'Oli','Parajuli','Sapkota','Wagle','Aryal','Baral','Dahal','Gautam',
  'Koirala','Pandey','Pokharel','Rana','Sapkota','Adhikari','Bhandari','Dhakal',
  'Joshi','Karki','Lama','Magar','Neupane','Pathak','Poudel','Sharma',
  'Bastola','Bhattarai','Chaudhary','Dhami','Gurung','Khadka','Maharjan','Maskey',
  'Ojha','Pandey','Regmi','Shrestha','Tamang','Thapa','Acharya','Basnet',
];

let nameIndex = 0;
function nextName() {
  const fn = firstNames[nameIndex % firstNames.length];
  const ln = lastNames[(nameIndex + 7) % lastNames.length];
  nameIndex++;
  return { firstName: fn, lastName: ln };
}

// ── Academic Batches ───────────────────────────────────────────────────
const BATCH_DEFS = [
  { batch: '078', bsYear: 2078, counts: { BCT: 24, BEI: 12, MSNCS: 6, MSICE: 5, MSDSA: 6, MSCSK: 5 } },
  { batch: '079', bsYear: 2079, counts: { BCT: 24, BEI: 12, MSNCS: 6, MSICE: 5, MSDSA: 6, MSCSK: 5 } },
  { batch: '080', bsYear: 2080, counts: { BCT: 30, BEI: 16, MSNCS: 8, MSICE: 6, MSDSA: 8, MSCSK: 6 } },
  { batch: '081', bsYear: 2081, counts: { BCT: 24, BEI: 12, MSNCS: 6, MSICE: 5, MSDSA: 6, MSCSK: 5 } },
  { batch: '082', bsYear: 2082, counts: { BCT: 18, BEI: 8, MSNCS: 12, MSICE: 8, MSDSA: 12, MSCSK: 8 } },
  { batch: '083', bsYear: 2083, counts: { BCT: 12, BEI: 6, MSNCS: 4, MSICE: 3, MSDSA: 4, MSCSK: 3 } },
];

function generateStudentDefs() {
  const defs = [];
  for (const bd of BATCH_DEFS) {
    for (const prog of BACHELOR_PROGRAMS) {
      for (let i = 1; i <= bd.counts[prog.code]; i++) {
        const { firstName, lastName } = nextName();
        defs.push({
          fn: firstName,
          ln: lastName,
          roll: bachelorRoll(bd.batch, prog.code, i),
          degreeType: 'BACHELOR',
          batch: String(bd.bsYear),
        });
      }
    }
    for (const prog of MASTER_PROGRAMS) {
      for (let i = 1; i <= bd.counts[prog.code]; i++) {
        const { firstName, lastName } = nextName();
        defs.push({
          fn: firstName,
          ln: lastName,
          roll: masterRoll(bd.batch, prog.code, i),
          degreeType: 'MASTER',
          batch: String(bd.bsYear),
        });
      }
    }
  }
  return defs;
}

async function main() {
  console.log('Seeding database with timeline-accurate academic dataset and rich multi-page sample PDFs...');

  // ── Clean slate ──
  await prisma.recommendation.deleteMany();
  await prisma.examinerAssignment.deleteMany();
  await prisma.formResponse.deleteMany();
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

  // Storage directories setup for PDF documents
  const storageThesesDir = path.join(__dirname, '..', 'storage', 'theses');
  const storageGroupsDir = path.join(__dirname, '..', 'storage', 'groups');
  if (!fs.existsSync(storageThesesDir)) fs.mkdirSync(storageThesesDir, { recursive: true });
  if (!fs.existsSync(storageGroupsDir)) fs.mkdirSync(storageGroupsDir, { recursive: true });

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
    { code: 'BCT', name: 'Bachelor in Computer Engineering', degreeType: 'BACHELOR', departmentId: eceDept.id },
    { code: 'BEI', name: 'Bachelor in Electronics and Information Engineering', degreeType: 'BACHELOR', departmentId: eceDept.id },
    { code: 'MSNCS', name: 'MSc in Network and Cyber Security', degreeType: 'MASTER', cluster: 'Computer networks and security', departmentId: eceDept.id },
    { code: 'MSICE', name: 'MSc in Information and Communication Engineering', degreeType: 'MASTER', cluster: 'Electronic devices, circuits and communication', departmentId: eceDept.id },
    { code: 'MSDSA', name: 'MSc in Data Science and Analytics', degreeType: 'MASTER', cluster: 'AI/ML and image processing', departmentId: eceDept.id },
    { code: 'MSCSK', name: 'MSc in Computer Science and Knowledge Engineering', degreeType: 'MASTER', cluster: 'Audio, NLP and data/text analytics', departmentId: eceDept.id },
  ];
  for (const p of progDefs) {
    programs[p.code] = await prisma.program.create({ data: p });
  }
  console.log(`Created ${progDefs.length} programs`);

  // ============================================================
  // ACADEMIC YEARS
  // ============================================================
  const ayMap = {};
  for (const bd of BATCH_DEFS) {
    const ay = await prisma.academicYear.create({
      data: { year: bd.batch, semester: 'Regular', departmentId: eceDept.id, isActive: ['079', '080', '081', '082'].includes(bd.batch) },
    });
    ayMap[bd.batch] = ay;
  }
  console.log(`Created ${Object.keys(ayMap).length} academic years (078–083)`);

  // ============================================================
  // USERS
  // ============================================================
  // Maintainer
  const maintainer = await prisma.user.create({
    data: { email: 'maintainer@pcampus.edu.np', password: hash, firstName: 'Subesh', lastName: 'Gaming', role: 'MAINTAINER' },
  });

  const coordDefs = [
    { code: 'BCT', fn: 'Ram', ln: 'Prasad', email: 'bct.coordinator@pcampus.edu.np', designation: 'Asst. Prof.' },
    { code: 'BEI', fn: 'Sita', ln: 'Devi', email: 'bei.coordinator@pcampus.edu.np', designation: 'Asst. Prof. Dr.' },
    { code: 'MSNCS', fn: 'Anil', ln: 'Thapa', email: 'msncs.coordinator@pcampus.edu.np', designation: 'Assoc. Prof. Dr.' },
    { code: 'MSICE', fn: 'Pooja', ln: 'Sharma', email: 'msice.coordinator@pcampus.edu.np', designation: 'Assoc. Prof.' },
    { code: 'MSDSA', fn: 'Gopal', ln: 'Adhikari', email: 'msdsa.coordinator@pcampus.edu.np', designation: 'Asst. Prof. Dr.' },
    { code: 'MSCSK', fn: 'Meera', ln: 'Joshi', email: 'mscsk.coordinator@pcampus.edu.np', designation: 'Prof. Dr.' },
  ];
  const coordinators = {};
  for (const cd of coordDefs) {
    const user = await prisma.user.create({
      data: { email: cd.email, password: hash, firstName: cd.fn, lastName: cd.ln, role: 'COORDINATOR', designation: cd.designation, departmentId: eceDept.id },
    });
    coordinators[cd.code] = user;
    await prisma.program.update({ where: { code: cd.code }, data: { coordinatorId: user.id } });
  }

  const supDefs = [
    { fn: 'Prabesh', ln: 'Bhattarai', email: 'prabesh.bhattarai@pcampus.edu.np', designation: 'Assoc. Prof. Dr.' },
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
      data: { email: sup.email, password: hash, firstName: sup.fn, lastName: sup.ln, role: 'SUPERVISOR', designation: sup.designation, departmentId: eceDept.id, canSupervise: true },
    }));
  }

  const externalExamDefs = [
    { fn: 'Hari', ln: 'Adhikari', email: 'hari.adhikari@pcampus.edu.np', designation: 'Prof. Dr.' },
    { fn: 'Suman', ln: 'Bhattarai', email: 'suman.bhattarai@pcampus.edu.np', designation: 'Assoc. Prof. Dr.' },
    { fn: 'Rita', ln: 'Sharma', email: 'rita.sharma@pcampus.edu.np', designation: 'Asst. Prof. Dr.' },
    { fn: 'Kiran', ln: 'Mainali', email: 'kiran.mainali@pcampus.edu.np', designation: 'Prof. Dr.' },
    { fn: 'Prajwal', ln: 'Ghimire', email: 'prajwal.ghimire@ioe.edu.np', designation: 'Dr.' },
    { fn: 'Anisha', ln: 'Rana', email: 'anisha.rana@ioe.edu.np', designation: 'Dr.' },
  ];
  const externalExaminers = [];
  for (const ex of externalExamDefs) {
    externalExaminers.push(await prisma.user.create({
      data: { email: ex.email, password: hash, firstName: ex.fn, lastName: ex.ln, role: 'EXTERNAL_EXAMINER', designation: ex.designation, departmentId: eceDept.id },
    }));
  }

  // ── Students ──
  const studentDefs = generateStudentDefs();
  const students = [];
  for (const s of studentDefs) {
    const progCode = getProgramFromRoll(s.roll);
    const program = programs[progCode];
    const studentEmail = s.roll.toUpperCase() === '082MSNCS01' ? 'subeshgaming@gmail.com' : `${s.roll.toLowerCase()}@pcampus.edu.np`;
    students.push(await prisma.user.create({
      data: {
        email: studentEmail,
        password: hash,
        firstName: s.fn,
        lastName: s.ln,
        role: 'STUDENT',
        degreeType: s.degreeType,
        rollNumber: s.roll,
        batch: s.batch,
        departmentId: program.departmentId,
        programId: program.id,
      },
    }));
  }
  console.log(`Created ${students.length} students across 6 batches`);

  async function attachComponents({ groupId, thesisId, projectType }) {
    const defaults = getDefaultComponents(projectType || 'MINOR');
    const out = [];
    for (const c of defaults) {
      const created = await prisma.evaluationComponent.create({
        data: { ...c, groupId, thesisId, createdById: maintainer.id },
      });
      out.push(created);
    }
    return out;
  }

  function findStudents(bsYear, programCode) {
    const yearStr = String(bsYear);
    return students.filter(s => {
      if (s.batch !== yearStr) return false;
      const prog = getProgramFromRoll(s.rollNumber);
      return prog === programCode;
    });
  }

  // ============================================================
  // BACHELOR GROUPS & MULTI-PAGE REPORTS
  // • 083 & 082 batches: 1st & 2nd year -> NO projects
  // • 080 batch (3rd Year): Minor Projects (Active / Pending)
  // • 079 batch (4th Year): Major Projects (Active / Defending)
  // • 078 batch (Graduated): Major Projects (COMPLETED with full evaluations)
  // ============================================================
  const bachelorGroupTitles = [
    'AI-Powered Code Review Assistant for Nepali Developers',
    'Multi-Cloud Cost Optimization Dashboard for SMEs',
    'Real-Time Data Analytics for IoT-enabled Hydropower Plants',
    'Online Learning Platform with Nepali Language AI Tutor',
    'Smart Agriculture Advisory System for Nepali Farmers',
    'Telemedicine Appointment & Record System for Rural Nepal',
    'Blockchain-based Food Supply Chain Traceability',
    'Energy-Efficient Edge Computing Framework for Smart Cities',
    'IoT-based Smart Water Quality Monitoring System',
    'Nepali Sign Language Translation using Deep Learning',
    'Automated Attendance System using Facial Recognition',
    'Smart Traffic Management System for Kathmandu Valley',
    'Decentralized Land Registry System on Hyperledger Fabric',
    'Autonomous Rover with LiDAR SLAM for Disaster Rescue',
    'Low-Cost Smart Prosthetic Arm with EMG Signal Processing',
    'Nepali Speech-to-Text Transcription using Conformer Architecture',
    'Microservices Architecture for Distributed Banking Systems',
    'Deep Learning based Plant Pathology and Yield Prediction',
    'Automated Toll Collection System with ANPR and RFID',
    'Federated Learning for Privacy-Preserving Health Diagnostics',
    'IoT-driven Cold Chain Telemetry System for Pharmaceuticals',
    'Urban Air Quality Forecasting using Spatial-Temporal Networks',
  ];

  let createdGroups = [];
  let bGroupIdx = 0;

  const bachelorBatches = [
    { batch: '078', bsYear: 2078, pType: 'MINOR', status: 'COMPLETED', start: '2022-02-01', end: '2022-07-30' },
    { batch: '078', bsYear: 2078, pType: 'MAJOR', status: 'COMPLETED', start: '2023-02-01', end: '2023-08-30' },
    { batch: '079', bsYear: 2079, pType: 'MINOR', status: 'COMPLETED', start: '2023-02-01', end: '2023-07-30' },
    { batch: '079', bsYear: 2079, pType: 'MAJOR', status: 'ACTIVE',    start: '2026-04-01', end: '2027-01-31' },
    { batch: '080', bsYear: 2080, pType: 'MINOR', status: 'ACTIVE',    start: '2026-05-01', end: '2027-02-28' },
  ];

  for (const item of bachelorBatches) {
    const batchStr = item.batch;
    const bsYear = item.bsYear;
    const nBCTGroups = 3;

    for (let gi = 0; gi < nBCTGroups; gi++) {
      const bctStudents = findStudents(bsYear, 'BCT');
      const startIdx = gi * 3;
      if (startIdx + 3 > bctStudents.length) break;
      const members = bctStudents.slice(startIdx, startIdx + 3);
      const sup = supervisors[bGroupIdx % supervisors.length];
      const ext = externalExaminers[bGroupIdx % externalExaminers.length];
      const title = bachelorGroupTitles[bGroupIdx % bachelorGroupTitles.length];

      const group = await prisma.projectGroup.create({
        data: {
          name: `BCT-${batchStr}-${item.pType === 'MAJOR' ? 'Major' : 'Minor'}-G${gi + 1}`,
          projectTitle: title,
          projectType: item.pType,
          status: item.status,
          cluster: ['AIML', 'IPCV', 'NTS', 'EDMES'][gi % 4],
          startDate: new Date(item.start),
          endDate: new Date(item.end),
          supervisorId: sup.id,
          programId: programs.BCT.id,
          academicYearId: ayMap[batchStr].id,
          batch: String(bsYear),
        },
      });

      for (const student of members) {
        await prisma.groupMember.create({
          data: { studentId: student.id, groupId: group.id, rollNumber: student.rollNumber },
        });
      }

      await prisma.examinerAssignment.create({
        data: { groupId: group.id, externalExaminerId: ext.id, assignedById: coordinators.BCT.id },
      });
      await attachComponents({ groupId: group.id, projectType: item.pType });

      // ── Generate Multi-Page PDFs and Attach Proposals ──
      const studentMemberList = members.map(m => ({ name: `${m.firstName} ${m.lastName}`, rollNumber: m.rollNumber }));

      // 1. Proposal PDF (All groups)
      const propPdfBuf = await generateRealisticProposalPDF({
        title,
        students: studentMemberList,
        supervisorName: `${sup.firstName} ${sup.lastName}`,
        supervisorDesignation: sup.designation,
        programName: 'Bachelor in Computer Engineering',
        batch: String(bsYear),
        projectType: item.pType,
      });
      const propFilename = `proposal_group_${group.id}.pdf`;
      fs.writeFileSync(path.join(storageGroupsDir, propFilename), propPdfBuf);
      await prisma.proposal.create({
        data: {
          stage: 'PROPOSAL',
          documentUrl: `/api/files/groups/${propFilename}`,
          documentType: 'PROPOSAL',
          status: 'APPROVED',
          submittedById: members[0].id,
          groupId: group.id,
        },
      });

      // 2. Midterm Report PDF (Batch 079 Major & Batch 078 Completed)
      if (item.pType === 'MAJOR') {
        const midPdfBuf = await generateRealisticMidtermReportPDF({
          title,
          students: studentMemberList,
          supervisorName: `${sup.firstName} ${sup.lastName}`,
          supervisorDesignation: sup.designation,
          programName: 'Bachelor in Computer Engineering',
          batch: String(bsYear),
          projectType: item.pType,
        });
        const midFilename = `midterm_group_${group.id}.pdf`;
        fs.writeFileSync(path.join(storageGroupsDir, midFilename), midPdfBuf);
        await prisma.proposal.create({
          data: {
            stage: 'MID_TERM',
            documentUrl: `/api/files/groups/${midFilename}`,
            documentType: 'MID_TERM_REPORT',
            status: 'APPROVED',
            submittedById: members[0].id,
            groupId: group.id,
          },
        });
      }

      // 3. Final Report PDF (Batch 078 Completed)
      if (item.status === 'COMPLETED') {
        const finalPdfBuf = await generateRealisticFinalReportPDF({
          title,
          students: studentMemberList,
          supervisorName: `${sup.firstName} ${sup.lastName}`,
          supervisorDesignation: sup.designation,
          externalExaminerName: `${ext.firstName} ${ext.lastName}`,
          programName: 'Bachelor in Computer Engineering',
          batch: String(bsYear),
          projectType: item.pType,
        });
        const finalFilename = `final_group_${group.id}.pdf`;
        fs.writeFileSync(path.join(storageGroupsDir, finalFilename), finalPdfBuf);
        await prisma.proposal.create({
          data: {
            stage: 'FINAL',
            documentUrl: `/api/files/groups/${finalFilename}`,
            documentType: 'FINAL_REPORT',
            status: 'APPROVED',
            submittedById: members[0].id,
            groupId: group.id,
          },
        });
      }

      createdGroups.push(group);
      bGroupIdx++;
    }

    // BEI group
    const beiStudents = findStudents(bsYear, 'BEI');
    if (beiStudents.length >= 2) {
      const sup = supervisors[1];
      const ext = externalExaminers[0];
      const title = 'IoT-based Smart Environmental Monitoring System';

      const group = await prisma.projectGroup.create({
        data: {
          name: `BEI-${batchStr}-${item.pType === 'MAJOR' ? 'Major' : 'Minor'}-G1`,
          projectTitle: title,
          projectType: item.pType,
          status: item.status,
          cluster: 'EDMES',
          startDate: new Date(item.start),
          endDate: new Date(item.end),
          supervisorId: sup.id,
          programId: programs.BEI.id,
          academicYearId: ayMap[batchStr].id,
          batch: String(bsYear),
        },
      });

      const beiMembers = [];
      for (let mi = 0; mi < Math.min(3, beiStudents.length); mi++) {
        beiMembers.push(beiStudents[mi]);
        await prisma.groupMember.create({
          data: { studentId: beiStudents[mi].id, groupId: group.id, rollNumber: beiStudents[mi].rollNumber },
        });
      }

      await prisma.examinerAssignment.create({
        data: { groupId: group.id, externalExaminerId: ext.id, assignedById: coordinators.BEI.id },
      });
      await attachComponents({ groupId: group.id, projectType: item.pType });

      const beiMemberList = beiMembers.map(m => ({ name: `${m.firstName} ${m.lastName}`, rollNumber: m.rollNumber }));
      const propPdfBuf = await generateRealisticProposalPDF({
        title,
        students: beiMemberList,
        supervisorName: `${sup.firstName} ${sup.lastName}`,
        supervisorDesignation: sup.designation,
        programName: 'Bachelor in Electronics & Information',
        batch: String(bsYear),
        projectType: item.pType,
      });
      const propFilename = `proposal_group_${group.id}.pdf`;
      fs.writeFileSync(path.join(storageGroupsDir, propFilename), propPdfBuf);
      await prisma.proposal.create({
        data: {
          stage: 'PROPOSAL',
          documentUrl: `/api/files/groups/${propFilename}`,
          documentType: 'PROPOSAL',
          status: 'APPROVED',
          submittedById: beiMembers[0].id,
          groupId: group.id,
        },
      });

      if (item.status === 'COMPLETED') {
        const finalPdfBuf = await generateRealisticFinalReportPDF({
          title,
          students: beiMemberList,
          supervisorName: `${sup.firstName} ${sup.lastName}`,
          supervisorDesignation: sup.designation,
          externalExaminerName: `${ext.firstName} ${ext.lastName}`,
          programName: 'Bachelor in Electronics & Information',
          batch: String(bsYear),
          projectType: item.pType,
        });
        const finalFilename = `final_group_${group.id}.pdf`;
        fs.writeFileSync(path.join(storageGroupsDir, finalFilename), finalPdfBuf);
        await prisma.proposal.create({
          data: {
            stage: 'FINAL',
            documentUrl: `/api/files/groups/${finalFilename}`,
            documentType: 'FINAL_REPORT',
            status: 'APPROVED',
            submittedById: beiMembers[0].id,
            groupId: group.id,
          },
        });
      }

      createdGroups.push(group);
    }
  }
  console.log(`Created ${createdGroups.length} Bachelor project groups with multi-page PDFs`);

  // ============================================================
  // MASTER THESES & PROJECTS WITH MULTI-PAGE REPORTS
  // ============================================================
  const masterThesisTitles = [
    'Automated Intrusion Detection in Software-Defined Networks using Deep Graph Convolutional Networks',
    'Zero-Trust Architecture and Micro-Segmentation for Cloud-Native Kubernetes Clusters',
    'Privacy-Preserving Federated Learning for IoT Malware Classification',
    'Post-Quantum Cryptographic Key Exchange for Lightweight Embedded Systems',
    'RIS-Assisted 6G Wireless Communication: Channel Estimation and Beamforming',
    'Energy-Harvesting Cognitive Radio Networks using Deep Reinforcement Learning',
    'FPGA Acceleration of Real-Time Video Super-Resolution for Telemedicine',
    'Spatiotemporal Graph Neural Networks for Kathmandu Traffic Flow Prediction',
    'Causal Inference and Multi-Modal Survival Analysis for Healthcare Outcomes',
    'Multilingual Low-Resource Neural Machine Translation for Nepali Dialects',
    'Neuro-Symbolic Knowledge Graph Completion for Biomedical Literature',
    'High-Throughput Distributed Graph Analytics Engine on Apache Spark & GraphX',
  ];

  const masterProjectTitles = [
    'Cloud-Native Microservices Security Auditing and Telemetry Pipeline',
    'Real-Time Network Flow Anomaly Detection using eBPF and XDP',
    'Automated Zero-Day Vulnerability Scanning in Smart Contracts',
    'Hardware-Accelerated Cryptographic Accelerator for Edge Routers',
    'Decentralized Identity Verification Framework using Verifiable Credentials',
    'Smart Grid Energy Consumption Forecasting using Hybrid Temporal Networks',
  ];

  let createdTheses = [];
  let createdProjects = [];
  let tIdx = 0;
  let pIdx = 0;

  const masterBatches = [
    { batch: '078', bsYear: 2078, thesisStatus: 'COMPLETED', projectStatus: 'COMPLETED', projStart: '2022-02-01', projEnd: '2022-07-30', thesisStart: '2022-08-01', thesisEnd: '2023-04-30' },
    { batch: '079', bsYear: 2079, thesisStatus: 'COMPLETED', projectStatus: 'COMPLETED', projStart: '2023-02-01', projEnd: '2023-07-30', thesisStart: '2023-08-01', thesisEnd: '2024-04-30' },
    { batch: '080', bsYear: 2080, thesisStatus: 'COMPLETED', projectStatus: 'COMPLETED', projStart: '2024-02-01', projEnd: '2024-07-30', thesisStart: '2024-08-01', thesisEnd: '2025-04-30' },
    { batch: '081', bsYear: 2081, thesisStatus: 'ACTIVE',    projectStatus: 'COMPLETED', projStart: '2025-02-01', projEnd: '2025-07-30', thesisStart: '2026-04-01', thesisEnd: '2027-02-28' },
  ];

  for (const item of masterBatches) {
    const bsYear = item.bsYear;
    for (const prog of MASTER_PROGRAMS) {
      const progStudents = findStudents(bsYear, prog.code);
      if (!progStudents.length) continue;

      const student = progStudents[0];
      if (!student) continue;

      const sup = supervisors[tIdx % supervisors.length];
      const extMid = externalExaminers[tIdx % externalExaminers.length];
      const extFinal = externalExaminers[(tIdx + 1) % externalExaminers.length];
      const thesisTitle = masterThesisTitles[tIdx % masterThesisTitles.length];
      const projectTitle = masterProjectTitles[pIdx % masterProjectTitles.length];
      const studentData = [{ name: `${student.firstName} ${student.lastName}`, rollNumber: student.rollNumber }];

      // 1. 3rd Semester Master Project (4 Cr, Completed for all 078-081)
      const mProject = await prisma.thesis.create({
        data: {
          title: projectTitle,
          projectType: 'PROJECT',
          studentId: student.id,
          status: item.projectStatus,
          startDate: new Date(item.projStart),
          endDate: new Date(item.projEnd),
          supervisorId: sup.id,
          externalMidTermId: null,
          externalFinalId: extFinal.id,
          batch: String(bsYear),
          cluster: prog.cluster,
          programId: prog.id,
        },
      });

      await attachComponents({ thesisId: mProject.id, projectType: 'PROJECT' });
      await prisma.examinerAssignment.create({
        data: { thesisId: mProject.id, externalExaminerId: extFinal.id, assignedById: coordinators[prog.code].id },
      });

      const projPropPdfBuf = await generateRealisticProposalPDF({
        title: projectTitle,
        students: studentData,
        supervisorName: `${sup.firstName} ${sup.lastName}`,
        supervisorDesignation: sup.designation,
        programName: prog.name,
        batch: String(bsYear),
        projectType: 'PROJECT',
      });
      const projPropFilename = `proposal_project_${mProject.id}.pdf`;
      fs.writeFileSync(path.join(storageThesesDir, projPropFilename), projPropPdfBuf);
      await prisma.proposal.create({
        data: {
          stage: 'PROPOSAL',
          documentUrl: `/api/files/theses/${projPropFilename}`,
          documentType: 'PROPOSAL',
          status: 'APPROVED',
          submittedById: student.id,
          thesisId: mProject.id,
        },
      });

      if (item.projectStatus === 'COMPLETED') {
        const projFinalPdfBuf = await generateRealisticFinalReportPDF({
          title: projectTitle,
          students: studentData,
          supervisorName: `${sup.firstName} ${sup.lastName}`,
          supervisorDesignation: sup.designation,
          externalExaminerName: `${extFinal.firstName} ${extFinal.lastName}`,
          programName: prog.name,
          batch: String(bsYear),
          projectType: 'PROJECT',
        });
        const projFinalFilename = `final_project_${mProject.id}.pdf`;
        fs.writeFileSync(path.join(storageThesesDir, projFinalFilename), projFinalPdfBuf);
        await prisma.proposal.create({
          data: {
            stage: 'FINAL',
            documentUrl: `/api/files/theses/${projFinalFilename}`,
            documentType: 'FINAL_REPORT',
            status: 'APPROVED',
            submittedById: student.id,
            thesisId: mProject.id,
          },
        });
      }
      createdProjects.push(mProject);
      pIdx++;

      // 2. 4th Semester Master Thesis (16 Cr, Active for 081, Completed for 078-080)
      const thesis = await prisma.thesis.create({
        data: {
          title: thesisTitle,
          projectType: 'THESIS',
          studentId: student.id,
          status: item.thesisStatus,
          startDate: new Date(item.thesisStart),
          endDate: new Date(item.thesisEnd),
          supervisorId: sup.id,
          externalMidTermId: extMid.id,
          externalFinalId: extFinal.id,
          batch: String(bsYear),
          cluster: prog.cluster,
          programId: prog.id,
        },
      });

      await attachComponents({ thesisId: thesis.id, projectType: 'THESIS' });
      await prisma.examinerAssignment.create({
        data: { thesisId: thesis.id, externalExaminerId: extFinal.id, assignedById: coordinators[prog.code].id },
      });

      const propPdfBuf = await generateRealisticProposalPDF({
        title: thesisTitle,
        students: studentData,
        supervisorName: `${sup.firstName} ${sup.lastName}`,
        supervisorDesignation: sup.designation,
        programName: prog.name,
        batch: String(bsYear),
        projectType: 'THESIS',
      });
      const propFilename = `proposal_thesis_${thesis.id}.pdf`;
      fs.writeFileSync(path.join(storageThesesDir, propFilename), propPdfBuf);
      await prisma.proposal.create({
        data: {
          stage: 'PROPOSAL',
          documentUrl: `/api/files/theses/${propFilename}`,
          documentType: 'PROPOSAL',
          status: 'APPROVED',
          submittedById: student.id,
          thesisId: thesis.id,
        },
      });

      // Midterm Report PDF (Active 4th sem or Completed)
      if (item.thesisStatus === 'COMPLETED' || item.batch === '081') {
        const midPdfBuf = await generateRealisticMidtermReportPDF({
          title: thesisTitle,
          students: studentData,
          supervisorName: `${sup.firstName} ${sup.lastName}`,
          supervisorDesignation: sup.designation,
          programName: prog.name,
          batch: String(bsYear),
          projectType: 'THESIS',
        });
        const midFilename = `midterm_thesis_${thesis.id}.pdf`;
        fs.writeFileSync(path.join(storageThesesDir, midFilename), midPdfBuf);
        await prisma.proposal.create({
          data: {
            stage: 'MID_TERM',
            documentUrl: `/api/files/theses/${midFilename}`,
            documentType: 'MID_TERM_REPORT',
            status: 'APPROVED',
            submittedById: student.id,
            thesisId: thesis.id,
          },
        });
      }

      // Final Report PDF (Completed)
      if (item.thesisStatus === 'COMPLETED') {
        const finalPdfBuf = await generateRealisticFinalReportPDF({
          title: thesisTitle,
          students: studentData,
          supervisorName: `${sup.firstName} ${sup.lastName}`,
          supervisorDesignation: sup.designation,
          externalExaminerName: `${extFinal.firstName} ${extFinal.lastName}`,
          programName: prog.name,
          batch: String(bsYear),
          projectType: 'THESIS',
        });
        const finalFilename = `final_thesis_${thesis.id}.pdf`;
        fs.writeFileSync(path.join(storageThesesDir, finalFilename), finalPdfBuf);
        await prisma.proposal.create({
          data: {
            stage: 'FINAL',
            documentUrl: `/api/files/theses/${finalFilename}`,
            documentType: 'FINAL_REPORT',
            status: 'APPROVED',
            submittedById: student.id,
            thesisId: thesis.id,
          },
        });
      }

      createdTheses.push(thesis);
      tIdx++;
    }
  }
  console.log(`Created ${createdTheses.length} Master Theses and ${createdProjects.length} Master Projects with multi-page PDFs`);

  // ============================================================
  // EVALUATIONS & MARKS (Full defense evaluations for completed cohorts)
  // ============================================================
  const completedGroups = createdGroups.filter(g => g.status === 'COMPLETED');
  for (const compGroup of completedGroups) {
    const comps = await prisma.evaluationComponent.findMany({ where: { groupId: compGroup.id } });
    const cMap = Object.fromEntries(comps.map(c => [c.evaluationType, c]));
    const ext = await prisma.examinerAssignment.findFirst({ where: { groupId: compGroup.id } });
    const isMinor = compGroup.projectType === 'MINOR';
    const coordId = compGroup.programId === programs.BEI.id ? coordinators.BEI.id : coordinators.BCT.id;

    if (cMap.PROPOSAL_DEFENSE) {
      await prisma.evaluation.create({
        data: { componentId: cMap.PROPOSAL_DEFENSE.id, stage: 'PROPOSAL', evaluationType: 'PROPOSAL_DEFENSE', marks: isMinor ? 4.5 : 8.5, comments: 'Well prepared proposal defense with sound feasibility study.', status: 'COMPLETED', submittedById: coordId, groupId: compGroup.id },
      });
    }
    if (cMap.MIDTERM_DEFENSE) {
      await prisma.evaluation.create({
        data: { componentId: cMap.MIDTERM_DEFENSE.id, stage: 'MID_TERM', evaluationType: 'MIDTERM_DEFENSE', marks: isMinor ? 4.0 : 8.0, comments: 'Good milestone progress; core pipeline verified.', status: 'COMPLETED', submittedById: coordId, groupId: compGroup.id },
      });
    }
    if (cMap.SUPERVISOR && compGroup.supervisorId) {
      await prisma.evaluation.create({
        data: { componentId: cMap.SUPERVISOR.id, stage: 'FINAL', evaluationType: 'SUPERVISOR', marks: isMinor ? 22.0 : 44.0, comments: 'Outstanding dedication and high software quality.', suggestions: 'Publish benchmark results.', status: 'COMPLETED', submittedById: compGroup.supervisorId, groupId: compGroup.id },
      });
    }
    if (cMap.EXTERNAL_EXAMINER && ext) {
      await prisma.evaluation.create({
        data: { componentId: cMap.EXTERNAL_EXAMINER.id, stage: 'FINAL', evaluationType: 'EXTERNAL_EXAMINER', marks: isMinor ? 8.5 : 17.5, comments: 'Clear presentation and solid defense of technical choices.', status: 'COMPLETED', submittedById: ext.externalExaminerId, groupId: compGroup.id },
      });
    }
    if (cMap.FINAL_DEFENSE) {
      await prisma.evaluation.create({
        data: { componentId: cMap.FINAL_DEFENSE.id, stage: 'FINAL', evaluationType: 'FINAL_DEFENSE', marks: isMinor ? 4.5 : 9.0, comments: 'Excellent final project defense.', status: 'COMPLETED', submittedById: coordId, groupId: compGroup.id },
      });
    }
  }

  const completedTheses = createdTheses.filter(t => t.status === 'COMPLETED');
  for (const compThesis of completedTheses) {
    const comps = await prisma.evaluationComponent.findMany({ where: { thesisId: compThesis.id } });
    const seenTypes = new Set();
    for (const c of comps) {
      let subId = compThesis.supervisorId || supervisors[0].id;
      let score = 18.0;
      if (c.evaluationType === 'EXTERNAL_MIDTERM') {
        subId = compThesis.externalMidTermId || externalExaminers[0].id;
        score = c.maxMarks === 20 ? 17.5 : 8.5;
      } else if (c.evaluationType === 'EXTERNAL_FINAL') {
        subId = compThesis.externalFinalId || externalExaminers[1].id;
        score = 18.5;
      }
      const isFirstForType = !seenTypes.has(c.evaluationType);
      seenTypes.add(c.evaluationType);

      await prisma.evaluation.create({
        data: {
          componentId: c.id,
          stage: c.stage || 'FINAL',
          evaluationType: c.evaluationType,
          marks: score,
          comments: isFirstForType ? 'Evaluated thoroughly with commendable research rigor.' : null,
          suggestions: isFirstForType ? 'Consider submitting extended results to an IEEE conference.' : null,
          status: 'COMPLETED',
          submittedById: subId,
          thesisId: compThesis.id,
        },
      });
    }
  }

  const completedProjects = createdProjects.filter(p => p.status === 'COMPLETED');
  for (const compProject of completedProjects) {
    const comps = await prisma.evaluationComponent.findMany({ where: { thesisId: compProject.id } });
    const subId = compProject.externalFinalId || externalExaminers[0].id;
    let isFirst = true;
    for (const c of comps) {
      await prisma.evaluation.create({
        data: {
          componentId: c.id,
          stage: 'FINAL',
          evaluationType: 'EXTERNAL_FINAL',
          marks: 18.5,
          comments: isFirst ? 'High quality implementation and defense.' : null,
          suggestions: isFirst ? 'Refactor modular components for production packaging.' : null,
          status: 'COMPLETED',
          submittedById: subId,
          thesisId: compProject.id,
        },
      });
      isFirst = false;
    }
  }

  // ============================================================
  // ANNOUNCEMENTS & FORMS (Batch 2080 Minor, 2079 Major, 2082 Master)
  // ============================================================
  const masterThesisAnn = await prisma.announcement.create({
    data: {
      title: 'M.Sc. Research Thesis Topic Registration & Concept Note (Batch 2082)',
      message: 'All enrolled M.Sc. students of Batch 2082 (MSNCS, MSDSA, MSICE, MSCSK) in 3rd Semester must register their research thesis proposal topic and preferred supervisor before the deadline.',
      type: 'THESIS',
      audience: 'PROGRAMS',
      degreeType: 'MASTER',
      programIds: [programs.MSNCS.id, programs.MSDSA.id, programs.MSICE.id, programs.MSCSK.id],
      batch: '2082',
      academicYearId: ayMap['082'].id,
      departmentId: eceDept.id,
      formEnabled: true,
      formFields: [
        { key: 'projectType', label: 'Proposal Type (Thesis / Project)', type: 'select', required: true, options: ['Thesis', 'Project'] },
        { key: 'cluster', label: 'Research Cluster / Area', type: 'select', required: true, options: ['AI/ML and image processing', 'Audio, NLP and data/text analytics', 'Electronic devices, circuits and communication', 'Computer networks and security'] },
        { key: 'is_guided', label: 'Is it a guided proposal? (topic provided by a faculty member)', type: 'select', required: true, options: ['Yes', 'No'] },
        { key: 'primary_supervisor', label: 'Primary faculty member consulted or preferred as supervisor', type: 'text', required: false, placeholder: 'Enter primary supervisor name (optional)' },
        { key: 'secondary_supervisor', label: 'Secondary faculty member(s) consulted or preferred as supervisor', type: 'text', required: false, placeholder: 'Enter secondary supervisor name(s) (optional)' },
        { key: 'pdfUrl', label: 'Concept Note / Proposal Document (PDF, max 10MB)', type: 'file', required: false },
        { key: 'remarks', label: 'Remarks / Abstract (if any)', type: 'textarea', required: false },
      ],
      startDate: new Date('2026-01-01'),
      expirationDate: new Date('2027-06-30'),
      createdById: coordinators.MSNCS.id,
    },
  });

  const bachelorMinorAnn = await prisma.announcement.create({
    data: {
      title: 'Bachelor Minor Project Group Formation & Proposal Call (Batch 2080)',
      message: 'Third year BCT & BEI students of Batch 2080 must form groups of 2–4 members and submit minor project proposals.',
      type: 'MINOR',
      audience: 'PROGRAMS',
      degreeType: 'BACHELOR',
      programIds: [programs.BCT.id, programs.BEI.id],
      batch: '2080',
      academicYearId: ayMap['080'].id,
      departmentId: eceDept.id,
      allowGroupFormation: true,
      groupSizeMin: 2,
      groupSizeMax: 4,
      formEnabled: true,
      formFields: [
        { key: 'project_cluster', label: 'Project Cluster', type: 'text', required: true, placeholder: 'AIML, IPCV, NTS, EDMES' },
      ],
      startDate: new Date('2026-01-01'),
      expirationDate: new Date('2027-06-30'),
      createdById: coordinators.BCT.id,
    },
  });

  const bachelorMajorAnn = await prisma.announcement.create({
    data: {
      title: 'Bachelor Major Project Group Formation & Defense Call (Batch 2079)',
      message: 'Final year BCT & BEI students of Batch 2079 must finalize their major project groups and defense submissions.',
      type: 'MAJOR',
      audience: 'PROGRAMS',
      degreeType: 'BACHELOR',
      programIds: [programs.BCT.id, programs.BEI.id],
      batch: '2079',
      academicYearId: ayMap['079'].id,
      departmentId: eceDept.id,
      allowGroupFormation: true,
      groupSizeMin: 2,
      groupSizeMax: 4,
      formEnabled: true,
      startDate: new Date('2026-01-01'),
      expirationDate: new Date('2027-06-30'),
      createdById: coordinators.BCT.id,
    },
  });

  // ============================================================
  // PRE-POPULATE DEMO FORM RESPONSES MATRIX (2082 Batch)
  // ============================================================
  const master2082Students = students.filter(s => s.batch === '2082' && s.degreeType === 'MASTER');

  const demoConceptSubmissions = [
    {
      roll: '082MSNCS01',
      title: 'Automated Intrusion Detection in Software-Defined Networks using Deep Graph Convolutional Networks',
      cluster: 'Computer networks and security',
      is_guided: 'Yes',
      primary_supervisor: 'Dr. Prabesh Bhattarai',
      secondary_supervisor: 'Ramesh Sharma',
      project_domain: 'Network Security & SDN',
      remarks: 'Consulted Dr. Bhattarai. Dataset from CIC-IDS2018 benchmark.',
      status: 'SUBMITTED',
      description: 'Automated intrusion detection framework for SDN using graph convolutional networks to model topological flow dependencies.'
    },
    {
      roll: '082MSNCS02',
      title: 'Zero-Trust Architecture and Micro-Segmentation for Cloud-Native Kubernetes Clusters',
      cluster: 'Computer networks and security',
      is_guided: 'No',
      primary_supervisor: 'Prof. Andrew Ng (Stanford/Coursera)',
      secondary_supervisor: 'Bishnu Tamang',
      project_domain: 'Cloud Security & DevOps',
      remarks: 'Requested external advisor, needs internal supervisor allocation.',
      status: 'SUBMITTED',
      description: 'Evaluating zero-trust network policies and eBPF-based packet filtering in high-concurrency microservices.'
    },
    {
      roll: '082MSNCS03',
      title: 'Privacy-Preserving Federated Learning for IoT Malware Classification',
      cluster: 'Computer networks and security',
      is_guided: 'Yes',
      primary_supervisor: 'Prof. Anita Gurung',
      secondary_supervisor: 'Bhattarai',
      project_domain: 'IoT Security & Federated Learning',
      remarks: 'Differential privacy parameters aligned with campus IoT lab protocols.',
      status: 'SUBMITTED',
      description: 'Investigating differential privacy guarantees in federated edge learning for IoT malware telemetry classification.'
    },
    {
      roll: '082MSNCS04',
      title: 'Post-Quantum Cryptographic Key Exchange for Lightweight Embedded Systems',
      cluster: 'Computer networks and security',
      is_guided: 'No',
      primary_supervisor: 'Assoc. Prof. Rajendra Neupane',
      secondary_supervisor: 'Dr. Yann LeCun (External Consultant)',
      project_domain: 'Applied Cryptography & Embedded Systems',
      remarks: 'Benchmarking Kyber-512 and Dilithium on ARM Cortex-M4 microcontrollers.',
      status: 'LATE_SUBMITTED',
      description: 'Benchmarking and optimization of NIST post-quantum cryptographic primitives on resource-constrained embedded nodes.'
    },
    {
      roll: '082MSICE01',
      title: 'RIS-Assisted 6G Wireless Communication: Channel Estimation and Beamforming',
      cluster: 'Electronic devices, circuits and communication',
      is_guided: 'Yes',
      primary_supervisor: 'Sagar Acharya',
      secondary_supervisor: 'Maya Khadka (HOD)',
      project_domain: 'Wireless Communications & 6G',
      remarks: 'Co-simulation with MATLAB/Simulink and SDR hardware in campus lab.',
      status: 'SUBMITTED',
      description: 'Design of reconfigurable intelligent surface phase-shift matrices for millimeter-wave multi-user channel estimation.'
    },
    {
      roll: '082MSICE02',
      title: 'Energy-Harvesting Cognitive Radio Networks using Deep Reinforcement Learning',
      cluster: '',
      is_guided: 'No',
      primary_supervisor: 'Dr. John Doe (Industry Mentor)',
      secondary_supervisor: 'Sarita',
      project_domain: 'Cognitive Radio & Green Communications',
      remarks: 'Unsure of cluster taxonomy; requesting coordinator guidance.',
      status: 'SUBMITTED',
      description: 'Multi-agent deep reinforcement learning for dynamic spectrum access under RF ambient energy harvesting constraints.'
    },
    {
      roll: '082MSICE03',
      title: 'FPGA Acceleration of Real-Time Video Super-Resolution for Telemedicine',
      cluster: 'AI/ML and image processing',
      is_guided: 'Yes',
      primary_supervisor: 'Sarita Poudel',
      secondary_supervisor: 'Dr. Sagar',
      project_domain: 'Hardware Acceleration & Computer Vision',
      remarks: 'Targeting Xilinx Zynq UltraScale+ FPGA with Vitis AI runtime.',
      status: 'SUBMITTED',
      description: 'Hardware-software co-design of quantized convolutional super-resolution models on embedded SoC FPGA.'
    },
    {
      roll: '082MSDSA01',
      title: 'Spatiotemporal Graph Neural Networks for Kathmandu Traffic Flow Prediction',
      cluster: 'Audio, NLP and data/text analytics',
      is_guided: 'Yes',
      primary_supervisor: 'gurung',
      secondary_supervisor: 'Prabesh Bhattarai',
      project_domain: 'Spatiotemporal Data Mining & GNNs',
      remarks: 'Traffic sensor & GPS telemetry dataset collected from Valley Traffic Police.',
      status: 'SUBMITTED',
      description: 'Spatial-temporal graph neural network architecture for urban corridor congestion forecasting in Kathmandu Valley.'
    },
    {
      roll: '082MSDSA02',
      title: 'Causal Inference and Multi-Modal Survival Analysis for Healthcare Outcomes',
      cluster: 'Audio, NLP and data/text analytics',
      is_guided: 'No',
      primary_supervisor: 'Tamang Sir',
      secondary_supervisor: 'Prof. Geoffrey Hinton',
      project_domain: 'Healthcare Analytics & Causal ML',
      remarks: 'De-identified MIMIC-IV electronic health records approved.',
      status: 'SUBMITTED',
      description: 'Counterfactual reasoning and transformer-based multi-modal survival estimators for critical patient progression.'
    },
    {
      roll: '082MSDSA03',
      title: 'Multilingual Low-Resource Neural Machine Translation for Nepali Dialects',
      cluster: 'Audio, NLP and data/text analytics',
      is_guided: 'Yes',
      primary_supervisor: 'Bishnu Tamang',
      secondary_supervisor: 'Sharma',
      project_domain: 'Natural Language Processing & LLMs',
      remarks: 'Fine-tuning LLaMA/Mistral with LoRA and custom bilingual corpus.',
      status: 'SUBMITTED',
      description: 'Parameter-efficient fine-tuning and synthetic back-translation strategies for low-resource Nepali language translation.'
    },
    {
      roll: '082MSDSA04',
      title: 'Large Language Model Reasoning Verification via Automated Formal Theorem Proving',
      cluster: 'Audio, NLP and data/text analytics',
      is_guided: 'Yes',
      primary_supervisor: 'Dr. Anita Gurung',
      secondary_supervisor: 'Bishnu Tamang',
      project_domain: 'Formal Methods & Generative AI',
      remarks: 'Integration with Lean 4 and Isabelle interactive theorem provers.',
      status: 'SUBMITTED',
      description: 'Neuro-symbolic feedback loops between generative language models and interactive proof assistants for mathematical verification.'
    },
    {
      roll: '082MSCSK01',
      title: 'Neuro-Symbolic Knowledge Graph Completion for Biomedical Literature',
      cluster: 'Audio, NLP and data/text analytics',
      is_guided: 'Yes',
      primary_supervisor: 'Ramesh Sharma',
      secondary_supervisor: 'Dr. Prabesh',
      project_domain: 'Knowledge Graphs & NLP',
      remarks: 'Extracting entity relations from PubMed open dataset.',
      status: 'SUBMITTED',
      description: 'Combining first-order logic rules and vector embeddings for robust multi-hop link prediction in biomedical knowledge graphs.'
    },
    {
      roll: '082MSCSK02',
      title: 'High-Throughput Distributed Graph Analytics Engine on Apache Spark & GraphX',
      cluster: 'Computer networks and security',
      is_guided: 'No',
      primary_supervisor: 'Bhattarai',
      secondary_supervisor: 'External Advisor - Dr. K. R. Joshi (KU)',
      project_domain: 'Big Data Systems & Distributed Computing',
      remarks: 'Benchmarking on 8-node cluster in departmental laboratory.',
      status: 'LATE_SUBMITTED',
      description: 'Design and partitioning optimizations for petabyte-scale distributed graph centrality and community detection.'
    },
    {
      roll: '082MSCSK03',
      title: '3D Medical Image Segmentation Using Diffusion Models and Transformers',
      cluster: 'AI/ML and image processing',
      is_guided: 'Yes',
      primary_supervisor: 'Dr. Sarita Poudel',
      secondary_supervisor: 'Maya Khadka',
      project_domain: 'Medical Imaging & Deep Learning',
      remarks: 'CT and MRI brain tumor segmentation with BraTS 2024 dataset.',
      status: 'SUBMITTED',
      description: 'Conditional latent diffusion framework with 3D vision transformers for volumetric organ-at-risk segmentation.'
    },
    {
      roll: '082MSCSK04',
      title: 'Automated Vulnerability Detection in Smart Contracts via Semantic Graph Embeddings',
      cluster: '',
      is_guided: 'No',
      primary_supervisor: 'Neupane',
      secondary_supervisor: 'Prabesh Bhattarai',
      project_domain: 'Blockchain & Software Security',
      remarks: 'Dataset of 50,000 verified Ethereum contracts analyzed with Slither.',
      status: 'SUBMITTED',
      description: 'Static AST and control-flow graph embedding pipeline for reentrancy and integer overflow detection in EVM bytecode.'
    }
  ];

  for (const item of demoConceptSubmissions) {
    const student = master2082Students.find(s => s.rollNumber.toUpperCase() === item.roll.toUpperCase());
    if (!student) continue;

    const pdfFilename = `proposal_${student.rollNumber.toLowerCase()}_${masterThesisAnn.id}.pdf`;
    const pdfBuf = await generateRealisticProposalPDF({
      title: item.title,
      students: [{ name: `${student.firstName} ${student.lastName}`, rollNumber: student.rollNumber }],
      supervisorName: item.primary_supervisor || 'Faculty Member',
      supervisorDesignation: 'Prospective Supervisor',
      programName: 'Master Degree Program',
      batch: '2082',
      projectType: 'THESIS',
    });
    fs.writeFileSync(path.join(storageThesesDir, pdfFilename), pdfBuf);
    const pdfUrl = `/api/files/theses/${pdfFilename}`;

    const formData = {
      title: item.title,
      description: item.description,
      cluster: item.cluster,
      is_guided: item.is_guided,
      primary_supervisor: item.primary_supervisor,
      secondary_supervisor: item.secondary_supervisor,
      remarks: item.remarks,
      project_domain: item.project_domain,
      pdfUrl,
      pdf_document: pdfUrl,
    };

    await prisma.formResponse.create({
      data: {
        announcementId: masterThesisAnn.id,
        studentId: student.id,
        formData,
        status: item.status,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 5 + 1) * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`Pre-populated ${demoConceptSubmissions.length} demo form submissions with multi-page PDFs`);

  console.log('\n========================================================================');
  console.log(' SEED COMPLETE — MULTI-PAGE PDFS & TIMELINE ALIGNED SHOWCASE READY');
  console.log('========================================================================');
  console.log('• Password for ALL accounts:          "subesh"');
  console.log('• Bachelor Minor (Batch 2080):       Active Minor Projects + Multi-Page Proposal PDFs');
  console.log('• Bachelor Major (Batch 2079):       Active Major Projects + Multi-Page Proposal & Midterm PDFs');
  console.log('• Bachelor Archive (Batch 2078):     Completed Major Projects + Proposal, Midterm, & Final Report PDFs');
  console.log('• Master Project (Batch 2082):       Active 3rd Sem Projects + Multi-Page Proposal PDFs');
  console.log('• Master Thesis (Batch 2081):        Active 4th Sem Theses + Multi-Page Proposal & Midterm PDFs');
  console.log('• Master Archive (Batch 2080-2078):  Completed Theses & Projects + Proposal, Midterm, & Final PDFs');
  console.log('========================================================================\n');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
