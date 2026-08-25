const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

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

async function runTests() {
  console.log('\n========================================');
  console.log(' RUNNING COMPREHENSIVE BACKEND TEST SUITE');
  console.log('========================================\n');

  try {
    // 1. Database Integrity Tests
    console.log('1. Testing Database Entities & Consistency...');
    const usersCount = await prisma.user.count();
    assert(usersCount > 300, `Total users seeded > 300 (actual: ${usersCount})`);

    const students = await prisma.user.findMany({ where: { role: 'STUDENT' } });
    assert(students.length > 250, `Students present in DB (actual: ${students.length})`);

    const programs = await prisma.program.findMany();
    assert(programs.length === 6, `6 academic programs configured (actual: ${programs.length})`);

    const ay = await prisma.academicYear.findMany();
    assert(ay.length === 6, `6 academic years configured (actual: ${ay.length})`);

    // 2. Authentication & User Password Verifications
    console.log('\n2. Testing Authentication & Passwords...');
    const testStudent = await prisma.user.findFirst({ where: { email: 'subeshgaming@gmail.com' } });
    assert(testStudent !== null, 'Student with email "subeshgaming@gmail.com" exists (082MSNCS01)');
    if (testStudent) {
      assert(testStudent.rollNumber === '082MSNCS01', '082MSNCS01 student matches email');
      assert(testStudent.batch === '2082', '082MSNCS01 belongs to batch 2082');
      assert(testStudent.degreeType === 'MASTER', '082MSNCS01 degreeType is MASTER');
      const passwordMatch = bcrypt.compareSync('subesh', testStudent.password);
      assert(passwordMatch, 'Password "subesh" matches for 082MSNCS01');
    }

    const coordinator = await prisma.user.findFirst({ where: { role: 'COORDINATOR' } });
    assert(coordinator !== null, 'Coordinator user exists');
    if (coordinator) {
      const coordPass = bcrypt.compareSync('subesh', coordinator.password);
      assert(coordPass, 'Password "subesh" matches for Coordinator');
    }

    // 3. Announcements & Form Responses Tests
    console.log('\n3. Testing Announcements & Form Responses...');
    const ann2082 = await prisma.announcement.findFirst({
      where: { batch: '2082', degreeType: 'MASTER' }
    });
    assert(ann2082 !== null, 'Master Batch 2082 announcement exists');
    assert(ann2082?.formEnabled === true, 'Announcement has formEnabled=true');

    const totalMaster2082Announcements = await prisma.announcement.count({
      where: { batch: '2082', degreeType: 'MASTER' }
    });
    assert(totalMaster2082Announcements === 1, `Exactly ONE Master Batch 2082 announcement exists (actual: ${totalMaster2082Announcements})`);

    const responses2082 = await prisma.formResponse.findMany({
      where: { announcementId: ann2082.id }
    });
    assert(responses2082.length === 15, `Exactly 15 demo responses submitted for Batch 2082 (actual: ${responses2082.length})`);

    const sagarResponse = responses2082.find(r => r.studentId === testStudent?.id);
    assert(sagarResponse !== null, 'Sagar Parajuli (082MSNCS01) has a submitted form response');
    if (sagarResponse) {
      assert(sagarResponse.formData?.title.includes('Automated Intrusion Detection'), 'Sagar response has correct concept title');
      assert(sagarResponse.formData?.pdfUrl?.endsWith('.pdf'), 'Sagar response includes uploaded proposal PDF');
    }

    // 4. Batch 2082 Student Theses Isolation (Zero conflict before finalization)
    console.log('\n4. Testing Batch 2082 Theses Isolation (No pre-created duplicates)...');
    const sagarThesesBeforeFinalize = await prisma.thesis.findMany({
      where: { studentId: testStudent.id }
    });
    assert(sagarThesesBeforeFinalize.length === 0, `Sagar Parajuli has 0 theses prior to coordinator finalization (actual: ${sagarThesesBeforeFinalize.length})`);

    // 5. Past Cohorts Master Theses & Projects Consistency
    console.log('\n5. Testing Master Past Cohorts & 4th Sem (2078-2081)...');
    const pastTheses = await prisma.thesis.findMany({
      where: { batch: { in: ['2078', '2079', '2080'] } }
    });
    const allPastCompleted = pastTheses.every(t => t.status === 'COMPLETED');
    assert(allPastCompleted, 'All theses & projects for batches 2078-2080 have status=COMPLETED');

    const batch2081Theses = await prisma.thesis.findMany({
      where: { batch: '2081', projectType: 'THESIS' }
    });
    assert(batch2081Theses.length > 0, 'Batch 2081 4th sem master theses exist');
    const all2081ThesesActive = batch2081Theses.every(t => t.status === 'ACTIVE');
    assert(all2081ThesesActive, 'All 4th sem theses for batch 2081 are ACTIVE');

    const batch2081Projects = await prisma.thesis.findMany({
      where: { batch: '2081', projectType: 'PROJECT' }
    });
    assert(batch2081Projects.length > 0, 'Batch 2081 3rd sem projects exist');
    const all2081ProjectsCompleted = batch2081Projects.every(t => t.status === 'COMPLETED');
    assert(all2081ProjectsCompleted, 'All 3rd sem projects for batch 2081 are COMPLETED');

    // 6. Bachelor Projects Hierarchy
    console.log('\n6. Testing Bachelor Cohorts Hierarchy (2078-2080)...');
    const b2080Minor = await prisma.projectGroup.findMany({
      where: { batch: '2080', projectType: 'MINOR' }
    });
    assert(b2080Minor.length > 0 && b2080Minor.every(g => g.status === 'ACTIVE'), 'Batch 2080 3rd year has ACTIVE Minor Projects');

    const b2079Major = await prisma.projectGroup.findMany({
      where: { batch: '2079', projectType: 'MAJOR' }
    });
    assert(b2079Major.length > 0 && b2079Major.every(g => g.status === 'ACTIVE'), 'Batch 2079 4th year has ACTIVE Major Projects');

    const b2079Minor = await prisma.projectGroup.findMany({
      where: { batch: '2079', projectType: 'MINOR' }
    });
    assert(b2079Minor.length > 0 && b2079Minor.every(g => g.status === 'COMPLETED'), 'Batch 2079 has COMPLETED Minor Projects from 3rd year');

    const b2078Groups = await prisma.projectGroup.findMany({
      where: { batch: '2078' }
    });
    assert(b2078Groups.length > 0 && b2078Groups.every(g => g.status === 'COMPLETED'), 'Batch 2078 graduated groups are all COMPLETED');

    // 7. Evaluation Scheme & Components
    console.log('\n7. Testing Evaluation Components & Marks...');
    const evalComponents = await prisma.evaluationComponent.findMany();
    assert(evalComponents.length > 0, `Evaluation components populated (actual: ${evalComponents.length})`);

    const evaluations = await prisma.evaluation.findMany();
    assert(evaluations.length > 0, `Completed evaluations recorded for archive cohorts (actual: ${evaluations.length})`);

    // 8. Documents & PDF Proposals
    console.log('\n8. Testing Proposal & Defense Documents...');
    const proposals = await prisma.proposal.findMany();
    assert(proposals.length > 0, `Proposals & Defense PDFs linked (actual: ${proposals.length})`);

    console.log('\n========================================');
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
