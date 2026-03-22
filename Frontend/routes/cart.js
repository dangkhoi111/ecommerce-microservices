var express = require('express');
var router = express.Router();


router.get('/', (req, res) => {
    res.render('cart');
});
// Cart Routes
router.post('/add', (req, res) => {
    const { productId, name, price, image, quantity } = req.body;
    
    if (!req.session.cart) {
        req.session.cart = [];
    }
    
    const existingItem = req.session.cart.find(item => item.productId === productId);
    
    if (existingItem) {
        existingItem.quantity += parseInt(quantity);
    } else {
        req.session.cart.push({
            productId,
            name,
            price: parseFloat(price),
            image,
            quantity: parseInt(quantity)
        });
    }
    
    res.json({
        success: true,
        cartCount: req.session.cart.length,
        message: 'Sản phẩm đã được thêm vào giỏ hàng'
    });
});

router.post('/update', (req, res) => {
    const { productId, quantity } = req.body;
    
    if (!req.session.cart) {
        req.session.cart = [];
    }
    
    const cartItem = req.session.cart.find(item => item.productId === productId);
    if (cartItem) {
        cartItem.quantity = parseInt(quantity);
        if (cartItem.quantity <= 0) {
            req.session.cart = req.session.cart.filter(item => item.productId !== productId);
        }
    }
    
    const total = req.session.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    res.json({
        success: true,
        total: total,
        cartCount: req.session.cart.length
    });
});

router.post('/remove', (req, res) => {
    const { productId } = req.body;
    
    if (!req.session.cart) {
        req.session.cart = [];
    }
    
    req.session.cart = req.session.cart.filter(item => item.productId !== productId);
    
    res.json({
        success: true,
        cartCount: req.session.cart.length,
        message: 'Sản phẩm đã được xóa khỏi giỏ hàng'
    });
});

router.post('/apply-coupon', (req, res) => {
    const { code } = req.body;
    
    // Giả lập mã giảm giá
    const coupons = {
        'WELCOME10': 10,
        'SALE20': 20,
        'MEGA30': 30
    };
    
    if (coupons[code]) {
        const discount = coupons[code];
        const total = req.session.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discountAmount = (total * discount) / 100;
        
        res.json({
            success: true,
            discount: discountAmount,
            message: `Áp dụng mã giảm giá ${discount}% thành công`
        });
    } else {
        res.json({
            success: false,
            message: 'Mã giảm giá không hợp lệ'
        });
    }
});

module.exports = router;