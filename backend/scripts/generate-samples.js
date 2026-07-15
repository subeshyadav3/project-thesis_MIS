const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const year = await p.academicYear.findFirst({
    where: { department: { code: 'CEE' } },
    orderBy: { year: 'desc' },
  });
  const progBCT = await p.program.findFirst({ where: { code: 'BCT' } });
  const progMSCS = await p.program.findFirst({ where: { code: 'MSCS' } });
  const progMECE = await p.program.findFirst({ where: { code: 'MECE' } });

  const assigned = new Set();
  (await p.groupMember.findMany({ select: { studentId: true } })).forEach(x => assigned.add(x.studentId));
  (await p.thesis.findMany({ select: { studentId: true } })).forEach(x => assigned.add(x.studentId));

  // ── BACHELOR TEMPLATE (blank with example) ──
  const blankBachelor = [
    { 'Group Name': '', 'Project Title': '', 'Member Names': '', 'Roll Numbers': '', 'Academic Year': '' },
    { 'Group Name': 'SampleGroup1', 'Project Title': 'Sample Bachelor Project 1', 'Member Names': 'Aarav Khadka, Binita Shrestha, Chandra Thapa', 'Roll Numbers': '078BCT001, 078BCT002, 078BCT003', 'Academic Year': year?.year || '2081' },
  ];

  const wbBlank1 = XLSX.utils.book_new();
  const wsBlank1 = XLSX.utils.json_to_sheet(blankBachelor);
  XLSX.utils.book_append_sheet(wbBlank1, wsBlank1, 'Groups');
  XLSX.writeFile(wbBlank1, 'excel-templates/bachelor_upload_template.xlsx');
  console.log('Created excel-templates/bachelor_upload_template.xlsx (blank with example)');

  // ── BACHELOR REAL DATA (for testing) ──
  const bctStudents = await p.user.findMany({
    where: { role: 'STUDENT', degreeType: 'BACHELOR', programId: progBCT.id },
    orderBy: { rollNumber: 'asc' },
  });

  const bachelorData = [];
  for (let i = 0; i < Math.min(bctStudents.length, 9); i += 3) {
    const group = bctStudents.slice(i, i + 3);
    const groupNum = Math.floor(i / 3) + 1;
    bachelorData.push({
      'Group Name': `SampleGroup${groupNum}`,
      'Project Title': `Sample Bachelor Project ${groupNum}`,
      'Member Names': group.map(s => s.firstName + ' ' + s.lastName).join(', '),
      'Roll Numbers': group.map(s => s.rollNumber).join(', '),
      'Academic Year': year.year,
    });
  }

  const wb1 = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(bachelorData);
  XLSX.utils.book_append_sheet(wb1, ws1, 'Groups');
  XLSX.writeFile(wb1, 'excel-templates/bachelor_upload_template_with_data.xlsx');
  console.log('Created excel-templates/bachelor_upload_template_with_data.xlsx (real data)');

  // ── MASTER TEMPLATE (blank with example) ──
  const blankMaster = [
    { 'Student Name': '', 'Roll Number': '', 'Thesis Title': '', 'Academic Year': '' },
    { 'Student Name': 'Anup Baral', 'Roll Number': '080MSCS001', 'Thesis Title': 'Sample Master Thesis 1', 'Academic Year': year?.year || '2081' },
  ];

  const wbBlank2 = XLSX.utils.book_new();
  const wsBlank2 = XLSX.utils.json_to_sheet(blankMaster);
  XLSX.utils.book_append_sheet(wbBlank2, wsBlank2, 'Theses');
  XLSX.writeFile(wbBlank2, 'excel-templates/master_upload_template.xlsx');
  console.log('Created excel-templates/master_upload_template.xlsx (blank with example)');

  // ── MASTER REAL DATA (for testing) ──
  const masterStudents = await p.user.findMany({
    where: { role: 'STUDENT', degreeType: 'MASTER' },
    orderBy: { rollNumber: 'asc' },
  });

  const thesisData = masterStudents.map((s, i) => ({
    'Student Name': s.firstName + ' ' + s.lastName,
    'Roll Number': s.rollNumber,
    'Thesis Title': `Sample Master Thesis ${i + 1}`,
    'Academic Year': year.year,
  }));

  const wb2 = XLSX.utils.book_new();
  const ws2 = XLSX.utils.json_to_sheet(thesisData);
  XLSX.utils.book_append_sheet(wb2, ws2, 'Theses');
  XLSX.writeFile(wb2, 'excel-templates/master_upload_template_with_data.xlsx');
  console.log('Created excel-templates/master_upload_template_with_data.xlsx (real data)');

  await p.$disconnect();
}

main().catch(e => { console.error(e); p.$disconnect(); });
