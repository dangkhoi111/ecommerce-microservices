/**
 * Intent Service - Phân tích intent từ tin nhắn người dùng
 */
class IntentService {
    // Từ khóa category mapping
    categoryKeywords = {
        'Điện thoại': ['điện thoại', 'phone', 'smartphone', 'iphone', 'samsung', 'xiaomi', 'oppo', 'vivo', 'realme'],
        'Điện Tử': ['laptop', 'máy tính', 'tablet', 'ipad', 'máy tính bảng', 'pc', 'máy tính xách tay'],
        'Sách': ['sách', 'truyện', 'sách vở', 'tiểu thuyết', 'sách giáo khoa', 'truyện tranh'],
        'Thời trang': ['áo', 'quần', 'giày', 'dép', 'thời trang', 'quần áo', 'giày dép', 'túi xách', 'ví'],
        'Gia dụng': ['tủ lạnh', 'máy giặt', 'bếp', 'gia dụng', 'đồ gia dụng', 'tủ', 'bàn', 'ghế'],
        'Đồng hồ': ['đồng hồ', 'watch', 'smartwatch'],
        'Mỹ phẩm': ['mỹ phẩm', 'son', 'kem', 'dưỡng da', 'makeup'],
        'Thể thao': ['thể thao', 'giày thể thao', 'quần áo thể thao', 'dụng cụ thể thao']
    };

    /**
     * Phân tích intent từ tin nhắn
     * @param {string} message - Tin nhắn từ người dùng
     * @returns {object} - { intent, category, keywords }
     */
    detectIntent(message) {
        const lowerMessage = message.toLowerCase().trim();
        
        // 1. Chào hỏi
        if (this.isGreeting(lowerMessage)) {
            return { 
                intent: 'greeting', 
                category: null,
                keywords: []
            };
        }
        
        // 2. Tìm sản phẩm theo category
        const category = this.extractCategory(lowerMessage);
        if (category) {
            return { 
                intent: 'find_product', 
                category,
                keywords: this.getKeywordsForCategory(category, lowerMessage)
            };
        }
        
        // 3. Hỏi giá
        if (this.isAskingPrice(lowerMessage)) {
            return { 
                intent: 'ask_price', 
                category: null,
                keywords: []
            };
        }
        
        // 4. Hỏi thông tin
        if (this.isAskingInfo(lowerMessage)) {
            return { 
                intent: 'ask_info', 
                category: null,
                keywords: []
            };
        }
        
        // 5. Cảm ơn / Tạm biệt
        if (this.isThanking(lowerMessage)) {
            return {
                intent: 'thank',
                category: null,
                keywords: []
            };
        }
        
        return { 
            intent: 'other', 
            category: null,
            keywords: []
        };
    }

    /**
     * Trích xuất category từ tin nhắn
     * @param {string} message - Tin nhắn đã lowercase
     * @returns {string|null} - Tên category hoặc null
     */
    extractCategory(message) {
        for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
            if (keywords.some(keyword => message.includes(keyword))) {
                return category;
            }
        }
        return null;
    }

    /**
     * Lấy keywords được tìm thấy trong message
     */
    getKeywordsForCategory(category, message) {
        const keywords = this.categoryKeywords[category] || [];
        return keywords.filter(keyword => message.includes(keyword));
    }

    /**
     * Kiểm tra có phải chào hỏi không
     */
    isGreeting(message) {
        const greetings = [
            'xin chào', 'hello', 'hi', 'chào', 'chào bạn', 'chào shop',
            'chào admin', 'hey', 'good morning', 'good afternoon', 'good evening'
        ];
        return greetings.some(g => message.includes(g));
    }

    /**
     * Kiểm tra có hỏi giá không
     */
    isAskingPrice(message) {
        const priceKeywords = [
            'giá', 'bao nhiêu', 'rẻ', 'đắt', 'giảm giá', 'khuyến mãi',
            'sale', 'discount', 'giá cả', 'chi phí', 'phí'
        ];
        return priceKeywords.some(k => message.includes(k));
    }

    /**
     * Kiểm tra có hỏi thông tin không
     */
    isAskingInfo(message) {
        const infoKeywords = [
            'thông tin', 'bảo hành', 'mô tả', 'chi tiết', 'có gì',
            'tính năng', 'đặc điểm', 'thông số', 'spec'
        ];
        return infoKeywords.some(k => message.includes(k));
    }

    /**
     * Kiểm tra có cảm ơn không
     */
    isThanking(message) {
        const thankKeywords = [
            'cảm ơn', 'thanks', 'thank you', 'cám ơn',
            'tạm biệt', 'bye', 'goodbye', 'see you'
        ];
        return thankKeywords.some(k => message.includes(k));
    }
}

module.exports = new IntentService();

