const express = require('express');
const router = express.Router();
const khuyenMaiController = require('../controllers/khuyenmai.controller');
const { checkAuth,checkRole } = require('../middleware/checkAuth');

// ========== PUBLIC ROUTES (phải đặt TRƯỚC routes có :id) ==========
// GET: Lấy danh sách mã giảm giá khả dụng cho khách hàng (public)
router.get('/khuyenmai/available', khuyenMaiController.getAvailableCoupons);

// POST: Validate mã giảm giá (public - không cần auth)
router.post('/khuyenmai/validate', khuyenMaiController.validateCoupon);

// ========== ADMIN ROUTES ==========
// POST: Admin tạo mã giảm giá cho customer
router.post('/khuyenmai/admin', checkAuth, checkRole(['admin']), khuyenMaiController.createAdmin);

// GET: Admin xem tất cả mã giảm giá (của admin)
router.get('/khuyenmai/admin', checkAuth, checkRole(['admin']), khuyenMaiController.getAllAdmin);

// PUT: Admin cập nhật mã giảm giá
router.put('/khuyenmai/admin/:id', checkAuth, checkRole(['admin']), khuyenMaiController.update);

// DELETE: Admin xóa mã giảm giá
router.delete('/khuyenmai/admin/:id', checkAuth, checkRole(['admin']), khuyenMaiController.delete);

// ========== SELLER ROUTES ==========
// POST: Tạo khuyến mãi (seller)
router.post('/khuyenmai', khuyenMaiController.create);

// GET: Lấy danh sách khuyến mãi (seller)
router.get('/khuyenmai/active',checkAuth,checkRole(['seller']), khuyenMaiController.getActive);
router.get('/khuyenmai',checkAuth,checkRole(['seller']), khuyenMaiController.getAll);

// Routes có :id phải đặt CUỐI CÙNG
router.put('/khuyenmai/:id',checkAuth,checkRole(['seller']), khuyenMaiController.update);  
router.get('/khuyenmai/:id',checkAuth,checkRole(['seller']), khuyenMaiController.getOne); 
router.delete('/khuyenmai/:id',checkAuth,checkRole(['seller']), khuyenMaiController.delete);

module.exports = router;
