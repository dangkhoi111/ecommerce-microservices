var express = require('express');
var router = express.Router();

// Contact route
router.get('/', (req, res) => {
    res.render('contact');
});

module.exports = router;    