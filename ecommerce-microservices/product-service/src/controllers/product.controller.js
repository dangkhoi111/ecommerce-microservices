const SanPham = require('../models/product.model');
const axios = require('axios');
const cloudinary =require('./../services/cloudinary');
const PhienBan = require('../models/versionProduct.model');
const fs = require('fs'); 
exports.getAll = async (req, res) => {
  try {
    if (!req.user.userBanId) {
      return res.status(403).json({ message: 'Bạn phải là người bán để xem sản phẩm' });
    }
    
    const items = await SanPham.find({maUserBan: req.user.userBanId})
      .populate('maDM', 'tenDM') // tên danh mục
      .populate('maKM', 'ma loaiGiamGia giaTriGiam') // khuyến mãi
      

    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách sản phẩm' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const item = await SanPham.findById(req.params.id)
      .populate('maDM', 'tenDM')
      .populate('maKM', 'ma loaiGiamGia giaTriGiam')
      
      

    if (!item) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
      
      const userId = item.maUserBan;
      const userResponse = await axios.get(`http://localhost:3002/api/user-ban/check/${userId}`);
      const userInfo = userResponse.data;

      const result = {
        ...item.toObject(),
        tenShop: userInfo.tenShop,
        tinhThanh :userInfo.tinhThanh,
        hinhAnhShop:userInfo.hinhAnh
      };

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi lấy sản phẩm' });
  }
};


exports.create = async (req, res) => {
  const { tenSP, giaGoc, soLuong, moTa, maDM, maUserBan, maKM, giaGiam } = req.body;
  const validMaKM = maKM === "null" ? null : maKM;

  const doc = {
    tenSP,
    giaGoc: Number(giaGoc),
    soLuong: Number(soLuong),
    moTa,
    maDM,
    maUserBan,
    maKM: validMaKM,
    giaGiam: Number(giaGiam),
  };

  try {
    if (req.file) {
      // Upload ảnh lên Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'sanpham',
      });

      // Lưu URL ảnh từ Cloudinary vào sản phẩm
      doc.hinhAnh = result.secure_url;

      // Chỉ xóa ảnh local nếu nó tồn tại
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path); // Xóa ảnh local sau khi upload
      }
    }

    const sp = await SanPham.create(doc);
    await PhienBan.create({
  mausac: null,
  kichco: null,
  soluong: sp.soLuong, // dùng số lượng từ sản phẩm chính
  maSP: sp._id
});
    res.status(201).json(sp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi khi tạo sản phẩm', error: err.message });
  }
};




exports.update = async (req, res) => {
  try {
    const { tenSP, giaGoc, soLuong, moTa, maDM, maUserBan, maKM, giaGiam } = req.body;

    // Kiểm tra maKM
    const validMaKM = maKM === "null" || maKM === "" ? null : maKM;

    const updateDoc = {
      tenSP,
      giaGoc: Number(giaGoc),
      soLuong: Number(soLuong),
      moTa,
      maDM,
      maUserBan,
      maKM: validMaKM,
      giaGiam: Number(giaGiam),
    };

    // Nếu có file hình ảnh mới
    if (req.file) {
      // Upload ảnh lên Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'sanpham',
      });

      // Gán link ảnh từ Cloudinary
      updateDoc.hinhAnh = result.secure_url;

      // Xóa file local sau khi upload thành công
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    const sp = await SanPham.findByIdAndUpdate(req.params.id, updateDoc, { new: true });

    if (!sp) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm để cập nhật' });
    }

    res.json(sp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi khi cập nhật sản phẩm', error: err.message });
  }
};



exports.delete = async (req, res) => {
  try {
    const sanpham = await SanPham.findByIdAndDelete(req.params.id);

    if (!sanpham) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm để xóa' });
    }

    return res.status(200).json({ message: 'Sản phẩm đã bị xóa' });
  } catch (err) {
    return res.status(500).json({ message: 'Lỗi khi xóa sản phẩm', error: err.message });
  }
};

exports.getSpDm = async (req,res) => {
  const danhMucId = req.params.id;
  const products = await SanPham.find({ maDM: danhMucId });
  res.json(products);
};

exports.getAllForAdmin = async (req, res) => {
  try {
    const sanphams = await SanPham.find().populate('maDM') // nếu cần
    res.status(200).json(sanphams);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách sản phẩm cho admin', error });
  }
};

exports.searchSanPham = async (req, res) => {
  try {
    const keyword = req.query.q || ''; // Lấy từ khóa tìm kiếm từ query param

    if (!keyword || keyword.trim() === '') {
      return res.json([]);
    }

    const trimmedKeyword = keyword.trim();
    console.log('🔍 Searching with keyword:', trimmedKeyword);

    // Tìm kiếm trong cả tên sản phẩm và mô tả (không phân biệt hoa thường)
    const searchConditions = {
      $or: [
        { tenSP: { $regex: trimmedKeyword, $options: 'i' } },
        { moTa: { $regex: trimmedKeyword, $options: 'i' } }
      ]
    };

    const items = await SanPham.find(searchConditions)
      .populate('maDM', 'tenDM')
      .populate('maKM', 'ma loaiGiamGia giaTriGiam');

    console.log('✅ Found', items.length, 'products for keyword:', trimmedKeyword);

    res.json(items);
  } catch (err) {
    console.error('❌ Search error:', err);
    res.status(500).json({ message: 'Lỗi khi tìm kiếm sản phẩm', error: err.message });
  }
};


exports.getAllPublic = async (req, res) => {
  try {
    const items = await SanPham.find()
      .populate('maDM', 'tenDM')
      .populate('maKM', 'ma loaiGiamGia giaTriGiam');

    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server khi lấy sản phẩm công khai' });
  }
};

exports.getSanPhamByShop = async (req, res) => {
  try {
    const maUserBan = req.params.maUserBan;
    const products = await SanPham.find({ maUserBan })
      .populate('maDM', 'tenDM')
      .populate('maKM', 'ma loaiGiamGia giaTriGiam');

    // Gọi API lấy thông tin shop
    const userResponse = await axios.get(`http://localhost:3002/api/user-ban/check/${maUserBan}`);
    const userInfo = userResponse.data;

    // Thêm thông tin shop vào mỗi sản phẩm
    const productsWithShopInfo = products.map(sp => ({
      ...sp.toObject(),
      tenShop: userInfo.tenShop,
      tinhThanh: userInfo.tinhThanh,
      hinhAnhShop: userInfo.hinhAnh
    }));

    res.json(productsWithShopInfo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi khi lấy sản phẩm theo shop', error: err.message });
  }
};