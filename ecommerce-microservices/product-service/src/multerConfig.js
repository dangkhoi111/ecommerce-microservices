const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./services/cloudinary'); // bạn sẽ tạo file này bên dưới

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'sanpham', // tên thư mục trên Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg','webp'], // định dạng ảnh cho phép
  }
});

const upload = multer({ storage });

module.exports = upload;
