const KhuyenMai = require('./../models/sale.model');

// Tạo khuyến mãi
exports.create = async (req, res) => {
  try {
    const newKM = await KhuyenMai.create(req.body);
    res.status(201).json(newKM);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Lấy tất cả khuyến mãi đã phân loại và định dạng sẵn
exports.getAll = async (req, res) => {
  try {
    if (!req.user.userBanId) {
      return res.status(403).json({ message: 'Bạn phải là người bán để xem ma giam gia' });
    }

    const all = await KhuyenMai.find({maUserBan: req.user.userBanId}).lean();
    const today = new Date();

    const active = [];
    const expired = [];

    all.forEach(km => {
      // Phân loại
      if (new Date(km.ngayKetThuc) >= today) active.push(km);
      else expired.push(km);
    });

    // Định dạng trường để frontend chỉ render
    const formatDate = d => new Date(d).toLocaleDateString('vi-VN');
    const formatCurrency = v => Number(v).toLocaleString('vi-VN') + ' VNĐ';

    const transform = km => ({
      id: km._id,
      maUserBan: km.maUserBan,
      tenKM: km.tenKM,
      ma: km.ma,
      displayDiscount: km.loaiGiamGia === 'phanTram'
        ? `Giảm ${km.giaTriGiam}%`
        : `Giảm ${formatCurrency(km.giaTriGiam)}`,
      period: `${formatDate(km.ngayBatDau)} – ${formatDate(km.ngayKetThuc)}`,
      donHangToiThieu: km.donHangToiThieu ? formatCurrency(km.donHangToiThieu) : '0 VNĐ'
    });

    res.json({
      active: active.map(transform),
      expired: expired.map(transform)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Lấy chi tiết khuyến mãi theo ID
exports.getOne = async (req, res) => { // <-- Thêm controller này
  try {
    const km = await KhuyenMai.findById(req.params.id);
    if (!km) return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
    res.json(km);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cập nhật khuyến mãi
exports.update = async (req, res) => {
  try {
    const updated = await KhuyenMai.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Xoá khuyến mãi
exports.delete = async (req, res) => {
  try {
    const deleted = await KhuyenMai.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
    res.json({ message: 'Đã xoá khuyến mãi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lấy khuyến mãi đang hoạt động
exports.getActive = async (req, res) => {
  try {
    const maUserBan = req.user?.userBanId || req.query.maUserBan;
    if (!maUserBan) {
      return res.status(403).json({ message: 'Bạn phải là người bán để xem ma giam gia' });
    }

    const all = await KhuyenMai.find({ maUserBan: maUserBan }).lean();
    const today = new Date();

    // Lọc các khuyến mãi còn hiệu lực
    const active = all.filter(km => new Date(km.ngayKetThuc) >= today);

    // Định dạng các khuyến mãi
    const formatDate = d => new Date(d).toLocaleDateString('vi-VN');
    const formatCurrency = v => Number(v).toLocaleString('vi-VN') + ' VNĐ';

    const transform = km => ({
      _id: km._id,  // Sử dụng _id thay vì id
      maUserBan: km.maUserBan,
      tenKM: km.tenKM,
      ma: km.ma,
      loaiGiamGia: km.loaiGiamGia,
      giaTriGiam: km.giaTriGiam,
      displayDiscount: km.loaiGiamGia === 'phanTram'
        ? `Giảm ${km.giaTriGiam}%`
        : `Giảm ${formatCurrency(km.giaTriGiam)}`,
      period: `${formatDate(km.ngayBatDau)} – ${formatDate(km.ngayKetThuc)}`,
      donHangToiThieu: km.donHangToiThieu ? formatCurrency(km.donHangToiThieu) : '0 VNĐ'
    });

    // Trả dữ liệu dưới dạng JSON
    res.json(active.map(transform));

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// ========== ADMIN CONTROLLERS ==========

// Admin tạo mã giảm giá cho customer
exports.createAdmin = async (req, res) => {
  try {
    const { tenKM, maDM, loaiGiamGia, giaTriGiam, ngayBatDau, ngayKetThuc, donHangToiThieu, ma } = req.body;
    
    // Validate
    if (!tenKM || !maDM || !loaiGiamGia || !giaTriGiam || !ngayBatDau || !ngayKetThuc || !ma) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
    }

    const newKM = await KhuyenMai.create({
      tenKM,
      loaiMa: 'admin',
      maDM,
      loaiGiamGia,
      giaTriGiam: Number(giaTriGiam),
      ngayBatDau: new Date(ngayBatDau),
      ngayKetThuc: new Date(ngayKetThuc),
      donHangToiThieu: Number(donHangToiThieu) || 0,
      ma: ma.toUpperCase().trim()
    });

    res.status(201).json(newKM);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Mã giảm giá đã tồn tại' });
    }
    res.status(400).json({ error: error.message });
  }
};

// Admin xem tất cả mã giảm giá (của admin)
exports.getAllAdmin = async (req, res) => {
  try {
    console.log('🔍 getAllAdmin - Tìm mã giảm giá loại admin...');
    
    // Chỉ lấy mã có loaiMa = 'admin' (mã do admin tạo cho customer)
    // Không lấy mã của seller (có maUserBan)
    const all = await KhuyenMai.find({ 
      loaiMa: 'admin'
    })
      .populate('maDM', 'tenDM')
      .lean();
    
    console.log(`📊 Tìm thấy ${all.length} mã giảm giá`);
    
    const today = new Date();
    const active = [];
    const expired = [];

    all.forEach(km => {
      const ngayKetThuc = new Date(km.ngayKetThuc);
      if (ngayKetThuc >= today) {
        active.push(km);
      } else {
        expired.push(km);
      }
    });
    
    console.log(`✅ ${active.length} mã đang hoạt động, ${expired.length} mã đã hết hạn`);

    const formatDate = d => new Date(d).toLocaleDateString('vi-VN');
    const formatCurrency = v => Number(v).toLocaleString('vi-VN') + ' VNĐ';

    const transform = km => ({
      _id: km._id,
      tenKM: km.tenKM,
      ma: km.ma,
      maDM: km.maDM ? {
        _id: km.maDM._id,
        tenDM: km.maDM.tenDM
      } : null,
      loaiGiamGia: km.loaiGiamGia,
      giaTriGiam: km.giaTriGiam,
      displayDiscount: km.loaiGiamGia === 'phanTram'
        ? `Giảm ${km.giaTriGiam}%`
        : `Giảm ${formatCurrency(km.giaTriGiam)}`,
      period: `${formatDate(km.ngayBatDau)} – ${formatDate(km.ngayKetThuc)}`,
      donHangToiThieu: km.donHangToiThieu ? formatCurrency(km.donHangToiThieu) : '0 VNĐ',
      ngayBatDau: km.ngayBatDau,
      ngayKetThuc: km.ngayKetThuc
    });

    const result = {
      active: active.map(transform),
      expired: expired.map(transform)
    };
    
    console.log('📤 Trả về kết quả:', {
      activeCount: result.active.length,
      expiredCount: result.expired.length
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Lỗi getAllAdmin:', error);
    res.status(500).json({ error: error.message });
  }
};

// ========== PUBLIC API - CHO CUSTOMER ==========

// Lấy danh sách mã giảm giá khả dụng cho khách hàng (public)
exports.getAvailableCoupons = async (req, res) => {
  try {
    const today = new Date();
    
    // Lấy tất cả mã admin còn hiệu lực
    const coupons = await KhuyenMai.find({
      loaiMa: 'admin',
      ngayBatDau: { $lte: today },
      ngayKetThuc: { $gte: today }
    })
      .populate('maDM', 'tenDM')
      .lean();

    const formatCurrency = v => Number(v).toLocaleString('vi-VN') + '₫';
    const formatDate = d => new Date(d).toLocaleDateString('vi-VN');

    const result = coupons.map(km => ({
      _id: km._id,
      ma: km.ma,
      tenKM: km.tenKM,
      loaiGiamGia: km.loaiGiamGia,
      giaTriGiam: km.giaTriGiam,
      displayDiscount: km.loaiGiamGia === 'phanTram'
        ? `Giảm ${km.giaTriGiam}%`
        : `Giảm ${formatCurrency(km.giaTriGiam)}`,
      danhMuc: km.maDM ? {
        _id: km.maDM._id,
        tenDM: km.maDM.tenDM
      } : null,
      donHangToiThieu: km.donHangToiThieu || 0,
      donHangToiThieuDisplay: km.donHangToiThieu ? formatCurrency(km.donHangToiThieu) : '0₫',
      ngayKetThuc: formatDate(km.ngayKetThuc)
    }));

    res.json(result);
  } catch (error) {
    console.error('Lỗi getAvailableCoupons:', error);
    res.status(500).json({ error: error.message });
  }
};

// Validate mã giảm giá cho customer (public API)
exports.validateCoupon = async (req, res) => {
  try {
    const { ma, tongTienGioHang, danhSachSanPham } = req.body;

    if (!ma || !tongTienGioHang) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã và tổng tiền giỏ hàng'
      });
    }

    // Tìm mã giảm giá (chỉ mã của admin)
    const khuyenMai = await KhuyenMai.findOne({ 
      ma: ma.toUpperCase().trim(),
      loaiMa: 'admin'
    }).populate('maDM', 'tenDM');

    if (!khuyenMai) {
      return res.json({
        success: false,
        message: 'Mã giảm giá không tồn tại'
      });
    }

    // Kiểm tra ngày hiệu lực
    const today = new Date();
    const ngayBatDau = new Date(khuyenMai.ngayBatDau);
    const ngayKetThuc = new Date(khuyenMai.ngayKetThuc);

    if (today < ngayBatDau) {
      return res.json({
        success: false,
        message: 'Mã giảm giá chưa có hiệu lực'
      });
    }

    if (today > ngayKetThuc) {
      return res.json({
        success: false,
        message: 'Mã giảm giá đã hết hạn'
      });
    }

    // Kiểm tra đơn hàng tối thiểu
    if (tongTienGioHang < khuyenMai.donHangToiThieu) {
      return res.json({
        success: false,
        message: `Đơn hàng tối thiểu ${khuyenMai.donHangToiThieu.toLocaleString('vi-VN')}₫ để sử dụng mã này`
      });
    }

    // Kiểm tra danh mục sản phẩm và tính tiền sản phẩm hợp lệ
    let tongTienHopLe = tongTienGioHang; // Mặc định là toàn bộ nếu không giới hạn danh mục
    
    if (khuyenMai.maDM && danhSachSanPham && danhSachSanPham.length > 0) {
      const SanPham = require('../models/product.model');
      tongTienHopLe = 0; // Reset, chỉ tính sản phẩm thuộc danh mục
      
      const couponCategoryId = khuyenMai.maDM._id ? khuyenMai.maDM._id.toString() : khuyenMai.maDM.toString();
      console.log('🔍 Kiểm tra danh mục mã giảm giá:', couponCategoryId);
      console.log('📋 Danh sách sản phẩm nhận được:', danhSachSanPham);

      for (const sp of danhSachSanPham) {
        const productId = sp.maSP || sp.productId;
        const soLuong = sp.soLuong || sp.quantity || 1;
        const giaSP = sp.gia || sp.price || 0;
        
        if (!productId) {
          console.log('⚠️ Không tìm thấy productId trong:', sp);
          continue;
        }

        try {
          // Lấy sản phẩm trực tiếp từ database
          const product = await SanPham.findById(productId).lean();
          
          if (product && product.maDM) {
            const productCategoryId = product.maDM._id ? product.maDM._id.toString() : product.maDM.toString();
            console.log(`📦 Sản phẩm ${product.tenSP}: danh mục ${productCategoryId}, giá: ${product.giaGiam || product.giaGoc}`);
            
            if (productCategoryId === couponCategoryId) {
              // Sản phẩm thuộc danh mục → tính vào tổng hợp lệ
              const giaThucTe = giaSP || product.giaGiam || product.giaGoc || 0;
              tongTienHopLe += giaThucTe * soLuong;
              console.log(`✅ Sản phẩm hợp lệ: ${product.tenSP}, giá: ${giaThucTe} x ${soLuong} = ${giaThucTe * soLuong}`);
            } else {
              console.log(`❌ Sản phẩm ${product.tenSP} KHÔNG thuộc danh mục mã giảm giá`);
            }
          }
        } catch (err) {
          console.error('❌ Lỗi khi lấy thông tin sản phẩm:', err.message);
        }
      }

      if (tongTienHopLe === 0) {
        console.log('❌ Không có sản phẩm nào thuộc danh mục mã giảm giá');
        return res.json({
          success: false,
          message: `Mã giảm giá này chỉ áp dụng cho sản phẩm thuộc danh mục "${khuyenMai.maDM.tenDM}". Vui lòng chọn sản phẩm thuộc danh mục này.`
        });
      }
      
      console.log(`💰 Tổng tiền sản phẩm hợp lệ (thuộc danh mục): ${tongTienHopLe}`);
    }

    // Tính số tiền giảm CHỈ dựa trên sản phẩm hợp lệ
    let soTienGiam = 0;
    if (khuyenMai.loaiGiamGia === 'phanTram') {
      soTienGiam = (tongTienHopLe * khuyenMai.giaTriGiam) / 100;
    } else if (khuyenMai.loaiGiamGia === 'soTien') {
      soTienGiam = khuyenMai.giaTriGiam;
      // Đảm bảo không giảm quá tổng tiền hợp lệ
      if (soTienGiam > tongTienHopLe) {
        soTienGiam = tongTienHopLe;
      }
    }

    const tongTienSauGiam = tongTienGioHang - soTienGiam;

    res.json({
      success: true,
      message: 'Áp dụng mã giảm giá thành công',
      data: {
        maKhuyenMai: khuyenMai._id,
        ma: khuyenMai.ma,
        tenKM: khuyenMai.tenKM,
        loaiGiamGia: khuyenMai.loaiGiamGia,
        giaTriGiam: khuyenMai.giaTriGiam,
        soTienGiam: Math.round(soTienGiam),
        tongTienGioHang: tongTienGioHang,
        tongTienSauGiam: Math.round(tongTienSauGiam),
        maDM: khuyenMai.maDM ? {
          _id: khuyenMai.maDM._id,
          tenDM: khuyenMai.maDM.tenDM
        } : null
      }
    });
  } catch (error) {
    console.error('Lỗi validate coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi validate mã giảm giá',
      error: error.message
    });
  }
};

