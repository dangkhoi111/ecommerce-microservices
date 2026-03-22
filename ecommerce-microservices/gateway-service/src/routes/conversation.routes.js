// gateway-service/src/routes/conversation.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/conversation.controller');

router.post('/start', ctrl.startConversation);
router.get('/',ctrl.getUserConversations);
router.get('/nguoi-ban',ctrl.getConversationsByUserBan);
router.delete('/:id',ctrl.deleteConversation);
// …nếu cần thêm PUT /last-message

module.exports = router;
