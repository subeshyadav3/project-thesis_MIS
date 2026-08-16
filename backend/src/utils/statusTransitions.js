const GROUP_THESIS_STATUSES = ['PENDING', 'ACTIVE', 'COMPLETED', 'OVERDUE', 'REJECTED'];

const VALID_TRANSITIONS = {
  PENDING: ['PENDING', 'ACTIVE', 'COMPLETED'],
  ACTIVE: ['ACTIVE', 'COMPLETED', 'OVERDUE'],
  OVERDUE: ['ACTIVE', 'COMPLETED', 'OVERDUE'],
  COMPLETED: ['COMPLETED'],
  REJECTED: ['REJECTED'],
};

function assertValidStatusTransition(model, current, next) {
  if (!GROUP_THESIS_STATUSES.includes(next)) {
    return { valid: false, error: `Invalid status "${next}". Allowed: ${GROUP_THESIS_STATUSES.join(', ')}` };
  }
  const allowed = VALID_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    return { valid: false, error: `Cannot change ${model} status from "${current}" to "${next}". Allowed: ${allowed.join(', ')}` };
  }
  return { valid: true };
}

module.exports = { assertValidStatusTransition, GROUP_THESIS_STATUSES };
