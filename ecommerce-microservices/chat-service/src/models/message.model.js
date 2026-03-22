const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  maKH: { type: mongoose.Schema.Types.ObjectId, ref: 'KhachHang', required: true },
  maUserBan: { type: mongoose.Schema.Types.ObjectId, ref: 'UserBan', required: true },
  noiDung: { type: String, required: true },
  daXem: { type: Boolean, default: false },
  nguoiGui: { type: String, enum: ['customer', 'seller'],required: true  }
  
},{
  timestamps: true
});

module.exports = mongoose.model('TinNhan', MessageSchema);
