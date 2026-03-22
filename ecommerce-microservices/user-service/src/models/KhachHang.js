// models/khachHangModel.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const KhachHangSchema = new Schema({
  hoTen:   { type: String, required: true },
  email:   { type: String, required: true, unique: true },
  matKhau: { type: String, required: true },
  sdt:     { type: String },
  avatar:  { type: String }, // URL ảnh đại diện từ Cloudinary
  resetToken: { type: String },
  resetTokenExpires: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('KhachHang', KhachHangSchema);