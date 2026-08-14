const { resolveCoordinatorScope, canManageThesisAsCoordinator, isThesisVisibleToCoordinator } = require('./src/utils/coordinatorScope');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function test() {
  try {
    const user = { id: 3050, role: 'COORDINATOR' };
    const thesis = await p.thesis.findUnique({
      where: { id: 483 },
      include: {
        student: { include: { program: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true, active: true } },
      }
    });
    
    const scope = await resolveCoordinatorScope(user);
    const visible = await isThesisVisibleToCoordinator(thesis, scope, user);
    const canManage = await canManageThesisAsCoordinator(thesis, scope, user);
    
    console.log('Intermediate values:');
    console.log('Scope program ID:', scope.program?.id);
    console.log('Scope degreeType:', scope.degreeType);
    console.log('Thesis student program ID:', thesis.student?.programId);
    console.log('Thesis program ID:', thesis.programId);
    console.log('Thesis student exists:', !!thesis.student);
    console.log('Thesis student programId exists:', !!thesis.student?.programId);
    console.log('Visible:', visible);
    console.log('CanManage:', canManage);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await p.$disconnect();
  }
}

test();
