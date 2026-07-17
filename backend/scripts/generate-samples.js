/**
 * Generate Excel template files for both bachelor and master uploads.
 *
 * ── Bachelor Group Upload (/groups/upload) ──
 *    Columns: Group Name, Project Title, Member Names, Roll Numbers, Academic Year
 *
 * ── Master Thesis Bulk Import (/theses/bulk-import) ──
 *    Columns: Name, Roll, Title, Batch, Cluster, Program, Supervisor,
 *             External_mid_term, External_final
 */
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const TEMPLATE_DIR = path.join(__dirname, '..', 'excel-templates');
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'frontend', 'public');

// Clean old files that used different naming
const OLD_FILES = [
  'bachelor_upload_template_with_data.xlsx',
  'master_upload_template_with_data.xlsx',
];
for (const f of OLD_FILES) {
  const p = path.join(TEMPLATE_DIR, f);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log(`  Removed old file: ${f}`);
  }
}

// ── Helper: generate Nepali-style roll numbers ──
function roll(code, i, batch = '078') {
  return `${batch}${code}${String(i).padStart(3, '0')}`;
}

// ── Sample supervisor/examiner names for templates ──
const sampleSupervisors = [
  'Dr. Ram Acharya', 'Prof. Sita Sharma', 'Assoc. Prof. Krishna Poudel',
  'Dr. Gita Rai', 'Prof. Mohan Adhikari', 'Dr. Bishnu Basnet',
];
const sampleExaminers = [
  'Prof. Hari Bhandari', 'Dr. Sagar Ojha', 'Assoc. Prof. Rita Maharjan',
  'Dr. Umesh Lama', 'Prof. Sunita Acharya', 'Dr. Roshan Karki',
];

// ====================================================================
// 1. BACHELOR TEMPLATE (blank header row + 2 example rows)
//    Columns: Group Name, Project Title, Member Names, Roll Numbers,
//             Academic Year, Supervisor, Examiner
// ====================================================================
const bachelorTemplate = [
  {
    'Group Name': '', 'Project Title': '', 'Member Names': '',
    'Roll Numbers': '', 'Academic Year': '', 'Supervisor': '', 'Examiner': '',
  },
  {
    'Group Name': 'TeamAlpha',
    'Project Title': 'AI-Based Traffic Management System',
    'Member Names': 'Aarav Khadka, Binita Shrestha, Chandra Thapa',
    'Roll Numbers': `${roll('BCT', 1)}, ${roll('BCT', 2)}, ${roll('BCT', 3)}`,
    'Academic Year': '2081',
    'Supervisor': sampleSupervisors[0],
    'Examiner': sampleExaminers[0],
  },
  {
    'Group Name': 'TeamBeta',
    'Project Title': 'Smart Agriculture Monitoring Platform',
    'Member Names': 'Dipesh Poudel, Ekta Rai, Firoj Khan',
    'Roll Numbers': `${roll('BCT', 4)}, ${roll('BEI', 1)}, ${roll('BEI', 2)}`,
    'Academic Year': '2081',
    'Supervisor': sampleSupervisors[1],
    'Examiner': sampleExaminers[1],
  },
];

// ====================================================================
// 2. BACHELOR TEST DATA (30 groups / 90 students)
// ====================================================================
const bachelorTestData = [];
const firstNames = ['Ram', 'Shyam', 'Hari', 'Sita', 'Gita', 'Rita', 'Krishna', 'Bishnu', 'Arjun', 'Pratik',
  'Nabin', 'Sagar', 'Roshan', 'Bibek', 'Amit', 'Sunita', 'Kabita', 'Pooja', 'Anita', 'Sarita',
  'Deepak', 'Mohan', 'Rajan', 'Umesh', 'Prakash', 'Mina', 'Tara', 'Reema', 'Sushma', 'Anjana'];
const lastNames = ['Acharya', 'Basnet', 'Chhetri', 'Dahal', 'Gurung', 'Khadka', 'Lama', 'Maharjan',
  'Neupane', 'Ojha', 'Pandey', 'Rai', 'Sharma', 'Thapa', 'Poudel', 'Pokhrel', 'Adhikari', 'Bhandari'];

