const express = require('express');
const router  = express.Router();
const Version = require('../models/versionProduct.model');
const multer  = require('multer');
const upload  = multer();  // chỉ parse form-data, không file
const { checkAuth,checkRole } = require('../middleware/checkAuth');
// POST   /api/phienban
router.post('/phienban', checkAuth,checkRole(['seller']) , upload.none(), async (req, res) => {
  try {
    const { maSanPham, mausac, kichco, soluong } = req.body;
    if (!maSanPham) {
      return res.status(400).json({ error: 'Thiếu mã sản phẩm maSanPham' });
    }
    const v = await Version.create({
      maSP: maSanPham,
      mausac,
      kichco,
      soluong
    });
    res.status(201).json(v);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET    /api/phienban?maSanPham=...
router.get('/phienban', async (req, res) => {
  try {
    const maSanPham = req.query.maSanPham;
    if (!maSanPham) {
      return res.status(400).json({ error: 'Thiếu mã sản phẩm maSanPham' });
    }
    const list = await Version.find({ maSP: maSanPham });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET    /api/phienban/:id
router.get('/phienban/:id', async (req, res) => {
  try {
    const v = await Version.findById(req.params.id).populate('maSP');
    if (!v) return res.status(404).json({ error: 'Không tìm thấy phiên bản' });
    res.json(v);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT    /api/phienban/:id
router.put('/phienban/:id', checkAuth,checkRole(['seller']) ,upload.none(), async (req, res) => {
    try {
      const { maSanPham, mausac, kichco, soluong } = req.body;
      if (!maSanPham) {
        return res.status(400).json({ error: 'Thiếu mã sản phẩm maSanPham' });
      }
      const v = await Version.findOneAndUpdate(
        { _id: req.params.id, maSP: maSanPham },
        { mausac, kichco, soluong },
        { new: true , runValidators: true}
      );
      if (!v) return res.status(404).json({ error: 'Không tìm thấy phiên bản hoặc maSanPham không khớp' });
      res.json(v);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

// DELETE /api/phienban/:id
router.delete('/phienban/:id', checkAuth,checkRole (['seller']), async (req, res) => {
  try {
    const v = await Version.findByIdAndDelete(req.params.id);
    if (!v) return res.status(404).json({ error: 'Không tìm thấy phiên bản' });
    res.json({ message: 'Đã xoá thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
