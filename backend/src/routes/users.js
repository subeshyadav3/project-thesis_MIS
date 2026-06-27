const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('MAINTAINER'), userController.getUsers);
router.post('/', authenticate, authorize('MAINTAINER', 'COORDINATOR'), userController.createUser);
router.put('/:id', authenticate, authorize('MAINTAINER'), userController.updateUser);
router.delete('/:id', authenticate, authorize('MAINTAINER'), userController.deleteUser);
router.get('/role/:role', authenticate, authorize('MAINTAINER', 'COORDINATOR'), userController.getUsersByRole);

module.exports = router;
