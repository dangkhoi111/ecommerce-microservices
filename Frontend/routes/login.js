var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken');

const bcrypt = require('bcryptjs');
// Route cho đăng nhập
router.get('/', (req, res) => {
    res.render('login',{ layout : false });    
});

module.exports = router;