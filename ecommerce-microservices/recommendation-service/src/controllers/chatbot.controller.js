const chatbotService = require('../services/chatbot.service');

/**
 * Xử lý tin nhắn từ AI chatbot
 * POST /api/recommendation/chatbot/message
 */
exports.processMessage = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Message is required and must be a non-empty string'
            });
        }

        console.log('🤖 Received message:', message);

        // Xử lý tin nhắn
        const result = await chatbotService.processMessage(message.trim());

        res.json({
            success: result.success,
            response: result.response,
            products: result.products,
            intent: result.intent,
            category: result.category
        });
    } catch (error) {
        console.error('❌ Chatbot controller error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            response: 'Xin lỗi, tôi gặp lỗi khi xử lý tin nhắn. Vui lòng thử lại sau.'
        });
    }
};

