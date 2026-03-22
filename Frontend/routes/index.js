var express = require('express');
var router = express.Router();

/* GET home page. */
router.use('/admin',require('./admin'));
router.use('/products',require('./product'));
router.use('/shop', require('./shop'));
router.use('/cart',require('./cart'));
router.use('/seller',require('./seller'));
router.use('/login',require('./login'));
router.use('/register',require('./register'));
router.get('/profile', (req,res)=>{
    res.render('profile');
});
router.use('/blog',require('./blog'));
router.use('/about',require('./about'));
router.use('/contact',require('./contact'));
router.use('/support',require('./support'));
router.use('/payment',require('./payment'));
router.get('/', (req, res) => { res.render('index');})
router.get('/test', (req, res) => { res.render('test-notification');})
router.get('/chat-demo', (req, res) => { res.render('chat-demo', { layout: false });})
router.get('/chat-color-demo', (req, res) => { res.render('chat-color-demo', { layout: false });})
router.get('/purchase', (req, res) => {
    res.render('purchase');
});
router.get('/checkout', (req, res) => {
    res.render('checkout');
});
router.get('/order/:id',(req,res)=>{
     res.render('order');
})
router.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { layout: false });
});
router.get('/invoice-test', (req, res) => {
    res.render('invoice-test', { layout: false });
});

router.use('/logout',require('./logout'));
module.exports = router;










