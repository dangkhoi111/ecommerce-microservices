const mongoose = require('mongoose');  
const OrderSchema = new mongoose.Schema({
  NgayLap: { type: Date, default: Date.now },      
  TongTien: { type: Number, required: true },
  TrangThai: { type: String, default: 'Chờ xác nhận' },
  MaKH: { type: String, required: true },
  MaVC: { type: String, default: null },
  PhuongThucGiaoHang: { type: String, default: 'COD' },
  MaUserBan: String,
  // Mã giảm giá (customer nhập khi thanh toán)
  maKhuyenMai: { type: mongoose.Schema.Types.ObjectId, ref: 'KhuyenMai', default: null },
  soTienGiam: { type: Number, default: 0 }, // Số tiền được giảm từ mã khuyến mãi
   // Thông tin địa chỉ giao hàng snapshot
  hoTenNguoiNhan: { type: String, required: true },
  sdtNguoiNhan: { type: String, required: true },
  diaChiChiTiet: { type: String, required: true },
  tinhThanh: { type: String, required: true }
});

module.exports = mongoose.model("Order", OrderSchema);
