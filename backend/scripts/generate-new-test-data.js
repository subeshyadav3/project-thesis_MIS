/**
 * Generate NEW test data for teacher demo/presentation into excel-templates/New-Test-data/
 *
 * Bachelor → BCT (Bachelor in Computer Engineering)
 * Master   → MSNCS (MSc in Network and Cyber Security, Cluster 1)
 *
 * Batch 083 (BS 2083) — brand-new academic year, NOT present in prisma/seed.js
 * (seed only covers batches 079–082 and startDate 2025-02-01).
 *
 * Files created:
 *   bachelor_bct_test_data.xlsx            (Groups upload format)
 *   bachelor_student_users_test_data.xlsx  (users bulk import format)
 *   bachelor_supervisor_users_test_data.xlsx
 *   bachelor_external_users_test_data.xlsx
 *   master_msncs_test_data.xlsx            (Theses bulk import format)
 *   master_student_users_test_data.xlsx
 *   master_supervisor_users_test_data.xlsx
 *   master_external_users_test_data.xlsx
 */
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'excel-templates', 'New-Test-data');
const PUBLIC_TEST_DIR = path.join(__dirname, '..', '..', 'frontend', 'public', 'test-data');
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'frontend', 'public');
const BATCH = '083'; // new batch, not in seed (seed = 079..082)
const PASSWORD = 'Test@123';

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_TEST_DIR, { recursive: true });

// ── Helpers ─────────────────────────────────────────────────────────────
const roll = (code, i) => {
  const isMaster = code.startsWith('MS');
  return `${BATCH}${code}${String(i).padStart(isMaster ? 2 : 3, '0')}`;
};

const emailFor = (r) => `${r.toLowerCase()}@pcampus.edu.np`;

// ── Fictional name pools (no real persons) ──────────────────────────────
const firstNames = [
  'Aashish','Bimala','Chiran','Dikshya','Emraj','Fulmaya','Gaurav','Himal',
  'Ishwor','Junu','Kishor','Laxman','Milan','Nirmaya','Oshan','Purnima',
  'Rajan','Sabita','Tej','Uma','Bijay','Mamata','Rameshwor','Sunil',
  'Dipendra','Kavita','Yubraj','Srijana','Niraj','Rejina','Anish','Binita',
  'Deepesh','Elina','Farhan','Gopal','Hira','Isha','Jitendra','Kamana',
  'Lokendra','Madan','Nabin','Pabitra','Rabina','Saurav','Trishna','Uttara',
  'Bibek','Champa','Dawa','Ganesh','Indira','Janak','Kiran','Lila',
  'Mukesh','Nita','Ojash','Prakash','Radha','Sushil','Tara','Umesh',
];

const lastNames = [
  'Acharya','Basnet','Chhetri','Dahal','Gurung','Khadka','Lama','Maharjan',
  'Neupane','Ojha','Pandey','Rai','Sharma','Thapa','Poudel','Pokharel',
  'Adhikari','Bhandari','Bhattarai','Chaudhary','Dhakal','Gautam','Joshi','Karki',
  'Koirala','Magar','Maskey','Pathak','Regmi','Shrestha','Tamang','Thakuri',
  'Aryal','Baral','Bista','Chalise','Dhami','Ghimire','K.C.','Neupane',
  'Oli','Parajuli','Sapkota','Wagle','Bastola','Dangi','Hada','Kumal',
  'Rana','Subedi','Timalsina','Yadav','Budhathoki','Dangol','Giri','Hamal',
];

let nameIdx = 0;
const freshName = () => {
  const fn = firstNames[nameIdx % firstNames.length];
  const ln = lastNames[(nameIdx * 3 + 5) % lastNames.length];
  nameIdx++;
  return `${fn} ${ln}`;
};

// ── Supervisors / external examiners (fictional faculty) ────────────────
const supervisorNames = [
  'Prof. Dr. Dinesh Koirala',
  'Assoc. Prof. Dr. Meena Shrestha',
  'Dr. Kiran Adhikari',
  'Assoc. Prof. Dr. Gyanendra Thapa',
  'Dr. Nilima Joshi',
  'Prof. Dr. Raju Poudel',
];

const externalNames = [
  'Dr. Prajwal Ghimire',
  'Prof. Dr. Lokendra Dhakal',
  'Dr. Anisha Rana',
  'Dr. Bidur Khadka',
  'Assoc. Prof. Dr. Manisha Aryal',
  'Dr. Sabin Wagle',
];

const designationFor = (fullName) => (fullName.startsWith('Prof.') ? 'Prof. Dr.' : fullName.startsWith('Assoc.') ? 'Assoc. Prof. Dr.' : 'Dr.');
const initials = (fullName) => {
  const parts = fullName.replace(/^(Prof\.|Assoc\. Prof\.) /, '').replace(/^Dr\. /, '').split(' ');
  return `${parts[0][0]}${parts[1][0]}`;
};

