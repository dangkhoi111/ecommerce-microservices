// services/notificationService.js
const axios = require('axios');

class NotificationService {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }

  async saveNotification(data) {
    try {
      console.log('📤 Sending notification to API with data:', data);  // Log dữ liệu gửi
      const response = await axios.post(this.apiUrl, data);
      return response.data;
    } catch (err) {
      console.error('❌ Error saving notification:', err.message);
      throw err;
    }
  }
}

module.exports = NotificationService;
