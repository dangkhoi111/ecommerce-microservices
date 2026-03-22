const mongoose = require('mongoose');
const versionProductSchema = new mongoose.Schema({
    mausac: { type: String , default:null },
    kichco: { type: String ,
        // set: v => v ? v.toUpperCase() : undefined,
        default: null
    },
    soluong: { type: Number, required: true, min: 0 },
    maSP: { type: mongoose.Schema.Types.ObjectId, ref: 'SanPham',required: true },
}, 
    
    {
    timestamps: true
  });
  
  module.exports = mongoose.model('phienbanSanpham', versionProductSchema);
  