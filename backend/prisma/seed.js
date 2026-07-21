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
  { code: 'MSNCS', name: 'MSc in Network and Cyber Security', cluster: 'Cluster 1', maxStudents: 24 },
  { code: 'MSICE', name: 'MSc in Information and Communication Engineering', cluster: 'Cluster 2', maxStudents: 20 },
  { code: 'MSDSA', name: 'MSc in Data Science and Analytics', cluster: 'Cluster 3', maxStudents: 24 },
  { code: 'MSCSKE', name: 'MSc in Computer Science and Knowledge Engineering', cluster: 'Cluster 4', maxStudents: 20 },
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
// Each object: { batch: '079', bsYear: 2079, counts: { BCT: n, BEI: n, ... } }
const BATCH_DEFS = [
  {
    batch: '079',
    bsYear: 2079,
    counts: { BCT: 24, BEI: 12, MSNCS: 6, MSICE: 5, MSDSA: 6, MSCSKE: 5 },
  },
  {
    batch: '080',
    bsYear: 2080,
    counts: { BCT: 30, BEI: 16, MSNCS: 8, MSICE: 6, MSDSA: 8, MSCSKE: 6 },
  },
  {
    batch: '081',
    bsYear: 2081,
    counts: { BCT: 24, BEI: 12, MSNCS: 6, MSICE: 5, MSDSA: 6, MSCSKE: 5 },
  },
  {
    batch: '082',
    bsYear: 2082,
    counts: { BCT: 18, BEI: 8, MSNCS: 4, MSICE: 3, MSDSA: 4, MSCSKE: 3 },
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
  console.log('Seeding database...');

  // ── Clean slate ──
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
    { code: 'BCT', name: 'Bachelor in Computer Engineering', degreeType: 'BACHELOR', departmentId: eceDept.id },
    { code: 'BEI', name: 'Bachelor in Electronics and Information Engineering', degreeType: 'BACHELOR', departmentId: eceDept.id },
    { code: 'MSNCS', name: 'MSc in Network and Cyber Security', degreeType: 'MASTER', cluster: 'Cluster 1', departmentId: eceDept.id },
    { code: 'MSICE', name: 'MSc in Information and Communication Engineering', degreeType: 'MASTER', cluster: 'Cluster 2', departmentId: eceDept.id },
    { code: 'MSDSA', name: 'MSc in Data Science and Analytics', degreeType: 'MASTER', cluster: 'Cluster 3', departmentId: eceDept.id },
    { code: 'MSCSKE', name: 'MSc in Computer Science and Knowledge Engineering', degreeType: 'MASTER', cluster: 'Cluster 4', departmentId: eceDept.id },
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
  // Also add 078 for legacy groups
  ayMap['078'] = await prisma.academicYear.create({
    data: { year: '078', semester: 'Regular', departmentId: eceDept.id, isActive: false },
  });
  console.log(`Created ${Object.keys(ayMap).length} academic years (078, 079, 080, 081, 082)`);

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

  // ── Generate all student definitions ──
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
  console.log(`Created ${students.length} students across ${BATCH_DEFS.length} batches`);

  // Print batch/program summary
  const summary = {};
  for (const bd of BATCH_DEFS) {
    summary[bd.batch] = {};
    for (const prog of [...BACHELOR_PROGRAMS, ...MASTER_PROGRAMS]) {
      summary[bd.batch][prog.code] = bd.counts[prog.code];
    }
  }
  console.log('Batch → Student counts:');
  for (const [batch, counts] of Object.entries(summary)) {
    const parts = Object.entries(counts).map(([code, n]) => `${code}=${n}`);
    console.log(`  ${batch}: ${parts.join(', ')}`);
  }

  // Helper to create evaluation components
  async function attachComponents({ groupId, thesisId, projectType }) {
    const defaults = getDefaultComponents(projectType || 'MINOR');
    const out = {};
    for (const c of defaults) {
      const created = await prisma.evaluationComponent.create({
        data: { ...c, groupId, thesisId, createdById: maintainer.id },
      });
      out[c.evaluationType] = created;
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
  // BACHELOR GROUPS — create some groups for each batch
  // ============================================================
  const groupTitles = [
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
  let groupIndex = 0;

  for (const bd of BATCH_DEFS) {
    const batchStr = bd.batch;
    const bsYear = bd.bsYear;
    // Make 3-4 BCT groups per batch, 1 BEI group per batch
    const nBCTGroups = Math.min(4, Math.floor(bd.counts.BCT / 3));
    const nBEIGroups = bd.counts.BEI >= 3 ? 1 : 0;

    for (let gi = 0; gi < nBCTGroups; gi++) {
      const bctStudents = findStudents(bsYear, 'BCT');
      const startIdx = gi * 3;
      if (startIdx + 3 > bctStudents.length) break;
      const members = bctStudents.slice(startIdx, startIdx + 3);

      const group = await prisma.projectGroup.create({
        data: {
          name: `BCT-${batchStr}-Group${gi + 1}`,
          projectTitle: groupTitles[groupIndex % groupTitles.length],
          projectType: 'MINOR',
          status: 'ACTIVE',
          supervisorId: supervisors[groupIndex % supervisors.length].id,
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
      await attachComponents({ groupId: group.id, projectType: 'MINOR' });
      createdGroups.push(group);
      groupIndex++;
    }

    if (nBEIGroups) {
      const beiStudents = findStudents(bsYear, 'BEI');
      const memberCount = Math.min(3, beiStudents.length);
      if (memberCount >= 2) {
        const group = await prisma.projectGroup.create({
          data: {
            name: `BEI-${batchStr}-Group1`,
            projectTitle: 'IoT-based Smart Monitoring System for Electronics Labs',
            projectType: 'MINOR',
            status: 'ACTIVE',
            supervisorId: supervisors[0].id,
            programId: programs.BEI.id,
            academicYearId: ayMap[batchStr].id,
            batch: String(bsYear),
          },
        });
        for (let mi = 0; mi < memberCount; mi++) {
          await prisma.groupMember.create({
            data: { studentId: beiStudents[mi].id, groupId: group.id, rollNumber: beiStudents[mi].rollNumber },
          });
        }
        await attachComponents({ groupId: group.id, projectType: 'MINOR' });
        createdGroups.push(group);
      }
    }
  }
  console.log(`Created ${createdGroups.length} bachelor groups`);

  // ============================================================
  // MASTER THESES — create for each batch
  // ============================================================
  const thesisTitles = [
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
    'Real-Time Sentiment Analysis of Nepali Social Media using Transformers',
    'Big Data Pipeline for Earthquake Early Warning System in Nepal',
    'Recommendation System for E-Learning Platforms using Collaborative Filtering',
    'Knowledge Graph Construction from Nepali Academic Publications',
    'Semantic Web Framework for Nepali Cultural Heritage Preservation',
    'Multi-Agent Reinforcement Learning for Traffic Optimization in Kathmandu',
    'Ontology-Based Question Answering System for Nepali Medical Domain',
    'Automated Essay Scoring using BERT for Nepali Language Education',
  ];

  let createdTheses = [];
  let thesisIndex = 0;

  for (const bd of BATCH_DEFS) {
    const batchStr = bd.batch;
    const bsYear = bd.bsYear;
    for (const prog of MASTER_PROGRAMS) {
      const maxTheses = Math.min(3, Math.floor(bd.counts[prog.code] / 2));
      if (maxTheses < 1) continue;
      const progStudents = findStudents(bsYear, prog.code);
      for (let ti = 0; ti < maxTheses; ti++) {
        const student = progStudents[ti];
        if (!student) break;

        const thesis = await prisma.thesis.create({
          data: {
            title: thesisTitles[thesisIndex % thesisTitles.length],
            projectType: 'MASTER',
            studentId: student.id,
            status: 'ACTIVE',
            supervisorId: supervisors[thesisIndex % supervisors.length].id,
            batch: String(bsYear),
            cluster: prog.cluster,
          },
        });
        await attachComponents({ thesisId: thesis.id, projectType: 'MASTER' });
        createdTheses.push(thesis);
        thesisIndex++;
      }
    }
  }
  console.log(`Created ${createdTheses.length} master theses`);

  // ============================================================
  // SAMPLE EVALUATIONS (first few groups/theses)
  // ============================================================
  // Evaluate first 4 groups
  for (let i = 0; i < 4 && i < createdGroups.length; i++) {
    const g = createdGroups[i];
    if (!g.supervisorId) continue;

    const components = await prisma.evaluationComponent.findMany({ where: { groupId: g.id } });
    const compByType = Object.fromEntries(components.map(c => [c.evaluationType, c]));

    const leadStudent = students[0]; // arbitrary student
    await prisma.proposal.create({
      data: { stage: 'PROPOSAL', documentUrl: '/api/files/groups/sample_proposal.pdf', submittedById: leadStudent.id, groupId: g.id },
    });

    // Find which coordinator to use based on program
    const groupProg = await prisma.projectGroup.findUnique({ where: { id: g.id }, include: { program: true } });
    const coordKey = groupProg?.program?.code || 'BCT';
    const coord = coordinators[coordKey];

    await prisma.evaluation.create({
      data: { componentId: compByType.PROPOSAL_DEFENSE.id, stage: 'PROPOSAL', evaluationType: 'PROPOSAL_DEFENSE', marks: 4.0, comment: 'Strong defense presentation.', comments: 'Proposal was well prepared and clearly presented.', suggestions: 'Consider adding more technical depth to the methodology section.', status: 'COMPLETED', submittedById: coord.id, groupId: g.id },
    });
    await prisma.evaluation.create({
      data: { componentId: compByType.MIDTERM_DEFENSE.id, stage: 'MID_TERM', evaluationType: 'MIDTERM_DEFENSE', marks: 3.5, comment: 'Progress is on track.', comments: 'Good progress shown during midterm review.', suggestions: 'Focus on completing the implementation phase before the final defense.', status: 'COMPLETED', submittedById: coord.id, groupId: g.id },
    });
    await prisma.evaluation.create({
      data: { componentId: compByType.SUPERVISOR.id, stage: 'FINAL', evaluationType: 'SUPERVISOR', marks: 21.5, comment: 'Well-structured proposal.', comments: 'The student showed consistent effort throughout the project.', suggestions: 'Document the code more thoroughly for future reference.', status: 'COMPLETED', submittedById: g.supervisorId, groupId: g.id },
    });
    const examiner = externalExaminers[i % externalExaminers.length];
    await prisma.evaluation.create({
      data: { componentId: compByType.EXTERNAL_EXAMINER.id, stage: 'FINAL', evaluationType: 'EXTERNAL_EXAMINER', marks: 8.0, comment: 'Solid technical implementation.', comments: 'Technical implementation was solid and well-tested.', suggestions: 'Improve the user interface for better usability.', status: 'COMPLETED', submittedById: examiner.id, groupId: g.id },
    });
    await prisma.evaluation.create({
      data: { componentId: compByType.FINAL_DEFENSE.id, stage: 'FINAL', evaluationType: 'FINAL_DEFENSE', marks: 16.0, comment: 'Excellent final presentation.', comments: 'The final defense was comprehensive and well-delivered.', suggestions: 'Publish the findings in a research paper.', status: 'COMPLETED', submittedById: coord.id, groupId: g.id },
    });
  }

  // Evaluate first 2 theses — use SUPERVISOR & EXTERNAL_EXAMINER components per MASTER scheme
  for (let i = 0; i < 2 && i < createdTheses.length; i++) {
    const t = createdTheses[i];
    if (!t.supervisorId) continue;

    const components = await prisma.evaluationComponent.findMany({ where: { thesisId: t.id } });
    const compByType = Object.fromEntries(components.map(c => [c.evaluationType, c]));
    const thesisStudent = await prisma.user.findUnique({ where: { id: t.studentId } });

    await prisma.proposal.create({
      data: { stage: 'PROPOSAL', documentUrl: '/api/files/theses/sample_proposal.pdf', submittedById: thesisStudent.id, thesisId: t.id },
    });

    // MASTER scheme only has SUPERVISOR and EXTERNAL_EXAMINER components
    if (compByType.SUPERVISOR) {
      await prisma.evaluation.create({
        data: { componentId: compByType.SUPERVISOR.id, stage: 'FINAL', evaluationType: 'SUPERVISOR', marks: 16.0, comment: 'Well-defined research scope.', comments: 'The research problem is clearly identified and relevant.', suggestions: 'Expand the literature review section.', status: 'COMPLETED', submittedById: t.supervisorId, thesisId: t.id },
      });
    }
    if (compByType.EXTERNAL_EXAMINER) {
      const examiner = externalExaminers[i % externalExaminers.length];
      await prisma.evaluation.create({
        data: { componentId: compByType.EXTERNAL_EXAMINER.id, stage: 'FINAL', evaluationType: 'EXTERNAL_EXAMINER', marks: 16.0, comment: 'Good presentation and defense.', comments: 'The student demonstrated good understanding of the subject.', suggestions: 'Improve the literature review.', status: 'COMPLETED', submittedById: examiner.id, thesisId: t.id },
      });
    }
  }

  // ── Test users for login ──
  const testBCT = findStudents('080', 'BCT');
  await prisma.user.create({
    data: { email: 'bachelor@test.com', password: hash, firstName: 'Bach', lastName: 'Student', role: 'STUDENT', degreeType: 'BACHELOR', departmentId: eceDept.id, programId: programs.BCT.id, rollNumber: '080BCT099', batch: '2080' },
  }).catch(() => {});
  await prisma.user.create({
    data: { email: 'master@test.com', password: hash, firstName: 'Mast', lastName: 'Student', role: 'STUDENT', degreeType: 'MASTER', departmentId: eceDept.id, programId: programs.MSNCS.id, rollNumber: '080MSNCS99', batch: '2080' },
  }).catch(() => {});

  console.log('\nSeed complete!');
  console.log('Test login:');
  console.log('  Maintainer:       subeshgaming@gmail.com');
  console.log('  Bachelor student: bachelor@test.com');
  console.log('  Master student:   master@test.com');
  console.log('  Password:         subesh');
}

main()
  .catch(e => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
