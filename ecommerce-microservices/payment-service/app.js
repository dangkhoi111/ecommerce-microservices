require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');

const paymentRoutes = require('./src/routes/payment.routes');

app.use(express.json());
app.use(cors());
app.use('/api/payment', paymentRoutes);

const PORT = process.env.PORT || 3005;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Payment service running on port ${PORT}`));
  })
  .catch(err => console.error(err));
