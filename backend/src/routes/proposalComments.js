const express = require('express');
const router = express.Router();
const proposalCommentController = require('../controllers/proposalCommentController');
const { authenticate, authorize } = require('../middleware/auth');

// Comment authors need to be supervisor, coordinator, or external
const commentAuth = authenticate;
const commentRole = authorize('SUPERVISOR', 'COORDINATOR', 'EXTERNAL_EXAMINER', 'MAINTAINER');

router.get('/:proposalId/comments', authenticate, proposalCommentController.listComments);
router.post('/:proposalId/comments', commentAuth, commentRole, proposalCommentController.createComment);
router.put('/:proposalId/comments/:id', commentAuth, commentRole, proposalCommentController.updateComment);
router.delete('/:proposalId/comments/:id', commentAuth, commentRole, proposalCommentController.deleteComment);

module.exports = router;
