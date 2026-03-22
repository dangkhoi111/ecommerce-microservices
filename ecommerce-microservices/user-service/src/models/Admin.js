const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  TenTK: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  MK: {
    type: String,
    required: true,
  },
  VaiTro: {
    type: String,
    required: true,
    default: 'admin',  // Có thể để mặc định 'admin'
  }
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);
