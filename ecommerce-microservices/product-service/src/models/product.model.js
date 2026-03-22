const { Schema, model } = require('mongoose');

const ProductSchema = new Schema({
  tenSP:     { type: String,  required: true },
  moTa:      String,
  giaGoc:    { type: Number,  required: true },
  giaGiam:   { type: Number,  default: 0 },
  soLuong:   { type: Number,  default: 0 },
  hinhAnh:   String,
  maKM:      { type: Schema.Types.ObjectId, ref: 'KhuyenMai' , default: null}, 
  maDM:      { type: Schema.Types.ObjectId, ref: 'DanhMuc',  required: true },
  maUserBan: { type: Schema.Types.ObjectId, ref: 'UserBan',  required: true }
}, { timestamps: true });

module.exports = model('SanPham', ProductSchema);