const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    failed++;
  }
}

async function runUploadTests() {
  console.log('\n========================================');
  console.log(' TESTING ALL EXCEL UPLOAD WORKFLOWS');
  console.log('========================================\n');

  try {
    const coordinator = await prisma.user.findFirst({ where: { role: 'COORDINATOR' } });
    const maintainer = await prisma.user.findFirst({ where: { role: 'MAINTAINER' } });
    const dept = await prisma.department.findFirst();
    const programs = await prisma.program.findMany();

    // 1. Test User Excel Parsing (Student, Supervisor, External Examiner)
    console.log('1. Testing User Excel Templates & Ingestion...');

    const studentXlsxPath = path.join(__dirname, '..', 'excel-templates', 'New-Test-data', 'master_student_users_test_data.xlsx');
    const studentWb = XLSX.readFile(studentXlsxPath);
    const studentRows = XLSX.utils.sheet_to_json(studentWb.Sheets[studentWb.SheetNames[0]]);
    assert(studentRows.length > 0, `Student test data contains rows (actual: ${studentRows.length})`);
    
    let createdStudents = 0;
    for (const r of studentRows) {
      const email = (r.email || r.Email || `${r.rollNumber}@pcampus.edu.np`).toLowerCase();
      const rollNumber = r.rollNumber || r.RollNumber;
      const progCode = r.programCode || r.ProgramCode;
      const prog = programs.find(p => p.code.toLowerCase() === progCode?.toLowerCase());
      
      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          password: await bcrypt.hash('Test@123', 10),
          firstName: r.firstName,
          lastName: r.lastName,
          role: 'STUDENT',
          rollNumber,
          degreeType: r.degreeType || 'MASTER',
          programId: prog?.id,
          departmentId: dept.id,
          batch: rollNumber.match(/^\d{2,3}/)?.[1] || '2083',
          active: true,
        }
      });
      if (user) createdStudents++;
    }
    assert(createdStudents === studentRows.length, `Successfully ingested ${createdStudents} students from test Excel`);

    // 2. Test Supervisor Excel
    console.log('\n2. Testing Supervisor Excel Ingestion...');
    const supXlsxPath = path.join(__dirname, '..', 'excel-templates', 'New-Test-data', 'bachelor_supervisor_users_test_data.xlsx');
    const supWb = XLSX.readFile(supXlsxPath);
    const supRows = XLSX.utils.sheet_to_json(supWb.Sheets[supWb.SheetNames[0]]);
    assert(supRows.length > 0, `Supervisor test data contains rows (actual: ${supRows.length})`);

    let createdSups = 0;
    for (const r of supRows) {
      const email = r.email.toLowerCase();
      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          password: await bcrypt.hash('Test@123', 10),
          firstName: r.firstName,
          lastName: r.lastName,
          designation: r.designation,
          role: 'SUPERVISOR',
          departmentId: dept.id,
          active: true,
        }
      });
      if (user) createdSups++;
    }
    assert(createdSups === supRows.length, `Successfully ingested ${createdSups} supervisors from test Excel`);

    // 3. Test External Examiner Excel
    console.log('\n3. Testing External Examiner Excel Ingestion...');
    const extXlsxPath = path.join(__dirname, '..', 'excel-templates', 'New-Test-data', 'bachelor_external_users_test_data.xlsx');
    const extWb = XLSX.readFile(extXlsxPath);
    const extRows = XLSX.utils.sheet_to_json(extWb.Sheets[extWb.SheetNames[0]]);
    assert(extRows.length > 0, `Examiner test data contains rows (actual: ${extRows.length})`);

    let createdExts = 0;
    for (const r of extRows) {
      const email = r.email.toLowerCase();
      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          password: await bcrypt.hash('Test@123', 10),
          firstName: r.firstName,
          lastName: r.lastName,
          designation: r.designation,
          role: 'EXTERNAL_EXAMINER',
          departmentId: dept.id,
          active: true,
        }
      });
      if (user) createdExts++;
    }
    assert(createdExts === extRows.length, `Successfully ingested ${createdExts} external examiners from test Excel`);

    // 4. Test Master Theses & Projects Excel Ingestion
    console.log('\n4. Testing Master Theses & Projects Excel Ingestion...');
    const masterXlsxPath = path.join(__dirname, '..', 'excel-templates', 'New-Test-data', 'master_all_programs_theses_test_data.xlsx');
    const masterWb = XLSX.readFile(masterXlsxPath);
    const masterRows = XLSX.utils.sheet_to_json(masterWb.Sheets[masterWb.SheetNames[0]]);
    assert(masterRows.length > 0, `Master all programs test data contains rows (actual: ${masterRows.length})`);

    let ingestedMaster = 0;
    for (const r of masterRows) {
      const roll = r.Roll || r.roll;
      const title = r.Title || r.title;
      const progCode = r.Program || r.program;
      const pType = (r.Type || '').toUpperCase() === 'PROJECT' ? 'PROJECT' : 'THESIS';
      const student = await prisma.user.findFirst({ where: { rollNumber: { equals: roll, mode: 'insensitive' } } });
      const prog = programs.find(p => p.code.toLowerCase() === progCode?.toLowerCase());
      
      if (student && title) {
        const t = await prisma.thesis.create({
          data: {
            title,
            projectType: pType,
            studentId: student.id,
            programId: prog?.id || student.programId,
            cluster: r.Cluster || null,
            batch: r.Batch || student.batch || '2083',
            status: 'ACTIVE',
            createdVia: 'BULK',
          }
        });
        if (t) ingestedMaster++;
      }
    }
    assert(ingestedMaster > 0, `Successfully ingested ${ingestedMaster} master theses/projects from Excel`);

    // 5. Test Bachelor Project Groups Excel Ingestion
    console.log('\n5. Testing Bachelor Project Groups Excel Ingestion...');
    const bachXlsxPath = path.join(__dirname, '..', 'excel-templates', 'New-Test-data', 'bachelor_bct_test_data.xlsx');
    const bachWb = XLSX.readFile(bachXlsxPath);
    const bachRows = XLSX.utils.sheet_to_json(bachWb.Sheets[bachWb.SheetNames[0]]);
    assert(bachRows.length > 0, `Bachelor BCT test data contains rows (actual: ${bachRows.length})`);

    let ingestedGroups = 0;
    for (const r of bachRows) {
      const gName = r['Group Name'] || r.groupName;
      const pTitle = r['Project Title'] || r.projectTitle;
      const prog = programs.find(p => p.code === 'BCT');
      
      if (gName && pTitle) {
        const group = await prisma.projectGroup.create({
          data: {
            name: gName,
            projectTitle: pTitle,
            projectType: 'MINOR',
            cluster: r.Cluster || 'AIML',
            status: 'ACTIVE',
            batch: r.Batch || '2083',
            programId: prog?.id,
          }
        });
        if (group) ingestedGroups++;
      }
    }
    assert(ingestedGroups === bachRows.length, `Successfully ingested ${ingestedGroups} bachelor groups from Excel`);

    // 6. Test Edge Cases & Validations
    console.log('\n6. Testing Edge Cases & Template Validations...');
    
    // (a) Template headers match expected schema
    const bTemplate = XLSX.readFile(path.join(__dirname, '..', 'excel-templates', 'bachelor_upload_template.xlsx'));
    const bHeaders = Object.keys(XLSX.utils.sheet_to_json(bTemplate.Sheets[bTemplate.SheetNames[0]])[0] || {});
    assert(bHeaders.includes('Group Name') && bHeaders.includes('Project Title') && bHeaders.includes('Members'), 'Bachelor template headers valid');

    const mTemplate = XLSX.readFile(path.join(__dirname, '..', 'excel-templates', 'master_upload_template.xlsx'));
    const mHeaders = Object.keys(XLSX.utils.sheet_to_json(mTemplate.Sheets[mTemplate.SheetNames[0]])[0] || {});
    assert(mHeaders.includes('Name') && mHeaders.includes('Roll') && mHeaders.includes('Title'), 'Master template headers valid');

    const sTemplate = XLSX.readFile(path.join(__dirname, '..', 'excel-templates', 'student_users_template.xlsx'));
    const sHeaders = Object.keys(XLSX.utils.sheet_to_json(sTemplate.Sheets[sTemplate.SheetNames[0]])[0] || {});
    assert(sHeaders.includes('firstName') && sHeaders.includes('rollNumber') && sHeaders.includes('programCode'), 'Student users template headers valid');

    console.log('\n========================================');
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Upload test error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runUploadTests();
