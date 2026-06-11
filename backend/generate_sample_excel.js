const XLSX = require('xlsx');
const path = require('path');

// Bachelor Projects Sample Data
const bachelorData = [
  { 'Group Name': 'AI Pioneers', 'Project Title': 'AI-Based Student Performance Prediction System', 'Member Names': 'Aarav Khadka, Binita Shrestha', 'Roll Numbers': 'CSE001, CSE002' },
  { 'Group Name': 'Cloud Ninjas', 'Project Title': 'Multi-Cloud Resource Optimization Dashboard', 'Member Names': 'Chandra Thapa, Deepa Poudel', 'Roll Numbers': 'CSE003, CSE004' },
  { 'Group Name': 'Data Warriors', 'Project Title': 'Real-Time Analytics for IoT Sensor Networks', 'Member Names': 'Ekaraj Rana, Falguni Neupane', 'Roll Numbers': 'CSE005, CSE006' },
  { 'Group Name': 'EduTech', 'Project Title': 'Adaptive Learning Platform with AI Tutor', 'Member Names': 'Ganesh Bhandari, Hima Acharya', 'Roll Numbers': 'CSE007, CSE008' },
  { 'Group Name': 'FinSecure', 'Project Title': 'Blockchain-Based Secure Transaction System', 'Member Names': 'Indra Joshi, Janaki Dahal', 'Roll Numbers': 'CSE009, CSE010' },
  { 'Group Name': 'GreenCompute', 'Project Title': 'Energy-Efficient Computing Framework', 'Member Names': 'Krishna Pokharel, Laxmi Regmi', 'Roll Numbers': 'CSE011, CSE012' },
  { 'Group Name': 'HealthLink', 'Project Title': 'Telemedicine Appointment & Record System', 'Member Names': 'Madhav Bastola, Nisha Lama', 'Roll Numbers': 'CSE013, CSE014' },
  { 'Group Name': 'SearchMasters', 'Project Title': 'Semantic Search Engine for Research Papers', 'Member Names': 'Om Pandey, Pooja Magar', 'Roll Numbers': 'CSE015, CSE016' },
  { 'Group Name': 'CyberShield', 'Project Title': 'Network Intrusion Detection System', 'Member Names': 'Rabi Koirala, Sita Bhattarai', 'Roll Numbers': 'CSE017, CSE018' },
  { 'Group Name': 'AgriTech', 'Project Title': 'Smart Agriculture Monitoring with IoT', 'Member Names': 'Tika Adhikari, Usha Dhami', 'Roll Numbers': 'CSE019, CSE020' },
];

// Master's Thesis Sample Data (same column structure as bachelor, but individual students)
const masterData = [
  { 'Group Name': '', 'Project Title': 'Deep Learning for Nepali Handwriting Recognition', 'Member Names': 'Bibek Chaudhary', 'Roll Numbers': 'CSE021' },
  { 'Group Name': '', 'Project Title': 'Optimizing Transformer Models for Low-Resource Languages', 'Member Names': 'Muna Gautam', 'Roll Numbers': 'CSE022' },
  { 'Group Name': '', 'Project Title': 'Federated Learning in Healthcare: A Privacy-Preserving Approach', 'Member Names': 'Rajan Puri', 'Roll Numbers': 'CSE023' },
  { 'Group Name': '', 'Project Title': 'Explainable AI for Credit Risk Assessment', 'Member Names': 'Sushma Karki', 'Roll Numbers': 'CSE024' },
  { 'Group Name': '', 'Project Title': 'Autonomous Navigation using Reinforcement Learning', 'Member Names': 'Dipesh Giri', 'Roll Numbers': 'CSE025' },
  { 'Group Name': '', 'Project Title': 'GAN-based Data Augmentation for Medical Imaging', 'Member Names': 'Kabita Bista', 'Roll Numbers': 'CSE026' },
];

// Create workbooks
const bachelorWb = XLSX.utils.book_new();
const bachelorWs = XLSX.utils.json_to_sheet(bachelorData);
XLSX.utils.book_append_sheet(bachelorWb, bachelorWs, 'Bachelor Projects');

const masterWb = XLSX.utils.book_new();
const masterWs = XLSX.utils.json_to_sheet(masterData);
XLSX.utils.book_append_sheet(masterWb, masterWs, 'Master Theses');

// Write files
const bachelorPath = path.join(__dirname, 'sample_bachelor_projects.xlsx');
const masterPath = path.join(__dirname, 'sample_master_theses.xlsx');

XLSX.writeFile(bachelorWb, bachelorPath);
XLSX.writeFile(masterWb, masterPath);

console.log('Sample Excel files created:');
console.log('- ' + bachelorPath);
console.log('- ' + masterPath);
console.log('\nBachelor Projects columns: Group Name, Project Title, Member Names, Roll Numbers');
console.log('Master Theses columns: Group Name (can be blank), Project Title, Member Names, Roll Numbers');
