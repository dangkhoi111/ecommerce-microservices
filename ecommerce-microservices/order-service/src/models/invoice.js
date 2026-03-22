const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    imagePath: {
      type: String,
      required: true,
    },
    rawText: {
      type: String,
    },
    parsed: {
      type: Object,
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending',
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Invoice', InvoiceSchema);








