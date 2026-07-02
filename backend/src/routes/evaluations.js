const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluationController');
const { authenticate, authorize } = require('../middleware/auth');

// Marks submission — role is checked against the component's evaluatorRole in the controller
router.post('/marks', authenticate, authorize('SUPERVISOR', 'COORDINATOR', 'EXTERNAL_EXAMINER'), evaluationController.submitComponentMarks);
router.post('/feedback', authenticate, authorize('SUPERVISOR'), evaluationController.submitFeedback);
router.get('/summary', authenticate, evaluationController.getMarksSummary);
router.get('/group/:id', authenticate, evaluationController.getGroupEvaluations);
router.get('/thesis/:id', authenticate, evaluationController.getThesisEvaluations);

module.exports = router;
