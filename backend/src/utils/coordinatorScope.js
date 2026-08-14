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
 *   - bachelor programs: only the theses in the coordinator's own program
 *     that the coordinator actually supervises (no cross-program)
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
      where.OR = [
        // Own program theses (all, bulk and manual)
        { student: { programId: scope.program.id } },
        { programId: scope.program.id },
        // Theses this coordinator supervises
        { supervisorId: user.id },
        // Cross-program theses MANUALLY created by THIS coordinator for other programs
        { crossProgramRequestedById: user.id },
      ];
    } else {
      where.OR = [
        { student: { programId: scope.program.id } },
        { programId: scope.program.id },
      ];
    }
    return { where, allowCrossProgram: isMaster, scope };
  }

  if (scope.kind === 'department') {
    const programIds = scope.programs.map(p => p.id);
    where.OR = [
      { supervisorId: user.id },
      { student: { ...(where.student || {}), programId: { in: programIds } } },
    ];
    return { where, allowCrossProgram: false, scope };
  }

  where.id = -1;
  return { where, allowCrossProgram: false, scope };
}

/**
 * Same-shape helper for ProjectGroup lookups.
 *   - bachelor programs: only the groups in the coordinator's own program
 *     that the coordinator actually supervises
 *   - master programs: all groups in the coordinator's own program
 *   - department coordinators: all groups in the department's programs
 */
async function buildGroupWhereForCoordinator(user, baseWhere = {}) {
  const scope = await resolveCoordinatorScope(user);
  const where = { ...baseWhere };

  // Same for master and bachelor: a coordinator sees all groups in their own
  // program (replicating the master behaviour, where the coordinator sees all
  // theses in scope). Supervising an out-of-program group only grants
  // supervisor-level access, not coordinator-level access.
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
 * Coordinator-level "manage" check for groups (bachelor projects).
 *
 * A coordinator can perform coordinator actions (finalize, assign
 * supervisors/examiners, upload documents, …) only on groups that fall inside
 * their coordinator scope. Merely being the assigned supervisor of a group
 * does NOT grant coordinator access — that only gives supervisor-level access.
 */
async function canManageGroupAsCoordinator(group, scope, user) {
  if (!group || !scope || scope.kind === 'none') return false;

  if (scope.kind === 'program') {
    // Same for master and bachelor: the coordinator manages all groups in
    // their own program. Being the supervisor of an out-of-program group only
    // gives supervisor-level access, not coordinator-level access.
    return group.programId === scope.program.id;
  }

  if (scope.kind === 'department') {
    const programIds = scope.programs.map(p => p.id);
    return programIds.includes(group.programId);
  }

  return false;
}

/**
 * Coordinator-level "manage" check for theses. Mirrors the "manage" branches
 * of buildThesisWhereForCoordinator() WITHOUT the supervisor escape hatch:
 * being the supervisor of a thesis outside the coordinator's scope only gives
 * supervisor-level access, not coordinator-level access.
 */
async function canManageThesisAsCoordinator(thesis, scope, user) {
  if (!thesis || !scope || scope.kind === 'none') return false;

  if (scope.kind === 'program') {
    return thesis.student?.programId === scope.program.id ||
      thesis.programId === scope.program.id ||
      (thesis.student && !thesis.student.programId);
  }

  if (scope.kind === 'department') {
    const programIds = scope.programs.map(p => p.id);
    return programIds.includes(thesis.student?.programId) ||
      (thesis.student && !thesis.student.programId);
  }

  return false;
}

/**
 * View-level check: can this coordinator open the group at all?
 * The assigned supervisor can always view their own group (supervisor-level),
 * otherwise the group must be manageable within the coordinator's scope.
 */
async function isGroupVisibleToCoordinator(group, scope, user) {
  if (!group || !scope || scope.kind === 'none') return false;
  if (group.supervisorId === user.id) return true;
  return canManageGroupAsCoordinator(group, scope, user);
}

/**
 * View-level check: can this coordinator open the thesis at all?
 * A coordinator who is the assigned supervisor can always access the thesis
 * (supervisor-level), regardless of which program/degree it belongs to — but
 * that access is supervisor-level only, not coordinator-level.
 */
async function isThesisVisibleToCoordinator(thesis, scope, user) {
  if (thesis?.supervisorId === user.id) return true;
  return canManageThesisAsCoordinator(thesis, scope, user);
}

module.exports = {
  resolveCoordinatorScope,
  buildThesisWhereForCoordinator,
  buildGroupWhereForCoordinator,
  canManageGroupAsCoordinator,
  canManageThesisAsCoordinator,
  isGroupVisibleToCoordinator,
  isThesisVisibleToCoordinator,
};
