const ShippingOption = require('./../models/shipping');
const ShippingHistory = require('./../models/shippinghistory');

const createShippingHistory = async (MaOrder, MaVC, GhiChu) => {
  try {
    const newShippingHistory = new ShippingHistory({
      MaOrder,
      MaVC,
      GhiChu,
    });

    const savedShippingHistory = await newShippingHistory.save();
    return savedShippingHistory;
  } catch (err) {
    throw new Error("Lỗi khi tạo lịch sử giao hàng: " + err.message);
  }
};

const getShippingById = async (req, res) => {
  try {
    const shipping = await ShippingOption.findById(req.params.id);
    if (!shipping) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin vận chuyển.' });
    }
    res.json(shipping);
  } catch (error) {
    console.error('Lỗi lấy thông tin vận chuyển:', error);
    res.status(500).json({ error: 'Lỗi server.' });
  }
};

const getShippingOptions = async (req, res) => {
  try {
    const shippingOptions = await ShippingOption.find();
    res.json(shippingOptions);
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi lấy thông tin đơn vị vận chuyển." });
  }
};

module.exports = {
  createShippingHistory,
  getShippingOptions,
    getShippingById
};
