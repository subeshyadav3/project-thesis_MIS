const express = require('express');
const router = express.Router();
const examinerAssignmentController = require('../controllers/examinerAssignmentController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/group', authenticate, authorize('COORDINATOR'), examinerAssignmentController.assignExaminerToGroup);
router.post('/thesis', authenticate, authorize('COORDINATOR'), examinerAssignmentController.assignExaminerToThesis);
router.get('/group/:id', authenticate, examinerAssignmentController.getAssignedExaminersForGroup);
router.get('/thesis/:id', authenticate, examinerAssignmentController.getAssignedExaminersForThesis);
router.delete('/:id', authenticate, authorize('COORDINATOR'), examinerAssignmentController.removeAssignment);

module.exports = router;