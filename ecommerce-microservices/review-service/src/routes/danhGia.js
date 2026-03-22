// routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/danhGia');

router.post('/', reviewController.createReview);
router.get('/sanpham/:maSP', reviewController.getReviewsByProduct);
router.get('/khachhang/:maKH', reviewController.getReviewsByCustomer);
router.put('/:maDG', reviewController.updateReview);
router.delete('/:maDG', reviewController.deleteReview);

module.exports = router;
