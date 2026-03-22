const axios = require('axios');
const intentService = require('./intent.service');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3006';

/**
 * Chatbot Service - Xử lý AI chat và gợi ý sản phẩm
 */
class ChatbotService {
    /**
     * Xử lý tin nhắn từ người dùng và trả về phản hồi
     * @param {string} message - Tin nhắn từ người dùng
     * @returns {Promise<object>} - { response, products, intent }
     */
    async processMessage(message) {
        try {
            // Phân tích intent
            const intent = intentService.detectIntent(message);
            
            console.log('🤖 AI Chat - Intent detected:', intent);

            let response = '';
            let products = [];

            switch (intent.intent) {
                case 'greeting':
                    response = this.getGreetingResponse();
                    break;

                case 'find_product':
                    if (intent.category) {
                        // Lấy sản phẩm bán chạy nhất theo category
                        products = await this.getBestSellingProducts(intent.category, 5);
                        response = this.getProductRecommendationResponse(intent.category, products);
                    } else {
                        response = 'Xin lỗi, tôi chưa hiểu bạn muốn tìm sản phẩm gì. Bạn có thể nói rõ hơn không? Ví dụ: "Tôi muốn mua điện thoại", "Tìm sách cho tôi"...';
                    }
                    break;

                case 'ask_price':
                    response = 'Bạn có thể xem giá chi tiết của từng sản phẩm trên website. Nếu bạn muốn tìm sản phẩm theo giá, hãy cho tôi biết bạn đang tìm sản phẩm gì nhé!';
                    break;

                case 'ask_info':
                    response = 'Tôi có thể giúp bạn tìm sản phẩm phù hợp. Hãy cho tôi biết bạn đang tìm sản phẩm gì, tôi sẽ gợi ý những sản phẩm bán chạy nhất cho bạn!';
                    break;

                case 'thank':
                    response = 'Không có gì! Nếu bạn cần hỗ trợ thêm, cứ hỏi tôi nhé. Chúc bạn mua sắm vui vẻ! 😊';
                    break;

                default:
                    response = 'Xin lỗi, tôi chưa hiểu câu hỏi của bạn. Bạn có thể hỏi tôi về:\n- Sản phẩm bạn muốn mua (ví dụ: "Tôi muốn mua điện thoại")\n- Hoặc chào hỏi đơn giản';
            }

            return {
                success: true,
                response,
                products,
                intent: intent.intent,
                category: intent.category
            };
        } catch (error) {
            console.error('❌ Chatbot service error:', error);
            return {
                success: false,
                response: 'Xin lỗi, tôi gặp lỗi khi xử lý tin nhắn của bạn. Vui lòng thử lại sau.',
                products: [],
                intent: 'error',
                category: null
            };
        }
    }

    /**
     * Lấy sản phẩm bán chạy nhất theo category
     * @param {string} category - Tên category
     * @param {number} limit - Số lượng sản phẩm
     * @returns {Promise<Array>} - Danh sách sản phẩm
     */
    async getBestSellingProducts(category, limit = 5) {
        try {
            console.log(`📦 Getting best selling products for category: ${category}, limit: ${limit}`);

            // Lấy tất cả sản phẩm từ Product Service
            const productResponse = await axios.get(`${PRODUCT_SERVICE_URL}/api/public/sanphams`, {
                timeout: 5000
            });

            if (!productResponse.data || productResponse.data.length === 0) {
                console.log('⚠️ No products found from Product Service');
                return [];
            }

            // Filter sản phẩm theo category
            let filteredProducts = productResponse.data.filter(p => {
                const productCategory = p.maDM?.tenDM || 
                                      (typeof p.maDM === 'string' ? p.maDM : '') ||
                                      p.category || '';
                return productCategory === category;
            });

            if (filteredProducts.length === 0) {
                console.log(`⚠️ No products found for category: ${category}`);
                return [];
            }

            // Lấy số lượng bán cho từng sản phẩm từ Order Service
            const productsWithSoldCount = await Promise.all(
                filteredProducts.map(async (product) => {
                    try {
                        const encodedProductName = encodeURIComponent(product.tenSP);
                        const soldResponse = await axios.get(
                            `${ORDER_SERVICE_URL}/api/orderitems/sold-count/${encodedProductName}`,
                            { timeout: 3000 }
                        );
                        const soldCount = soldResponse.data?.soldCount || 0;
                        return {
                            ...product,
                            soldCount
                        };
                    } catch (err) {
                        // Nếu không lấy được sold count, set = 0
                        return {
                            ...product,
                            soldCount: 0
                        };
                    }
                })
            );

            // Sắp xếp theo số lượng bán giảm dần
            productsWithSoldCount.sort((a, b) => b.soldCount - a.soldCount);

            // Lấy top N sản phẩm
            return productsWithSoldCount.slice(0, limit);
        } catch (error) {
            console.error('❌ Error getting best selling products:', error.message);
            return [];
        }
    }

    /**
     * Tạo câu trả lời chào hỏi
     */
    getGreetingResponse() {
        const greetings = [
            'Xin chào! Tôi là AI trợ lý của MegaStore. Tôi có thể giúp bạn tìm sản phẩm phù hợp. Bạn đang tìm mua gì vậy? 😊',
            'Chào bạn! Tôi có thể gợi ý những sản phẩm bán chạy nhất cho bạn. Bạn muốn tìm sản phẩm gì?',
            'Xin chào! Hãy cho tôi biết bạn đang tìm mua sản phẩm gì, tôi sẽ gợi ý những sản phẩm tốt nhất cho bạn!'
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }

    /**
     * Tạo câu trả lời gợi ý sản phẩm
     */
    getProductRecommendationResponse(category, products) {
        if (!products || products.length === 0) {
            return `Xin lỗi, hiện tại chúng tôi chưa có sản phẩm ${category} nào. Bạn có thể thử tìm kiếm các danh mục khác nhé!`;
        }

        let response = `Dựa trên nhu cầu của bạn về "${category}", đây là ${products.length} sản phẩm bán chạy nhất:\n\n`;
        
        products.forEach((product, index) => {
            const price = new Intl.NumberFormat('vi-VN').format(product.giaGiam || product.giaGoc || 0);
            const soldText = product.soldCount > 0 ? ` (Đã bán: ${product.soldCount})` : '';
            response += `${index + 1}. ${product.tenSP} - ${price}₫${soldText}\n`;
        });

        response += '\nBạn có thể click vào sản phẩm để xem chi tiết. Bạn muốn tìm sản phẩm gì khác không?';

        return response;
    }
}

module.exports = new ChatbotService();

