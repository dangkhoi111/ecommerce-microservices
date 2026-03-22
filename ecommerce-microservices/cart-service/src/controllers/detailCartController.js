const DetailCart = require("./../models/detailcart.model");
const axios = require("axios");
exports.addItemToCart = async (req, res) => {
  try {
    const item = new DetailCart(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCartItems = async (req, res) => {
  try {
    const items = await DetailCart.find({ maGH: req.params.id });

    // Gọi API product-service cho từng maPB
    const detailedItems = await Promise.all(items.map(async (item) => {
      const response = await axios.get(`http://localhost:3001/api/phienban/${item.maPB}`);
      return {
        ...item.toObject(),
        phienban: response.data // thêm thông tin phiên bản sản phẩm
      };
    }));

    res.json(detailedItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.removeItemFromCart = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedItem = await DetailCart.findByIdAndDelete(id);

    if (!deletedItem) {
      return res.status(404).json({ message: "Không tìm thấy item với _id đã cho" });
    }

    res.json({ message: "Đã xóa sản phẩm khỏi giỏ hàng", item: deletedItem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateItemQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { soluong } = req.body;

    if (!soluong || soluong < 1) {
      return res.status(400).json({ message: "Số lượng không hợp lệ" });
    }

    const updatedItem = await DetailCart.findByIdAndUpdate(
      id,
      { soluong },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ message: "Không tìm thấy item" });
    }

    res.json(updatedItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