for (let g = 0; g < 30; g++) {
  const members = [];
  const rolls = [];
  const codes = ['BCT', 'BEI'];
  for (let m = 0; m < 3; m++) {
    const fi = (g * 3 + m) % firstNames.length;
    const li = (g * 3 + m) % lastNames.length;
    members.push(`${firstNames[fi]} ${lastNames[li]}`);
    rolls.push(roll(codes[(g + m) % 2], g * 3 + m + 1));
  }
  bachelorTestData.push({
    'Group Name': `TestGroup_${g + 1}`,
    'Project Title': `Test Bachelor Project ${g + 1} — ${['IoT', 'ML', 'Web', 'Mobile', 'Blockchain', 'NLP', 'CV', 'Robotics', 'Embedded', 'Cloud'][g % 10]} Application`,
    'Member Names': members.join(', '),
    'Roll Numbers': rolls.join(', '),
    'Academic Year': '2081',
    'Supervisor': g < 25 ? sampleSupervisors[g % sampleSupervisors.length] : '',
    'Examiner': g < 20 ? sampleExaminers[g % sampleExaminers.length] : '',
  });
}

// ====================================================================
// 3. MASTER TEMPLATE (blank header row + 2 example rows)
//    Matches bulkImportPreview columns: Name, Roll, Title, Batch, Cluster,
//    Program, Supervisor, External_mid_term, External_final
// ====================================================================
const masterTemplate = [
  {
    Name: '', Roll: '', Title: '', Batch: '', Cluster: '', Program: '',
    Supervisor: '', External_mid_term: '', External_final: '',
  },
  {
    Name: 'Anup Baral',
    Roll: roll('MSCS', 1, '080'),
    Title: 'Deep Learning for Nepali Sign Language Recognition',
    Batch: '080',
    Cluster: 'Cluster 1',
    Program: 'MSc in Network and Cyber Security',
    Supervisor: 'Dr. Ram Acharya',
    External_mid_term: 'Prof. Sita Sharma',
    External_final: 'Dr. Hari Basnet',
  },
  {
    Name: 'Bina Thapa',
    Roll: roll('MSDSA', 1, '080'),
    Title: 'Predictive Analytics for Agricultural Yield in Nepal',
    Batch: '080',
    Cluster: 'Cluster 3',
    Program: 'MSc in Data Science and Analytics',
    Supervisor: 'Prof. Krishna Poudel',
    External_mid_term: 'Dr. Gita Rai',
    External_final: 'Prof. Mohan Adhikari',
  },
];

// ====================================================================
// 4. MASTER TEST DATA (50 student rows)
// ====================================================================
const masterPrograms = [
  { code: 'MSNCS', name: 'MSc in Network and Cyber Security', cluster: 'Cluster 1' },
  { code: 'MSICE', name: 'MSc in Information and Communication Engineering', cluster: 'Cluster 2' },
  { code: 'MSDSA', name: 'MSc in Data Science and Analytics', cluster: 'Cluster 3' },
  { code: 'MSCSKE', name: 'MSc in Computer Science and Knowledge Engineering', cluster: 'Cluster 4' },
];
const supervisorNames = [
  'Prof. Dr. Rajan Sharma', 'Dr. Pramod Acharya', 'Assoc. Prof. Sita Dahal',
  'Dr. Bishnu Poudel', 'Prof. Gita Thapa', 'Dr. Mohan Basnet',
  'Assoc. Prof. Reema Rai', 'Dr. Deepak Neupane', 'Prof. Kabita Khadka',
  'Dr. Nabin Pandey', 'Assoc. Prof. Mina Gurung', 'Dr. Prakash Chhetri',
];
const externalNames = [
  'Prof. Dr. Hari Bhandari', 'Dr. Sagar Ojha', 'Assoc. Prof. Rita Maharjan',
  'Dr. Umesh Lama', 'Prof. Sunita Acharya', 'Dr. Roshan Karki',
  'Assoc. Prof. Sarita Ghimire', 'Dr. Pratik Thapa', 'Prof. Anjana Shrestha',
  'Dr. Bibek Pradhan', 'Assoc. Prof. Tara Rana', 'Dr. Krishna Subedi',
];
const thesisTitles = [
  'Machine Learning for Early Detection of Crop Diseases',
  'Blockchain-Based Land Registry System for Nepal',
  'Natural Language Processing for Nepali Text Summarization',
  'IoT-Enabled Smart Grid for Rural Electrification',
  'Deep Learning Approach for Medical Image Diagnosis',
  'Cloud Computing Framework for E-Government Services',
  'Computer Vision for Traffic Violation Detection',
  'Reinforcement Learning for Autonomous Vehicle Navigation',
  'Big Data Analytics for Tourism Pattern Prediction',
  'Cybersecurity Framework for Financial Transactions',
  'Sentiment Analysis of Nepali Social Media Content',
  'Edge Computing Architecture for Real-Time Monitoring',
  'Federated Learning for Privacy-Preserving Healthcare',
  'Optical Character Recognition for Nepali Scripts',
  'Wireless Sensor Network for Earthquake Early Warning',
  'AI-Powered Chatbot for Student Advisory Services',
  'Robotic Process Automation in Healthcare Administration',
  'Augmented Reality for Cultural Heritage Preservation',
  'Quantum Cryptography for Secure Communications',
  'Speech Recognition System for Nepali Language',
  'Smart Waste Management Using IoT Sensors',
  'Predictive Maintenance Using Machine Learning',
  'Recommendation System for E-Learning Platforms',
  'Image Segmentation for Agricultural Land Classification',
  'Time Series Forecasting for Hydropower Generation',
  'Mobile Health Application for Remote Patient Monitoring',
  'Sustainable Energy Optimization Using AI',
  'Automated Essay Scoring in Nepali Education',
  'Face Recognition System for Attendance Management',
  'Gesture Recognition for Human-Computer Interaction',
  'Anomaly Detection in Network Traffic Using Deep Learning',
  'Blockchain for Supply Chain Transparency',
  'Emotion Recognition from Speech Signals',
  'Document Classification in Legal Domain',
  'Video Analytics for Crowd Management',
  'Multi-Agent System for Disaster Response',
  'Knowledge Graph for Research Publication Analysis',
  'Transfer Learning for Low-Resource Nepali NLP',
  'Explainable AI for Credit Risk Assessment',
  'Indoor Localization Using WiFi Fingerprinting',
  'Real-Time Sign Language Translation',
  'Data Privacy Framework for Social Media Platforms',
  'Smart Irrigation System Using AI and IoT',
  'Cryptographic Protocol for Secure E-Voting',
  'Adaptive Learning System for Personalized Education',
  'Digital Twin for Smart Manufacturing',
  'Social Network Analysis for Misinformation Detection',
  'Autonomous Drone Navigation Using Computer Vision',
  'Semantic Web Framework for Heritage Documentation',
  'End-to-End Encryption for Messaging Platforms',
];

