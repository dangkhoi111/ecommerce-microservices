const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./services/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'avatars', // Folder riêng cho avatar người dùng
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' } // Tự động crop ảnh vuông 400x400
    ]
  },
});

const upload = multer({ storage });

// Middleware để upload avatar
const uploadAvatarMiddleware = (req, res, next) => {
  console.log('Upload avatar middleware called');
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      console.error('Upload avatar error:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
    console.log('Upload avatar success, file info:', req.file);
    next();
  });
};

module.exports = uploadAvatarMiddleware;

