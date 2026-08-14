const express = require('express');
const router = express.Router();
const externalExaminerController = require('../controllers/externalExaminerController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/groups', authenticate, authorize('EXTERNAL_EXAMINER', 'SUPERVISOR', 'COORDINATOR'), externalExaminerController.getAssignedGroups);
router.get('/theses', authenticate, authorize('EXTERNAL_EXAMINER', 'SUPERVISOR', 'COORDINATOR'), externalExaminerController.getAssignedTheses);
router.post('/evaluation', authenticate, authorize('EXTERNAL_EXAMINER', 'SUPERVISOR', 'COORDINATOR'), externalExaminerController.submitEvaluation);

module.exports = router;