const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserBanSchema = new Schema({
  tenShop:   { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  sdt:       { type: String },
  diaChiChiTiet:    { type: String },
  tinhThanh:    { type: String },
  hinhAnh:{type:String},
  maKH:      { type: Schema.Types.ObjectId, ref: 'KhachHang', required: true }
}, { timestamps: true });

module.exports = mongoose.model('UserBan', UserBanSchema);