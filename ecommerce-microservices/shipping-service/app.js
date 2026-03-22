const express = require('express');
const mongoose = require('mongoose');
const shippingRoutes = require('./src/routes/shipping'); // Đã import route shipping
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());
mongoose.connect('mongodb+srv://dangkhoi0980_db_user:ik224oZkkMG4CBrh@cluster0.45kpsfx.mongodb.net/shipping-db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection
  .once('open', () => console.log('Kết nối MongoDB thành công!'))
  .on('error', (error) => console.log('Lỗi kết nối MongoDB:', error));

app.use('/api/shipping', shippingRoutes); // Đăng ký các route cho shipping

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Shipping service đang chạy trên cổng ${PORT}`);
});
