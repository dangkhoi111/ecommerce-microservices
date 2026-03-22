const UserBehavior = require('../models/UserBehavior');
const axios = require('axios');
const mongoose = require('mongoose');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001';

class RecommendationService {
    /**
     * 1. Collaborative Filtering (CF)
     * Tìm người dùng tương tự dựa trên hành vi xem sản phẩm
     */
    async collaborativeFiltering(maKH, limit = 10) {
        try {
            if (!maKH) {
                return [];
            }

            // Lấy danh sách sản phẩm và category người dùng đã xem (từ metadata)
            const userBehaviors = await UserBehavior.find({ 
                maKH: new mongoose.Types.ObjectId(maKH),
                hanhDong: { $in: ['view', 'click', 'add_to_cart', 'purchase'] }
            }).select('maSP metadata').lean();

            if (userBehaviors.length === 0) {
                return [];
            }

            const userProductIds = userBehaviors.map(b => b.maSP.toString());
            
            // Lấy các category mà user đã xem (từ metadata)
            // QUAN TRỌNG: Filter cả null/undefined và empty string
            const viewedCategories = [...new Set(
                userBehaviors
                    .map(b => b.metadata?.category)
                    .filter(cat => cat && cat.trim() !== '') // Loại bỏ null/undefined/empty string
            )];

            console.log('📊 CF - User viewed categories:', viewedCategories);
            console.log('📊 CF - User viewed products count:', userProductIds.length);
            console.log('📊 CF - User behaviors sample:', userBehaviors.slice(0, 3).map(b => ({
                maSP: b.maSP,
                category: b.metadata?.category
            })));

            // Nếu user chưa có category hợp lệ nào, KHÔNG recommend gì cả
            // Vì không thể biết user thích gì nếu không có category
            if (viewedCategories.length === 0) {
                console.log('⚠️ CF - No valid categories found in user behavior. Cannot recommend without category info.');
                return [];
            }

            // Tìm người dùng khác đã xem các sản phẩm tương tự
            const similarUsers = await UserBehavior.aggregate([
                {
                    $match: {
                        maKH: { $ne: new mongoose.Types.ObjectId(maKH) },
                        maSP: { $in: userProductIds.map(id => new mongoose.Types.ObjectId(id)) }
                    }
                },
                {
                    $group: {
                        _id: '$maKH',
                        commonProducts: { $addToSet: '$maSP' },
                        interactionCount: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        maKH: '$_id',
                        commonProducts: 1,
                        interactionCount: 1,
                        similarity: {
                            $divide: [
                                { $size: '$commonProducts' },
                                userProductIds.length
                            ]
                        }
                    }
                },
                {
                    $match: {
                        similarity: { $gte: 0.2 } // Ít nhất 20% tương đồng
                    }
                },
                {
                    $sort: { similarity: -1, interactionCount: -1 }
                },
                { $limit: 50 } // Lấy top 50 người dùng tương tự
            ]);

            if (similarUsers.length === 0) {
                console.log('⚠️ CF - No similar users found');
                return [];
            }

            console.log('📊 CF - Found similar users:', similarUsers.length);

            // Lấy sản phẩm mà người dùng tương tự đã xem nhưng user hiện tại chưa xem
            // QUAN TRỌNG: Filter theo category mà user đã xem
            const similarUserIds = similarUsers.map(u => u.maKH);
            
            // Build match condition: CHỈ lấy sản phẩm cùng category với user đã xem
            // QUAN TRỌNG: Luôn filter theo category vì đã check ở trên
            const matchCondition = {
                maKH: { $in: similarUserIds },
                maSP: { $nin: userProductIds.map(id => new mongoose.Types.ObjectId(id)) },
                'metadata.category': { 
                    $in: viewedCategories,
                    $ne: '', // Loại bỏ empty string
                    $exists: true // Đảm bảo có field category
                }
            };

            console.log('📊 CF - Match condition:', JSON.stringify(matchCondition, null, 2));

            const recommendedProducts = await UserBehavior.aggregate([
                {
                    $match: matchCondition
                },
                {
                    $group: {
                        _id: '$maSP',
                        score: { $sum: 1 },
                        interactions: { $addToSet: '$hanhDong' },
                        categories: { $addToSet: '$metadata.category' }
                    }
                },
                {
                    $project: {
                        maSP: '$_id',
                        score: {
                            $add: [
                                '$score',
                                {
                                    $cond: [
                                        { $in: ['purchase', '$interactions'] },
                                        5,
                                        { $cond: [{ $in: ['add_to_cart', '$interactions'] }, 3, 1] }
                                    ]
                                }
                            ]
                        },
                        categories: 1
                    }
                },
                {
                    $addFields: {
                        // Bonus điểm nếu category khớp với category user đã xem
                        categoryMatch: {
                            $cond: [
                                {
                                    $gt: [
                                        {
                                            $size: {
                                                $filter: {
                                                    input: '$categories',
                                                    as: 'cat',
                                                    cond: { $in: ['$$cat', viewedCategories] }
                                                }
                                            }
                                        },
                                        0
                                    ]
                                },
                                2, // Thêm 2 điểm nếu category khớp
                                0
                            ]
                        }
                    }
                },
                {
                    $project: {
                        maSP: 1,
                        finalScore: { $add: ['$score', '$categoryMatch'] }
                    }
                },
                { $sort: { finalScore: -1 } },
                { $limit: limit }
            ]);

            const result = recommendedProducts.map(p => p.maSP);
            console.log('📊 CF - Recommended products count:', result.length);
            console.log('📊 CF - Recommended products:', result);

            return result;
        } catch (error) {
            console.error('❌ CF Error:', error);
            return [];
        }
    }

