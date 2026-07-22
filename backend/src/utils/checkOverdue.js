
const prisma = require('./prisma');

/**
 * Check all announcements that have an expirationDate that has passed,
 * and mark their associated PENDING/ACTIVE groups and theses as OVERDUE.
 * Also checks announcements whose expiresAt has passed (deactivated).
 */
async function markOverdueItems() {
  const now = new Date();

  // Find announcements with expired expirationDate
  const expiredAnnouncements = await prisma.announcement.findMany({
    where: {
      expirationDate: { not: null, lte: now },
      allowGroupFormation: true,
    },
    select: { id: true },
  });

  const expiredIds = expiredAnnouncements.map(a => a.id);

  if (expiredIds.length === 0) return { groups: 0, theses: 0 };

  // Mark groups as OVERDUE
  const groupResult = await prisma.projectGroup.updateMany({
    where: {
      announcementId: { in: expiredIds },
      status: { in: ['PENDING', 'ACTIVE'] },
    },
    data: { status: 'OVERDUE' },
  });

  // Mark theses as OVERDUE
  const thesisResult = await prisma.thesis.updateMany({
    where: {
      announcementId: { in: expiredIds },
      status: { in: ['PENDING', 'ACTIVE'] },
    },
    data: { status: 'OVERDUE' },
  });

  return { groups: groupResult.count, theses: thesisResult.count };
}

/**
 * Mark items under a specific announcement as OVERDUE.
 * Called when an announcement is deactivated.
 */
async function markOverdueForAnnouncement(announcementId) {
  const now = new Date();

  const groupResult = await prisma.projectGroup.updateMany({
    where: {
      announcementId,
      status: { in: ['PENDING', 'ACTIVE'] },
    },
    data: { status: 'OVERDUE' },
  });

  const thesisResult = await prisma.thesis.updateMany({
    where: {
      announcementId,
      status: { in: ['PENDING', 'ACTIVE'] },
    },
    data: { status: 'OVERDUE' },
  });

  return { groups: groupResult.count, theses: thesisResult.count };
}

module.exports = { markOverdueItems, markOverdueForAnnouncement };
