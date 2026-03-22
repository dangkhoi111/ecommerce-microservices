const Cart = require("./../models/cart.model");

exports.createCart = async (req, res) => {
  try {
    const { maKH } = req.body;

    // Kiểm tra nếu giỏ hàng đã tồn tại
    const existingCart = await Cart.findOne({ maKH });
    if (existingCart) {
      return res.status(200).json({ message: "Cart already exists", cart: existingCart });
    }

    // Nếu chưa, tạo mới
    const newCart = new Cart({ maKH });
    await newCart.save();

    res.status(201).json({ message: "Cart created", cart: newCart });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getCartByCustomer = async (req, res) => {
  try {
    const carts = await Cart.findOne({ maKH: req.params.id });
    res.json(carts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
