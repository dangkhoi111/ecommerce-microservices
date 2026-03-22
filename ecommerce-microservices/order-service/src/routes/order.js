const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.post('/', orderController.createOrder);
router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.put('/:id', orderController.updateOrder);
router.put('/:id/status', orderController.updateOrderStatus);
router.delete('/:id', orderController.deleteOrder);
router.get('/seller/:maUserBan', orderController.getOrdersBySeller);
router.get('/admin/all', orderController.getAllOrdersForAdmin);
module.exports = router;
