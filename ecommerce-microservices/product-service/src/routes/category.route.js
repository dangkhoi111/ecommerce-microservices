// routes/category.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/category.controller');
const upload = require('./../multerConfig'); // Thêm middleware xử lý ảnh


router.get('/danhmucs', ctrl.getAll);
router.get('/danhmucs/:id', ctrl.getById);
router.post('/danhmucs', upload.single('hinhAnh'), ctrl.create);
router.put('/danhmucs/:id', upload.single('hinhAnh'), ctrl.update);
router.delete('/danhmucs/:id', ctrl.delete);

module.exports = router;
