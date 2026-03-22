const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const invoiceController = require('../controllers/invoiceController');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../uploads/invoices');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${timestamp}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Định dạng file không hợp lệ'));
    }
  },
});

router.post('/', upload.single('invoice'), invoiceController.uploadInvoice);
router.get('/', invoiceController.listInvoices);
router.get('/order/:orderId', invoiceController.getInvoiceByOrder);
router.get('/generate/:orderId', invoiceController.generateInvoice); // Generate invoice HTML

module.exports = router;

