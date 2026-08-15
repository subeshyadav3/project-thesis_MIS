const axios = require('axios');
const prisma = require('../src/utils/prisma');
const bcrypt = require('bcryptjs');

const BASE_URL = 'http://localhost:5000/api';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    testsPassed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    testsFailed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('Starting End-to-End Test Suite for TPMS');
  console.log('====================================================\n');

  try {
    // 1. Check Database Seed Status
    const userCount = await prisma.user.count();
    const groupCount = await prisma.projectGroup.count();
    const thesisCount = await prisma.thesis.count({ where: { projectType: 'THESIS' } });
    const projectCount = await prisma.thesis.count({ where: { projectType: 'PROJECT' } });

    console.log('1. Database Seed Verification');
    assert(userCount > 200, `User count in DB is ${userCount}`);
    assert(groupCount >= 10, `Bachelor groups in DB is ${groupCount}`);
    assert(thesisCount >= 10, `Master Theses in DB is ${thesisCount}`);
    assert(projectCount >= 10, `Master Projects in DB is ${projectCount}`);

    // 2. Evaluation Schemes and Marks
    console.log('\n2. Evaluation Scheme Integrity');
    const { SCHEMES, getDefaultComponents } = require('../src/config/evaluationScheme');
    assert(SCHEMES.THESIS.totalMaxMarks === 300, 'Master Thesis total marks is 300');
    assert(SCHEMES.PROJECT.totalMaxMarks === 100, 'Master Project total marks is 100');
    assert(SCHEMES.MAJOR.totalMaxMarks === 100, 'Bachelor Major Project total marks is 100');
    assert(SCHEMES.MINOR.totalMaxMarks === 50, 'Bachelor Minor Project total marks is 50');

    const thesisComps = getDefaultComponents('THESIS');
    assert(thesisComps.length === 18, `Master Thesis has 18 evaluation criteria (total 300)`);

    const projectComps = getDefaultComponents('PROJECT');
    assert(projectComps.length === 5, `Master Project has 5 evaluation criteria (total 100)`);
    assert(projectComps.every(c => c.evaluatorRole === 'EXTERNAL_EXAMINER'), 'Master Project criteria all evaluated by External Examiner');

    // 3. Completed Theses & Projects Data
    console.log('\n3. Completed Records & PDF Generation Verification');
    const completedThesis = await prisma.thesis.findFirst({
      where: { projectType: 'THESIS', status: 'COMPLETED' },
      include: { evaluationComponents: true, evaluations: true, student: true },
    });
    assert(!!completedThesis, 'Completed Master Thesis exists in database');
    if (completedThesis) {
      assert(completedThesis.evaluations.length === completedThesis.evaluationComponents.length,
        `Completed thesis has all ${completedThesis.evaluationComponents.length} components evaluated`);
    }

    const completedProject = await prisma.thesis.findFirst({
      where: { projectType: 'PROJECT', status: 'COMPLETED' },
      include: { evaluationComponents: true, evaluations: true, student: true },
    });
    assert(!!completedProject, 'Completed Master Project exists in database');
    if (completedProject) {
      assert(completedProject.evaluations.length === 5,
        `Completed project has all 5 criteria evaluated`);
    }

    // 4. Role Assignment & Scoping Logic
    console.log('\n4. Role Assignment & Scoping Edge Cases');
    const projectRecord = await prisma.thesis.findFirst({ where: { projectType: 'PROJECT' } });
    assert(projectRecord.supervisorId === null, 'Master Project has no supervisor assigned');
    assert(projectRecord.externalMidTermId === null, 'Master Project has no mid-term examiner assigned');
    assert(projectRecord.externalFinalId !== null, 'Master Project has external final examiner assigned');

    // 5. Status Transitions
    console.log('\n5. Status Transitions Validation');
    const { assertValidStatusTransition } = require('../src/utils/statusTransitions');
    assert(assertValidStatusTransition('thesis', 'ACTIVE', 'COMPLETED').valid, 'ACTIVE -> COMPLETED is valid');
    assert(assertValidStatusTransition('thesis', 'PENDING', 'ACTIVE').valid, 'PENDING -> ACTIVE is valid');
    assert(!assertValidStatusTransition('thesis', 'COMPLETED', 'ACTIVE').valid, 'COMPLETED -> ACTIVE is blocked');
    assert(!assertValidStatusTransition('thesis', 'REJECTED', 'COMPLETED').valid, 'REJECTED -> COMPLETED is blocked');

    // 6. Year/Semester Rules
    console.log('\n6. Academic Year & Semester Rules');
    const { validateYearSemester, RULES } = require('../src/config/yearSemesterRules');
    const eligibleThesis = validateYearSemester('MASTER', 'THESIS', 2, 4);
    assert(eligibleThesis.valid, 'Master student in Year 2 Semester 4 is eligible for Thesis');
    const eligibleProject = validateYearSemester('MASTER', 'PROJECT', 2, 3);
    assert(eligibleProject.valid, 'Master student in Year 2 Semester 3 is eligible for Project');
    const ineligible = validateYearSemester('BACHELOR', 'MAJOR', 1, 1);
    assert(!ineligible.valid, 'Bachelor student in Year 1 Semester 1 is blocked from Major Project');

    console.log('\n====================================================');
    console.log(`Test Results: ${testsPassed} PASSED, ${testsFailed} FAILED`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('Test execution error:', err);
    testsFailed++;
  } finally {
    await prisma.$disconnect();
    if (testsFailed > 0) process.exit(1);
  }
}

runTests();