const masterTestData = [];
for (let i = 0; i < 50; i++) {
  const prog = masterPrograms[i % masterPrograms.length];
  const sup = supervisorNames[i % supervisorNames.length];
  const extMid = externalNames[i % externalNames.length];
  const extFin = externalNames[(i + 1) % externalNames.length];
  const fi = i % firstNames.length;
  const li = (i + 3) % lastNames.length;
  masterTestData.push({
    Name: `${firstNames[fi]} ${lastNames[li]}`,
    Roll: roll(prog.code, i + 1, '080'),
    Title: thesisTitles[i],
    Batch: '080',
    Cluster: prog.cluster,
    Program: prog.name,
    Supervisor: i < 40 ? sup : '',          // last 10 have no supervisor
    External_mid_term: extMid,
    External_final: extFin,
  });
}

// ====================================================================
// WRITE ALL 4 FILES (with retry + rename fallback for locked files)
// ====================================================================

const safeWrite = (data, filename, sheetName = 'Sheet1') => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const writeTo = (dir) => {
    const target = path.join(dir, filename);
    const tmp = target + '.tmp';
    try {
      fs.writeFileSync(tmp, buf);
      // Attempt rename (atomic on same filesystem)
      try { fs.renameSync(tmp, target); }
      catch (renameErr) {
        // rename failed (EBUSY) — try copy then unlink tmp
        try { fs.copyFileSync(tmp, target); fs.unlinkSync(tmp); }
        catch (copyErr) {
          // Last resort: keep the .tmp file as the output
          console.warn(`  ⚠ Could not write ${filename} to ${dir} — saved as .tmp instead`);
        }
      }
    } catch (writeErr) {
      console.warn(`  ⚠ Could not write ${filename} to ${dir}: ${writeErr.message}`);
    }
  };

  writeTo(TEMPLATE_DIR);
  if (fs.existsSync(PUBLIC_DIR)) writeTo(PUBLIC_DIR);
};

safeWrite(bachelorTemplate, 'bachelor_upload_template.xlsx', 'Groups');
console.log('✓ Created bachelor_upload_template.xlsx (template with 2 sample groups)');

safeWrite(bachelorTestData, 'bachelor_upload_test_data.xlsx', 'Groups');
console.log(`✓ Created bachelor_upload_test_data.xlsx (${bachelorTestData.length} groups for testing)`);

safeWrite(masterTemplate, 'master_upload_template.xlsx', 'Theses');
console.log('✓ Created master_upload_template.xlsx (template with 2 sample rows)');

safeWrite(masterTestData, 'master_upload_test_data.xlsx', 'Theses');
console.log(`✓ Created master_upload_test_data.xlsx (${masterTestData.length} thesis rows for testing)`);

console.log('\nDone — all 4 files generated in excel-templates/ and copied to frontend/public/');
