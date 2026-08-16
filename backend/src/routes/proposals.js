const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposalController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/pending', authenticate, authorize('COORDINATOR'), proposalController.listPendingLateProposals);
router.get('/:id', authenticate, proposalController.getProposal);
router.put('/:id/approve', authenticate, authorize('COORDINATOR'), proposalController.approveLateProposal);
router.put('/:id/reject', authenticate, authorize('COORDINATOR'), proposalController.rejectLateProposal);

module.exports = router;
