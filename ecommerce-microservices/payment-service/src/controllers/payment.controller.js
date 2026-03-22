const Payment = require('./../models/payment');

exports.createPayment = async (req, res) => {
  
  try {
    const { maOrder } = req.body;
    const payment = await Payment.create({ maOrder });
    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByIdAndUpdate(id, { status: 'Đã thanh toán' }, { new: true });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPaymentByOrderId = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findOne({ maOrder:id });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
