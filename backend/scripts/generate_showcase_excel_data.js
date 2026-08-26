const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const outDirs = [
  path.join(__dirname, '..', 'excel-templates', 'defense-showcase'),
  path.join(__dirname, '..', 'test-data', 'defense-showcase')
];
for (const d of outDirs) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function writeSheet(filename, data, sheetName = 'Sheet1') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  for (const d of outDirs) {
    const filePath = path.join(d, filename);
    XLSX.writeFile(wb, filePath);
    console.log(`Generated: ${filePath} (${data.length} rows)`);
  }
}

// 1. Master 3rd Semester Projects (Batch 2082 - 4 Credit Project)
// Clean unassigned students: 082MSNCS05, 082MSNCS06, 082MSDSA05, 082MSDSA06
const master3rdSemProjectsData = [
  {
    'Type': 'Project',
    'Name': 'Gopal Baral',
    'Roll': '082MSNCS05',
    'Title': 'Zero-Trust Access Control Framework for Kubernetes Service Meshes',
    'Batch': '2082',
    'Cluster': 'Computer networks and security',
    'Program': 'MSNCS',
    'Supervisor': 'Assoc. Prof. Dr. Prabesh Bhattarai',
    'External_mid_term': '',
    'External_final': 'Prof. Dr. Hari Adhikari'
  },
  {
    'Type': 'Project',
    'Name': 'Meera Dahal',
    'Roll': '082MSNCS06',
    'Title': 'Automated Kernel-Level Ransomware Behavioral Detection via eBPF',
    'Batch': '2082',
    'Cluster': 'Computer networks and security',
    'Program': 'MSNCS',
    'Supervisor': 'Asst. Prof. Dr. Anita Gurung',
    'External_mid_term': '',
    'External_final': 'Dr. Prajwal Ghimire'
  },
  {
    'Type': 'Project',
    'Name': 'Bishnu Bhattarai',
    'Roll': '082MSDSA05',
    'Title': 'Heterogeneous Graph Neural Networks for Financial Fraud Ring Detection',
    'Batch': '2082',
    'Cluster': 'AI/ML and image processing',
    'Program': 'MSDSA',
    'Supervisor': 'Prof. Dr. Sagar Acharya',
    'External_mid_term': '',
    'External_final': 'Prof. Dr. Kiran Mainali'
  },
  {
    'Type': 'Project',
    'Name': 'Shyam Chaudhary',
    'Roll': '082MSDSA06',
    'Title': 'Dense Passage Retrieval with Cross-Lingual Knowledge Distillation for Nepali NLP',
    'Batch': '2082',
    'Cluster': 'AI/ML and image processing',
    'Program': 'MSDSA',
    'Supervisor': 'Assoc. Prof. Dr. Rajendra Neupane',
    'External_mid_term': '',
    'External_final': 'Dr. Anisha Rana'
  }
];

// 2. Master 4th Semester Theses (Batch 2081 - 16 Credit Research Thesis)
// Clean unassigned students: 081MSNCS02, 081MSNCS03, 081MSDSA02, 081MSDSA03
const master4thSemThesesData = [
  {
    'Type': 'Thesis',
    'Name': 'Usha Regmi',
    'Roll': '081MSNCS02',
    'Title': 'Quantifying Physical Side-Channel Leakage in Post-Quantum Lattice Cryptosystems',
    'Batch': '2081',
    'Cluster': 'Computer networks and security',
    'Program': 'MSNCS',
    'Supervisor': 'Assoc. Prof. Dr. Prabesh Bhattarai',
    'External_mid_term': 'Dr. Prajwal Ghimire',
    'External_final': 'Prof. Dr. Hari Adhikari'
  },
  {
    'Type': 'Thesis',
    'Name': 'Bibek Shrestha',
    'Roll': '081MSNCS03',
    'Title': 'Privacy-Preserving Federated Self-Supervised Intrusion Detection for 5G Core',
    'Batch': '2081',
    'Cluster': 'Computer networks and security',
    'Program': 'MSNCS',
    'Supervisor': 'Dr. Anita Gurung',
    'External_mid_term': 'Dr. Anisha Rana',
    'External_final': 'Assoc. Prof. Dr. Suman Bhattarai'
  },
  {
    'Type': 'Thesis',
    'Name': 'Anup Khadka',
    'Roll': '081MSDSA02',
    'Title': 'Conditional Diffusion Models for Counterfactual Explanations in Medical Diagnostics',
    'Batch': '2081',
    'Cluster': 'AI/ML and image processing',
    'Program': 'MSDSA',
    'Supervisor': 'Prof. Dr. Sagar Acharya',
    'External_mid_term': 'Prof. Dr. Kiran Mainali',
    'External_final': 'Prof. Dr. Hari Adhikari'
  },
  {
    'Type': 'Thesis',
    'Name': 'Bhawana Lama',
    'Roll': '081MSDSA03',
    'Title': 'Spatial-Temporal Transformer Networks for Extreme Weather Event Forecasting',
    'Batch': '2081',
    'Cluster': 'AI/ML and image processing',
    'Program': 'MSDSA',
    'Supervisor': 'Assoc. Prof. Dr. Rajendra Neupane',
    'External_mid_term': 'Dr. Prajwal Ghimire',
    'External_final': 'Dr. Anisha Rana'
  }
];

