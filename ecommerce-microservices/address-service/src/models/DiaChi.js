const mongoose = require('mongoose');

const diaChiSchema = new mongoose.Schema({
  maKH: {type: mongoose.Schema.Types.ObjectId,required: true},
  hoTenNguoiNhan: { type: String, required: true},
  sdtNguoiNhan: { type: String,required: true},
  diaChiChiTiet: { type: String,required: true},
  tinhThanh: {  type: String,required: true},
  macDinh: { type: Boolean,default: false}
}, {
  timestamps: true
});

module.exports = mongoose.model('DiaChi', diaChiSchema);