    /**
     * 2. Rule-Based Recommendation
     * Gợi ý dựa trên các luật đơn giản - CHỈ DÙNG DỮ LIỆU TỪ HÀNH VI
     */
    async ruleBasedRecommendation(maKH, limit = 10) {
        try {
            if (!maKH) {
                return [];
            }

            // Lấy sản phẩm người dùng đã xem gần đây
            const recentBehaviors = await UserBehavior.find({ 
                maKH: new mongoose.Types.ObjectId(maKH)
            })
            .sort({ thoiGian: -1 })
            .limit(50)
            .lean();

            if (recentBehaviors.length === 0) {
                return [];
            }

            const viewedProductIds = recentBehaviors.map(b => b.maSP.toString());
            const viewedCategories = [...new Set(recentBehaviors.map(b => b.metadata?.category).filter(Boolean))];
            const avgPrice = recentBehaviors.reduce((sum, b) => {
                return sum + (b.metadata?.giaGiam || 0);
            }, 0) / recentBehaviors.length;

            const recommendedProductIds = new Set();

            // Rule 1: Gợi ý sản phẩm cùng danh mục (từ hành vi của người dùng khác)
            if (viewedCategories.length > 0) {
                const categoryBehaviors = await UserBehavior.aggregate([
                    {
                        $match: {
                            maKH: { $ne: new mongoose.Types.ObjectId(maKH) },
                            'metadata.category': { $in: viewedCategories },
                            maSP: { $nin: viewedProductIds.map(id => new mongoose.Types.ObjectId(id)) }
                        }
                    },
                    {
                        $group: {
                            _id: '$maSP',
                            count: { $sum: 1 },
                            avgPrice: { $avg: '$metadata.giaGiam' }
                        }
                    },
                    {
                        $sort: { count: -1 }
                    },
                    { $limit: limit }
                ]);

                categoryBehaviors.forEach(item => {
                    recommendedProductIds.add(item._id.toString());
                });

                // FALLBACK: Nếu không tìm thấy từ user khác, lấy từ TẤT CẢ behaviors cùng category
                // (bao gồm cả user hiện tại, nhưng loại bỏ sản phẩm user đã xem)
                if (recommendedProductIds.size === 0) {
                    console.log('⚠️ Rule-based: No products from other users. Falling back to all behaviors in same category...');
                    const allCategoryBehaviors = await UserBehavior.aggregate([
                        {
                            $match: {
                                'metadata.category': { $in: viewedCategories },
                                'metadata.category': { $ne: '', $exists: true },
                                maSP: { $nin: viewedProductIds.map(id => new mongoose.Types.ObjectId(id)) }
                            }
                        },
                        {
                            $group: {
                                _id: '$maSP',
                                count: { $sum: 1 },
                                avgPrice: { $avg: '$metadata.giaGiam' }
                            }
                        },
                        {
                            $sort: { count: -1 }
                        },
                        { $limit: limit }
                    ]);

                    allCategoryBehaviors.forEach(item => {
                        recommendedProductIds.add(item._id.toString());
                    });
                    console.log(`📊 Rule-based fallback: Found ${allCategoryBehaviors.length} products from all behaviors`);
                }
            }

            // Rule 2: Gợi ý sản phẩm cùng khoảng giá (từ hành vi của người dùng khác)
            if (recommendedProductIds.size < limit && avgPrice > 0) {
                const priceRange = {
                    min: avgPrice * 0.5,
                    max: avgPrice * 1.5
                };

                const priceBehaviors = await UserBehavior.aggregate([
                    {
                        $match: {
                            maKH: { $ne: new mongoose.Types.ObjectId(maKH) },
                            'metadata.giaGiam': { $gte: priceRange.min, $lte: priceRange.max },
                            maSP: { 
                                $nin: [
                                    ...viewedProductIds.map(id => new mongoose.Types.ObjectId(id)),
                                    ...Array.from(recommendedProductIds).map(id => new mongoose.Types.ObjectId(id))
                                ]
                            }
                        }
                    },
                    {
                        $group: {
                            _id: '$maSP',
                            count: { $sum: 1 }
                        }
                    },
                    {
                        $sort: { count: -1 }
                    },
                    { $limit: limit - recommendedProductIds.size }
                ]);

                priceBehaviors.forEach(item => {
                    recommendedProductIds.add(item._id.toString());
                });
            }

            // Rule 3: Gợi ý sản phẩm phổ biến (sản phẩm được xem nhiều nhất từ hành vi)
            if (recommendedProductIds.size < limit) {
                const popularProducts = await UserBehavior.aggregate([
                    {
                        $match: {
                            maSP: { 
                                $nin: [
                                    ...viewedProductIds.map(id => new mongoose.Types.ObjectId(id)),
                                    ...Array.from(recommendedProductIds).map(id => new mongoose.Types.ObjectId(id))
                                ]
                            }
                        }
                    },
                    {
                        $group: {
                            _id: '$maSP',
                            viewCount: { $sum: { $cond: [{ $eq: ['$hanhDong', 'view'] }, 1, 0] } },
                            clickCount: { $sum: { $cond: [{ $eq: ['$hanhDong', 'click'] }, 1, 0] } },
                            cartCount: { $sum: { $cond: [{ $eq: ['$hanhDong', 'add_to_cart'] }, 1, 0] } },
                            purchaseCount: { $sum: { $cond: [{ $eq: ['$hanhDong', 'purchase'] }, 1, 0] } }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            score: {
                                $add: [
                                    { $multiply: ['$viewCount', 1] },
                                    { $multiply: ['$clickCount', 2] },
                                    { $multiply: ['$cartCount', 3] },
                                    { $multiply: ['$purchaseCount', 5] }
                                ]
                            }
                        }
                    },
                    {
                        $sort: { score: -1 }
                    },
                    { $limit: limit - recommendedProductIds.size }
                ]);

                popularProducts.forEach(item => {
                    recommendedProductIds.add(item._id.toString());
                });
            }

            return Array.from(recommendedProductIds).slice(0, limit);
        } catch (error) {
            console.error('Rule-based Error:', error);
            return [];
        }
    }

