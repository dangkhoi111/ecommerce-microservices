const UserBehavior = require('../models/UserBehavior');
const recommendationService = require('../services/recommendation.service');
const axios = require('axios');
const mongoose = require('mongoose');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001';

// Track user behavior (view, click, etc.)
exports.trackBehavior = async (req, res) => {
    try {
        const { maKH, maSP, hanhDong = 'view', metadata = {} } = req.body;

        if (!maSP) {
            return res.status(400).json({ error: 'maSP is required' });
        }

        // Validate maSP format (should be ObjectId)
        if (!mongoose.Types.ObjectId.isValid(maSP)) {
            return res.status(400).json({ error: 'Invalid maSP format' });
        }

        // Validate maKH if provided
        if (maKH && !mongoose.Types.ObjectId.isValid(maKH)) {
            return res.status(400).json({ error: 'Invalid maKH format' });
        }

        // Tạo thời gian hiện tại (sẽ được lưu dưới dạng UTC trong MongoDB)
        const currentTime = new Date();
        
        // Convert sang timezone Việt Nam (UTC+7)
        // Format: DD/MM/YYYY, HH:mm:ss
        const vietnamDate = new Date(currentTime.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
        const day = String(vietnamDate.getDate()).padStart(2, '0');
        const month = String(vietnamDate.getMonth() + 1).padStart(2, '0');
        const year = vietnamDate.getFullYear();
        const hours = String(vietnamDate.getHours()).padStart(2, '0');
        const minutes = String(vietnamDate.getMinutes()).padStart(2, '0');
        const seconds = String(vietnamDate.getSeconds()).padStart(2, '0');
        const thoiGianLocal = `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;

        // Nếu metadata không có category, lấy từ Product Service
        let category = metadata.category;
        if (!category || category.trim() === '') {
            try {
                const productResponse = await axios.get(`${PRODUCT_SERVICE_URL}/api/sanphams/${maSP}`, {
                    timeout: 3000
                });
                if (productResponse.data && productResponse.data.maDM) {
                    // maDM có thể là object (populated) hoặc ObjectId
                    if (typeof productResponse.data.maDM === 'object' && productResponse.data.maDM.tenDM) {
                        category = productResponse.data.maDM.tenDM;
                    } else if (productResponse.data.maDM) {
                        // Nếu là ObjectId, có thể cần query thêm, nhưng tạm thời bỏ qua
                        console.log('⚠️ Product maDM is ObjectId, cannot get category name directly');
                    }
                }
            } catch (err) {
                console.warn('⚠️ Failed to fetch product category from Product Service:', err.message);
            }
        }

        // Đảm bảo thoiGianLocal được thêm vào metadata (không bị ghi đè)
        // Tạo object mới để tránh mutation và đảm bảo thoiGianLocal luôn có
        const finalMetadata = {
            ...metadata,
            category: category || metadata.category || '', // Ưu tiên category từ Product Service
            thoiGianLocal: thoiGianLocal // Force set - luôn có giá trị
        };

        const behaviorData = {
            maKH: maKH || null,
            maSP: maSP,
            hanhDong,
            thoiGian: currentTime, // Set thời gian hiện tại (UTC)
            metadata: finalMetadata
        };

        // Debug: Log metadata trước khi save
        console.log('📝 Metadata before save:', JSON.stringify(finalMetadata, null, 2));

        // Tạo document mới với metadata đầy đủ ngay từ đầu
        const behavior = new UserBehavior(behaviorData);
        
        // Đảm bảo metadata được set đúng cách
        behavior.metadata = finalMetadata;
        behavior.markModified('metadata');
        
        console.log('📝 Behavior data before save:', {
            metadata: behavior.metadata,
            hasThoiGianLocal: !!behavior.metadata?.thoiGianLocal,
            metadataType: typeof behavior.metadata
        });

        // Save document
        await behavior.save();
        const documentId = behavior._id;
        console.log('📝 Document saved with ID:', documentId.toString());

        // SỬ DỤNG MongoDB NATIVE COLLECTION để update trực tiếp, tránh Mongoose cache
        // Lấy MongoDB connection từ Mongoose
        const db = mongoose.connection.db;
        const collection = db.collection('user-behavior');
        
        // Update trực tiếp bằng MongoDB native driver
        const nativeUpdateResult = await collection.updateOne(
            { _id: documentId },
            { $set: { 'metadata.thoiGianLocal': thoiGianLocal } }
        );
        
        console.log('📝 Native MongoDB update result:', {
            matchedCount: nativeUpdateResult.matchedCount,
            modifiedCount: nativeUpdateResult.modifiedCount,
            acknowledged: nativeUpdateResult.acknowledged
        });

        // Verify bằng cách query lại từ MongoDB native collection
        const nativeDoc = await collection.findOne({ _id: documentId });
        const nativeMetadata = nativeDoc?.metadata || {};
        
        console.log('🔍 Native MongoDB query result:', JSON.stringify(nativeMetadata, null, 2));
        console.log('🔍 Has thoiGianLocal in native query:', !!nativeMetadata?.thoiGianLocal);
        
        // Nếu vẫn không có, thử replace toàn bộ metadata bằng native update
        if (!nativeMetadata?.thoiGianLocal) {
            console.warn('⚠️ WARNING: thoiGianLocal not found in native query! Trying replace metadata...');
            
            const updatedMetadata = {
                ...nativeMetadata,
                thoiGianLocal: thoiGianLocal
            };
            
            const replaceResult = await collection.updateOne(
                { _id: documentId },
                { $set: { metadata: updatedMetadata } }
            );
            
            console.log('📝 Native replace result:', {
                matchedCount: replaceResult.matchedCount,
                modifiedCount: replaceResult.modifiedCount,
                acknowledged: replaceResult.acknowledged
            });
            
            // Reload lại từ native collection
            const retryNativeDoc = await collection.findOne({ _id: documentId });
            const retryNativeMetadata = retryNativeDoc?.metadata || {};
            console.log('✅ Retry native result:', JSON.stringify(retryNativeMetadata, null, 2));
            console.log('✅ Has thoiGianLocal after native retry:', !!retryNativeMetadata?.thoiGianLocal);
        }
        
        // Lấy document cuối cùng từ MongoDB native collection để response
        const finalNativeDoc = await collection.findOne({ _id: documentId });
        const finalMetadataForResponse = finalNativeDoc?.metadata || {};
        
        // Cũng lấy từ Mongoose để đảm bảo consistency
        const finalDoc = await UserBehavior.findById(documentId).lean();
        
        console.log('✅ Behavior tracked successfully:', {
            database: 'behavior',
            collection: 'user-behavior',
            documentId: finalDoc._id,
            maKH: maKH || 'anonymous',
            maSP,
            hanhDong,
            thoiGianUTC: finalDoc.thoiGian ? new Date(finalDoc.thoiGian).toISOString() : currentTime.toISOString(),
            thoiGianLocal: finalMetadataForResponse?.thoiGianLocal || thoiGianLocal,
            metadataKeys: Object.keys(finalMetadataForResponse || {}),
            fullMetadata: finalMetadataForResponse
        });

        // Sử dụng finalDoc để đảm bảo có đầy đủ metadata từ MongoDB
        res.status(201).json({
            success: true,
            message: 'Behavior tracked successfully',
            data: {
                _id: finalDoc._id,
                maKH: finalDoc.maKH,
                maSP: finalDoc.maSP,
                hanhDong: finalDoc.hanhDong,
                thoiGian: finalDoc.thoiGian,
                thoiGianUTC: new Date(finalDoc.thoiGian).toISOString(),
                thoiGianLocal: finalMetadataForResponse?.thoiGianLocal || thoiGianLocal,
                metadata: finalMetadataForResponse || finalMetadata
            }
        });
    } catch (error) {
        console.error('❌ Track behavior error:', error);
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({ 
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Get recommendations for a user
exports.getRecommendations = async (req, res) => {
    try {
        const { maKH } = req.query;
        const limit = parseInt(req.query.limit) || 10;
        const model = req.query.model || 'hybrid'; // 'cf', 'rule', 'gnn', 'hybrid'

        if (!maKH) {
            // Nếu không có maKH, trả về sản phẩm phổ biến
            try {
                const response = await axios.get(`${PRODUCT_SERVICE_URL}/api/public/sanphams?limit=${limit}`);
                return res.json({
                    success: true,
                    model: 'popular',
                    products: response.data || [],
                    count: (response.data || []).length
                });
            } catch (err) {
                return res.status(500).json({ error: 'Failed to fetch popular products' });
            }
        }

        let productIds = [];
        let actualModel = model; // Track model thực tế được sử dụng

        switch (model) {
            case 'cf':
                productIds = await recommendationService.collaborativeFiltering(maKH, limit);
                // Nếu CF không có kết quả, fallback sang Rule-based (dựa trên category)
                if (productIds.length === 0) {
                    console.log('⚠️ CF returned no products. Falling back to Rule-based recommendation...');
                    productIds = await recommendationService.ruleBasedRecommendation(maKH, limit);
                    actualModel = 'cf+rule'; // Đánh dấu đã fallback
                }
                break;
            case 'rule':
                productIds = await recommendationService.ruleBasedRecommendation(maKH, limit);
                break;
            case 'gnn':
                productIds = await recommendationService.gnnRecommendation(maKH, limit);
                break;
            case 'hybrid':
            default:
                productIds = await recommendationService.getHybridRecommendations(maKH, limit);
                break;
        }

        // Nếu vẫn không có sản phẩm, fallback sang Rule-based (dựa trên category user đã xem)
        if (productIds.length === 0 && model === 'cf') {
            console.log('⚠️ All models returned no products. Trying Rule-based as final fallback...');
            productIds = await recommendationService.ruleBasedRecommendation(maKH, limit);
            actualModel = 'rule';
        }

        // Nếu vẫn không có sản phẩm (user không có hành vi), trả về sản phẩm random
        if (productIds.length === 0) {
            console.log('⚠️ User has no behavior. Returning random products...');
            try {
                const response = await axios.get(`${PRODUCT_SERVICE_URL}/api/public/sanphams`);
                const allProducts = response.data || [];
                
                // Shuffle array để random
                const shuffled = allProducts.sort(() => Math.random() - 0.5);
                
                // Lấy random products
                productIds = shuffled
                    .slice(0, limit)
                    .map(p => p._id.toString());
                
                actualModel = 'random';
                console.log(`✅ Returning ${productIds.length} random products`);
            } catch (err) {
                console.error('❌ Failed to fetch random products:', err.message);
                return res.status(500).json({ 
                    error: 'Failed to fetch random products',
                    message: err.message 
                });
            }
        }

        // Bổ sung sản phẩm nếu chưa đủ limit (chỉ cho hybrid model)
        if (model === 'hybrid' && productIds.length < limit) {
            try {
                const response = await axios.get(`${PRODUCT_SERVICE_URL}/api/public/sanphams?limit=${limit * 2}`);
                const allProducts = response.data || [];
                const existingIds = productIds.map(id => id.toString());
                const additionalProducts = allProducts
                    .filter(p => !existingIds.includes(p._id.toString()))
                    .slice(0, limit - productIds.length);
                
                productIds = [...productIds, ...additionalProducts.map(p => p._id.toString())];
            } catch (err) {
                console.error('Failed to fetch additional products:', err.message);
            }
        }

        // Lấy thông tin chi tiết sản phẩm (chỉ lấy những product còn tồn tại)
        const products = [];
        const validProductIds = productIds.slice(0, limit);
        
        // Fetch song song để tăng tốc độ
        const productPromises = validProductIds.map(async (productId) => {
            try {
                // Sử dụng endpoint đúng: /api/sanphams/:id (không có /public)
                const response = await axios.get(`${PRODUCT_SERVICE_URL}/api/sanphams/${productId}`, {
                    timeout: 5000 // Timeout 5 giây
                });
                return response.data;
            } catch (err) {
                // Chỉ log warning, không throw error để không làm gián đoạn recommendation
                if (err.response?.status === 404) {
                    // Product không tồn tại (có thể đã bị xóa) - không log để tránh spam
                    return null;
                } else {
                    console.warn(`⚠️ Failed to fetch product ${productId}:`, err.message);
                    return null;
                }
            }
        });

        // Chờ tất cả requests hoàn thành
        const productResults = await Promise.all(productPromises);
        
        // Lọc bỏ các product null (không tồn tại)
        const validProducts = productResults.filter(p => p !== null);
        products.push(...validProducts);

        res.json({
            success: true,
            model: actualModel, // Trả về model thực tế được sử dụng (có thể là 'cf+rule' nếu fallback)
            originalModel: model, // Model được yêu cầu ban đầu
            products,
            count: products.length
        });
    } catch (error) {
        console.error('Get recommendations error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get user behavior history
exports.getUserBehavior = async (req, res) => {
    try {
        const { maKH } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        const behaviors = await UserBehavior.find({ maKH })
            .sort({ thoiGian: -1 })
            .limit(limit)
            .lean();

        res.json({
            success: true,
            data: behaviors,
            count: behaviors.length
        });
    } catch (error) {
        console.error('Get user behavior error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get statistics for recommendation system
exports.getStats = async (req, res) => {
    try {
        const totalBehaviors = await UserBehavior.countDocuments();
        const uniqueUsers = await UserBehavior.distinct('maKH').then(users => users.length);
        const uniqueProducts = await UserBehavior.distinct('maSP').then(products => products.length);
        
        const behaviorTypes = await UserBehavior.aggregate([
            {
                $group: {
                    _id: '$hanhDong',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            stats: {
                totalBehaviors,
                uniqueUsers,
                uniqueProducts,
                behaviorTypes: behaviorTypes.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get detailed analytics for admin dashboard
exports.getAnalytics = async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // Total stats
        const totalBehaviors = await UserBehavior.countDocuments();
        const uniqueUsers = await UserBehavior.distinct('maKH').then(users => users.length);
        const uniqueProducts = await UserBehavior.distinct('maSP').then(products => products.length);

        // Recent stats (last N days)
        const recentBehaviors = await UserBehavior.countDocuments({ thoiGian: { $gte: startDate } });
        const recentUsers = await UserBehavior.distinct('maKH', { thoiGian: { $gte: startDate } }).then(users => users.length);

        // Behavior types breakdown
        const behaviorTypes = await UserBehavior.aggregate([
            {
                $group: {
                    _id: '$hanhDong',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Events over time (daily)
        let eventsOverTime = [];
        try {
            eventsOverTime = await UserBehavior.aggregate([
                {
                    $match: { 
                        thoiGian: { 
                            $gte: startDate,
                            $exists: true,
                            $ne: null
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$thoiGian' }
                        },
                        count: { $sum: 1 },
                        views: { $sum: { $cond: [{ $eq: ['$hanhDong', 'view'] }, 1, 0] } },
                        clicks: { $sum: { $cond: [{ $eq: ['$hanhDong', 'click'] }, 1, 0] } },
                        addToCart: { $sum: { $cond: [{ $eq: ['$hanhDong', 'add_to_cart'] }, 1, 0] } },
                        purchases: { $sum: { $cond: [{ $eq: ['$hanhDong', 'purchase'] }, 1, 0] } }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
        } catch (error) {
            console.error('Error aggregating events over time:', error);
            eventsOverTime = [];
        }
        
        // Ensure eventsOverTime is always an array
        if (!Array.isArray(eventsOverTime)) {
            eventsOverTime = [];
        }

        // Top products by views
        const topProducts = await UserBehavior.aggregate([
            {
                $group: {
                    _id: '$maSP',
                    views: { $sum: { $cond: [{ $eq: ['$hanhDong', 'view'] }, 1, 0] } },
                    clicks: { $sum: { $cond: [{ $eq: ['$hanhDong', 'click'] }, 1, 0] } },
                    addToCart: { $sum: { $cond: [{ $eq: ['$hanhDong', 'add_to_cart'] }, 1, 0] } },
                    total: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } },
            { $limit: 10 }
        ]);

        // Top users by activity
        const topUsers = await UserBehavior.aggregate([
            {
                $group: {
                    _id: '$maKH',
                    total: { $sum: 1 },
                    views: { $sum: { $cond: [{ $eq: ['$hanhDong', 'view'] }, 1, 0] } },
                    clicks: { $sum: { $cond: [{ $eq: ['$hanhDong', 'click'] }, 1, 0] } },
                    addToCart: { $sum: { $cond: [{ $eq: ['$hanhDong', 'add_to_cart'] }, 1, 0] } }
                }
            },
            { $sort: { total: -1 } },
            { $limit: 10 }
        ]);

        // Category breakdown
        const categoryStats = await UserBehavior.aggregate([
            {
                $match: { 'metadata.category': { $exists: true, $ne: '' } }
            },
            {
                $group: {
                    _id: '$metadata.category',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            success: true,
            analytics: {
                overview: {
                    totalBehaviors: totalBehaviors || 0,
                    uniqueUsers: uniqueUsers || 0,
                    uniqueProducts: uniqueProducts || 0,
                    recentBehaviors: recentBehaviors || 0,
                    recentUsers: recentUsers || 0
                },
                behaviorTypes: behaviorTypes.reduce((acc, item) => {
                    if (item._id) {
                        acc[item._id] = item.count || 0;
                    }
                    return acc;
                }, {}),
                eventsOverTime: Array.isArray(eventsOverTime) ? eventsOverTime : [],
                topProducts: Array.isArray(topProducts) ? topProducts : [],
                topUsers: Array.isArray(topUsers) ? topUsers : [],
                categoryStats: Array.isArray(categoryStats) ? categoryStats : []
            }
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Update behaviors without category - Cập nhật hành vi thiếu category
exports.updateBehaviorsCategory = async (req, res) => {
    try {
        console.log('🔄 Starting to update behaviors without category...');
        
        // Tìm tất cả hành vi không có category hoặc category rỗng
        // Kiểm tra cả trường hợp metadata không tồn tại
        const allBehaviors = await UserBehavior.find({}).limit(100).lean();
        console.log(`📊 Total behaviors to check: ${allBehaviors.length}`);
        
        // Filter behaviors không có category hợp lệ
        const behaviorsWithoutCategory = allBehaviors.filter(b => {
            const category = b.metadata?.category;
            return !category || category.trim() === '' || category === null;
        });

        console.log(`📊 Found ${behaviorsWithoutCategory.length} behaviors without valid category`);
        console.log(`📊 Sample behaviors:`, behaviorsWithoutCategory.slice(0, 3).map(b => ({
            _id: b._id,
            maSP: b.maSP,
            hasMetadata: !!b.metadata,
            category: b.metadata?.category
        })));

        let updated = 0;
        let failed = 0;

        for (const behavior of behaviorsWithoutCategory) {
            try {
                // Lấy category từ Product Service
                const productResponse = await axios.get(`${PRODUCT_SERVICE_URL}/api/sanphams/${behavior.maSP}`, {
                    timeout: 3000
                });

                if (productResponse.data && productResponse.data.maDM) {
                    let category = '';
                    if (typeof productResponse.data.maDM === 'object' && productResponse.data.maDM.tenDM) {
                        category = productResponse.data.maDM.tenDM;
                    }

                    if (category) {
                        // Cập nhật metadata.category
                        await UserBehavior.updateOne(
                            { _id: behavior._id },
                            { $set: { 'metadata.category': category } }
                        );
                        updated++;
                        console.log(`✅ Updated behavior ${behavior._id} with category: ${category}`);
                    } else {
                        failed++;
                    }
                } else {
                    failed++;
                }
            } catch (err) {
                console.warn(`⚠️ Failed to update behavior ${behavior._id}:`, err.message);
                failed++;
            }
        }

        res.json({
            success: true,
            message: `Updated ${updated} behaviors, ${failed} failed`,
            updated,
            failed,
            total: behaviorsWithoutCategory.length
        });
    } catch (error) {
        console.error('❌ Update behaviors category error:', error);
        res.status(500).json({ error: error.message });
    }
};

