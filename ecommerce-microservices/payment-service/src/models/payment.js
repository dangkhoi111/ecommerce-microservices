const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  maOrder: { type: String, required: true },
  method: { type: String, enum: ['COD'], default: 'COD' },
  status: { type: String, enum: ['Chưa thanh toán', 'Đã thanh toán'], default: 'Chưa thanh toán' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ThanhToan', PaymentSchema);
