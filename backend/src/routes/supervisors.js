const express = require('express');
const router = express.Router();
const supervisorController = require('../controllers/supervisorController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/groups', authenticate, authorize('SUPERVISOR'), supervisorController.getMyGroups);
router.get('/theses', authenticate, authorize('SUPERVISOR'), supervisorController.getMyTheses);
router.post('/recommendation', authenticate, authorize('SUPERVISOR'), supervisorController.issueRecommendation);

module.exports = router;
