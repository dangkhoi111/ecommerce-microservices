var express = require('express');
var router = express.Router();

router.get('/', (req, res) => {
    res.render('products');
});

router.get('/detail/:id', (req, res) => {
    res.render('product-detail');
});


module.exports = router;