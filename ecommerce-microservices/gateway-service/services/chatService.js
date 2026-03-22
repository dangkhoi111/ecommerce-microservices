const axios = require('axios');

const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || 'http://localhost:3008';

exports.sendMessage = async ({ maKH, maUserBan, noiDung ,nguoiGui}) => {
  console.log(noiDung);
  const res = await axios.post(`${CHAT_SERVICE_URL}/api/messages/send`, {
    maKH, maUserBan, noiDung ,nguoiGui
  });
  return res.data;
};

exports.getMessages = async ({ maKH, maUserBan }) => {
  const res = await axios.get(`${CHAT_SERVICE_URL}/api/messages`, {
    params: { maKH, maUserBan }
  });
  return res.data;
};
