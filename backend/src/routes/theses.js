const express = require('express');
const router = express.Router();
const multer = require('multer');
const thesisController = require('../controllers/thesisController');
const { authenticate, authorize } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', authenticate, authorize('COORDINATOR', 'MAINTAINER'), thesisController.getTheses);
router.get('/:id', authenticate, authorize('COORDINATOR', 'MAINTAINER'), thesisController.getThesis);
router.post('/', authenticate, authorize('COORDINATOR', 'MAINTAINER'), thesisController.createThesis);
router.post('/upload', authenticate, authorize('COORDINATOR'), upload.single('file'), thesisController.uploadExcel);
router.put('/:id/supervisor', authenticate, authorize('COORDINATOR'), thesisController.assignSupervisor);
router.put('/:id/status', authenticate, authorize('COORDINATOR'), thesisController.updateThesisStatus);

module.exports = router;
