const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/my-group', authenticate, authorize('STUDENT'), studentController.getMyGroup);
router.get('/my-thesis', authenticate, authorize('STUDENT'), studentController.getMyThesis);
router.get('/notifications', authenticate, authorize('STUDENT'), studentController.getMyNotifications);
router.put('/notifications/:id/read', authenticate, authorize('STUDENT'), studentController.markNotificationRead);

module.exports = router;
