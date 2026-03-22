const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const KhachHang = require('./../models/KhachHang');
const UserBan = require('../models/UserBann');
const Admin=require('../models/Admin');
const axios = require("axios");
const { sendForgotPasswordEmail } = require('../services/emailService');
const cloudinary = require('./../services/cloudinary');
const fs = require('fs');

exports.register = async (req, res) => {
  try {
    const { hoTen, email, matKhau, sdt } = req.body;

    const existingUser = await KhachHang.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }

    const newUser = await KhachHang.create({ hoTen, email, matKhau, sdt });


 await axios.post("http://localhost:3003/api/cart", {
  maKH: newUser._id,
});

    res.status(201).json({ success: true, message: 'Đăng ký thành công', data: newUser });
  } catch (err) {
    console.error('Đăng ký lỗi:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await KhachHang.find();

    const result = await Promise.all(
      users.map(async (user) => {
        const isSeller = await UserBan.findOne({ maKH: user._id });
        return {
          id: user._id,
          hoTen: user.hoTen,
          email: user.email,
          matKhau:user.matKhau,
          role: isSeller ? 'seller' : 'customer',
          userBanId: isSeller ? isSeller._id : null,
           createdAt: user.createdAt
        };
      })
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Lỗi lấy danh sách khách hàng:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};



exports.adminLogin = async (req, res) => {
  try {
    const { TenTK, MK } = req.body;

    // Tìm admin theo TenTK
    const admin = await Admin.findOne({ TenTK });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Tài khoản admin không tồn tại' });
    }

    // So sánh mật khẩu (nên dùng bcrypt nếu mã hóa)
    const isMatch = admin.MK === MK; 
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Sai mật khẩu' });
    }

    // Tạo payload và token
    // Đảm bảo role luôn là 'admin' (lowercase)
    const adminRole = (admin.VaiTro || 'admin').toLowerCase();
    const payload = {
      id: admin._id,
      TenTK: admin.TenTK,
      role: adminRole === 'admin' ? 'admin' : 'admin' // Luôn set là 'admin'
    };
    
    console.log('🔐 Admin login - VaiTro:', admin.VaiTro, 'Role trong token:', payload.role);

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: admin._id,
        TenTK: admin.TenTK,
        role: admin.VaiTro || 'admin'
      }
    });
  } catch (error) {
    console.error('Lỗi đăng nhập admin:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.login = async (req, res) => {
    try {
      const { email, matKhau } = req.body;
  
      const user = await KhachHang.findOne({ email });
      if (!user) {
        return res.status(404).json({ success: false, message: 'Email không tồn tại' });
      }
  
      const isMatch = user.matKhau === matKhau; // Nếu hash mật khẩu thì dùng bcrypt.compare
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Sai mật khẩu' });
      }
  
      // Kiểm tra có phải Người Bán không
      const isSeller = await UserBan.findOne({ maKH: user._id });
  
      const payload = {
        id: user._id,
        hoTen : user.hoTen,
        email: user.email,
        role: isSeller ? 'seller' : 'customer' ,
        userBanId: isSeller ? isSeller._id : null
      };
  
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  
      res.status(200).json({
        success: true,
        token,
        user: 
        {
          id: user._id,
          hoTen : user.hoTen,
          email: user.email,
          role: isSeller ? 'seller' : 'customer',
          userBanId: isSeller ? isSeller._id : null
        }
        
      });
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  };

  exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await KhachHang.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    }

    // Kiểm tra có phải người bán không
    const isSeller = await UserBan.findOne({ maKH: user._id });

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        hoTen: user.hoTen,
        email: user.email,
        sdt: user.sdt || null,
        avatar: user.avatar || null, // Thêm avatar vào response
        role: isSeller ? 'seller' : 'customer',
        userBanId: isSeller ? isSeller._id : null
      }
    });
  } catch (error) {
    console.error('Lỗi lấy thông tin khách hàng:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Reset password endpoint
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    const user = await KhachHang.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Email không tồn tại' });
    }
    
    // Update password
    user.matKhau = newPassword;
    await user.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Đặt lại mật khẩu thành công',
      data: {
        email: user.email,
        hoTen: user.hoTen
      }
    });
  } catch (error) {
    console.error('Lỗi đặt lại mật khẩu:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Xóa người dùng
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
  
    // Tìm người dùng theo ID
    const user = await KhachHang.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    }

    // Xóa các bản ghi liên quan đến UserBan nếu có
    await UserBan.deleteOne({ maKH: user._id });

    // Xóa người dùng khỏi cơ sở dữ liệu
    await KhachHang.deleteOne({ _id: id });

    res.status(200).json({ success: true, message: 'Xóa người dùng thành công' });
  } catch (error) {
    console.error('Lỗi khi xóa người dùng:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Cập nhật thông tin người dùng
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { hoTen, email, matKhau, sdt } = req.body;

    // Tìm người dùng theo ID
    const user = await KhachHang.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    }

    // Cập nhật thông tin người dùng
    user.hoTen = hoTen || user.hoTen;
    user.email = email || user.email;
    user.matKhau = matKhau || user.matKhau;
    user.sdt = sdt || user.sdt;

    // Xử lý upload avatar nếu có file
    if (req.file) {
      try {
        // Upload ảnh lên Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'avatars',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' }
          ]
        });

        // Lưu URL ảnh từ Cloudinary
        user.avatar = result.secure_url;

        // Xóa file local sau khi upload thành công
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        console.log('✅ Avatar uploaded successfully:', result.secure_url);
      } catch (uploadError) {
        console.error('❌ Error uploading avatar:', uploadError);
        // Nếu upload lỗi, vẫn tiếp tục cập nhật các thông tin khác
      }
    }

    // Lưu lại thông tin đã cập nhật
    await user.save();

    res.status(200).json({ success: true, message: 'Cập nhật thông tin người dùng thành công', data: user });
  } catch (error) {
    console.error('Lỗi khi cập nhật thông tin người dùng:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Quên mật khẩu - gửi mã OTP
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Kiểm tra email có tồn tại không
    const user = await KhachHang.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Email không tồn tại trong hệ thống' 
      });
    }

    // Tạo mã OTP 6 số
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Lưu mã OTP vào user
    user.resetToken = otpCode;
    user.resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút
    await user.save();

    // Gửi email với mã OTP
    const emailResult = await sendForgotPasswordEmail(email, otpCode);
    
    if (!emailResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Không thể gửi email. Vui lòng thử lại sau.' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Mã xác thực đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.' 
    });

  } catch (error) {
    console.error('Lỗi quên mật khẩu:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Xác thực mã OTP và đặt lại mật khẩu
exports.verifyOtpAndResetPassword = async (req, res) => {
  try {
    const { email, otpCode, newPassword } = req.body;

    // Kiểm tra email có tồn tại không
    const user = await KhachHang.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Email không tồn tại trong hệ thống' 
      });
    }

    // Kiểm tra mã OTP
    if (!user.resetToken || user.resetToken !== otpCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mã xác thực không đúng' 
      });
    }

    // Kiểm tra thời hạn mã OTP
    if (!user.resetTokenExpires || new Date() > user.resetTokenExpires) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.' 
      });
    }

    // Cập nhật mật khẩu mới
    user.matKhau = newPassword;
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();

    res.status(200).json({ 
      success: true, 
      message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới.' 
    });

  } catch (error) {
    console.error('Lỗi xác thực OTP:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
