const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  maKH:{type:mongoose.Schema.Types.ObjectId , required:true , ref:"KhachHang"},
},{
  timestamps: true
});


module.exports = mongoose.model("Cart", cartItemSchema);
