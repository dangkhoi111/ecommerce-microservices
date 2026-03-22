const express = require('express');
const router = express.Router();
const orderItemController = require('./../controllers/orderItemController');


router.post('/', orderItemController.createOrderItem);
router.get('/', orderItemController.getAllOrderItems);
router.get('/sold-count/:productName', orderItemController.getSoldCountByProductName);
router.get('/:id', orderItemController.getOrderItemById);
router.put('/:id', orderItemController.updateOrderItem);
router.delete('/:id', orderItemController.deleteOrderItem);
module.exports = router;