// ── 1. BACHELOR BCT GROUPS (20 groups, 2–4 members each) ────────────────
const bctTitles = [
  'IoT-Based Smart Water Quality Monitoring System for Kathmandu Valley',
  'Nepali Sign Language Recognition Using Deep Learning',
  'Online Blood Donation Management System',
  'Smart Traffic Signal Control Using Computer Vision',
  'Crop Disease Detection Using CNN for Nepali Agriculture',
];

const groupCounts = [3, 2, 3, 2, 2];

const bctGroups = [];
let rollCounter = 1;
for (let g = 0; g < bctTitles.length; g++) {
  const members = [];
  const rolls = [];
  for (let m = 0; m < groupCounts[g]; m++) {
    members.push(freshName());
    rolls.push(roll('BCT', rollCounter++));
  }
  const hasSup = g % 4 !== 3;          // ~25% without supervisor
  const hasExt = g % 5 !== 4;          // ~20% without external examiner
  const bctClusters = ['AIML', 'IPCV', 'ANLP', 'NTS', 'EDMES'];
  bctGroups.push({
    'Group Name': `BCT-083-G${g + 1}`,
    'Project Title': bctTitles[g],
    'Members': members.join(', '),
    'Roll Numbers': rolls.join(', '),
    'Batch': BATCH,
    'Cluster': bctClusters[g % bctClusters.length],
    'Supervisor': hasSup ? supervisorNames[g % supervisorNames.length] : '',
    'External Examiner': hasExt ? externalNames[(g + 2) % externalNames.length] : '',
  });
}

// ── 2. MASTER ALL-PROGRAMS THESES (2 rows each for MSNCS, MSICE, MSDSA, MSCSK) ─
const masterThesesDefs = [
  // MSNCS (Network and Cyber Security)
  {
    programCode: 'MSNCS',
    programName: 'MSc in Computer System and Network Engineering',
    cluster: 'Computer networks and security',
    title: 'Analysis of Ransomware Attack Vectors and Mitigation Strategies',
    supervisor: 'Prof. Dr. Dinesh Koirala',
    midTerm: 'Dr. Prajwal Ghimire',
    finalExam: 'Dr. Anisha Rana',
  },
  {
    programCode: 'MSNCS',
    programName: 'MSc in Computer System and Network Engineering',
    cluster: 'Computer networks and security',
    title: 'AI-Powered Intrusion Detection System for Campus Networks',
    supervisor: 'Assoc. Prof. Dr. Meena Shrestha',
    midTerm: 'Dr. Bidur Khadka',
    finalExam: 'Assoc. Prof. Dr. Manisha Aryal',
  },
  // MSICE (Information and Communication Engineering)
  {
    programCode: 'MSICE',
    programName: 'MSc in Information and Communication Engineering',
    cluster: 'Electronic devices, circuits and communication',
    title: '5G Massive MIMO Beamforming Optimization Using Machine Learning',
    supervisor: 'Dr. Kiran Adhikari',
    midTerm: 'Prof. Dr. Lokendra Dhakal',
    finalExam: 'Dr. Sabin Wagle',
  },
  {
    programCode: 'MSICE',
    programName: 'MSc in Information and Communication Engineering',
    cluster: 'Electronic devices, circuits and communication',
    title: 'Performance Evaluation of Cognitive Radio Networks in Dense Urban Areas',
    supervisor: 'Assoc. Prof. Dr. Gyanendra Thapa',
    midTerm: 'Dr. Prajwal Ghimire',
    finalExam: 'Dr. Anisha Rana',
  },
  // MSDSA (Data Science and Analytics)
  {
    programCode: 'MSDSA',
    programName: 'MSc in Data Science and Analytics',
    cluster: 'AI/ML and image processing',
    title: 'Predictive Analytics for Dengue Outbreak Forecasting in Nepal Using LSTM',
    supervisor: 'Dr. Nilima Joshi',
    midTerm: 'Assoc. Prof. Dr. Manisha Aryal',
    finalExam: 'Dr. Bidur Khadka',
  },
  {
    programCode: 'MSDSA',
    programName: 'MSc in Data Science and Analytics',
    cluster: 'Audio, NLP and data/text analytics',
    title: 'Nepali Sentiment Analysis on Social Media Using Transformer Architectures',
    supervisor: 'Prof. Dr. Raju Poudel',
    midTerm: 'Dr. Sabin Wagle',
    finalExam: 'Prof. Dr. Lokendra Dhakal',
  },
  // MSCSK (Computer Systems and Knowledge Engineering)
  {
    programCode: 'MSCSK',
    programName: 'MSc in Computer Systems and Knowledge Engineering',
    cluster: 'Audio, NLP and data/text analytics',
    title: 'Knowledge Graph Construction for Nepali Biomedical Literature',
    supervisor: 'Prof. Dr. Dinesh Koirala',
    midTerm: 'Dr. Prajwal Ghimire',
    finalExam: 'Dr. Anisha Rana',
  },
  {
    programCode: 'MSCSK',
    programName: 'MSc in Computer Systems and Knowledge Engineering',
    cluster: 'AI/ML and image processing',
    title: 'Automated Semantic Question Answering System Using Ontologies',
    supervisor: 'Assoc. Prof. Dr. Meena Shrestha',
    midTerm: 'Dr. Bidur Khadka',
    finalExam: 'Assoc. Prof. Dr. Manisha Aryal',
  },
];

