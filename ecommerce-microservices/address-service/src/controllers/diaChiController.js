const DiaChi = require('../models/DiaChi');

// Tạo địa chỉ mới
exports.createDiaChi = async (req, res) => {
  try {
    const diaChi = new DiaChi(req.body);
    if (diaChi.macDinh) {
      // Set các địa chỉ khác của cùng khách hàng về false
      await DiaChi.updateMany({ maKH: diaChi.maKH }, { macDinh: false });
    }
    const saved = await diaChi.save();
    res.status(201).json({
  success: true,
  message: 'Thêm địa chỉ thành công',
  diaChi: saved
});
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Lấy tất cả địa chỉ của một khách hàng
exports.getAllByKhachHang = async (req, res) => {
  try {
    const list = await DiaChi.find({ maKH: req.params.maKH });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy chi tiết 1 địa chỉ
exports.getDiaChi = async (req, res) => {
  try {
    const diaChi = await DiaChi.findById(req.params.id);
    if (!diaChi) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(diaChi);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Cập nhật địa chỉ
exports.updateDiaChi = async (req, res) => {
  try {
    if (req.body.macDinh) {
      await DiaChi.updateMany({ maKH: req.body.maKH }, { macDinh: false });
    }
    const updated = await DiaChi.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({updated,success:true});
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Xoá địa chỉ
exports.deleteDiaChi = async (req, res) => {
  try {
    await DiaChi.findByIdAndDelete(req.params.id);
    res.json({ message: 'Xoá thành công' ,success:true});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
