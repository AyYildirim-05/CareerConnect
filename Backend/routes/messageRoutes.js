const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All messaging routes require a valid JWT
router.use(authenticateToken);

router.get('/', MessageController.listConversations);
router.post('/', MessageController.startConversation);
router.get('/:id/messages', MessageController.getMessages);
router.post('/:id/messages', MessageController.sendMessage);

module.exports = router;
