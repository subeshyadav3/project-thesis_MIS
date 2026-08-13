const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/announcementController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/eligible', ctrl.listEligible);
router.get('/:id/form-responses', authorize('COORDINATOR', 'MAINTAINER'), ctrl.getFormResponses);
router.put('/responses/:responseId', authorize('COORDINATOR', 'MAINTAINER'), ctrl.updateFormResponse);
router.post('/responses/:responseId/finalize', authorize('COORDINATOR', 'MAINTAINER'), ctrl.finalizeFormResponse);
router.get('/', authorize('COORDINATOR', 'MAINTAINER'), ctrl.list);
router.get('/:id', authorize('COORDINATOR', 'MAINTAINER', 'STUDENT'), ctrl.get);
router.post('/', authorize('COORDINATOR', 'MAINTAINER'), ctrl.create);
router.put('/:id/deactivate', authorize('COORDINATOR', 'MAINTAINER'), ctrl.deactivate);
router.put('/:id', authorize('COORDINATOR', 'MAINTAINER'), ctrl.update);
router.delete('/:id', authorize('COORDINATOR', 'MAINTAINER'), ctrl.delete);

module.exports = router;
