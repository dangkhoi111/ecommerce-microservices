const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();
const { initSocket } = require('./socket');

const convoRoutes = require('./src/routes/conversation.routes');
const chatRoutes  = require('./src/routes/chat.routes');
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/conversations', convoRoutes);
app.use('/api/chat',chatRoutes);

const server = http.createServer(app);
initSocket(server); // Khởi tạo Socket.IO

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Gateway service (Socket + API Gateway) is running on port ${PORT}`);
});
