var express = require('express');
var router = express.Router();

// Support route
router.get('/', (req, res) => {
    res.render('support', { layout: false });
});

module.exports = router; 