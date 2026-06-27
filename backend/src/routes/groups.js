const express = require('express');
const router = express.Router();
const multer = require('multer');
const groupController = require('../controllers/groupController');
const { authenticate, authorize } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', authenticate, authorize('COORDINATOR', 'MAINTAINER'), groupController.getGroups);
router.get('/:id', authenticate, authorize('COORDINATOR', 'MAINTAINER'), groupController.getGroup);
router.post('/', authenticate, authorize('COORDINATOR', 'MAINTAINER'), groupController.createGroup);
router.post('/upload', authenticate, authorize('COORDINATOR'), upload.single('file'), groupController.uploadExcel);
router.put('/:id/supervisor', authenticate, authorize('COORDINATOR'), groupController.assignSupervisor);
router.put('/:id/status', authenticate, authorize('COORDINATOR'), groupController.updateGroupStatus);
router.put('/components/:id', authenticate, authorize('COORDINATOR', 'SUPERVISOR'), groupController.updateEvaluationComponent);

module.exports = router;
