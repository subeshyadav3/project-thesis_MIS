const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, departmentController.getDepartments);
router.post('/', authenticate, authorize('MAINTAINER'), departmentController.createDepartment);
router.put('/:id', authenticate, authorize('MAINTAINER'), departmentController.updateDepartment);
router.delete('/:id', authenticate, authorize('MAINTAINER'), departmentController.deleteDepartment);
router.get('/academic-years', authenticate, departmentController.getAcademicYears);
router.post('/academic-years', authenticate, authorize('MAINTAINER'), departmentController.createAcademicYear);

router.get('/programs', authenticate, departmentController.getPrograms);
router.post('/programs', authenticate, authorize('MAINTAINER'), departmentController.createProgram);
router.put('/programs/:id', authenticate, authorize('MAINTAINER'), departmentController.updateProgram);
router.delete('/programs/:id', authenticate, authorize('MAINTAINER'), departmentController.deleteProgram);

module.exports = router;
