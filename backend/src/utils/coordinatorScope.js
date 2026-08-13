
const prisma = require('./prisma');

/**
 * Resolve the scoping context for a coordinator.
 *
 * Returns:
 *   - { kind: 'program',  program, department, degreeType }
 *       The coordinator owns a single program (Program.coordinatorId).
 *   - { kind: 'department', department, programs, degreeTypes }
 *       The coordinator owns an entire department (Department.coordinatorId).
 *   - { kind: 'none' }
 *       The user is a coordinator but is not assigned to any program or
 *       department (treat as no-scope; callers should default-deny beyond
 *       what auth already passed).
 *
 * IMPORTANT: Cross-program is allowed ONLY for MASTER degree-type
 * coordinators. Bachelor program / department coordinators cannot see or
 * act on theses from other programs.
 */
async function resolveCoordinatorScope(user) {
  if (!user || user.role !== 'COORDINATOR') {
    return { kind: 'none' };
  }

  // 1) Program coordinator (preferred — narrower scope)
  const program = await prisma.program.findUnique({
    where: { coordinatorId: user.id },
    include: { department: true },
  });
  if (program) {
    return {
      kind: 'program',
      program,
      department: program.department || null,
      degreeType: program.degreeType || null,
    };
  }

  // 2) Department coordinator — owns every program in the dept
  const department = await prisma.department.findUnique({
    where: { coordinatorId: user.id },
    include: { programs: true },
  });
  if (department) {
    const programs = department.programs || [];
    const degreeTypes = [...new Set(programs.map(p => p.degreeType).filter(Boolean))];
    return { kind: 'department', department, programs, degreeTypes };
  }

  return { kind: 'none' };
}

/**
 * Build a Prisma `where` clause fragment for Thesis lookups that respects:
 *   - bachelor programs: only own program (no cross-program)
 *   - master programs:  every MASTER program in the same department
 *     (any coordinator can see/assign across master programs)
 *   - department coordinators: all theses in the department.
 *
 * Returns { where, allowCrossProgram }.
 */
async function buildThesisWhereForCoordinator(user, baseWhere = {}) {
  const scope = await resolveCoordinatorScope(user);
  const where = { ...baseWhere };

  if (scope.kind === 'program') {
    const isMaster = scope.degreeType === 'MASTER';
    if (isMaster) {
      // Whole department: all master programs under the same department
      const deptPrograms = await prisma.program.findMany({
        where: { departmentId: scope.program.departmentId, degreeType: 'MASTER' },
      });
      const programIds = deptPrograms.map(p => p.id);
      where.OR = [
        { student: { programId: { in: programIds } } },
        { programId: { in: programIds } },
      ];
    } else {
      // BACHELOR (or anything non-master) — strictly own program.
      where.student = { ...(where.student || {}), programId: scope.program.id };
    }
    return { where, allowCrossProgram: isMaster, scope };
  }

  if (scope.kind === 'department') {
    const programIds = scope.programs.map(p => p.id);
    where.student = { ...(where.student || {}), programId: { in: programIds } };
    return { where, allowCrossProgram: false, scope };
  }

  // No scope — return an impossible `where` so coordinators with no
  // program/department linkage see nothing rather than everything.
  where.id = -1;
  return { where, allowCrossProgram: false, scope };
}

/**
 * Same-shape helper for ProjectGroup lookups. Currently groups are
 * restricted to the coordinator's program only (no cross-program).
 */
async function buildGroupWhereForCoordinator(user, baseWhere = {}) {
  const scope = await resolveCoordinatorScope(user);
  const where = { ...baseWhere };

  if (scope.kind === 'program') {
    where.programId = scope.program.id;
    return { where, scope };
  }
  if (scope.kind === 'department') {
    const programIds = scope.programs.map(p => p.id);
    where.programId = { in: programIds };
    return { where, scope };
  }

  where.id = -1;
  return { where, scope };
}

/**
 * Check whether the given thesis is visible to the requesting user.
 * Mirrors the WHERE produced by buildThesisWhereForCoordinator() so we
 * don't have to construct the same predicate twice.
 */
async function isThesisVisibleToCoordinator(thesis, scope, user) {
  if (!scope || scope.kind === 'none') return false;
  if (scope.kind === 'program') {
    if (scope.degreeType === 'MASTER') {
      // Whole department: all master programs under the same department
      const deptPrograms = await prisma.program.findMany({
        where: { departmentId: scope.program.departmentId, degreeType: 'MASTER' },
      });
      const programIds = deptPrograms.map(p => p.id);
      return programIds.includes(thesis.student?.programId) ||
        programIds.includes(thesis.programId) ||
        (thesis.student && !thesis.student.programId);
    }
    return thesis.student?.programId === scope.program.id ||
      (thesis.student && !thesis.student.programId);
  }
  if (scope.kind === 'department') {
    const programIds = scope.programs.map(p => p.id);
    return programIds.includes(thesis.student?.programId) ||
      (thesis.student && !thesis.student.programId);
  }
  return false;
}

module.exports = {
  resolveCoordinatorScope,
  buildThesisWhereForCoordinator,
  buildGroupWhereForCoordinator,
  isThesisVisibleToCoordinator,
};
