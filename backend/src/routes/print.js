const express = require('express');
const router = express.Router();
const printController = require('../controllers/printController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/group/:id', authenticate, authorize('COORDINATOR', 'SUPERVISOR', 'EXTERNAL_EXAMINER'), printController.printGroupEvaluation);
router.get('/thesis/:id', authenticate, authorize('COORDINATOR', 'SUPERVISOR', 'EXTERNAL_EXAMINER'), printController.printThesisEvaluation);
router.get('/preview/group/:id', authenticate, authorize('COORDINATOR', 'SUPERVISOR', 'EXTERNAL_EXAMINER'), printController.previewGroupEvaluation);
router.get('/preview/thesis/:id', authenticate, authorize('COORDINATOR', 'SUPERVISOR', 'EXTERNAL_EXAMINER'), printController.previewThesisEvaluation);

module.exports = router;
