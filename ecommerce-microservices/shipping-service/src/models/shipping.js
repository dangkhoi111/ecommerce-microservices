const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const shippingOptionSchema = new Schema({
  
  TenDonVi: { type: String, required: true },
  PhiVC: { type: Number, required: true },
  ThoiGianDuKien: { type: String, required: true },
});

module.exports = mongoose.model('vanchuyen', shippingOptionSchema);