const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./services/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'sanpham',
    allowed_formats: ['jpg', 'png', 'jpeg','webp'],
  },
});

const upload = multer({ storage });

// Middleware bọc để log
const uploadMiddleware = (req, res, next) => {
  console.log('Upload middleware called');
  upload.single('hinhAnh')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
    console.log('Upload success, file info:', req.file);
    next();
  });
};

module.exports = uploadMiddleware;
