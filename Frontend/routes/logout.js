var express = require('express');
var router = express.Router();

// Blog route
router.get('/', (req, res) => {
   
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).send('Lỗi khi đăng xuất');
            }
            res.redirect('/');
        });
    
});
module.exports = router;