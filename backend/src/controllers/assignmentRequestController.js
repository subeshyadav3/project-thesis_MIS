
const prisma = require('../utils/prisma');
const notifSvc = require('../services/notificationService');
const audit = require('../services/auditService');

exports.createRequest = async (req, res) => {
  try {
    const { thesisId, supervisorId } = req.body;
    if (!thesisId || !supervisorId) {
      return res.status(400).json({ error: 'thesisId and supervisorId are required' });
    }

    // Get the thesis with student info
    const thesis = await prisma.thesis.findUnique({
      where: { id: parseInt(thesisId) },
      include: { student: true },
    });
    if (!thesis) return res.status(404).json({ error: 'Thesis not found' });

    // Get the requesting coordinator's program
    const fromProgram = await prisma.program.findUnique({ where: { coordinatorId: req.user.id } });
    if (!fromProgram) return res.status(400).json({ error: 'You are not assigned as a program coordinator' });

    // Find the student's program coordinator
    const studentProgram = await prisma.program.findUnique({ where: { id: thesis.student.programId } });
    if (!studentProgram || !studentProgram.coordinatorId) {
      return res.status(400).json({ error: 'Student\'s program has no coordinator assigned' });
    }

    // If same program, no cross-program request needed - assign directly
    if (studentProgram.coordinatorId === req.user.id) {
      // Direct assignment
      const updated = await prisma.thesis.update({
        where: { id: thesis.id },
        data: { supervisorId: parseInt(supervisorId), status: 'ACTIVE' },
      });
      return res.json({ message: 'Supervisor assigned directly', thesis: updated, crossProgram: false });
    }

    // Create cross-program request
    const request = await prisma.assignmentRequest.create({
      data: {
        thesisId: thesis.id,
        supervisorId: parseInt(supervisorId),
        fromCoordinatorId: req.user.id,
        toCoordinatorId: studentProgram.coordinatorId,
        status: 'PENDING',
      },
    });

    // Get the requester's info and supervisor info
    const fromUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    const supervisor = await prisma.user.findUnique({ where: { id: parseInt(supervisorId) } });

    // Notify the target coordinator with urgent message
    const msg = `[URGENT] ${fromUser.designation ? fromUser.designation + ' ' : ''}${fromUser.firstName} ${fromUser.lastName} (${fromProgram.code} coordinator) requests to assign supervisor ${supervisor.firstName} ${supervisor.lastName} to student ${thesis.student.firstName} ${thesis.student.lastName} (${studentProgram.code}) for thesis "${thesis.title}". Please approve or reject.`;

    const notification = await notifSvc.notify(studentProgram.coordinatorId, 'CROSS_PROGRAM_REQUEST', msg);

    // Also send email
    try {
      const emailService = require('../services/emailService');
      const toUser = await prisma.user.findUnique({ where: { id: studentProgram.coordinatorId } });
      if (toUser?.email) {
        await emailService.sendEmail({
          to: toUser.email,
          subject: `[URGENT] Cross-Program Assignment Request - ${thesis.title}`,
          title: 'Cross-Program Assignment Request',
          contentLines: [
            `Dear ${toUser.firstName} ${toUser.lastName},`,
            `You have received a cross-program assignment request:`,
            `<strong>From:</strong> ${fromUser.designation ? fromUser.designation + ' ' : ''}${fromUser.firstName} ${fromUser.lastName} (${fromProgram.code} coordinator)`,
            `<strong>Student:</strong> ${thesis.student.firstName} ${thesis.student.lastName} (${studentProgram.code})`,
            `<strong>Thesis:</strong> "${thesis.title}"`,
            `<strong>Requested Supervisor:</strong> ${supervisor.firstName} ${supervisor.lastName}`,
            `Please log in to the system to approve or reject this request.`,
          ],
        });
      }
    } catch (e) { console.error('cross-program email error:', e.message); }

    // Store notification ID on the request
    if (notification) {
      await prisma.assignmentRequest.update({
        where: { id: request.id },
        data: { notificationId: notification.id },
      });
    }

    audit.log({ action: 'CROSS_PROGRAM_REQUEST', entity: 'AssignmentRequest', entityId: request.id, details: `Cross-program request for thesis ${thesisId} from ${fromProgram.code} to ${studentProgram.code}`, performedById: req.user.id });

    res.status(201).json({ message: 'Cross-program request sent for approval', request, crossProgram: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const requests = await prisma.assignmentRequest.findMany({
      where: { toCoordinatorId: req.user.id },
      include: {
        thesis: { include: { student: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true, designation: true } },
        fromCoordinator: { select: { id: true, firstName: true, lastName: true, designation: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.approveRequest = async (req, res) => {
  try {
    const request = await prisma.assignmentRequest.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { thesis: true, fromCoordinator: true, supervisor: true },
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.toCoordinatorId !== req.user.id) return res.status(403).json({ error: 'Not your request to approve' });
    if (request.status !== 'PENDING') return res.status(400).json({ error: 'Request already ' + request.status });

    // Approve: assign supervisor to thesis
    await prisma.thesis.update({
      where: { id: request.thesisId },
      data: { supervisorId: request.supervisorId, status: 'ACTIVE' },
    });

    await prisma.assignmentRequest.update({
      where: { id: request.id },
      data: { status: 'APPROVED' },
    });

    // Notify the requesting coordinator
    const toUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    const msg = `Your request to assign supervisor ${request.supervisor.firstName} ${request.supervisor.lastName} to thesis "${request.thesis.title}" has been APPROVED by ${toUser.firstName} ${toUser.lastName}.`;
    await notifSvc.notify(request.fromCoordinatorId, 'CROSS_PROGRAM_APPROVED', msg);

    // Send email
    try {
      const emailService = require('../services/emailService');
      const fromUser = await prisma.user.findUnique({ where: { id: request.fromCoordinatorId } });
      if (fromUser?.email) {
        await emailService.sendEmail({
          to: fromUser.email,
          subject: `Cross-Program Request Approved - ${request.thesis.title}`,
          title: 'Assignment Request Approved',
          contentLines: [
            `Dear ${fromUser.firstName} ${fromUser.lastName},`,
            `Your cross-program assignment request has been APPROVED.`,
            `<strong>Thesis:</strong> "${request.thesis.title}"`,
            `<strong>Supervisor:</strong> ${request.supervisor.firstName} ${request.supervisor.lastName}`,
            `<strong>Approved by:</strong> ${toUser.firstName} ${toUser.lastName}`,
            `The supervisor has been assigned to the thesis. Please log in to view the updated status.`,
          ],
        });
      }
    } catch (e) { console.error('approve email error:', e.message); }

    audit.log({ action: 'CROSS_PROGRAM_APPROVED', entity: 'AssignmentRequest', entityId: request.id, details: `Approved cross-program request for thesis ${request.thesisId}`, performedById: req.user.id });

    res.json({ message: 'Request approved. Supervisor assigned to thesis.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const { rejectReason } = req.body;
    const request = await prisma.assignmentRequest.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { thesis: true, fromCoordinator: true, supervisor: true },
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.toCoordinatorId !== req.user.id) return res.status(403).json({ error: 'Not your request to reject' });
    if (request.status !== 'PENDING') return res.status(400).json({ error: 'Request already ' + request.status });

    // Reject: update thesis status to REJECTED
    await prisma.thesis.update({
      where: { id: request.thesisId },
      data: { status: 'PENDING' },
    });

    await prisma.assignmentRequest.update({
      where: { id: request.id },
      data: { status: 'REJECTED', rejectReason: rejectReason || 'No reason provided' },
    });

    // Notify the requesting coordinator
    const toUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    const reason = rejectReason || 'No specific reason provided';
    const msg = `Your request to assign supervisor ${request.supervisor.firstName} ${request.supervisor.lastName} to thesis "${request.thesis.title}" has been REJECTED by ${toUser.firstName} ${toUser.lastName}. Reason: ${reason}`;
    await notifSvc.notify(request.fromCoordinatorId, 'CROSS_PROGRAM_REJECTED', msg);

    // Send email
    try {
      const emailService = require('../services/emailService');
      const fromUser = await prisma.user.findUnique({ where: { id: request.fromCoordinatorId } });
      if (fromUser?.email) {
        await emailService.sendEmail({
          to: fromUser.email,
          subject: `Cross-Program Request Rejected - ${request.thesis.title}`,
          title: 'Assignment Request Rejected',
          contentLines: [
            `Dear ${fromUser.firstName} ${fromUser.lastName},`,
            `Your cross-program assignment request has been REJECTED.`,
            `<strong>Thesis:</strong> "${request.thesis.title}"`,
            `<strong>Supervisor:</strong> ${request.supervisor.firstName} ${request.supervisor.lastName}`,
            `<strong>Rejected by:</strong> ${toUser.firstName} ${toUser.lastName}`,
            `<strong>Reason:</strong> ${reason}`,
            `Please contact the coordinator for more details.`,
          ],
        });
      }
    } catch (e) { console.error('reject email error:', e.message); }

    audit.log({ action: 'CROSS_PROGRAM_REJECTED', entity: 'AssignmentRequest', entityId: request.id, details: `Rejected cross-program request for thesis ${request.thesisId}: ${reason}`, performedById: req.user.id });

    res.json({ message: 'Request rejected. Requester has been notified.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
