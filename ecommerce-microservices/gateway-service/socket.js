const { Server } = require('socket.io');
const ChatService = require('./services/chatService');
const NotificationService = require('./services/notificationService');  // Lấy class
require('dotenv').config(); 
const notificationService = new NotificationService(process.env.NOTIFICATION_API); // Tạo instance với URL API

const onlineUsers = new Map();

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*" }
  });

  io.on('connection', (socket) => {
    console.log('User connected: ', socket.id);

    socket.on('register', ({ userId }) => {
      onlineUsers.set(userId, socket.id);
      console.log(`User ${userId} is online with socket ${socket.id}`);
    });

    // Xử lý chat message
    socket.on('send_message', async (data) => {
  const { from, to, noiDung, nguoiGui } = data;
  console.log(data);

  // Xác định maKH và maUserBan dựa vào người gửi
  let maKH, maUserBan;
  if (nguoiGui === 'customer') {
    maKH = from;
    maUserBan = to;
  } else if (nguoiGui === 'seller') {
    maKH = to;
    maUserBan = from;
  } else {
    console.error('Giá trị nguoiGui không hợp lệ:', nguoiGui);
    return;
  }

  // Gửi tin nhắn qua chat-service
  await ChatService.sendMessage({
    maKH,
    maUserBan,
    noiDung,
    nguoiGui
  });

  // Gửi realtime nếu người nhận đang online
  const toSocket = onlineUsers.get(to);
  if (toSocket) {
    io.to(toSocket).emit('receive_message', {
      from,
      noiDung,
      timestamp: new Date()
    });
  }
});


    // Xử lý notification realtime
    socket.on('send_notification', async (data) => {
      const { maNguoiDung, loaiNguoiDung, tieuDe, noiDung, loai } = data;

      try {
        // Gọi API notification-service lưu vào DB
        const savedNotif = await notificationService.saveNotification({
          maNguoiDung,
          loaiNguoiDung,
          tieuDe,
          noiDung,
          loai
        });

        // Gửi realtime nếu người nhận đang online
        const receiverSocketId = onlineUsers.get(maNguoiDung);
        console.log('Receiver socket id:', receiverSocketId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receive_notification', savedNotif);
          console.log('📨 Notification sent to user via socket:', maNguoiDung);
        }
      } catch (err) {
        console.error('❌ Error sending notification:', err.message);
      }
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      console.log('User disconnected: ', socket.id);
    });
  });
}

module.exports = { initSocket };
