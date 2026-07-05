const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const log = async ({ action, entity, entityId, details, performedById }) => {
  try {
    await prisma.auditLog.create({
      data: { action, entity, entityId: entityId ? parseInt(entityId) : null, details: details ? String(details).slice(0, 500) : null, performedById: performedById ? parseInt(performedById) : null },
    });
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
};

module.exports = { log };
