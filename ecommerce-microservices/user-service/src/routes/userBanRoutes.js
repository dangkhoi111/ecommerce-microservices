// src/routes/userBanRoutes.js
const express = require('express');
const router = express.Router();
const { register,check,checkSeller ,updateSeller} = require('../controllers/userBanController');
const { checkAuth } = require('../middleware/checkAuth');
const uploadMiddleware = require('../multerConfig');
// Khách hàng đã login xong → upgrade thành người bán
router.post('/register', checkAuth, uploadMiddleware, register);
router.get('/:id',check);
router.get('/check/:id',checkSeller);
router.put('/:id', checkAuth, uploadMiddleware, updateSeller);
module.exports = router;
