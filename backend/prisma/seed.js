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
  const hashPrabesh = await bcrypt.hash('prabesh', 10);

  // === USERS ===
  const maintainer = await prisma.user.create({
    data: { email: 'subeshgaming@gmail.com', password: hash, firstName: 'Subesh', lastName: 'Gaming', role: 'MAINTAINER' },
  });
  console.log('Created MAINTAINER: subeshgaming@gmail.com / subesh');

  const coord = await prisma.user.create({
    data: { email: 'coordinator@university.edu', password: hash, firstName: 'Subesh', lastName: 'Gaming', role: 'COORDINATOR' },
  });
  console.log('Created COORDINATOR: coordinator@university.edu / subesh');

  const supervisor1 = await prisma.user.create({
    data: { email: 'prabeshbchettri25@gmail.com', password: hashPrabesh, firstName: 'Prabesh', lastName: 'Bhattarai Chettri', role: 'SUPERVISOR' },
  });
  console.log('Created SUPERVISOR: prabeshbchettri25@gmail.com / prabesh');

  const supervisor2 = await prisma.user.create({
    data: { email: 'dr.sharma@university.edu', password: hash, firstName: 'Ramesh', lastName: 'Sharma', role: 'SUPERVISOR' },
  });
  const supervisor3 = await prisma.user.create({
    data: { email: 'dr.gurung@university.edu', password: hash, firstName: 'Anita', lastName: 'Gurung', role: 'SUPERVISOR' },
  });
  const supervisor4 = await prisma.user.create({
    data: { email: 'prof.tamang@university.edu', password: hash, firstName: 'Bishnu', lastName: 'Tamang', role: 'SUPERVISOR' },
  });
  console.log('Created 4 supervisors');

  // Students
  const studentNames = [
    ['Aarav', 'Khadka', 'a.khadka'], ['Binita', 'Shrestha', 'b.shrestha'], ['Chandra', 'Thapa', 'c.thapa'],
    ['Deepa', 'Poudel', 'd.poudel'], ['Ekaraj', 'Rana', 'e.rana'], ['Falguni', 'Neupane', 'f.neupane'],
    ['Ganesh', 'Bhandari', 'g.bhandari'], ['Hima', 'Acharya', 'h.acharya'], ['Indra', 'Joshi', 'i.joshi'],
    ['Janaki', 'Dahal', 'j.dahal'], ['Krishna', 'Pokharel', 'k.pokharel'], ['Laxmi', 'Regmi', 'l.regmi'],
    ['Madhav', 'Bastola', 'm.bastola'], ['Nisha', 'Lama', 'n.lama'], ['Om', 'Pandey', 'o.pandey'],
    ['Pooja', 'Magar', 'p.magar'], ['Rabi', 'Koirala', 'r.koirala'], ['Sita', 'Bhattarai', 's.bhattarai'],
    ['Tika', 'Adhikari', 't.adhikari'], ['Usha', 'Dhami', 'u.dhami'], ['Bibek', 'Chaudhary', 'bibek.c'],
    ['Muna', 'Gautam', 'muna.g'], ['Rajan', 'Puri', 'rajan.p'], ['Sushma', 'Karki', 'sushma.k'],
    ['Dipesh', 'Giri', 'dipesh.g'], ['Kabita', 'Bista', 'kabita.b'], ['Yubaraj', 'Dhakal', 'yubaraj.d'],
    ['Sarita', 'Oli', 'sarita.o'], ['Nabin', 'Chalise', 'nabin.c'], ['Reema', 'Pathak', 'reema.p'],
  ];

  const students = [];
  for (const [fn, ln, uname] of studentNames) {
    const s = await prisma.user.create({
      data: { email: `${uname}@student.university.edu`, password: hash, firstName: fn, lastName: ln, role: 'STUDENT' },
    });
    students.push(s);
  }
  console.log(`Created ${students.length} students`);

  // === DEPARTMENT ===
  const dept = await prisma.department.create({
    data: { name: 'Computer Science & Engineering', code: 'CSE' },
  });
  await prisma.department.create({
    data: { name: 'Electronics & Communication', code: 'ECE' },
  });

  // === ACADEMIC YEARS ===
  const year1 = await prisma.academicYear.create({
    data: { year: '2025-2026', semester: 'Fall', departmentId: dept.id, isActive: true },
  });
  const year2 = await prisma.academicYear.create({
    data: { year: '2025-2026', semester: 'Spring', departmentId: dept.id },
  });
  await prisma.academicYear.create({
    data: { year: '2024-2025', semester: 'Fall', departmentId: dept.id },
  });

  // === PROJECT GROUPS (Bachelor) ===
  const groupData = [
    { name: 'AlphaDev', title: 'AI-Powered Code Review Assistant' },
    { name: 'CloudNine', title: 'Multi-Cloud Cost Optimization Dashboard' },
    { name: 'DataPulse', title: 'Real-Time Data Analytics for IoT' },
    { name: 'EduBridge', title: 'Online Learning Platform with AI Tutor' },
    { name: 'FinSafe', title: 'Blockchain-based Secure Transaction System' },
    { name: 'GreenCompute', title: 'Energy-Efficient Computing Framework' },
    { name: 'HealthLink', title: 'Telemedicine Appointment & Record System' },
    { name: 'InnoSearch', title: 'Semantic Search Engine for Research Papers' },
    { name: 'CyberShield', title: 'Network Intrusion Detection System' },
    { name: 'AgriTech', title: 'Smart Agriculture Monitoring with IoT' },
    { name: 'RouteOpt', title: 'GPS-based Route Optimization for Logistics' },
    { name: 'SmartClass', title: 'Classroom Attendance via Facial Recognition' },
    { name: 'DocuSign', title: 'Digital Document Signing Platform' },
    { name: 'EcoTrack', title: 'Carbon Footprint Tracking Mobile App' },
    { name: 'ChatBotCSE', title: 'Departmental FAQ Chatbot with NLP' },
  ];

  const supervisors = [supervisor1, supervisor2, supervisor3, supervisor4];
  const createdGroups = [];
  for (let i = 0; i < groupData.length; i++) {
    const g = groupData[i];
    const sup = i < 12 ? supervisors[i % supervisors.length] : null;
    const group = await prisma.projectGroup.create({
      data: {
        name: g.name,
        projectTitle: g.title,
        status: sup ? 'ACTIVE' : 'PENDING',
        supervisorId: sup?.id || null,
        academicYearId: i < 10 ? year1.id : year2.id,
      },
    });
    const s1 = students[i * 2 % students.length];
    const s2 = students[(i * 2 + 1) % students.length];
    await prisma.groupMember.create({ data: { studentId: s1.id, groupId: group.id, rollNumber: `CSE00${i*2+1}` } });
    await prisma.groupMember.create({ data: { studentId: s2.id, groupId: group.id, rollNumber: `CSE00${i*2+2}` } });

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
  console.log(`Created ${createdGroups.length} project groups`);

  // === MASTER THESES ===
  const thesisData = [
    { title: 'Deep Learning for Nepali Handwriting Recognition', studentIdx: 20 },
    { title: 'Optimizing Transformer Models for Low-Resource Languages', studentIdx: 21 },
    { title: 'Federated Learning in Healthcare: A Privacy-Preserving Approach', studentIdx: 22 },
    { title: 'Explainable AI for Credit Risk Assessment', studentIdx: 23 },
    { title: 'Autonomous Navigation using Reinforcement Learning', studentIdx: 24 },
    { title: 'GAN-based Data Augmentation for Medical Imaging', studentIdx: 25 },
  ];

  for (let i = 0; i < thesisData.length; i++) {
    const t = thesisData[i];
    const sup = supervisors[i % supervisors.length];
    const thesis = await prisma.thesis.create({
      data: {
        title: t.title,
        studentId: students[t.studentIdx].id,
        status: 'ACTIVE',
        supervisorId: sup.id,
        academicYearId: year1.id,
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
  console.log(`Created ${thesisData.length} master theses`);

  // === SAMPLE EVALUATIONS & FEEDBACK ===
  for (let i = 0; i < 5 && i < createdGroups.length; i++) {
    const g = createdGroups[i];
    if (g.supervisorId) {
      await prisma.evaluation.create({
        data: { stage: 'PROPOSAL', marks: 4.2, comment: 'Good proposal, refine methodology section.', submittedById: g.supervisorId, groupId: g.id },
      });
      await prisma.evaluation.create({
        data: { stage: 'MID_TERM', marks: 3.8, comment: 'Progress is satisfactory. Keep up the work.', submittedById: g.supervisorId, groupId: g.id },
      });
      await prisma.proposal.create({
        data: { stage: 'PROPOSAL', supervisorComment: 'Well-structured. Consider adding more references.', submittedById: g.supervisorId, groupId: g.id },
      });
    }
  }

  // === EXTERNAL EXAMINERS ===
  await prisma.externalExaminer.create({
    data: { name: 'Dr. Hari Adhikari', email: 'hari.adhikari@external.edu', phone: '9851122334', department: 'Computer Science' },
  });
  await prisma.externalExaminer.create({
    data: { name: 'Prof. Suman Bhattarai', email: 'suman.bhattarai@external.edu', phone: '9845566778', department: 'Computer Science' },
  });

  console.log('\n=== SEED COMPLETE ===');
  console.log('Login credentials:');
  console.log('  MAINTAINER: subeshgaming@gmail.com / subesh');
  console.log('  COORDINATOR: coordinator@university.edu / subesh');
  console.log('  SUPERVISOR: prabeshbchettri25@gmail.com / prabesh');
  console.log('  Other supervisors: use password subesh');
  console.log('  Students: <username>@student.university.edu / subesh');
  console.log(`\nTotal: 1 maintainer, 1 coordinator, 4 supervisors, ${students.length} students`);
  console.log(`${createdGroups.length} project groups, ${thesisData.length} master theses`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
