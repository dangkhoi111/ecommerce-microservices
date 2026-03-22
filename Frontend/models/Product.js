const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    sku: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    oldPrice: {
        type: Number
    },
    discount: {
        type: Number,
        default: 0
    },
    mainImage: {
        type: String,
        required: true
    },
    images: [{
        type: String
    }],
    category: {
        type: String,
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    origin: {
        type: String
    },
    material: {
        type: String
    },
    style: {
        type: String
    },
    stock: {
        type: Number,
        required: true,
        default: 0
    },
    rating: {
        type: Number,
        default: 0
    },
    reviewCount: {
        type: Number,
        default: 0
    },
    soldCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware to update the updatedAt field
productSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for calculating current price with discount
productSchema.virtual('currentPrice').get(function() {
    if (this.discount > 0 && this.oldPrice) {
        return this.oldPrice * (1 - this.discount / 100);
    }
    return this.price;
});

module.exports = mongoose.model('Product', productSchema); 