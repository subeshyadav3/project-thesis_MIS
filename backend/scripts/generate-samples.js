const XLSX = require('xlsx');
const path = require('path');

const outDir = path.join(__dirname, '..');

// ============================================================
// Bachelor Projects Sample
// ============================================================
const bachelorData = [
  {
    'Group Name': 'Team Alpha',
    'Project Title': 'AI-Powered Smart Farming Assistant for Nepali Agriculture',
    'Member Names': 'Ram Khadka,Sita Poudel,Gopal Thapa',
    'Roll Numbers': '078BCT021,078BCT022,078BCT023',
  },
  {
    'Group Name': 'CodeCraft',
    'Project Title': 'E-Hospital: Blockchain-based Medical Record System',
    'Member Names': 'Anita Shrestha,Bibek Sharma,Radha Neupane',
    'Roll Numbers': '078BCT031,078BCT032,078BCT033',
  },
  {
    'Group Name': 'CyberNepal',
    'Project Title': 'Network Intrusion Detection for Government Infrastructure',
    'Member Names': 'Dipendra Karki,Muna Acharya,Rajan Puri',
    'Roll Numbers': '080BCT011,080BCT012,080BCT013',
  },
];

const bachelorWS = XLSX.utils.json_to_sheet(bachelorData);
const bachelorWB = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(bachelorWB, bachelorWS, 'Bachelor Projects');
XLSX.writeFile(bachelorWB, path.join(outDir, 'sample_bachelor_projects.xlsx'));
console.log('Created sample_bachelor_projects.xlsx');

// ============================================================
// Master Theses Sample
// ============================================================
const thesisData = [
  {
    'Project Title': 'Deep Learning for Nepali Sign Language Recognition',
    'Member Names': 'Pooja Magar',
    'Roll Numbers': '080BCT001',
  },
  {
    'Project Title': 'Federated Learning for Privacy-Preserving Medical Diagnosis',
    'Member Names': 'Rajan Puri',
    'Roll Numbers': '080BCT008',
  },
  {
    'Project Title': 'NLP-based Automatic Question Paper Generator in Nepali',
    'Member Names': 'Sushma Karki',
    'Roll Numbers': '080BCT009',
  },
];

const thesisWS = XLSX.utils.json_to_sheet(thesisData);
const thesisWB = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(thesisWB, thesisWS, 'Master Theses');
XLSX.writeFile(thesisWB, path.join(outDir, 'sample_master_theses.xlsx'));
console.log('Created sample_master_theses.xlsx');
