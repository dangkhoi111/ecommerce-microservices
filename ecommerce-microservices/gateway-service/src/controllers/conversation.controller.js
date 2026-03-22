// gateway-service/src/controllers/conversation.controller.js
const axios = require('axios');
const CHAT_URL = process.env.CHAT_SERVICE_URL || 'http://localhost:3008';

// 1. Tạo hoặc lấy conversation
exports.startConversation = async (req, res, next) => {
  try {
    const { maKH, maUserBan } = req.body;
    const resp = await axios.post(`${CHAT_URL}/api/conversations/start`, { maKH, maUserBan });
    res.status(resp.status).json(resp.data);
  } catch (err) { next(err); }
};

// 2. Lấy danh sách conversation của 1 khách hàng
exports.getUserConversations = async (req, res, next) => {
  try {
    const { maKH } = req.query;
    const resp = await axios.get(`${CHAT_URL}/api/conversations`, { params: { maKH } });
    res.status(resp.status).json(resp.data);
  } catch (err) { next(err); }
};

exports.getConversationsByUserBan = async (req, res, next) => {
  try {
   
    const { maUserBan } = req.query;
    const resp = await axios.get(`${CHAT_URL}/api/conversations/nguoi-ban`, { params: { maUserBan } });
    res.status(resp.status).json(resp.data);
  } catch (err) { next(err); }
};

// 3. Xoá conversation theo id (soft delete - chỉ xóa một bên)
exports.deleteConversation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // role: 'customer' hoặc 'seller'
    const resp = await axios.delete(`${CHAT_URL}/api/conversations/${id}`, {
      data: { role }
    });
    res.status(resp.status).json(resp.data);
  } catch (err) { next(err); }
};

// 4. Cập nhật last message
exports.updateLastMessage = async (req, res, next) => {
  try {
    const resp = await axios.put(`${CHAT_URL}/api/conversations/last-message`, req.body);
    res.status(resp.status).json(resp.data);
  } catch (err) { next(err); }
};