    /**
     * 3. Graph Neural Network (GNN) - Simplified Version
     * Mô phỏng GNN bằng cách xây dựng đồ thị người dùng-sản phẩm
     */
    async gnnRecommendation(maKH, limit = 10) {
        try {
            if (!maKH) {
                return [];
            }

            // Xây dựng đồ thị: User -> Product -> User
            const userBehaviors = await UserBehavior.find({ 
                maKH: new mongoose.Types.ObjectId(maKH)
            })
                .select('maSP')
                .lean();

            if (userBehaviors.length === 0) {
                return [];
            }

            const userProductIds = userBehaviors.map(b => b.maSP.toString());

            // Bước 1: Tìm các sản phẩm liên quan (được xem bởi cùng người dùng)
            const productGraph = await UserBehavior.aggregate([
                {
                    $match: {
                        maKH: { $ne: new mongoose.Types.ObjectId(maKH) },
                        maSP: { $in: userProductIds.map(id => new mongoose.Types.ObjectId(id)) }
                    }
                },
                {
                    $group: {
                        _id: '$maKH',
                        products: { $addToSet: '$maSP' }
                    }
                }
            ]);

            // Bước 2: Tìm sản phẩm được xem bởi người dùng có sản phẩm chung
            const relatedProducts = new Map();

            for (const user of productGraph) {
                const commonProducts = user.products.filter(p => 
                    userProductIds.includes(p.toString())
                );

                if (commonProducts.length > 0) {
                    // Lấy các sản phẩm khác của user này
                    const otherProducts = await UserBehavior.find({
                        maKH: user._id,
                        maSP: { $nin: userProductIds.map(id => new mongoose.Types.ObjectId(id)) }
                    }).select('maSP hanhDong').lean();

                    otherProducts.forEach(behavior => {
                        const productId = behavior.maSP.toString();
                        const weight = commonProducts.length * (behavior.hanhDong === 'purchase' ? 3 : 1);
                        
                        if (!relatedProducts.has(productId)) {
                            relatedProducts.set(productId, 0);
                        }
                        relatedProducts.set(productId, relatedProducts.get(productId) + weight);
                    });
                }
            }

            // Sắp xếp theo trọng số và lấy top
            const sortedProducts = Array.from(relatedProducts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit)
                .map(([productId]) => productId);

            return sortedProducts;
        } catch (error) {
            console.error('GNN Error:', error);
            return [];
        }
    }

