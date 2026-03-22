const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  maNguoiDung: { type: mongoose.Schema.Types.ObjectId, required: true }, // MaKH hoặc MaUserBan
  loaiNguoiDung: { type: String, enum: ['customer', 'seller'], required: true }, // phân biệt loại người dùng
  tieuDe: { type: String, required: true },
  noiDung: { type: String, required: true },
  loai: { type: String, required: true },
  daDoc :{type:Boolean,default:false}
}, { timestamps: true });


module.exports = mongoose.model('ThongBao', notificationSchema);
