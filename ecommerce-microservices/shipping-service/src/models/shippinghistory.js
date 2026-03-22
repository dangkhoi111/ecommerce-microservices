const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const shippingHistorySchema = new Schema({
  
  MaOrder: { type: String, required: true },  // FK → Order
  MaVC: { type: Schema.Types.ObjectId, ref: 'vanchuyen', required: true }, // FK → ShippingOption
  TrangThai: {
    type: String,
    enum: ['Chờ giao', 'Đang giao', 'Đã giao', 'Trả hàng'],
    default: 'Chờ giao',
  },
  NgayCapNhat: { type: Date, default: Date.now },
  GhiChu: { type: String }
});

module.exports = mongoose.model('lichsugiaohang', shippingHistorySchema);
