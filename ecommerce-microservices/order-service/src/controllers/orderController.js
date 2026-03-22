const Order = require('./../models/order');
const OrderItem =require('./../models/orderItem');
const axios = require('axios');
const { io } = require('socket.io-client');
const socket = io('http://localhost:4000'); // Gateway socket 
// Tạo đơn hàng mới
exports.createOrder = async (req, res) => {
  try {
    const { TongTien, TrangThai, MaKH, MaVC,MaUserBan, PhuongThucGiaoHang, items, thanhToan
      , hoTenNguoiNhan, sdtNguoiNhan, diaChiChiTiet, tinhThanh, maKhuyenMai, soTienGiam
     } = req.body;

    // Validate lại mã giảm giá nếu có (đảm bảo vẫn hợp lệ)
    let finalSoTienGiam = soTienGiam || 0;
    let finalMaKhuyenMai = maKhuyenMai || null;

    if (maKhuyenMai) {
      try {
        // Gọi API validate lại mã
        const validateRes = await axios.post('http://localhost:3001/api/khuyenmai/validate', {
          ma: req.body.maCoupon || '', // Cần gửi mã từ frontend
          tongTienGioHang: TongTien + (soTienGiam || 0) // Tổng tiền trước khi giảm
        });

        if (validateRes.data.success) {
          finalSoTienGiam = validateRes.data.data.soTienGiam;
          finalMaKhuyenMai = validateRes.data.data.maKhuyenMai;
        } else {
          // Mã không còn hợp lệ, bỏ qua
          console.warn('Mã giảm giá không còn hợp lệ:', validateRes.data.message);
          finalSoTienGiam = 0;
          finalMaKhuyenMai = null;
        }
      } catch (validateErr) {
        console.error('Lỗi khi validate mã giảm giá:', validateErr.message);
        // Nếu lỗi, vẫn tạo đơn hàng nhưng không áp dụng mã
        finalSoTienGiam = 0;
        finalMaKhuyenMai = null;
      }
    }

    // Tạo đơn hàng
    const order = await Order.create({
      NgayLap: Date.now(),
      TongTien,
      TrangThai,
      MaKH,
      MaVC,
      PhuongThucGiaoHang,
      MaUserBan,
      maKhuyenMai: finalMaKhuyenMai,
      soTienGiam: finalSoTienGiam,
      hoTenNguoiNhan,
      sdtNguoiNhan,
      diaChiChiTiet,
      tinhThanh
    });

    // Tạo các item trong đơn hàng
    const itemsToCreate = items.map(item => ({
      ...item,
      MaOrder: order._id.toString()
    }));
    await OrderItem.insertMany(itemsToCreate);

    // Gửi yêu cầu tạo thanh toán đến payment-service
    const paymentResponse = await axios.post('http://localhost:3005/api/payment', {
      maOrder: order._id.toString(),
      method: thanhToan.PhuongThuc,
      status: thanhToan.TrangThai
    });

    if (paymentResponse.status === 201) {
         // Gửi notification bằng socket (real-time)
      try {
        socket.emit('send_notification', {
          maNguoiDung: MaUserBan,
          loaiNguoiDung: 'seller', // hoặc 'nguoiBan' tuỳ hệ thống bạn quy định
          tieuDe: 'Bạn có đơn hàng mới',
          noiDung: `Đơn hàng #${order._id.toString().slice(-6).toUpperCase()} đã được đặt thành công`,
          loai: 'donhang'
        });
      } catch (notifyErr) {
        console.error('❌ Gửi notification qua socket thất bại:', notifyErr.message);
      }
      // Thanh toán thành công
      res.status(201).json({ message: 'Tạo đơn hàng và thanh toán thành công', orderId: order._id });
    } else {
      // Nếu API thanh toán không thành công
      res.status(400).json({ message: 'Tạo thanh toán thất bại' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Lấy tất cả đơn hàng
exports.getAllOrders = async (req, res) => {
  try {
    const { maKH } = req.query;

    // Nếu không có maKH thì trả về lỗi
    if (!maKH) {
      return res.status(400).json({ error: "Thiếu mã khách hàng (maKH)" });
    }

    const orders = await Order.find({ MaKH: maKH });

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const orderItems = await OrderItem.find({ MaOrder: order._id.toString() });
        return {
          ...order.toObject(),
          orderItems,
        };
      })
    );

    res.json(ordersWithItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Lấy đơn hàng theo ID
// Lấy đơn hàng theo ID, bao gồm các sản phẩm trong đơn hàng
exports.getOrderById = async (req, res) => {
  try {
    // Tìm đơn hàng theo ID
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    // Lấy các sản phẩm trong đơn hàng
    const orderItems = await OrderItem.find({ MaOrder: order._id.toString() });

    // Trả về thông tin đơn hàng cùng với các sản phẩm
    res.json({
      ...order.toObject(),
      orderItems
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOrdersBySeller = async (req, res) => {
  try {
    const { maUserBan } = req.params;

    const orders = await Order.find({ MaUserBan: maUserBan });

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const orderItems = await OrderItem.find({ MaOrder: order._id.toString() });
        return {
          ...order.toObject(),
          orderItems,
        };
      })
    );

    res.json(ordersWithItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Cập nhật đơn hàng theo ID
exports.updateOrder = async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Không tìm thấy" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Xoá đơn hàng theo ID
exports.deleteOrder = async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Không tìm thấy" });
    res.json({ message: "Đã xoá thành công" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { TrangThai } = req.body;  // Lấy trạng thái từ request body
    const orderId = req.params.id; // Lấy ID đơn hàng từ URL params

    // Tìm và cập nhật đơn hàng
    const updatedOrder = await Order.findByIdAndUpdate(orderId, { TrangThai: TrangThai }, { new: true });

    if (!updatedOrder) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    res.json({
      message: "Cập nhật trạng thái thành công",
      updatedOrder,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Admin: Lấy tất cả đơn hàng trong hệ thống
exports.getAllOrdersForAdmin = async (req, res) => {
  try {
    const orders = await Order.find();

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const orderItems = await OrderItem.find({ MaOrder: order._id.toString() });
        return {
          ...order.toObject(),
          orderItems,
        };
      })
    );

    res.json(ordersWithItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