let progCounters = { MSNCS: 1, MSICE: 1, MSDSA: 1, MSCSK: 1 };
const masterTheses = masterThesesDefs.map((def) => {
  const r = roll(def.programCode, progCounters[def.programCode]++);
  return {
    Name: freshName(),
    Roll: r,
    Title: def.title,
    Batch: BATCH,
    Cluster: def.cluster,
    Program: def.programCode,
    Supervisor: def.supervisor,
    External_mid_term: def.midTerm,
    External_final: def.finalExam,
  };
});

// ── 3. USER BULK-IMPORT FILES ──────────────────────────────────────────
// Bachelor students: exactly the BCT rolls used in the groups above.
const bachelorStudents = [];
for (let i = 1; i < rollCounter; i++) {
  const r = roll('BCT', i);
  const name = bctGroups.map(g => g['Roll Numbers'].split(', ').indexOf(r)).reduce((acc, idx, gi) => idx >= 0 ? bctGroups[gi]['Members'].split(', ')[idx] : acc, 'Student');
  const [fn, ...rest] = name.split(' ');
  bachelorStudents.push({
    email: emailFor(r),
    password: PASSWORD,
    firstName: fn,
    lastName: rest.join(' '),
    rollNumber: r,
    programCode: 'BCT',
    degreeType: 'BACHELOR',
  });
}

// Master students: 2 for each of the 4 programs
const masterStudents = masterTheses.map((t) => {
  const [fn, ...rest] = t.Name.split(' ');
  const pCode = t.Program;
  return {
    email: emailFor(t.Roll),
    password: PASSWORD,
    firstName: fn,
    lastName: rest.join(' '),
    rollNumber: t.Roll,
    programCode: pCode,
    degreeType: 'MASTER',
  };
});

const parseFacultyName = (input) => {
  const titleRegex = /^((Assoc\.\s*Prof\.|Asst\.\s*Prof\.|Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.|Er\.)\s*\.?\s*)/i;
  let cleaned = input.trim();
  let title = '';
  let m;
  while ((m = titleRegex.exec(cleaned)) !== null) {
    title += m[1];
    cleaned = cleaned.slice(m[0].length).trim();
  }
  const designation = title.trim().replace(/\.\s+/g, '. ').trim() || 'Dr.';
  const parts = cleaned.split(/\s+/);
  const fn = parts[0] || 'Faculty';
  const ln = parts.slice(1).join(' ') || fn;
  return { firstName: fn, lastName: ln, designation };
};

const supervisors = supervisorNames.map((n) => {
  const p = parseFacultyName(n);
  const fn = p.firstName.toLowerCase().replace(/[^a-z]/g, '');
  const ln = p.lastName.toLowerCase().replace(/[^a-z]/g, '');
  return {
    email: `${fn}.${ln}@pcampus.edu.np`,
    password: PASSWORD,
    firstName: p.firstName,
    lastName: p.lastName,
    designation: p.designation,
  };
});

const externals = externalNames.map((n) => {
  const p = parseFacultyName(n);
  const fn = p.firstName.toLowerCase().replace(/[^a-z]/g, '');
  const ln = p.lastName.toLowerCase().replace(/[^a-z]/g, '');
  return {
    email: `${fn}.${ln}@ioe.edu.np`,
    password: PASSWORD,
    firstName: p.firstName,
    lastName: p.lastName,
    designation: p.designation,
  };
});

// ── 4. WRITE FILES ─────────────────────────────────────────────────────
const writeFile = (name, rows, sheet) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheet);
  XLSX.writeFile(wb, path.join(OUT_DIR, name));
  if (fs.existsSync(PUBLIC_TEST_DIR)) {
    XLSX.writeFile(wb, path.join(PUBLIC_TEST_DIR, name));
  }
  if (fs.existsSync(PUBLIC_DIR)) {
    XLSX.writeFile(wb, path.join(PUBLIC_DIR, name));
  }
  console.log(`✓ ${name}  (${rows.length} rows)`);
};

writeFile('bachelor_bct_test_data.xlsx', bctGroups, 'Groups');
writeFile('bachelor_student_users_test_data.xlsx', bachelorStudents, 'Students');
writeFile('bachelor_supervisor_users_test_data.xlsx', supervisors, 'Supervisors');
writeFile('bachelor_external_users_test_data.xlsx', externals, 'Examiners');
writeFile('master_theses_test_data.xlsx', masterTheses, 'Theses');
writeFile('master_msncs_test_data.xlsx', masterTheses.filter(t => t.Program === 'MSNCS'), 'Theses');
writeFile('master_all_programs_theses_test_data.xlsx', masterTheses, 'Theses');
writeFile('master_student_users_test_data.xlsx', masterStudents, 'Students');
writeFile('master_supervisor_users_test_data.xlsx', supervisors, 'Supervisors');
writeFile('master_external_users_test_data.xlsx', externals, 'Examiners');

console.log(`\nDone — all files written to excel-templates/New-Test-data/ (batch ${BATCH}, password ${PASSWORD})`);
