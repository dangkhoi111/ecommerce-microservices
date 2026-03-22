const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { checkAuth,checkRole } = require('../middleware/checkAuth');
const uploadAvatar = require('../multerAvatarConfig');
// Đăng ký khách hàng
router.post('/register', authController.register);

// Đăng nhập khách hàng (customer/seller đều dùng chung)
router.post('/login', authController.login);
router.post('/login/admin', authController.adminLogin);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp-reset', authController.verifyOtpAndResetPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/', checkAuth,checkRole(['admin']),authController.getAllUsers);
router.get('/:id', authController.getUserById);

router.put('/user/:id', uploadAvatar, authController.updateUser);
router.delete('/user/:id', authController.deleteUser);
module.exports = router;
