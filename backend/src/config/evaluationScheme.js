const EVALUATION_TYPES = {
  SUPERVISOR: {
    label: 'Supervisor',
    maxMarks: 25,
    role: 'SUPERVISOR',
    stage: 'FINAL',
  },
  PROPOSAL_DEFENSE: {
    label: 'Proposal Defense',
    maxMarks: 5,
    role: 'COORDINATOR',
    stage: 'PROPOSAL',
  },
  MIDTERM_DEFENSE: {
    label: 'Mid-Term Defense',
    maxMarks: 5,
    role: 'COORDINATOR',
    stage: 'MID_TERM',
  },
  FINAL_DEFENSE: {
    label: 'Final Defense',
    maxMarks: 5,
    role: 'COORDINATOR',
    stage: 'FINAL',
  },
  EXTERNAL_EXAMINER: {
    label: 'External Examiner',
    maxMarks: 10,
    role: 'EXTERNAL_EXAMINER',
    stage: 'FINAL',
  },
};

const TOTAL_MAX_MARKS = 50;

const TYPE_BY_ROLE = {
  SUPERVISOR: 'SUPERVISOR',
  COORDINATOR: ['PROPOSAL_DEFENSE', 'MIDTERM_DEFENSE', 'FINAL_DEFENSE'],
  EXTERNAL_EXAMINER: 'EXTERNAL_EXAMINER',
};

function getTypeConfig(type) {
  return EVALUATION_TYPES[type];
}

function validateMarks(type, marks) {
  const config = EVALUATION_TYPES[type];
  if (!config) return { valid: false, error: 'Invalid evaluation type' };
  if (marks === null || marks === undefined) return { valid: true };
  if (marks < 0) return { valid: false, error: 'Marks cannot be negative' };
  if (marks > config.maxMarks) {
    return { valid: false, error: `Marks cannot exceed ${config.maxMarks}` };
  }
  return { valid: true };
}

function validateRoleForType(role, type) {
  const config = EVALUATION_TYPES[type];
  if (!config) return { valid: false, error: 'Invalid evaluation type' };
  if (config.role !== role) {
    return { valid: false, error: `${role} cannot submit ${type} evaluation` };
  }
  return { valid: true };
}

function computeSummary(evaluations) {
  const summary = {
    supervisor: { marks: null, maxMarks: 25, label: 'Supervisor' },
    proposalDefense: { marks: null, maxMarks: 5, label: 'Proposal Defense' },
    midtermDefense: { marks: null, maxMarks: 5, label: 'Mid-Term Defense' },
    finalDefense: { marks: null, maxMarks: 5, label: 'Final Defense' },
    externalExaminer: { marks: null, maxMarks: 10, label: 'External Examiner' },
  };

  const typeToKey = {
    SUPERVISOR: 'supervisor',
    PROPOSAL_DEFENSE: 'proposalDefense',
    MIDTERM_DEFENSE: 'midtermDefense',
    FINAL_DEFENSE: 'finalDefense',
    EXTERNAL_EXAMINER: 'externalExaminer',
  };

  for (const eval of evaluations) {
    if (eval.evaluationType && eval.marks !== null && eval.marks !== undefined) {
      const key = typeToKey[eval.evaluationType];
      if (key) {
        summary[key].marks = eval.marks;
      }
    }
  }

  let total = 0;
  let maxTotal = 0;
  for (const key of Object.keys(summary)) {
    maxTotal += summary[key].maxMarks;
    if (summary[key].marks !== null) {
      total += summary[key].marks;
    }
  }

  return { breakdown: summary, total, maxTotal };
}

module.exports = {
  EVALUATION_TYPES,
  TOTAL_MAX_MARKS,
  TYPE_BY_ROLE,
  getTypeConfig,
  validateMarks,
  validateRoleForType,
  computeSummary,
};