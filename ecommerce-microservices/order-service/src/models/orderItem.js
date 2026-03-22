const mongoose = require('mongoose');  
const OrderItemSchema = new mongoose.Schema({
  TenSp: { type: String, required: true },   
  MauSac: { type: String, default:null },   
  MaOrder: { type: String, required: true },  
  SoLuong: { type: Number, required: true },  
  KichThuoc: { type: String, default:null }, 
  Tong: { type: Number, required: true },     
});
  
  module.exports = mongoose.model("OrderItem", OrderItemSchema);
  