var express = require('express');
var router = express.Router();
const bcrypt = require('bcryptjs');

// Route cho đăng ký
router.get('/', (req, res) => {
    res.render('register',{layout : false});
});

// Route xử lý form đăng ký
router.post('/', async (req, res) => {
    const { firstName, lastName, email, password, phone } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!firstName || !lastName || !email || !password || !phone) {
        return res.status(400).send('Vui lòng nhập đầy đủ thông tin!');
    }

    try {
        // Kiểm tra email đã tồn tại chưa
        const existingUser = await KhachHang.findOne({ Email: email });
        if (existingUser) return res.status(400).send('Email đã tồn tại!');

        // Hash mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);

        // Tạo người dùng mới
        const newUser = new KhachHang({
            HoTen: `${firstName} ${lastName}`,
            Email: email,
            MatKhau: hashedPassword,
            SDT: phone,
            DiaChi: '', // có thể bổ sung field này sau nếu cần
        });

        await newUser.save();

        res.redirect('/login'); // hoặc trả JSON nếu là API
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi server!');
    }
});

module.exports = router;