    /**
     * Kết hợp 3 mô hình với trọng số
     */
    async getHybridRecommendations(maKH, limit = 10) {
        try {
            const [cfProducts, ruleProducts, gnnProducts] = await Promise.all([
                this.collaborativeFiltering(maKH, limit),
                this.ruleBasedRecommendation(maKH, limit),
                this.gnnRecommendation(maKH, limit)
            ]);

            // Trọng số: CF (40%), Rule-based (30%), GNN (30%)
            const productScores = new Map();

            // CF products (weight: 0.4)
            cfProducts.forEach((productId, index) => {
                const score = (limit - index) / limit * 0.4;
                productScores.set(productId.toString(), (productScores.get(productId.toString()) || 0) + score);
            });

            // Rule-based products (weight: 0.3)
            ruleProducts.forEach((productId, index) => {
                const score = (limit - index) / limit * 0.3;
                productScores.set(productId.toString(), (productScores.get(productId.toString()) || 0) + score);
            });

            // GNN products (weight: 0.3)
            gnnProducts.forEach((productId, index) => {
                const score = (limit - index) / limit * 0.3;
                productScores.set(productId.toString(), (productScores.get(productId.toString()) || 0) + score);
            });

            // Sắp xếp và lấy top
            const sortedProducts = Array.from(productScores.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit)
                .map(([productId]) => productId);

            return sortedProducts;
        } catch (error) {
            console.error('Hybrid Recommendation Error:', error);
            return [];
        }
    }
}

module.exports = new RecommendationService();

