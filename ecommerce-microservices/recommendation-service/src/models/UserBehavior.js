const mongoose = require('mongoose');

const userBehaviorSchema = new mongoose.Schema({
    maKH: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'KhachHang',
        required: false, // Cho phép null khi user chưa đăng nhập
        index: true,
        default: null
    },
    maSP: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SanPham',
        required: true,
        index: true
    },
    hanhDong: {
        type: String,
        enum: ['view', 'click', 'add_to_cart', 'purchase'],
        default: 'view',
        required: true
    },
    thoiGian: {
        type: Date,
        default: () => new Date(), // Sử dụng function để lấy thời gian hiện tại khi tạo document
        required: true,
        index: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    collection: 'user-behavior', // Chỉ định tên collection trong MongoDB Atlas
    strict: false, // Cho phép lưu các field không được định nghĩa trong schema
    _id: true
});

// Index để tối ưu query
userBehaviorSchema.index({ maKH: 1, thoiGian: -1 });
userBehaviorSchema.index({ maSP: 1, thoiGian: -1 });
userBehaviorSchema.index({ maKH: 1, maSP: 1 });
userBehaviorSchema.index({ 'metadata.category': 1 });
userBehaviorSchema.index({ 'metadata.giaGiam': 1 });

module.exports = mongoose.model('UserBehavior', userBehaviorSchema);

