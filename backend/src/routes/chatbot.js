const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const chatbotController = require('../controllers/chatbotController');
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
  keyGenerator: (req) => `ai:${req.user?.id || 'anon'}`,
});
router.use(aiLimiter);

// ──New ai_chatbot service endpoints (analysis pipeline + RAG chat)──────────
router.post('/chatbot/status/:id', nonStudentOnly, chatbotController.getStatus);
router.post('/chatbot/analysis/:id', nonStudentOnly, chatbotController.getAnalysis);

// ──Re-runs analysis (e.g. when document type changes)─────────────────────────
router.post('/chatbot/reanalyze/:id', nonStudentOnly, chatbotController.reanalyze);

// ──RAG chat (streaming + non-streaming)───────────────────────────────────────
router.post('/chatbot/chat/:id', nonStudentOnly, chatbotController.chat);
router.post('/chatbot/chat/:id/stream', nonStudentOnly, chatbotController.chatStream);

// ──Embeddings / summarize / evaluate (delegated to ai_chatbot service) ───────
// Kept here so the existing AiAssistantModal keeps working without changes.
router.post('/embed/:id', nonStudentOnly, aiController.embed);
router.post('/summarize/:id', nonStudentOnly, aiController.summarize);
router.post('/evaluate/:id', nonStudentOnly, aiController.evaluate);
router.post('/ask/:id', nonStudentOnly, aiController.ask);
router.get('/candidates/:id', nonStudentOnly, aiController.listCandidates);
router.post('/similarity/:id', nonStudentOnly, aiController.similarity);

module.exports = router;
