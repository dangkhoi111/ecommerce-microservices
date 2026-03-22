const express = require('express');
const mongoose = require('mongoose');
const diaChiRoutes = require('./src/routes/diaChiRoutes');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());
mongoose.connect('mongodb+srv://dangkhoi0980_db_user:ik224oZkkMG4CBrh@cluster0.45kpsfx.mongodb.net/adress-db')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

app.use('/api/diachi', diaChiRoutes);

app.listen(3007, () => console.log('DiaChi Service running on port 3007'));
