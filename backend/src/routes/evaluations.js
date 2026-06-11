const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluationController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('SUPERVISOR'), evaluationController.submitEvaluation);
router.post('/feedback', authenticate, authorize('SUPERVISOR'), evaluationController.submitFeedback);
router.get('/group/:id', authenticate, evaluationController.getGroupEvaluations);
router.get('/thesis/:id', authenticate, evaluationController.getThesisEvaluations);

module.exports = router;
