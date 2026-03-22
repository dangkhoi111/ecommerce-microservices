// gateway-service/src/controllers/chat.controller.js
const axios = require('axios');
const CHAT_URL = process.env.CHAT_SERVICE_URL || 'http://localhost:3008';

exports.sendMessage = async (req, res, next) => {
  try {
    const resp = await axios.post(`${CHAT_URL}/api/messages/send`, req.body);
    res.status(resp.status).json(resp.data);
  } catch (err) { next(err); }
};

exports.getHistory = async (req, res, next) => {
  try {
    const resp = await axios.get(`${CHAT_URL}/api/messages`, { params: req.query });
    res.status(resp.status).json(resp.data);
  } catch (err) { next(err); }
};
