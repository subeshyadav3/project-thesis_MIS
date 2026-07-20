const express = require('express');
const router = express.Router();
const multer = require('multer');
const thesisController = require('../controllers/thesisController');
const { authenticate, authorize } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', authenticate, authorize('COORDINATOR', 'MAINTAINER'), thesisController.getTheses);
router.get('/:id', authenticate, authorize('COORDINATOR', 'SUPERVISOR', 'EXTERNAL_EXAMINER', 'MAINTAINER'), thesisController.getThesis);
router.post('/', authenticate, authorize('COORDINATOR', 'MAINTAINER'), thesisController.createThesis);
router.post('/bulk-import', authenticate, authorize('COORDINATOR'), upload.single('file'), thesisController.bulkImportPreview);
router.post('/bulk-import/confirm', authenticate, authorize('COORDINATOR'), thesisController.bulkImportConfirm);
router.put('/:id', authenticate, authorize('COORDINATOR'), thesisController.updateThesis);
router.put('/:id/supervisor', authenticate, authorize('COORDINATOR'), thesisController.assignSupervisor);
router.put('/:id/status', authenticate, authorize('COORDINATOR'), thesisController.updateThesisStatus);
router.put('/:id/external-midterm', authenticate, authorize('COORDINATOR'), thesisController.assignMidTermExternal);
router.put('/:id/external-final', authenticate, authorize('COORDINATOR'), thesisController.assignFinalExternal);
router.post('/export', authenticate, authorize('COORDINATOR', 'MAINTAINER'), thesisController.exportTheses);
router.put('/:id/approve-cross-program', authenticate, authorize('COORDINATOR'), thesisController.approveCrossProgramThesis);
router.put('/:id/reject-cross-program', authenticate, authorize('COORDINATOR'), thesisController.rejectCrossProgramThesis);
router.delete('/:id', authenticate, authorize('COORDINATOR'), thesisController.deleteThesis);

module.exports = router;
