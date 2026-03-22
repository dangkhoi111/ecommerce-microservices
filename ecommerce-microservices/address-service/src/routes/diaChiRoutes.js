const express = require('express');
const router = express.Router();
const diaChiController = require('../controllers/diaChiController');

router.post('/', diaChiController.createDiaChi);
router.get('/khachhang/:maKH', diaChiController.getAllByKhachHang);
router.get('/:id', diaChiController.getDiaChi);
router.put('/:id', diaChiController.updateDiaChi);
router.delete('/:id', diaChiController.deleteDiaChi);

module.exports = router;
