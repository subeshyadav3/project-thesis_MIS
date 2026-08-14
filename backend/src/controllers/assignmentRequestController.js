const prisma = require('../utils/prisma');
const notifSvc = require('../services/notificationService');
const audit = require('../services/auditService');

/**
 * Assign a supervisor to a thesis.
 * Any coordinator can assign for any program within the department —
 * no approval flow. If the student belongs to a different program, the
 * student's coordinator is notified (notification only, no approval).
 */
exports.createRequest = async (req, res) => {
  try {
    const { thesisId, supervisorId } = req.body;
    if (!thesisId) {
      return res.status(400).json({ error: 'thesisId is required' });
    }

    const thesis = await prisma.thesis.findUnique({
      where: { id: parseInt(thesisId) },
      include: { student: { include: { program: true } } },
    });
    if (!thesis) return res.status(404).json({ error: 'Thesis not found' });

    const oldSupervisorId = thesis.supervisorId;
    const isRemoving = !supervisorId || supervisorId === 'NONE' || supervisorId === 'CLEAR' || isNaN(parseInt(supervisorId));

    if (isRemoving) {
      const updated = await prisma.thesis.update({
        where: { id: thesis.id },
        data: { supervisorId: null, supervisorAssignmentStatus: null },
      });

      if (oldSupervisorId) {
        try {
          const assignerName = `${req.user.firstName} ${req.user.lastName}`.trim() || 'Coordinator';
          await notifSvc.notify(oldSupervisorId, 'SUPERVISOR_REMOVED',
            `${assignerName} unassigned you as supervisor for thesis "${thesis.title}".`, `/theses/${thesis.id}`);
        } catch (e) { console.error('notify unassign error:', e.message); }
      }

      audit.log({ action: 'UNASSIGN_SUPERVISOR', entity: 'Thesis', entityId: thesis.id, details: `Supervisor unassigned from thesis ${thesisId}`, performedById: req.user.id });
      return res.json({ message: 'Supervisor removed successfully', thesis: updated });
    }

    const supId = parseInt(supervisorId);
    const supUser = await prisma.user.findUnique({ where: { id: supId }, select: { role: true } });
    const isCoordinatorSup = supUser?.role === 'COORDINATOR';
    // Assign — pending the supervisor's acceptance
    const updated = await prisma.thesis.update({
      where: { id: thesis.id },
      data: { supervisorId: supId, supervisorAssignmentStatus: 'PENDING' },
    });

    // Notify old supervisor if changed
    if (oldSupervisorId && oldSupervisorId !== supId) {
      try {
        const assignerName = `${req.user.firstName} ${req.user.lastName}`.trim() || 'Coordinator';
        await notifSvc.notify(oldSupervisorId, 'SUPERVISOR_REMOVED',
          `${assignerName} unassigned you as supervisor for thesis "${thesis.title}".`, `/theses/${thesis.id}`);
      } catch (e) { console.error('notify old supervisor error:', e.message); }
    }

    // Notify the supervisor of the pending assignment
    try {
      const assignerName = `${req.user.firstName} ${req.user.lastName}`.trim() || 'Coordinator';
      await notifSvc.notify(parseInt(supervisorId), 'SUPERVISOR_ASSIGNMENT',
        `${assignerName} assigned you as supervisor for "${thesis.title}" (Master Thesis) — pending your acceptance.`, `/theses/${thesis.id}`);
    } catch (e) { console.error('notify supervisor error:', e.message); }

    // Notify the student's program coordinator (if different from the requester)
    const studentProgram = thesis.student?.program;
    if (studentProgram?.coordinatorId && studentProgram.coordinatorId !== req.user.id) {
      const fromProgram = await prisma.program.findUnique({ where: { coordinatorId: req.user.id } });
      const supervisor = await prisma.user.findUnique({ where: { id: parseInt(supervisorId) } });
      const msg = `A supervisor has been assigned to your student ${thesis.student.firstName} ${thesis.student.lastName} (${studentProgram.code}) for thesis "${thesis.title}" by ${req.user.firstName} ${req.user.lastName}${fromProgram ? ` (${fromProgram.code} coordinator)` : ''}. Supervisor: ${supervisor ? supervisor.firstName + ' ' + supervisor.lastName : ''}.`;
      await notifSvc.notify(studentProgram.coordinatorId, 'CROSS_PROGRAM_ASSIGNED', msg, `/theses/${thesis.id}`);
    }

    audit.log({ action: 'ASSIGN_SUPERVISOR', entity: 'Thesis', entityId: thesis.id, details: `Supervisor ${supervisorId} assigned to thesis ${thesisId}`, performedById: req.user.id });

    res.json({ message: 'Supervisor assigned successfully', thesis: updated, crossProgram: false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};