const express = require('express');
const router = express.Router();
const assignmentRequestController = require('../controllers/assignmentRequestController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('COORDINATOR'), assignmentRequestController.createRequest);

module.exports = router;