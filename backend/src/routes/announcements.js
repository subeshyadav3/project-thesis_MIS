const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/announcementController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/eligible', ctrl.listEligible);
router.get('/', authorize('COORDINATOR', 'MAINTAINER'), ctrl.list);
router.get('/:id', authorize('COORDINATOR', 'MAINTAINER', 'STUDENT'), ctrl.get);
router.post('/', authorize('COORDINATOR', 'MAINTAINER'), ctrl.create);
router.put('/:id/deactivate', authorize('COORDINATOR', 'MAINTAINER'), ctrl.deactivate);

module.exports = router;
