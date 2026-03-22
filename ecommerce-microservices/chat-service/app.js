const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const messageRoutes = require('./src/routes/message.routes');
const conversationRoutes = require('./src/routes/conversation.routes');
const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://dangkhoi0980_db_user:ik224oZkkMG4CBrh@cluster0.45kpsfx.mongodb.net/chat-db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
  app.listen(process.env.PORT || 3008, () => {
    console.log(`Chat service running on port ${process.env.PORT || 3008}`);
  });
}).catch((err) => console.error(err));