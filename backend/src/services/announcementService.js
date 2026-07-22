
const prisma = require('../utils/prisma');

async function resolveAudience({ type, degreeType, programIds, studentIds, departmentId, academicYearId, batch }) {
  const filter = { role: 'STUDENT', active: true, departmentId };

  if (studentIds?.length) {
    return prisma.user.findMany({ where: { ...filter, id: { in: studentIds.map(Number) } }, select: { id: true } });
  }

  if (degreeType) filter.degreeType = degreeType;
  if (programIds?.length) {
    filter.programId = { in: programIds.map(Number) };
  }

  // Filter by batch if provided — match students whose batch field or rollNumber starts with the batch
  if (batch?.trim()) {
    const batchStr = batch.trim();
    // Derive 3-digit short form (e.g., "2080" → "080") and 4-digit full form
    const shortBatch = batchStr.length === 4 && batchStr.startsWith('2') ? batchStr.slice(1) : null;
    filter.OR = [
      { batch: batchStr },
      { rollNumber: { startsWith: batchStr } },
    ];
    if (shortBatch) {
      filter.OR.push(
        { batch: shortBatch },
        { rollNumber: { startsWith: shortBatch } },
      );
    }
  }

  return prisma.user.findMany({ where: filter, select: { id: true } });
}

async function listEligibleAnnouncementsForStudent(user) {
  if (user.role !== 'STUDENT') return [];
  const now = new Date();
  const all = await prisma.announcement.findMany({
    where: {
      allowGroupFormation: true,
      departmentId: user.departmentId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: 'desc' },
  });
  return all.filter(a => {
    if (a.degreeType && a.degreeType !== user.degreeType) return false;
    if (a.programIds?.length && (!user.programId || !a.programIds.includes(user.programId))) return false;
    if (a.studentIds?.length && !a.studentIds.includes(user.id)) return false;
    if (a.type === 'MINOR' && user.degreeType !== 'BACHELOR') return false;
    if (a.type === 'MAJOR' && user.degreeType !== 'BACHELOR') return false;
    if (a.type === 'THESIS' && user.degreeType !== 'MASTER') return false;
    // Batch filter — only show announcements for the student's batch
    if (a.batch) {
      const userBatch = user.batch || user.rollNumber?.slice(0, 3);
      if (userBatch) {
        // Normalize both sides to 4-digit before comparing (handles "080"/"2080" matching)
        const n = (v) => /^\d{3}$/.test(v) ? `2${v}` : v;
        if (n(a.batch) !== n(userBatch)) return false;
      }
    }
    return true;
  });
}

async function isStudentAlreadyInAGroupAnnouncement(user, announcement) {
  if (user.role !== 'STUDENT') return false;
  const matchType = ['MINOR', 'MAJOR'].includes(announcement.type);
  if (matchType) {
    const member = await prisma.groupMember.findFirst({
      where: { studentId: user.id, group: { projectType: announcement.type, announcementId: announcement.id } },
    });
    return !!member;
  }
  const thesis = await prisma.thesis.findFirst({
    where: { studentId: user.id, announcementId: announcement.id, status: { in: ['PENDING', 'ACTIVE'] } },
  });
  return !!thesis;
}

module.exports = { resolveAudience, listEligibleAnnouncementsForStudent, isStudentAlreadyInAGroupAnnouncement };
