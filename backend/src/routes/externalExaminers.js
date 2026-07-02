const express = require('express');
const router = express.Router();
const externalExaminerController = require('../controllers/externalExaminerController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/groups', authenticate, authorize('EXTERNAL_EXAMINER'), externalExaminerController.getAssignedGroups);
router.get('/theses', authenticate, authorize('EXTERNAL_EXAMINER'), externalExaminerController.getAssignedTheses);
router.post('/evaluation', authenticate, authorize('EXTERNAL_EXAMINER'), externalExaminerController.submitEvaluation);

module.exports = router;