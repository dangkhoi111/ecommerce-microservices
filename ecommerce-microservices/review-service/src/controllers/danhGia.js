// controllers/reviewController.js
const Review = require('../models/danhGia');
const axios = require('axios');
// Tạo đánh giá mới
exports.createReview = async (req, res) => {
    try {
        const { noiDung, diemSo, maKH, maSP } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!diemSo || !maKH || !maSP) {
            return res.status(400).json({ error: 'Thiếu các trường bắt buộc: diemSo, maKH, maSP' });
        }
        if (diemSo < 1 || diemSo > 5) {
            return res.status(400).json({ error: 'Điểm số phải nằm trong khoảng từ 1 đến 5' });
        }

        const review = await Review.create({
            noiDung,
            diemSo,
            maKH,
            maSP,
            ngayDG: Date.now()
        });

        res.status(201).json(review);
    } catch (err) {
        res.status(500).json({ error: `Lỗi khi tạo đánh giá: ${err.message}` });
    }
};

// Lấy danh sách đánh giá theo sản phẩm (hỗ trợ phân trang)
exports.getReviewsByProduct = async (req, res) => {
    try {
        const { maSP } = req.params;
        const { page = 1, limit = 10 } = req.query; // Mặc định page=1, limit=10

        if (!maSP) {
            return res.status(400).json({ error: 'Thiếu mã sản phẩm (maSP)' });
        }

        const reviews = await Review.find({ maSP })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ ngayDG: -1 }); // Sắp xếp theo ngày mới nhất

        const totalReviews = await Review.countDocuments({ maSP });

        // Lấy hoTen và avatar cho từng maKH
        const reviewsWithHoTen = await Promise.all(reviews.map(async (review) => {
            try {
                const response = await axios.get(`http://localhost:3002/api/auth/${review.maKH}`);
                if (response.data.success) {
                    return {
                        ...review.toObject(), // Chuyển document thành object
                        hoTen: response.data.data.hoTen || 'Ẩn danh', // Lấy hoTen, mặc định 'Ẩn danh' nếu không có
                        avatar: response.data.data.avatar || null // Lấy avatar nếu có
                    };
                } else {
                    return {
                        ...review.toObject(),
                        hoTen: 'Ẩn danh', // Nếu API trả về success: false
                        avatar: null
                    };
                }
            } catch (err) {
                console.error(`Lỗi khi lấy thông tin cho maKH ${review.maKH}:`, err.message);
                return {
                    ...review.toObject(),
                    hoTen: 'Ẩn danh', // Nếu API thất bại
                    avatar: null
                };
            }
        }));

        res.json({
            reviews: reviewsWithHoTen,
            totalReviews,
            totalPages: Math.ceil(totalReviews / limit),
            currentPage: parseInt(page)
        });
    } catch (err) {
        console.error('Lỗi khi lấy đánh giá:', err);
        res.status(500).json({ error: `Lỗi khi lấy đánh giá: ${err.message}` });
    }
};

// Lấy danh sách đánh giá theo khách hàng
exports.getReviewsByCustomer = async (req, res) => {
    try {
        const { maKH } = req.params;

        if (!maKH) {
            return res.status(400).json({ error: 'Thiếu mã khách hàng (maKH)' });
        }

        const reviews = await Review.find({ maKH }).sort({ ngayDG: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: `Lỗi khi lấy đánh giá: ${err.message}` });
    }
};

// Cập nhật đánh giá
exports.updateReview = async (req, res) => {
    try {
        const { maDG } = req.params; // Sử dụng maDG từ route (thực chất là _id)
        const { noiDung, diemSo, maKH } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (diemSo && (diemSo < 1 || diemSo > 5)) {
            return res.status(400).json({ error: 'Điểm số phải nằm trong khoảng từ 1 đến 5' });
        }

        // Kiểm tra quyền: chỉ người tạo đánh giá hoặc admin được phép sửa
        const review = await Review.findById(maDG);
        if (!review) {
            return res.status(404).json({ error: 'Không tìm thấy đánh giá' });
        }
        // So sánh maKH (có thể là ObjectId hoặc string)
        const reviewMaKH = String(review.maKH);
        const requestMaKH = String(maKH);
        if (reviewMaKH !== requestMaKH) {
            return res.status(403).json({ error: 'Bạn không có quyền sửa đánh giá này' });
        }

        const updatedReview = await Review.findByIdAndUpdate(
            maDG,
            { noiDung, diemSo, ngayDG: Date.now() },
            { new: true, runValidators: true }
        );

        if (!updatedReview) {
            return res.status(404).json({ error: 'Không tìm thấy đánh giá' });
        }

        res.json(updatedReview);
    } catch (err) {
        res.status(500).json({ error: `Lỗi khi cập nhật đánh giá: ${err.message}` });
    }
};

// Xóa đánh giá
exports.deleteReview = async (req, res) => {
    try {
        const { maDG } = req.params; // Sử dụng maDG từ route (thực chất là _id)
        const { maKH } = req.body; // Giả định maKH được gửi từ client

        // Kiểm tra quyền: chỉ người tạo đánh giá hoặc admin được phép xóa
        const review = await Review.findById(maDG);
        if (!review) {
            return res.status(404).json({ error: 'Không tìm thấy đánh giá' });
        }
        // So sánh maKH (có thể là ObjectId hoặc string)
        const reviewMaKH = String(review.maKH);
        const requestMaKH = String(maKH);
        if (reviewMaKH !== requestMaKH) {
            return res.status(403).json({ error: 'Bạn không có quyền xóa đánh giá này' });
        }

        await Review.findByIdAndDelete(maDG);
        res.json({ message: 'Xóa đánh giá thành công' });
    } catch (err) {
        res.status(500).json({ error: `Lỗi khi xóa đánh giá: ${err.message}` });
    }
};