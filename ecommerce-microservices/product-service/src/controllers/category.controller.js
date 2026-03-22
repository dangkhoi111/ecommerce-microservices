// controllers/category.controller.js
const DanhMuc = require('../models/category.model');
const cloudinary = require('../services/cloudinary');
const fs = require('fs');

// Lấy tất cả danh mục
exports.getAll = async (req, res) => {
  try {
    const list = await DanhMuc.find();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy danh mục' });
  }
};
// Lấy danh mục theo ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await DanhMuc.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Danh mục không tồn tại' });
    }
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi lấy danh mục' });
  }
};

// Tạo mới danh mục
exports.create = async (req, res) => {
  try {
    const { tenDM } = req.body;
    let hinhAnh = '';

    // Kiểm tra nếu có ảnh thì lưu lên Cloudinary
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'danhmuc',
      });
      hinhAnh = result.secure_url; // Lưu URL ảnh từ Cloudinary

      // Xóa ảnh local nếu nó tồn tại
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    // Tạo mới danh mục
    const newCategory = await DanhMuc.create({
      tenDM,
      hinhAnh,
    });

    res.status(201).json(newCategory);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi tạo danh mục' });
  }
};


// Cập nhật danh mục
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenDM } = req.body;
    let hinhAnh = '';

    // Nếu có ảnh mới, upload lên Cloudinary
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'danhmuc',
      });
      hinhAnh = result.secure_url;

      // Xóa ảnh local nếu nó tồn tại
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    // Cập nhật danh mục
    const updatedCategory = await DanhMuc.findByIdAndUpdate(
      id,
      { tenDM, hinhAnh },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: 'Danh mục không tìm thấy' });
    }

    res.json(updatedCategory);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi cập nhật danh mục' });
  }
};

// Xóa danh mục
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCategory = await DanhMuc.findByIdAndDelete(id);
    if (!deletedCategory) {
      return res.status(404).json({ message: 'Danh mục không tìm thấy' });
    }

    res.json({ message: 'Danh mục đã được xóa' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi xóa danh mục' });
  }
};
