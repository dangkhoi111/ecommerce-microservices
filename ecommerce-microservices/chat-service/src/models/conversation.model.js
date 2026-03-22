// src/models/conversation.model.js
const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  maKH: { type: mongoose.Schema.Types.ObjectId, required: true },
  maUserBan: { type: mongoose.Schema.Types.ObjectId, required: true },
  tinNhanCuoi: { type: String, default: '' },
  thoiGianNhanCuoi: { type: Date, default: Date.now },
  deletedByCustomer: { type: Boolean, default: false },
  deletedBySeller: { type: Boolean, default: false },
  deletedAtCustomer: { type: Date }, // Thời điểm customer xóa
  deletedAtSeller: { type: Date }, // Thời điểm seller xóa
  restoredAtCustomer: { type: Date }, // Thời điểm customer restore (nhận tin nhắn mới)
  restoredAtSeller: { type: Date } // Thời điểm seller restore (nhận tin nhắn mới)
}, {
  timestamps: true
});

module.exports = mongoose.model('CuocHoiThoai', ConversationSchema);
