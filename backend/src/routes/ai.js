const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const aiController = require('../controllers/aiController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
const nonStudentOnly = authorize('COORDINATOR', 'SUPERVISOR', 'EXTERNAL_EXAMINER');

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please slow down.' },
  keyGenerator: (req) => `ai:${req.user?.id || req.ip}`,
});
router.use(aiLimiter);

router.post('/summarize/:id', nonStudentOnly, aiController.summarize);
router.post('/evaluate/:id', nonStudentOnly, aiController.evaluate);
router.post('/ask/:id', nonStudentOnly, aiController.ask);

router.post('/embed/:id', nonStudentOnly, aiController.embed);
router.get('/candidates/:id', nonStudentOnly, aiController.listCandidates);
router.post('/similarity/:id', nonStudentOnly, aiController.similarity);

module.exports = router;
