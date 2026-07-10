const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.post('/summarize/:id', authorize('COORDINATOR', 'SUPERVISOR', 'EXTERNAL_EXAMINER'), aiController.summarize);
router.post('/evaluate/:id', authorize('COORDINATOR', 'SUPERVISOR', 'EXTERNAL_EXAMINER'), aiController.evaluate);
router.post('/ask/:id', authorize('COORDINATOR', 'SUPERVISOR', 'EXTERNAL_EXAMINER'), aiController.ask);

module.exports = router;
