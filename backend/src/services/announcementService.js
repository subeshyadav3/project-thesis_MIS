const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resolveAudience({ type, degreeType, programIds, studentIds, departmentId, academicYearId }) {
  const filter = { role: 'STUDENT', active: true, departmentId };

  if (studentIds?.length) {
    return prisma.user.findMany({ where: { ...filter, id: { in: studentIds.map(Number) } }, select: { id: true } });
  }

  if (degreeType) filter.degreeType = degreeType;
  if (programIds?.length) {
    filter.programId = { in: programIds.map(Number) };
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