// 3. Master Student Users (Matching student_users_template.xlsx exact headers)
// Headers: email, password, firstName, lastName, rollNumber, programCode, degreeType
const masterStudentUsersData = [
  {
    'email': '083msncs05@pcampus.edu.np',
    'password': 'Test@123Password',
    'firstName': 'Aayush',
    'lastName': 'Shrestha',
    'rollNumber': '083MSNCS05',
    'programCode': 'MSNCS',
    'degreeType': 'MASTER'
  },
  {
    'email': '083msncs06@pcampus.edu.np',
    'password': 'Test@123Password',
    'firstName': 'Binita',
    'lastName': 'Pandey',
    'rollNumber': '083MSNCS06',
    'programCode': 'MSNCS',
    'degreeType': 'MASTER'
  },
  {
    'email': '083msdsa05@pcampus.edu.np',
    'password': 'Test@123Password',
    'firstName': 'Chetan',
    'lastName': 'Poudel',
    'rollNumber': '083MSDSA05',
    'programCode': 'MSDSA',
    'degreeType': 'MASTER'
  },
  {
    'email': '083msdsa06@pcampus.edu.np',
    'password': 'Test@123Password',
    'firstName': 'Deepika',
    'lastName': 'Karki',
    'rollNumber': '083MSDSA06',
    'programCode': 'MSDSA',
    'degreeType': 'MASTER'
  }
];

// 4. Master Faculty Supervisors (Matching supervisor_users_template.xlsx exact headers)
// Headers: email, password, firstName, lastName, designation
const masterSupervisorUsersData = [
  {
    'email': 'subarna.shakya@pcampus.edu.np',
    'password': 'Test@123Password',
    'firstName': 'Subarna',
    'lastName': 'Shakya',
    'designation': 'Prof. Dr.'
  },
  {
    'email': 'nanda.adhikari@pcampus.edu.np',
    'password': 'Test@123Password',
    'firstName': 'Nanda Bikram',
    'lastName': 'Adhikari',
    'designation': 'Prof. Dr.'
  },
  {
    'email': 'baburam.dawadi@pcampus.edu.np',
    'password': 'Test@123Password',
    'firstName': 'Babu Ram',
    'lastName': 'Dawadi',
    'designation': 'Assoc. Prof. Dr.'
  }
];

// 5. Master External Examiners (Matching external_users_template.xlsx exact headers)
// Headers: email, password, firstName, lastName, designation
const masterExternalExaminersData = [
  {
    'email': 'shashidhar.joshi@ioe.edu.np',
    'password': 'Test@123Password',
    'firstName': 'Shashidhar Ram',
    'lastName': 'Joshi',
    'designation': 'Prof. Dr.'
  },
  {
    'email': 'sanjeeb.panday@ioe.edu.np',
    'password': 'Test@123Password',
    'firstName': 'Sanjeeb Prasad',
    'lastName': 'Panday',
    'designation': 'Assoc. Prof. Dr.'
  }
];

writeSheet('01_master_3rd_sem_082_projects.xlsx', master3rdSemProjectsData);
writeSheet('02_master_4th_sem_081_theses.xlsx', master4thSemThesesData);
writeSheet('03_master_student_users.xlsx', masterStudentUsersData);
writeSheet('04_master_supervisor_users.xlsx', masterSupervisorUsersData);
writeSheet('05_master_external_examiners.xlsx', masterExternalExaminersData);

console.log('All 5 Master showcase datasets generated successfully in backend/test-data/defense-showcase/');
