const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');

// Tạo thông báo mới
router.post('/', notificationController.createNotification);

// Lấy thông báo theo người dùng
router.get('/:maNguoiDung/:loaiNguoiDung', notificationController.getNotificationsByUser);

// Đánh dấu đã đọc
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
