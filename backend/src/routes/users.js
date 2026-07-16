const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('MAINTAINER', 'COORDINATOR'), userController.getUsers);
router.post('/', authenticate, authorize('MAINTAINER', 'COORDINATOR'), userController.createUser);
router.put('/:id', authenticate, authorize('MAINTAINER', 'COORDINATOR'), userController.updateUser);
router.delete('/:id', authenticate, authorize('MAINTAINER', 'COORDINATOR'), userController.deleteUser);
router.get('/role/:role', authenticate, authorize('MAINTAINER', 'COORDINATOR'), userController.getUsersByRole);
router.put('/:id/toggle-active', authenticate, authorize('MAINTAINER', 'COORDINATOR'), userController.toggleActive);
router.get('/audit-logs', authenticate, authorize('MAINTAINER', 'COORDINATOR'), userController.getAuditLogs);
router.post('/bulk', authenticate, authorize('MAINTAINER', 'COORDINATOR'), userController.bulkCreateUsers);

module.exports = router;
