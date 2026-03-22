const ThongBao = require('../models/notification.model');

// Tạo thông báo
exports.createNotification = async (req, res) => {
  try {
    const { maNguoiDung, loaiNguoiDung, tieuDe, noiDung, loai } = req.body;
    const tb = await ThongBao.create({ maNguoiDung, loaiNguoiDung, tieuDe, noiDung, loai });
    res.status(201).json(tb);
  } catch (error) {
    res.status(500).json({ error: 'Tạo thông báo thất bại', details: error.message });
  }
};

// Lấy tất cả thông báo của người dùng
exports.getNotificationsByUser = async (req, res) => {
  try {
    const { maNguoiDung, loaiNguoiDung } = req.params;
    const notifications = await ThongBao.find({ maNguoiDung, loaiNguoiDung }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Lấy thông báo thất bại', details: error.message });
  }
};

// Đánh dấu đã đọc
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await ThongBao.findByIdAndUpdate(id, { $set: { daDoc: true } });
    res.json({ message: 'Đã đánh dấu đã đọc' });
  } catch (error) {
    res.status(500).json({ error: 'Cập nhật thất bại', details: error.message });
  }
};
