// gateway-service/src/routes/chat.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/chat.controller');

router.post('/send',   ctrl.sendMessage);
router.get('/history', ctrl.getHistory);

module.exports = router;
