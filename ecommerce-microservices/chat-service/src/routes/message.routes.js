const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');

router.post('/send', messageController.sendMessage);
router.get('/', messageController.getMessages);

module.exports = router;