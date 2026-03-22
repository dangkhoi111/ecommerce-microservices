var express = require('express');
var router = express.Router();

// Blog route
router.get('/', (req, res) => {
    res.render('blog');
});
module.exports = router;