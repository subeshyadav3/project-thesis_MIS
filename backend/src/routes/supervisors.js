const express = require('express');
const router = express.Router();
const supervisorController = require('../controllers/supervisorController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/groups', authenticate, authorize('SUPERVISOR', 'COORDINATOR'), supervisorController.getMyGroups);
router.get('/theses', authenticate, authorize('SUPERVISOR', 'COORDINATOR'), supervisorController.getMyTheses);
router.put('/theses/:id/accept-supervision', authenticate, authorize('SUPERVISOR', 'COORDINATOR'), supervisorController.acceptThesisSupervision);
router.put('/theses/:id/reject-supervision', authenticate, authorize('SUPERVISOR', 'COORDINATOR'), supervisorController.rejectThesisSupervision);
router.put('/groups/:id/accept-supervision', authenticate, authorize('SUPERVISOR', 'COORDINATOR'), supervisorController.acceptGroupSupervision);
router.put('/groups/:id/reject-supervision', authenticate, authorize('SUPERVISOR', 'COORDINATOR'), supervisorController.rejectGroupSupervision);
router.post('/recommendation', authenticate, authorize('SUPERVISOR', 'COORDINATOR'), supervisorController.issueRecommendation);
router.get('/recommendation/:id/pdf', authenticate, authorize('SUPERVISOR', 'STUDENT', 'COORDINATOR', 'MAINTAINER'), supervisorController.downloadRecommendation);
router.delete('/recommendation/:id', authenticate, authorize('SUPERVISOR', 'COORDINATOR', 'MAINTAINER'), supervisorController.deleteRecommendation);

module.exports = router;
