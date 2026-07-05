const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposalController');
const { authenticate } = require('../middleware/auth');

router.put('/:id/comment', authenticate, proposalController.updateComment);

module.exports = router;
