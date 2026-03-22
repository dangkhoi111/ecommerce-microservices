// src/routes/conversation.routes.js
const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversation.controller');

router.post('/start', conversationController.startConversation);
router.get('/', conversationController.getUserConversations);
router.get('/nguoi-ban', conversationController.getConversationsByUserBan);

router.delete('/:id', conversationController.deleteConversation);
router.put('/last-message', conversationController.updateLastMessage);
module.exports = router;
