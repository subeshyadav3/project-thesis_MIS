// Single source of truth for the 5 evaluation components of the minor project.
// Total = 50 marks. This mirrors the academic regulation table exactly:
//   Supervisor (25) + Proposal Defense (5) + Mid-Term Defense (5)
//   + Final Defense (5) + Internal Examiner (10)

const EVALUATION_SCHEME = [
  {
    type: 'SUPERVISOR',
    name: 'Supervisor',
    label: 'Supervisor',
    shortLabel: 'Supervisor',
    maxMarks: 25,
    stage: 'FINAL',
    evaluatorRole: 'SUPERVISOR',
    description: 'Continuous assessment of progress, quality of work and engagement throughout the project.',
    evaluatorDescription: 'Supervisor',
  },
  {
    type: 'PROPOSAL_DEFENSE',
    name: 'Proposal Defense',
    label: 'Proposal Defense',
    shortLabel: 'Proposal',
    maxMarks: 5,
    stage: 'PROPOSAL',
    evaluatorRole: 'COORDINATOR',
    description: 'Evaluation of the proposal defense presentation by the project coordinator.',
    evaluatorDescription: 'Coordinator',
  },
  {
    type: 'MIDTERM_DEFENSE',
    name: 'Mid-Term Defense',
    label: 'Mid-Term Defense',
    shortLabel: 'Mid-Term',
    maxMarks: 5,
    stage: 'MID_TERM',
    evaluatorRole: 'COORDINATOR',
    description: 'Evaluation of mid-semester progress and demonstration by the project coordinator.',
    evaluatorDescription: 'Coordinator',
  },
  {
    type: 'FINAL_DEFENSE',
    name: 'Final Defense',
    label: 'Final Defense',
    shortLabel: 'Final Def.',
    maxMarks: 5,
    stage: 'FINAL',
    evaluatorRole: 'COORDINATOR',
    description: 'Evaluation of the final defense / viva by the project coordinator.',
    evaluatorDescription: 'Coordinator',
  },
  {
    type: 'EXTERNAL_EXAMINER',
    name: 'Internal Examiner',
    label: 'Internal Examiner',
    shortLabel: 'Int. Examiner',
    maxMarks: 10,
    stage: 'FINAL',
    evaluatorRole: 'EXTERNAL_EXAMINER',
    description: 'Independent assessment of the final deliverable by the appointed internal examiner.',
    evaluatorDescription: 'Internal Examiner',
  },
];

const TOTAL_MAX_MARKS = EVALUATION_SCHEME.reduce((s, c) => s + c.maxMarks, 0); // 50
const SCHEME_BY_TYPE = Object.fromEntries(EVALUATION_SCHEME.map(c => [c.type, c]));

const ROLE_LABEL = {
  SUPERVISOR: 'Supervisor',
  COORDINATOR: 'Coordinator',
  EXTERNAL_EXAMINER: 'Internal Examiner',
  STUDENT: 'Student',
  MAINTAINER: 'Maintainer',
};

function getComponentByType(type) { return SCHEME_BY_TYPE[type] || null; }

function validateMarks(marks, maxMarks) {
  if (marks === null || marks === undefined || marks === '') return { valid: true };
  const num = Number(marks);
  if (Number.isNaN(num)) return { valid: false, error: 'Marks must be a number' };
  if (num < 0) return { valid: false, error: 'Marks cannot be negative' };
  if (num > maxMarks) return { valid: false, error: `Marks cannot exceed ${maxMarks}` };
  return { valid: true };
}

// Build the canonical component list to seed for a new group/thesis.
// Each component is linked to an evaluator role.
function getDefaultComponents() {
  return EVALUATION_SCHEME.map(c => ({
    name: c.name,
    evaluationType: c.type,
    evaluatorRole: c.evaluatorRole,
    maxMarks: c.maxMarks,
  }));
}

// Compute the per-component + total summary used by every UI.
function computeSummary(evaluations, components) {
  const componentMap = new Map((components || []).map(c => [c.id, c]));
  const breakdown = (components || []).map(c => {
    const evalRec = (evaluations || []).find(e => e.componentId === c.id);
    return {
      componentId: c.id,
      evaluationType: c.evaluationType,
      name: c.name,
      label: c.name,
      shortLabel: c.shortLabel,
      description: c.description,
      evaluatorRole: c.evaluatorRole,
      evaluatorDescription: ROLE_LABEL[c.evaluatorRole] || c.evaluatorRole,
      stage: c.evaluationType === 'SUPERVISOR' || c.evaluationType === 'EXTERNAL_EXAMINER' || c.evaluationType === 'FINAL_DEFENSE' ? 'FINAL'
        : c.evaluationType === 'MIDTERM_DEFENSE' ? 'MID_TERM' : 'PROPOSAL',
      maxMarks: c.maxMarks,
      marks: evalRec ? evalRec.marks : null,
      comment: evalRec ? evalRec.comment : null,
      submittedBy: evalRec ? evalRec.submittedBy : null,
      submittedAt: evalRec ? evalRec.createdAt : null,
      evaluationId: evalRec ? evalRec.id : null,
      status: evalRec && evalRec.marks !== null ? 'COMPLETED' : 'PENDING',
    };
  });

  const total = breakdown.reduce((s, b) => s + (b.marks !== null && b.marks !== undefined ? Number(b.marks) : 0), 0);
  const completedCount = breakdown.filter(b => b.status === 'COMPLETED').length;
  return {
    breakdown,
    total,
    maxTotal: TOTAL_MAX_MARKS,
    completedCount,
    totalCount: breakdown.length,
    isComplete: completedCount === breakdown.length,
  };
}

module.exports = {
  EVALUATION_SCHEME,
  SCHEME_BY_TYPE,
  TOTAL_MAX_MARKS,
  ROLE_LABEL,
  getComponentByType,
  getDefaultComponents,
  validateMarks,
  computeSummary,
};
