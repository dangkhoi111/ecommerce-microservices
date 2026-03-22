const express = require('express');
const router = express.Router();
const { createShippingHistory, getShippingOptions,getShippingById } = require('../controllers/shippingController');

// Lấy danh sách các đơn vị vận chuyển
router.get('/', getShippingOptions);

// Lấy thông tin vận chuyển theo ID
router.get('/:id', getShippingById);

// Tạo lịch sử giao hàng (Khi đặt hàng)
router.post('/shipping-history', async (req, res) => {
  const { MaOrder, MaVC, GhiChu } = req.body;
  try {
    const result = await createShippingHistory(MaOrder, MaVC, GhiChu);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi tạo lịch sử giao hàng." });
  }
});

module.exports = router;
