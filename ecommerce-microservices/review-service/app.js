// app.js
const express = require('express');
const mongoose = require('mongoose');
const reviewRoutes = require('./src/routes/danhGia');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());
mongoose.connect('mongodb+srv://dangkhoi0980_db_user:ik224oZkkMG4CBrh@cluster0.45kpsfx.mongodb.net/review-db')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/reviews', reviewRoutes);

app.listen(3010, () => {
  console.log('Review service running on port 3010');
});
