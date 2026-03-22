const mongoose = require('mongoose');

const khuyenMaiSchema = new mongoose.Schema({
  tenKM: { type: String, required: true },  
  // Loại mã: 'seller' (seller tạo) hoặc 'admin' (admin tạo cho customer)
  loaiMa: { type: String, enum: ['seller', 'admin'], default: 'seller' },
  maUserBan: { type: mongoose.Schema.Types.ObjectId, ref: 'UserBan', default: null },  // Chỉ có khi loaiMa = 'seller'
  maDM: { type: mongoose.Schema.Types.ObjectId, ref: 'DanhMuc', default: null },  // Chỉ có khi loaiMa = 'admin'
  loaiGiamGia: { type: String, enum: ['phanTram', 'soTien'], required: true }, 
  giaTriGiam: { type: Number, required: true },  
  ngayBatDau: { type: Date, required: true },  
  ngayKetThuc: { type: Date, required: true },  
  donHangToiThieu: { type: Number, default: 0 },  
  ma: { type: String, required: true, unique: true },
}, {
  timestamps: true,  
});

module.exports = mongoose.model('KhuyenMai', khuyenMaiSchema);
