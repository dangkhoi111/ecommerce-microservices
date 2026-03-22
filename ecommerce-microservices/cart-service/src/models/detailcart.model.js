const mongoose = require("mongoose");

const detailCartItemSchema = new mongoose.Schema({
  maGH:{type:mongoose.Schema.Types.ObjectId , required:true , ref:"Cart"},
  soluong :{ type: Number, required: true },  
  maPB :{type:mongoose.Schema.Types.ObjectId , required:true },
},{
    timestamps: true
  });


module.exports = mongoose.model("DetailCart", detailCartItemSchema);
