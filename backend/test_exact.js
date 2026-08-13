const { resolveCoordinatorScope, canManageThesisAsCoordinator } = require('./src/utils/coordinatorScope');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function test() {
  const user = await p.user.findUnique({ where: { id: 3050 } });
  console.log('User:', user);
  const scope = await resolveCoordinatorScope(user);
  console.log('Resolved Scope:', JSON.stringify(scope, null, 2));

  const thesis = await p.thesis.findUnique({
    where: { id: 483 },
    include: {
      student: { include: { program: true } },
      supervisor: true
    }
  });
  console.log('Thesis:', {
    id: thesis.id,
    programId: thesis.programId,
    studentProgramId: thesis.student?.programId,
    studentProgram: thesis.student?.program
  });

  const canManage = await canManageThesisAsCoordinator(thesis, scope, user);
  console.log('canManageResult:', canManage);
  
  await p.$disconnect();
}

test();
