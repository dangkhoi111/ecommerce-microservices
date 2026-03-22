require('dotenv').config();
const express = require('express');
const connectDB = require('./src/config/db');
const cors = require('cors');
const path = require('path');
// Connect DB
connectDB(process.env.MONGO_URI);

const app = express();
app.use(express.json());
app.use(cors());
// Routes
app.use('/api', require('./src/routes/category.route'));
app.use('/api', require('./src/routes/product.route'));
app.use('/api', require('./src/routes/khuyenmai.route'));
app.use('/api', require('./src/routes/product-version.route'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


const PORT = process.env.PORT || process.env.APP_PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Product service listening on port ${PORT}`));