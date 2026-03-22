const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const orderItemRoutes = require('./src/routes/orderitem');
const orderRoutes = require('./src/routes/order');
const invoiceRoutes = require('./src/routes/invoice');

const app = express();
app.use(express.json()); // Middleware để xử lý JSON body
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Kết nối với MongoDB
mongoose.connect('mongodb+srv://dangkhoi0980_db_user:ik224oZkkMG4CBrh@cluster0.45kpsfx.mongodb.net/order-db')
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.log('Error connecting to MongoDB:', err));

// Sử dụng routes
app.use('/api/orderitems', orderItemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/invoices', invoiceRoutes);
// Khởi chạy server
const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
