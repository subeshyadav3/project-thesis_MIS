const express = require('express');
const router = express.Router();
const assignmentRequestController = require('../controllers/assignmentRequestController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('COORDINATOR'), assignmentRequestController.createRequest);
router.get('/', authenticate, authorize('COORDINATOR'), assignmentRequestController.getRequests);
router.put('/:id/approve', authenticate, authorize('COORDINATOR'), assignmentRequestController.approveRequest);
router.put('/:id/reject', authenticate, authorize('COORDINATOR'), assignmentRequestController.rejectRequest);

module.exports = router;
