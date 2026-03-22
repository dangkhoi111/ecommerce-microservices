require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const connectDB = require('./src/configs/db');

// Kết nối MongoDB
connectDB(process.env.MONGO_URI);

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./src/routes/authRoute'));
app.use('/api/user-ban', require('./src/routes/userBanRoutes'));

// Khởi động server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`🚀 User Service is running on port ${PORT}`));
