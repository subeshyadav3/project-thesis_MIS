const prisma = require('../utils/prisma');

const ENGAGED_STATUSES = ['PENDING', 'ACTIVE', 'OVERDUE'];

async function getEngagement(studentId) {
  const [thesis, membership] = await Promise.all([
    prisma.thesis.findFirst({
      where: { studentId, status: { in: ENGAGED_STATUSES } },
      select: { id: true, title: true, status: true },
    }),
    prisma.groupMember.findFirst({
      where: { studentId, group: { status: { in: ENGAGED_STATUSES } } },
      select: { id: true, group: { select: { id: true, projectTitle: true, status: true } } },
    }),
  ]);
  if (thesis) return { engaged: true, type: 'thesis', id: thesis.id, title: thesis.title, status: thesis.status };
  if (membership) return { engaged: true, type: 'group', id: membership.group.id, title: membership.group.projectTitle, status: membership.group.status };
  return { engaged: false };
}

async function assertNoEngagement(studentId) {
  const result = await getEngagement(studentId);
  if (result.engaged) {
    const err = new Error(
      `Student is already engaged in ${result.type === 'thesis' ? 'a thesis' : 'a project'} ` +
      `(${result.status}): "${result.title}". A student cannot be part of two projects.`
    );
    err.statusCode = 409;
    err.engagement = result;
    throw err;
  }
  return result;
}

module.exports = { getEngagement, assertNoEngagement };