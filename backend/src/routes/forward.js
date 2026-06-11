const express = require('express');
const router = express.Router();
const forwardController = require('../controllers/forwardController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('COORDINATOR'), forwardController.forwardToExamDept);

module.exports = router;
