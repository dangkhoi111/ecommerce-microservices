const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const notificationRoutes = require('./src/routes/notification.routes');

const app = express();
const PORT = 3009;

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb+srv://dangkhoi0980_db_user:ik224oZkkMG4CBrh@cluster0.45kpsfx.mongodb.net/notification-db')
  .then(() => console.log('Kết nối MongoDB thành công'))
  .catch(err => console.error(' Kết nối MongoDB thất bại:', err));

app.use('/api/notifications', notificationRoutes);

app.listen(PORT, () => {
  console.log(` Notification service đang chạy ở http://localhost:${PORT}`);
});
