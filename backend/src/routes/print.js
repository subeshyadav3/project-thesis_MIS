const express = require('express');
const router = express.Router();
const printController = require('../controllers/printController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/group/:id', authenticate, authorize('COORDINATOR', 'SUPERVISOR'), printController.printGroupEvaluation);
router.get('/thesis/:id', authenticate, authorize('COORDINATOR', 'SUPERVISOR'), printController.printThesisEvaluation);

module.exports = router;
