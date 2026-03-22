const UserBan = require('../models/UserBann');
const KhachHang = require('./../models/KhachHang');
const cloudinary =require('./../services/cloudinary');
const fs = require('fs');
exports.register = async (req, res) => {
  console.log('User id from token:', req.user.id);
    console.log('Request body:', req.body);
   console.log('Request file:', req.file);
  try {
    const { tenShop, email, sdt, diaChiChiTiet, tinhThanh } = req.body;
    const maKH = req.user.id; // Lấy thông tin user từ JWT token

    // Kiểm tra xem khách hàng đã tồn tại chưa
    const customer = await KhachHang.findById(maKH);
    if (!customer) {
      return res.status(400).json({ success: false, message: 'Khách hàng không tồn tại!' });
    }

    // Tạo người bán
    const newSeller = new UserBan({
      tenShop,
      maKH,
      email,
      sdt,
      diaChiChiTiet,
      tinhThanh,
    });

    if (req.file) {
   newSeller.hinhAnh = req.file.path;
    }

    await newSeller.save();
    return res.status(201).json({
      success: true,
      message: 'Đăng ký người bán thành công!',
      seller: newSeller,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};


exports.check=async(req,res)=>{
  try {
    const customerId = req.params.id; 
   
    const userBan = await UserBan.findOne({ maKH : customerId });
    if (!userBan) {
      return res.status(404).json({ message: 'Người bán không tìm thấy!' });
    }
    res.status(200).json({
      message: 'Tìm thấy người bán!',
      userBanId: userBan._id, 
    });
  } catch (error) {
    console.error('Lỗi khi kiểm tra người bán:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi kiểm tra người bán!' });
  }
};

exports.checkSeller=async(req,res)=>{
  try {
    const sellerId = req.params.id;

    const userBan = await UserBan.findById(sellerId);
    if (!userBan) {
      return res.status(404).json({ message: 'Người bán không tồn tại!' });
    }

    res.status(200).json({
      message: 'Tìm thấy người bán!',
      tenShop: userBan.tenShop,
      tinhThanh: userBan.tinhThanh,
      diaChiChiTiet: userBan.diaChiChiTiet,
      hinhAnh: userBan.hinhAnh
    });
  } catch (error) {
    console.error('Lỗi khi kiểm tra người bán:', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi kiểm tra người bán!' });
  }
}

exports.updateSeller = async (req, res) => {
  try {
    const sellerId = req.params.id;
    const { tenShop, email, sdt, diaChiChiTiet, tinhThanh } = req.body;

    const userBan = await UserBan.findById(sellerId);
    if (!userBan) {
      return res.status(404).json({ success: false, message: 'Người bán không tồn tại!' });
    }

    userBan.tenShop = tenShop || userBan.tenShop;
    userBan.email = email || userBan.email;
    userBan.sdt = sdt || userBan.sdt;
    userBan.diaChiChiTiet = diaChiChiTiet || userBan.diaChiChiTiet;
    userBan.tinhThanh = tinhThanh || userBan.tinhThanh;

    // Xử lý upload ảnh shop logo nếu có file
    if (req.file) {
      try {
        // Upload ảnh lên Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'shop-logos',
          transformation: [
            { width: 400, height: 400, crop: 'fill' }
          ]
        });

        // Lưu URL ảnh từ Cloudinary
        userBan.hinhAnh = result.secure_url;

        // Xóa file local sau khi upload thành công
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        console.log('✅ Shop logo uploaded successfully:', result.secure_url);
      } catch (uploadError) {
        console.error('❌ Error uploading shop logo:', uploadError);
        // Nếu upload lỗi, vẫn tiếp tục cập nhật các thông tin khác
        // Có thể giữ nguyên ảnh cũ hoặc dùng req.file.path
        if (req.file && req.file.path) {
          userBan.hinhAnh = req.file.path;
        }
      }
    }

    await userBan.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin người bán thành công!',
      userBan
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật người bán:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật!' });
  }
};
