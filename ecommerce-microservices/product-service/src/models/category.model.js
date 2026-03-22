const { Schema, model } = require('mongoose');

const CategorySchema = new Schema({
  tenDM: { type: String, required: true, unique: true },
  hinhAnh: String
}, { timestamps: true });

module.exports = model('DanhMuc', CategorySchema);