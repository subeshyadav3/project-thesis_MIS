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

  // ── BACHELOR GROUPS ──
  const bctStudents = await p.user.findMany({
    where: { role: 'STUDENT', degreeType: 'BACHELOR', programId: progBCT.id },
    orderBy: { rollNumber: 'asc' },
  });

  // Use all BCT students (some assigned, some not) — existing ones will be skipped
  const bachelorData = bctStudents.slice(0, 9).map((s, i) => ({
    'Group Name': `SampleGroup${Math.floor(i / 3) + 1}`,
    'Project Title': `Sample Bachelor Project ${Math.floor(i / 3) + 1}`,
    'Member Names': s.firstName + ' ' + s.lastName,
    'Roll Numbers': s.rollNumber,
    'Academic Year': year.year,
  }));

  const wb1 = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(bachelorData);
  XLSX.utils.book_append_sheet(wb1, ws1, 'Groups');
  XLSX.writeFile(wb1, 'excel-templates/bachelor_upload_template.xlsx');
  console.log('Created excel-templates/bachelor_upload_template.xlsx');

  // ── MASTER THESES ──
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
  XLSX.writeFile(wb2, 'excel-templates/master_upload_template.xlsx');
  console.log('Created excel-templates/master_upload_template.xlsx');

  await p.$disconnect();
}

main().catch(e => { console.error(e); p.$disconnect(); });
