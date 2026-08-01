
const prisma = require('../utils/prisma');

const log = async ({ action, entity, entityId, details, performedById }) => {
  try {
    await prisma.auditLog.create({
      data: { action, entity, entityId: entityId ? parseInt(entityId) : null, details: details ? String(details).slice(0, 500) : null, performedById: performedById ? parseInt(performedById) : null },
    });
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
};

/**
 * Batched marks audit: marking several components of the same project/thesis
 * in quick succession (e.g. one "Save changes" click) produces a single,
 * readable audit entry naming the item — instead of one row per component.
 */
const pendingMarksBatches = new Map();

const logMarks = async ({ groupId, thesisId, title, performedById, isUpdate }) => {
  const itemKey = groupId ? `g:${groupId}` : `t:${thesisId}`;
  const batchKey = `${performedById}:${itemKey}`;

  const flush = async (entry) => {
    pendingMarksBatches.delete(batchKey);
    const action = entry.isUpdate ? 'UPDATE_MARKS' : 'SUBMIT_MARKS';
    const entity = groupId ? 'Project' : 'Thesis';
    const detail = entry.count > 1
      ? `${entry.actionLabel} for "${entry.title}" (${entry.count} components)`
      : `${entry.actionLabel} for "${entry.title}"`;
    await log({ action, entity, entityId: groupId || thesisId, details: detail, performedById });
  };

  const existing = pendingMarksBatches.get(batchKey);
  if (existing) {
    existing.count += 1;
    existing.isUpdate = existing.isUpdate || isUpdate;
    existing.actionLabel = existing.isUpdate ? 'Updated marks' : 'Submitted marks';
    clearTimeout(existing.timer);
    existing.timer = setTimeout(() => flush(existing), 800);
  } else {
    const entry = {
      count: 1,
      isUpdate: !!isUpdate,
      title,
      actionLabel: isUpdate ? 'Updated marks' : 'Submitted marks',
      timer: null,
    };
    entry.timer = setTimeout(() => flush(entry), 800);
    pendingMarksBatches.set(batchKey, entry);
  }
};

module.exports = { log, logMarks };
