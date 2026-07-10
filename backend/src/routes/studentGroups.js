const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/studentGroupController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', authorize('STUDENT'), ctrl.listMyGroups);
router.get('/available', authorize('STUDENT'), ctrl.availableGroups);
router.get('/invitations', authorize('STUDENT'), ctrl.myInvitations);
router.get('/students-by-program', authorize('STUDENT'), ctrl.getStudentsByProgram);
router.get('/announcement/:announcementId', authorize('STUDENT'), ctrl.getMyGroupByAnnouncement);
router.get('/:id', authorize('STUDENT'), ctrl.getMyGroupById);
router.post('/', authorize('STUDENT'), ctrl.create);
router.post('/:id/invite', authorize('STUDENT'), ctrl.invite);
router.post('/:id/join', authorize('STUDENT'), ctrl.joinOpenGroup);
router.delete('/:id', authorize('STUDENT'), ctrl.deleteGroup);
router.get('/students-by-program', authorize('STUDENT'), ctrl.getStudentsByProgram);
router.put('/invitations/:id', authorize('STUDENT', 'SUPERVISOR', 'COORDINATOR'), ctrl.respondToInvitation);

module.exports = router;
