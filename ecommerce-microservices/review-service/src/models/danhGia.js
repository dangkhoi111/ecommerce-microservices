// models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  noiDung: { type: String },
  diemSo: { type: Number, min: 1, max: 5, required: true },
  ngayDG: { type: Date, default: Date.now },
  maKH: { type: String, required: true }, // MaKH (FK)
  maSP: { type: String, required: true }  // MaSP (FK)
});

module.exports = mongoose.model('Review', reviewSchema);
