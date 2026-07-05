const SCHEMES = {
  MINOR: {
    name: 'Minor Project',
    totalMaxMarks: 50,
    components: [
      { type: 'SUPERVISOR', name: 'Supervisor', maxMarks: 25, stage: 'FINAL', evaluatorRole: 'SUPERVISOR' },
      { type: 'PROPOSAL_DEFENSE', name: 'Proposal Defense', maxMarks: 5, stage: 'PROPOSAL', evaluatorRole: 'COORDINATOR' },
      { type: 'MIDTERM_DEFENSE', name: 'Mid-Term Defense', maxMarks: 5, stage: 'MID_TERM', evaluatorRole: 'COORDINATOR' },
      { type: 'FINAL_DEFENSE', name: 'Final Defense', maxMarks: 5, stage: 'FINAL', evaluatorRole: 'COORDINATOR' },
      { type: 'EXTERNAL_EXAMINER', name: 'Internal Examiner', maxMarks: 10, stage: 'FINAL', evaluatorRole: 'EXTERNAL_EXAMINER' },
    ],
  },
  MAJOR: {
    name: 'Major Project',
    totalMaxMarks: 100,
    components: [
      { type: 'SUPERVISOR', name: 'Supervisor', maxMarks: 50, stage: 'FINAL', evaluatorRole: 'SUPERVISOR' },
      { type: 'PROPOSAL_DEFENSE', name: 'Proposal Defense', maxMarks: 10, stage: 'PROPOSAL', evaluatorRole: 'COORDINATOR' },
      { type: 'MIDTERM_DEFENSE', name: 'Mid-Term Defense', maxMarks: 10, stage: 'MID_TERM', evaluatorRole: 'COORDINATOR' },
      { type: 'FINAL_DEFENSE', name: 'Final Defense', maxMarks: 10, stage: 'FINAL', evaluatorRole: 'COORDINATOR' },
      { type: 'EXTERNAL_EXAMINER', name: 'Internal Examiner', maxMarks: 20, stage: 'FINAL', evaluatorRole: 'EXTERNAL_EXAMINER' },
    ],
  },
  MASTER: {
    name: 'Master Thesis',
    totalMaxMarks: 200,
    components: [
      // Supervisor criteria (5 × 20 = 100)
      { type: 'SUPERVISOR', name: 'Regularity of works (regular reporting of the progress report)', maxMarks: 20, stage: 'FINAL', evaluatorRole: 'SUPERVISOR' },
      { type: 'SUPERVISOR', name: 'Degree of Completeness of thesis', maxMarks: 20, stage: 'FINAL', evaluatorRole: 'SUPERVISOR' },
      { type: 'SUPERVISOR', name: 'Understanding of thesis work & related theory', maxMarks: 20, stage: 'FINAL', evaluatorRole: 'SUPERVISOR' },
      { type: 'SUPERVISOR', name: 'Student effort and performance', maxMarks: 20, stage: 'FINAL', evaluatorRole: 'SUPERVISOR' },
      { type: 'SUPERVISOR', name: 'Organization of study', maxMarks: 20, stage: 'FINAL', evaluatorRole: 'SUPERVISOR' },
      // External examiner criteria (5 × 20 = 100)
      { type: 'EXTERNAL_EXAMINER', name: 'Presentation Skills and Flow of Slides', maxMarks: 20, stage: 'FINAL', evaluatorRole: 'EXTERNAL_EXAMINER' },
      { type: 'EXTERNAL_EXAMINER', name: 'Defense & Question Handling', maxMarks: 20, stage: 'FINAL', evaluatorRole: 'EXTERNAL_EXAMINER' },
      { type: 'EXTERNAL_EXAMINER', name: 'Understanding of Thesis work & related theory', maxMarks: 20, stage: 'FINAL', evaluatorRole: 'EXTERNAL_EXAMINER' },
      { type: 'EXTERNAL_EXAMINER', name: 'Research Quality & Originality', maxMarks: 20, stage: 'FINAL', evaluatorRole: 'EXTERNAL_EXAMINER' },
      { type: 'EXTERNAL_EXAMINER', name: 'Report Writing', maxMarks: 20, stage: 'FINAL', evaluatorRole: 'EXTERNAL_EXAMINER' },
    ],
  },
};

const ROLE_LABEL = {
  SUPERVISOR: 'Supervisor',
  COORDINATOR: 'Coordinator',
  EXTERNAL_EXAMINER: 'Internal Examiner',
  STUDENT: 'Student',
  MAINTAINER: 'Maintainer',
};

function getScheme(projectType) {
  return SCHEMES[projectType] || SCHEMES.MINOR;
}

function getComponentByType(projectType, type) {
  const scheme = getScheme(projectType);
  return scheme.components.find(c => c.type === type) || null;
}

function validateMarks(marks, maxMarks) {
  if (marks === null || marks === undefined || marks === '') return { valid: true };
  const num = Number(marks);
  if (Number.isNaN(num)) return { valid: false, error: 'Marks must be a number' };
  if (num < 0) return { valid: false, error: 'Marks cannot be negative' };
  if (num > maxMarks) return { valid: false, error: `Marks cannot exceed ${maxMarks}` };
  return { valid: true };
}

function getDefaultComponents(projectType) {
  const scheme = getScheme(projectType);
  return scheme.components.map(c => ({
    name: c.name,
    evaluationType: c.type,
    evaluatorRole: c.evaluatorRole,
    maxMarks: c.maxMarks,
  }));
}

function getTotalMaxMarks(projectType) {
  return getScheme(projectType).totalMaxMarks;
}

function computeSummary(evaluations, components, projectType) {
  const maxTotal = projectType ? getTotalMaxMarks(projectType)
    : (components || []).reduce((s, c) => s + c.maxMarks, 0);
  const breakdown = (components || []).map(c => {
    const evalRec = (evaluations || []).find(e => e.componentId === c.id);
    return {
      componentId: c.id,
      evaluationType: c.evaluationType,
      name: c.name,
      evaluatorRole: c.evaluatorRole,
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
    maxTotal,
    completedCount,
    totalCount: breakdown.length,
    isComplete: completedCount === breakdown.length,
  };
}

module.exports = {
  SCHEMES,
  ROLE_LABEL,
  getScheme,
  getComponentByType,
  validateMarks,
  getDefaultComponents,
  getTotalMaxMarks,
  computeSummary,
};
