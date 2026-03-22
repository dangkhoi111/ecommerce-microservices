const express = require('express');
const router = express.Router();
const paymentCtrl = require('../controllers/payment.controller');

router.post('/', paymentCtrl.createPayment);
router.put('/:id/status', paymentCtrl.updatePaymentStatus);
router.get('/order/:id', paymentCtrl.getPaymentByOrderId);

module.exports = router;
