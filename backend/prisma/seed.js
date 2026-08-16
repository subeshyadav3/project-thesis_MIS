const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
const { getDefaultComponents } = require('../src/config/evaluationScheme');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

const hash = bcrypt.hashSync('subesh', 10);

/** Extract program code from a roll number like "080BCT001" or "080MSNCS01" */
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

// ── Batch definitions ──────────────────────────────────────────────────
const BATCH_DEFS = [
  {
    batch: '079',
    bsYear: 2079,
    counts: { BCT: 24, BEI: 12, MSNCS: 6, MSICE: 5, MSDSA: 6, MSCSK: 5 },
  },
  {
    batch: '080',
    bsYear: 2080,
    counts: { BCT: 30, BEI: 16, MSNCS: 8, MSICE: 6, MSDSA: 8, MSCSK: 6 },
  },
  {
    batch: '081',
    bsYear: 2081,
    counts: { BCT: 24, BEI: 12, MSNCS: 6, MSICE: 5, MSDSA: 6, MSCSK: 5 },
  },
  {
    batch: '082',
    bsYear: 2082,
    counts: { BCT: 18, BEI: 8, MSNCS: 4, MSICE: 3, MSDSA: 4, MSCSK: 3 },
  },
];

// ── Student definition generator ───────────────────────────────────────
function generateStudentDefs() {
  const defs = [];
  for (const bd of BATCH_DEFS) {
    // Bachelor students
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
    // Master students
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
  console.log('Seeding database with comprehensive demo dataset...');

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
      data: { year: bd.batch, semester: 'Regular', departmentId: eceDept.id, isActive: bd.batch === '080' },
    });
    ayMap[bd.batch] = ay;
  }
  ayMap['078'] = await prisma.academicYear.create({
    data: { year: '078', semester: 'Regular', departmentId: eceDept.id, isActive: false },
  });
  console.log(`Created ${Object.keys(ayMap).length} academic years (078–082)`);

  // ============================================================
  // USERS
  // ============================================================
  // Maintainer
  const maintainer = await prisma.user.create({
    data: { email: 'subeshgaming@gmail.com', password: hash, firstName: 'Subesh', lastName: 'Gaming', role: 'MAINTAINER' },
  });

  // Coordinators — one per program
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
  console.log(`Created ${coordDefs.length} program coordinators`);

  // Supervisors
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
  console.log(`Created ${supervisors.length} supervisors`);

  // External Examiners
  const externalExamDefs = [
    { fn: 'Hari', ln: 'Adhikari', email: 'hari.adhikari@pcampus.edu.np', designation: 'Prof. Dr.' },
    { fn: 'Suman', ln: 'Bhattarai', email: 'suman.bhattarai@pcampus.edu.np', designation: 'Assoc. Prof. Dr.' },
    { fn: 'Rita', ln: 'Sharma', email: 'rita.sharma@pcampus.edu.np', designation: 'Asst. Prof. Dr.' },
    { fn: 'Kiran', ln: 'Mainali', email: 'kiran.mainali@pcampus.edu.np', designation: 'Prof. Dr.' },
  ];
  const externalExaminers = [];
  for (const ex of externalExamDefs) {
    externalExaminers.push(await prisma.user.create({
      data: { email: ex.email, password: hash, firstName: ex.fn, lastName: ex.ln, role: 'EXTERNAL_EXAMINER', designation: ex.designation, departmentId: eceDept.id },
    }));
  }
  console.log(`Created ${externalExaminers.length} external examiners`);

  // ── Students ──
  const studentDefs = generateStudentDefs();
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
        rollNumber: s.roll,
        batch: s.batch,
        departmentId: program.departmentId,
        programId: program.id,
      },
    }));
  }
  console.log(`Created ${students.length} students across 4 batches`);

  // Helper to create evaluation components
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

  // Helper to find students by batch (BS year) and program
  function findStudents(bsYear, programCode) {
    const yearStr = String(bsYear);
    return students.filter(s => {
      if (s.batch !== yearStr) return false;
      const prog = getProgramFromRoll(s.rollNumber);
      return prog === programCode;
    });
  }

  // ============================================================
  // BACHELOR GROUPS (Minor & Major Projects)
  // ============================================================
  const bachelorGroupTitles = [
    'AI-Powered Code Review Assistant for Nepali Developers',
    'Multi-Cloud Cost Optimization Dashboard for SMEs',
    'Real-Time Data Analytics for IoT-enabled Hydropower Plants',
    'Online Learning Platform with Nepali Language AI Tutor',
    'Smart Agriculture Advisory System for Nepali Farmers',
    'Telemedicine Appointment & Record System for Rural Nepal',
    'Blockchain-based Food Supply Chain Traceability',
    'Energy-Efficient Edge Computing Framework',
    'IoT-based Smart Water Quality Monitoring System',
    'Nepali Sign Language Translation using Deep Learning',
    'Automated Attendance System using Facial Recognition',
    'Smart Traffic Management for Kathmandu Valley',
  ];

  let createdGroups = [];
  let bGroupIdx = 0;

  for (const bd of BATCH_DEFS) {
    const batchStr = bd.batch;
    const bsYear = bd.bsYear;
    const nBCTGroups = Math.min(3, Math.floor(bd.counts.BCT / 3));

    for (let gi = 0; gi < nBCTGroups; gi++) {
      const bctStudents = findStudents(bsYear, 'BCT');
      const startIdx = gi * 3;
      if (startIdx + 3 > bctStudents.length) break;
      const members = bctStudents.slice(startIdx, startIdx + 3);
      const isMajor = bd.batch === '079' || gi === 0;
      const pType = isMajor ? 'MAJOR' : 'MINOR';
      const status = (gi === 0 && bd.batch === '079') ? 'COMPLETED' : (gi === 1 ? 'ACTIVE' : 'ACTIVE');

      const group = await prisma.projectGroup.create({
        data: {
          name: `BCT-${batchStr}-Group${gi + 1}`,
          projectTitle: bachelorGroupTitles[bGroupIdx % bachelorGroupTitles.length],
          projectType: pType,
          status,
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-07-30'),
          supervisorId: supervisors[bGroupIdx % supervisors.length].id,
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

      const extExaminer = externalExaminers[bGroupIdx % externalExaminers.length];
      await prisma.examinerAssignment.create({
        data: { groupId: group.id, externalExaminerId: extExaminer.id, assignedById: coordinators.BCT.id },
      });

      await attachComponents({ groupId: group.id, projectType: pType });
      createdGroups.push(group);
      bGroupIdx++;
    }

    // 1 BEI group
    const beiStudents = findStudents(bsYear, 'BEI');
    if (beiStudents.length >= 2) {
      const group = await prisma.projectGroup.create({
        data: {
          name: `BEI-${batchStr}-Group1`,
          projectTitle: 'IoT-based Smart Environmental Monitoring System',
          projectType: 'MINOR',
          status: 'ACTIVE',
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-07-30'),
          supervisorId: supervisors[1].id,
          programId: programs.BEI.id,
          academicYearId: ayMap[batchStr].id,
          batch: String(bsYear),
        },
      });
      for (let mi = 0; mi < Math.min(3, beiStudents.length); mi++) {
        await prisma.groupMember.create({
          data: { studentId: beiStudents[mi].id, groupId: group.id, rollNumber: beiStudents[mi].rollNumber },
        });
      }
      await prisma.examinerAssignment.create({
        data: { groupId: group.id, externalExaminerId: externalExaminers[0].id, assignedById: coordinators.BEI.id },
      });
      await attachComponents({ groupId: group.id, projectType: 'MINOR' });
      createdGroups.push(group);
    }
  }
  console.log(`Created ${createdGroups.length} bachelor project groups`);

  // ============================================================
  // MASTER THESES (16 Credits) & MASTER PROJECTS (4 Credits)
  // ============================================================
  const masterThesisTitles = [
    'Deep Learning for Nepali Handwriting Recognition',
    'Optimizing Transformer Models for Low-Resource Nepali Languages',
    'Federated Learning for Privacy-Preserving Healthcare in Nepal',
    'Intrusion Detection System using Deep Learning for Nepali Networks',
    'Zero Trust Security Architecture for Cloud-Based Government Services',
    'Explainable AI for Credit Risk Assessment in Nepali Banks',
    'Autonomous Navigation using Reinforcement Learning for Nepali Terrain',
    'GAN-based Medical Image Augmentation for Rural Diagnostics',
    '5G Network Slicing for Smart City Applications in Nepal',
    'IoMT-based Remote Patient Monitoring System for Rural Nepal',
    'Predictive Analytics for Crop Yield Optimization using Satellite Data',
    'Natural Language Processing for Nepali Legal Document Summarization',
  ];

  const masterProjectTitles = [
    'Audio-Visual Speech Synthesis for Nepali Language Virtual Assistant',
    'Microservices-Based Real-Time Log Analytics Engine for Cloud Infrastructure',
    'Automated Fact-Checking System for Nepali News Media using LLMs',
    'Computer Vision Pipeline for Automated Road Pothole Detection',
    'Decentralized Identity Verification Framework using Verifiable Credentials',
    'Smart Grid Energy Consumption Forecasting using Hybrid Temporal Networks',
    'Semantic Code Search Engine for Multi-Repository Open Source Codebases',
    'Edge-AI Accelerated Real-Time Video Analytics for Surveillance Systems',
  ];

  let createdTheses = [];
  let createdProjects = [];
  let tIdx = 0;
  let pIdx = 0;

  for (const bd of BATCH_DEFS) {
    const bsYear = bd.bsYear;
    for (const prog of MASTER_PROGRAMS) {
      const progStudents = findStudents(bsYear, prog.code);
      if (!progStudents.length) continue;

      // 1. Create Master Thesis (16 Cr)
      const thesisStudent = progStudents[0];
      if (thesisStudent) {
        const isCompleted = (bd.batch === '079' && prog.code === 'MSDSA');
        const sup = supervisors[tIdx % supervisors.length];
        const extMid = externalExaminers[tIdx % externalExaminers.length];
        const extFinal = externalExaminers[(tIdx + 1) % externalExaminers.length];

        const thesis = await prisma.thesis.create({
          data: {
            title: masterThesisTitles[tIdx % masterThesisTitles.length],
            projectType: 'THESIS',
            studentId: thesisStudent.id,
            status: isCompleted ? 'COMPLETED' : 'ACTIVE',
            startDate: new Date('2025-02-01'),
            endDate: new Date('2025-08-30'),
            supervisorId: sup.id,
            externalMidTermId: extMid.id,
            externalFinalId: extFinal.id,
            batch: String(bsYear),
            cluster: prog.cluster,
            programId: prog.id,
          },
        });

        // Attach THESIS components (300 marks total: Sup 100 + Ext Mid 100 + Ext Final 100)
        await attachComponents({ thesisId: thesis.id, projectType: 'THESIS' });

        // Add examiner assignments
        await prisma.examinerAssignment.create({
          data: { thesisId: thesis.id, externalExaminerId: extFinal.id, assignedById: coordinators[prog.code].id },
        });

        // Proposal document
        await prisma.proposal.create({
          data: { stage: 'PROPOSAL', documentUrl: '/api/files/theses/thesis_proposal.pdf', submittedById: thesisStudent.id, thesisId: thesis.id },
        });

        createdTheses.push(thesis);
        tIdx++;
      }

      // 2. Create Master Project (4 Cr)
      if (progStudents.length > 1) {
        const projectStudent = progStudents[1];
        const isCompleted = (bd.batch === '079' && prog.code === 'MSNCS');
        const extFinal = externalExaminers[pIdx % externalExaminers.length];

        const mProject = await prisma.thesis.create({
          data: {
            title: masterProjectTitles[pIdx % masterProjectTitles.length],
            projectType: 'PROJECT',
            studentId: projectStudent.id,
            status: isCompleted ? 'COMPLETED' : 'ACTIVE',
            startDate: new Date('2025-02-01'),
            endDate: new Date('2025-08-30'),
            supervisorId: null,
            externalMidTermId: null,
            externalFinalId: extFinal.id,
            batch: String(bsYear),
            cluster: prog.cluster,
            programId: prog.id,
          },
        });

        // Attach PROJECT components (100 marks total: 5 criteria x 20 marks)
        await attachComponents({ thesisId: mProject.id, projectType: 'PROJECT' });

        await prisma.examinerAssignment.create({
          data: { thesisId: mProject.id, externalExaminerId: extFinal.id, assignedById: coordinators[prog.code].id },
        });

        await prisma.proposal.create({
          data: { stage: 'PROPOSAL', documentUrl: '/api/files/theses/project_proposal.pdf', submittedById: projectStudent.id, thesisId: mProject.id },
        });

        createdProjects.push(mProject);
        pIdx++;
      }
    }
  }
  console.log(`Created ${createdTheses.length} Master Theses (16 Cr) and ${createdProjects.length} Master Projects (4 Cr)`);

  // ============================================================
  // EVALUATIONS & MARKS (Populate demo evaluations)
  // ============================================================

  // 1. Fully evaluate completed Bachelor group
  const compGroup = createdGroups.find(g => g.status === 'COMPLETED') || createdGroups[0];
  if (compGroup) {
    const comps = await prisma.evaluationComponent.findMany({ where: { groupId: compGroup.id } });
    const cMap = Object.fromEntries(comps.map(c => [c.evaluationType, c]));
    const ext = await prisma.examinerAssignment.findFirst({ where: { groupId: compGroup.id } });

    if (cMap.PROPOSAL_DEFENSE) {
      await prisma.evaluation.create({
        data: { componentId: cMap.PROPOSAL_DEFENSE.id, stage: 'PROPOSAL', evaluationType: 'PROPOSAL_DEFENSE', marks: 8.5, comments: 'Well prepared proposal.', status: 'COMPLETED', submittedById: coordinators.BCT.id, groupId: compGroup.id },
      });
    }
    if (cMap.MIDTERM_DEFENSE) {
      await prisma.evaluation.create({
        data: { componentId: cMap.MIDTERM_DEFENSE.id, stage: 'MID_TERM', evaluationType: 'MIDTERM_DEFENSE', marks: 8.0, comments: 'Significant implementation progress.', status: 'COMPLETED', submittedById: coordinators.BCT.id, groupId: compGroup.id },
      });
    }
    if (cMap.SUPERVISOR && compGroup.supervisorId) {
      await prisma.evaluation.create({
        data: { componentId: cMap.SUPERVISOR.id, stage: 'FINAL', evaluationType: 'SUPERVISOR', marks: 44.0, comments: 'Outstanding dedication and code quality.', suggestions: 'Publish benchmark results.', status: 'COMPLETED', submittedById: compGroup.supervisorId, groupId: compGroup.id },
      });
    }
    if (cMap.EXTERNAL_EXAMINER && ext) {
      await prisma.evaluation.create({
        data: { componentId: cMap.EXTERNAL_EXAMINER.id, stage: 'FINAL', evaluationType: 'EXTERNAL_EXAMINER', marks: 18.0, comments: 'Clear presentation and solid defense.', status: 'COMPLETED', submittedById: ext.externalExaminerId, groupId: compGroup.id },
      });
    }
    if (cMap.FINAL_DEFENSE) {
      await prisma.evaluation.create({
        data: { componentId: cMap.FINAL_DEFENSE.id, stage: 'FINAL', evaluationType: 'FINAL_DEFENSE', marks: 9.0, comments: 'Excellent final project defense.', status: 'COMPLETED', submittedById: coordinators.BCT.id, groupId: compGroup.id },
      });
    }
  }

  // 2. Fully evaluate completed Master Thesis (300 Marks: Sup 100 + Ext Mid 100 + Ext Final 100)
  const compThesis = createdTheses.find(t => t.status === 'COMPLETED') || createdTheses[0];
  if (compThesis) {
    const comps = await prisma.evaluationComponent.findMany({ where: { thesisId: compThesis.id } });
    for (const c of comps) {
      let subId = compThesis.supervisorId;
      let score = 17.5;
      if (c.evaluationType === 'EXTERNAL_MIDTERM') {
        subId = compThesis.externalMidTermId || externalExaminers[0].id;
        score = c.maxMarks === 20 ? 17.0 : 8.5;
      } else if (c.evaluationType === 'EXTERNAL_FINAL') {
        subId = compThesis.externalFinalId || externalExaminers[1].id;
        score = 18.0;
      }
      await prisma.evaluation.create({
        data: {
          componentId: c.id,
          stage: c.stage || 'FINAL',
          evaluationType: c.evaluationType,
          marks: score,
          comments: `${c.name} evaluated thoroughly with commendable rigor.`,
          suggestions: 'Consider submitting extended results to an IEEE conference.',
          status: 'COMPLETED',
          submittedById: subId,
          thesisId: compThesis.id,
        },
      });
    }
    console.log(`Fully evaluated demo Master Thesis "${compThesis.title}" (300 Marks)`);
  }

  // 3. Fully evaluate completed Master Project (100 Marks: 5 criteria x 20)
  const compProject = createdProjects.find(p => p.status === 'COMPLETED') || createdProjects[0];
  if (compProject) {
    const comps = await prisma.evaluationComponent.findMany({ where: { thesisId: compProject.id } });
    const subId = compProject.externalFinalId || externalExaminers[0].id;
    for (const c of comps) {
      await prisma.evaluation.create({
        data: {
          componentId: c.id,
          stage: 'FINAL',
          evaluationType: 'EXTERNAL_FINAL',
          marks: 18.5,
          comments: 'High quality implementation and defense.',
          suggestions: 'Refactor modular components for production packaging.',
          status: 'COMPLETED',
          submittedById: subId,
          thesisId: compProject.id,
        },
      });
    }
    console.log(`Fully evaluated demo Master Project "${compProject.title}" (100 Marks)`);
  }

  // 4. Partially evaluate active Master Thesis & Project (for live grading / testing)
  const activeThesis = createdTheses.find(t => t.status === 'ACTIVE');
  if (activeThesis) {
    const comps = await prisma.evaluationComponent.findMany({ where: { thesisId: activeThesis.id } });
    const supComps = comps.filter(c => c.evaluatorRole === 'SUPERVISOR');
    for (const c of supComps) {
      await prisma.evaluation.create({
        data: {
          componentId: c.id,
          stage: 'FINAL',
          evaluationType: 'SUPERVISOR',
          marks: 16.0,
          comments: 'Good consistent progress.',
          status: 'COMPLETED',
          submittedById: activeThesis.supervisorId,
          thesisId: activeThesis.id,
        },
      });
    }
  }

  // ============================================================
  // ANNOUNCEMENTS & FORMS
  // ============================================================
  // 1. Master Thesis Registration Announcement
  await prisma.announcement.create({
    data: {
      title: 'Master Thesis Topic Registration 2081 (Batch 2080)',
      message: 'All enrolled M.Sc. students of Batch 2080 must register their research thesis proposal topic and preferred supervisor before the deadline.',
      type: 'THESIS',
      audience: 'PROGRAMS',
      degreeType: 'MASTER',
      programIds: [programs.MSDSA.id, programs.MSNCS.id, programs.MSICE.id, programs.MSCSK.id],
      batch: '2080',
      academicYearId: ayMap['080'].id,
      departmentId: eceDept.id,
      formEnabled: true,
      formFields: [
        { key: 'research_area', label: 'Research Area / Cluster', type: 'text', required: true, placeholder: 'e.g. AI/ML, Cloud Security, Signal Processing' },
        { key: 'expected_mentor', label: 'Preferred Supervisor (optional)', type: 'text', required: false, placeholder: 'Faculty name' },
      ],
      startDate: new Date('2026-01-01'),
      expirationDate: new Date('2027-06-30'),
      createdById: coordinators.MSDSA.id,
    },
  });

  // 2. Master Project Registration Announcement
  await prisma.announcement.create({
    data: {
      title: 'Master Project Registration (4 Credit Course)',
      message: 'M.Sc. students undertaking the 4-credit Master Project course should register their project title and domain.',
      type: 'THESIS',
      audience: 'PROGRAMS',
      degreeType: 'MASTER',
      programIds: [programs.MSDSA.id, programs.MSNCS.id, programs.MSICE.id, programs.MSCSK.id],
      batch: '2080',
      academicYearId: ayMap['080'].id,
      departmentId: eceDept.id,
      formEnabled: true,
      formFields: [
        { key: 'project_domain', label: 'Project Domain', type: 'text', required: true, placeholder: 'e.g. DevOps, Computer Vision' },
      ],
      startDate: new Date('2026-01-01'),
      expirationDate: new Date('2027-06-30'),
      createdById: coordinators.MSDSA.id,
    },
  });

  // 3. Bachelor Project Registration
  await prisma.announcement.create({
    data: {
      title: 'Bachelor Major Project Group Formation & Proposal Call',
      message: 'Final year BCT & BEI students must form groups of 2–4 members and submit project proposals.',
      type: 'MAJOR',
      audience: 'PROGRAMS',
      degreeType: 'BACHELOR',
      programIds: [programs.BCT.id, programs.BEI.id],
      batch: '2080',
      academicYearId: ayMap['080'].id,
      departmentId: eceDept.id,
      formEnabled: true,
      formFields: [
        { key: 'project_cluster', label: 'Project Cluster', type: 'text', required: true, placeholder: 'AIML, IPCV, NTS, EDMES' },
      ],
      startDate: new Date('2026-01-01'),
      expirationDate: new Date('2027-06-30'),
      createdById: coordinators.BCT.id,
    },
  });

  // ── Test User Convenience Accounts ──
  await prisma.user.create({
    data: { email: 'bachelor@test.com', password: hash, firstName: 'Bikash', lastName: 'Shrestha', role: 'STUDENT', degreeType: 'BACHELOR', departmentId: eceDept.id, programId: programs.BCT.id, rollNumber: '080BCT099', batch: '2080' },
  }).catch(() => {});

  await prisma.user.create({
    data: { email: 'master@test.com', password: hash, firstName: 'Manish', lastName: 'Poudel', role: 'STUDENT', degreeType: 'MASTER', departmentId: eceDept.id, programId: programs.MSDSA.id, rollNumber: '080MSDSA99', batch: '2080' },
  }).catch(() => {});

  console.log('\n======================================================');
  console.log('Seed Complete! Comprehensive Presentation Dataset Ready:');
  console.log('------------------------------------------------------');
  console.log('• Password for all seeded users: "subesh"');
  console.log('• Maintainer:          subeshgaming@gmail.com');
  console.log('• MSDSA Coordinator:   msdsa.coordinator@pcampus.edu.np');
  console.log('• MSNCS Coordinator:   msncs.coordinator@pcampus.edu.np');
  console.log('• BCT Coordinator:     bct.coordinator@pcampus.edu.np');
  console.log('• Faculty/Supervisor:  prabesh.bhattarai@pcampus.edu.np');
  console.log('• External Examiner:   hari.adhikari@pcampus.edu.np');
  console.log('• Bachelor Student:    bachelor@test.com');
  console.log('• Master Student:      master@test.com');
  console.log('======================================================\n');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
