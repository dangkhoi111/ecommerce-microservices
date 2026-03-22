const OrderItem = require('../models/orderItem');

// Tạo OrderItem mới
exports.createOrderItem = async (req, res) => {
    const { TenSp, MauSac, MaOrder, SoLuong, KichThuoc, Tong } = req.body;

    try {
        const newOrderItem = new OrderItem({ TenSp, MauSac, MaOrder, SoLuong, KichThuoc, Tong });
        await newOrderItem.save();
        res.status(201).json({ message: 'Order Item created successfully!', data: newOrderItem });
    } catch (error) {
        res.status(500).json({ message: 'Error creating Order Item', error });
    }
};

// Lấy tất cả OrderItems
exports.getAllOrderItems = async (req, res) => {
    try {
        const orderItems = await OrderItem.find();
        res.status(200).json({ message: 'Order Items fetched successfully!', data: orderItems });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching Order Items', error });
    }
};

// Lấy OrderItem theo ID
exports.getOrderItemById = async (req, res) => {
    const { id } = req.params;
    try {
        const orderItem = await OrderItem.findById(id);
        if (!orderItem) {
            return res.status(404).json({ message: 'Order Item not found' });
        }
        res.status(200).json({ message: 'Order Item fetched successfully!', data: orderItem });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching Order Item', error });
    }
};

// Cập nhật OrderItem theo ID
exports.updateOrderItem = async (req, res) => {
    const { id } = req.params;
    const { TenSp, MauSac, MaOrder, SoLuong, KichThuoc, Tong } = req.body;

    try {
        const updatedOrderItem = await OrderItem.findByIdAndUpdate(
            id,
            { TenSp, MauSac, MaOrder, SoLuong, KichThuoc, Tong },
            { new: true }
        );

        if (!updatedOrderItem) {
            return res.status(404).json({ message: 'Order Item not found' });
        }
        res.status(200).json({ message: 'Order Item updated successfully!', data: updatedOrderItem });
    } catch (error) {
        res.status(500).json({ message: 'Error updating Order Item', error });
    }
};

// Xóa OrderItem theo ID
exports.deleteOrderItem = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedOrderItem = await OrderItem.findByIdAndDelete(id);
        if (!deletedOrderItem) {
            return res.status(404).json({ message: 'Order Item not found' });
        }
        res.status(200).json({ message: 'Order Item deleted successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting Order Item', error });
    }
};

// Lấy số lượt đã bán của sản phẩm theo tên sản phẩm
exports.getSoldCountByProductName = async (req, res) => {
    try {
        let { productName } = req.params;
        
        if (!productName) {
            return res.status(400).json({ error: 'Thiếu tên sản phẩm' });
        }

        // Decode URL encoded product name
        productName = decodeURIComponent(productName);
        
        console.log('Getting sold count for product:', productName);

        // Tìm tất cả OrderItem có tên sản phẩm trùng khớp (không phân biệt hoa thường)
        // Sử dụng exact match hoặc contains tùy theo cách lưu trong DB
        const orderItems = await OrderItem.find({
            TenSp: { $regex: productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
        });

        console.log('Found order items:', orderItems.length);

        // Tính tổng số lượng đã bán
        const soldCount = orderItems.reduce((total, item) => total + (item.SoLuong || 0), 0);

        console.log('Sold count:', soldCount);

        res.json({ soldCount, productName });
    } catch (error) {
        console.error('Lỗi khi lấy số lượt đã bán:', error);
        res.status(500).json({ error: `Lỗi khi lấy số lượt đã bán: ${error.message}` });
    }
};