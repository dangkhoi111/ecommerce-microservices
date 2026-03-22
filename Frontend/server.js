require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const axios = require('axios');
var expressLayouts = require('express-ejs-layouts');
const app = express();
const PORT = process.env.PORT || 3000;
const route=require('./routes');

const ANALYTICS_URL = (process.env.ANALYTICS_SERVICE_URL || '').replace(/\/$/, '');
const TRACKING_API_KEY = process.env.TRACKING_API_KEY;
const RECOMMENDATION_URL = (process.env.RECOMMENDATION_SERVICE_URL || '').replace(/\/$/, '');
const RECOMMENDATION_API_KEY = process.env.RECOMMENDATION_API_KEY;

// Cấu hình EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout','backend');



// Middleware
app.use(session({
    secret: 'webbanhang-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // set to true if using HTTPS
}));
app.use((req, res, next) => {
    if (req.session.khachHang) {
        const kh = req.session.khachHang;
        res.locals.hoTen = kh.hoTen;
        res.locals.userContext = {
            maKH: kh._id ? kh._id.toString() : null,
            hoTen: kh.hoTen,
            email: kh.email || null
        };
    } else {
        res.locals.hoTen = null;  // Nếu không có thông tin user, đặt hoTen là null
        res.locals.userContext = null;
    }
    next();  // Tiếp tục với middleware hoặc route tiếp theo
});
app.use(express.urlencoded({ extended: true }));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/session/login', (req, res) => {
    const user = req.body;
    const userId = user && (user._id || user.id);
    if (!userId) {
        return res.status(400).json({ error: 'Thiếu thông tin người dùng' });
    }
    req.session.khachHang = {
        _id: userId,
        hoTen: user.hoTen,
        email: user.email || null,
        sdt: user.sdt || null
    };
    res.json({ status: 'ok' });
});

app.post('/api/session/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Destroy session error', err);
            return res.status(500).json({ error: 'Không thể đăng xuất' });
        }
        res.clearCookie('connect.sid');
        res.json({ status: 'ok' });
    });
});

app.post('/api/track', async (req, res) => {
    if (!ANALYTICS_URL || !TRACKING_API_KEY) {
        return res.status(503).json({ error: 'Tracking service is not configured' });
    }
    try {
        await axios.post(`${ANALYTICS_URL}/api/events`, req.body, {
            headers: { 'x-api-key': TRACKING_API_KEY }
        });
        res.status(204).end();
    } catch (error) {
        console.error('Failed to proxy tracking event', error.message);
        res.status(error.response?.status || 500).json({ error: 'Failed to track event' });
    }
});

app.get('/api/recommendations/user', async (req, res) => {
    if (!RECOMMENDATION_URL || !RECOMMENDATION_API_KEY) {
        return res.status(503).json({ error: 'Recommendation service is not configured' });
    }
    if (!req.session.khachHang) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const userId = req.session.khachHang._id?.toString();
    if (!userId) {
        return res.json({ recommendations: [] });
    }

    try {
        console.log(`[Frontend API] Fetching recommendations for user: ${userId}`);
        console.log(`[Frontend API] Recommendation service URL: ${RECOMMENDATION_URL}`);
        const response = await axios.get(`${RECOMMENDATION_URL}/api/recommendations/user/${userId}`, {
            headers: { 'x-internal-key': RECOMMENDATION_API_KEY }
        });
        console.log(`[Frontend API] Received recommendations:`, {
            source: response.data?.source,
            count: response.data?.recommendations?.length || 0
        });
        res.json(response.data);
    } catch (error) {
        console.error('[Frontend API] Failed to fetch recommendations:', error.message);
        if (error.response) {
            console.error('[Frontend API] Response status:', error.response.status);
            console.error('[Frontend API] Response data:', error.response.data);
        }
        res.status(error.response?.status || 500).json({ error: 'Failed to fetch recommendations' });
    }
});

// Admin Dashboard Statistics API
app.get('/api/admin/stats', async (req, res) => {
    try {
        const USER_SERVICE_URL = 'http://localhost:3002';
        const ORDER_SERVICE_URL = 'http://localhost:3006';
        
        // Calculate date ranges
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        
        // Get all users
        const usersResponse = await axios.get(`${USER_SERVICE_URL}/api/auth/`, {
            headers: { Authorization: `Bearer ${req.headers.authorization?.split(' ')[1] || ''}` }
        }).catch(() => ({ data: { success: true, data: [] } }));
        
        const allUsers = usersResponse.data?.data || [];
        const totalUsers = allUsers.length;
        
        // Users created this month
        const usersThisMonth = allUsers.filter(user => {
            const createdAt = new Date(user.createdAt || user.id);
            return createdAt >= currentMonthStart;
        }).length;
        
        // Users created last month
        const usersLastMonth = allUsers.filter(user => {
            const createdAt = new Date(user.createdAt || user.id);
            return createdAt >= lastMonthStart && createdAt <= lastMonthEnd;
        }).length;
        
        // Calculate user growth percentage
        const userGrowthPercent = usersLastMonth > 0 
            ? Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100)
            : usersThisMonth > 0 ? 100 : 0;
        
        // Get all orders
        const ordersResponse = await axios.get(`${ORDER_SERVICE_URL}/api/orders/admin/all`).catch(() => ({ data: [] }));
        const allOrders = ordersResponse.data || [];
        const totalOrders = allOrders.length;
        
        // Orders created this month
        const ordersThisMonth = allOrders.filter(order => {
            const createdAt = new Date(order.createdAt || order.NgayDat);
            return createdAt >= currentMonthStart;
        }).length;
        
        // Orders created last month
        const ordersLastMonth = allOrders.filter(order => {
            const createdAt = new Date(order.createdAt || order.NgayDat);
            return createdAt >= lastMonthStart && createdAt <= lastMonthEnd;
        }).length;
        
        // Calculate order growth percentage
        const orderGrowthPercent = ordersLastMonth > 0
            ? Math.round(((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100)
            : ordersThisMonth > 0 ? 100 : 0;
        
        // Calculate revenue
        const totalRevenue = allOrders.reduce((sum, order) => {
            return sum + (parseFloat(order.TongTien) || 0);
        }, 0);
        
        // Revenue this month
        const revenueThisMonth = allOrders
            .filter(order => {
                const createdAt = new Date(order.createdAt || order.NgayDat);
                return createdAt >= currentMonthStart;
            })
            .reduce((sum, order) => sum + (parseFloat(order.TongTien) || 0), 0);
        
        // Revenue last month
        const revenueLastMonth = allOrders
            .filter(order => {
                const createdAt = new Date(order.createdAt || order.NgayDat);
                return createdAt >= lastMonthStart && createdAt <= lastMonthEnd;
            })
            .reduce((sum, order) => sum + (parseFloat(order.TongTien) || 0), 0);
        
        // Calculate revenue growth percentage
        const revenueGrowthPercent = revenueLastMonth > 0
            ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
            : revenueThisMonth > 0 ? 100 : 0;
        
        // Get all sellers (stores) - count from users with seller role
        const allSellers = allUsers.filter(user => user.role === 'seller' || user.userBanId);
        const totalStores = allSellers.length;
        
        // Stores created this month
        const storesThisMonth = Array.isArray(allSellers) ? allSellers.filter(seller => {
            const createdAt = new Date(seller.createdAt || seller._id);
            return createdAt >= currentMonthStart;
        }).length : 0;
        
        // Stores created last month
        const storesLastMonth = Array.isArray(allSellers) ? allSellers.filter(seller => {
            const createdAt = new Date(seller.createdAt || seller._id);
            return createdAt >= lastMonthStart && createdAt <= lastMonthEnd;
        }).length : 0;
        
        // Calculate store growth percentage
        const storeGrowthPercent = storesLastMonth > 0
            ? Math.round(((storesThisMonth - storesLastMonth) / storesLastMonth) * 100)
            : storesThisMonth > 0 ? 100 : 0;
        
        // Get recent activities
        const recentUsers = allUsers
            .sort((a, b) => new Date(b.createdAt || b.id) - new Date(a.createdAt || a.id))
            .slice(0, 5)
            .map(user => ({
                type: 'user',
                message: 'Người dùng mới đăng ký',
                time: new Date(user.createdAt || user.id),
                count: 1
            }));
        
        const recentOrders = allOrders
            .sort((a, b) => new Date(b.createdAt || b.NgayDat) - new Date(a.createdAt || a.NgayDat))
            .slice(0, 5)
            .map(order => ({
                type: 'order',
                message: 'Đơn hàng mới được tạo',
                time: new Date(order.createdAt || order.NgayDat),
                count: 1
            }));
        
        const recentStores = Array.isArray(allSellers) ? allSellers
            .sort((a, b) => new Date(b.createdAt || b._id) - new Date(a.createdAt || a._id))
            .slice(0, 5)
            .map(seller => ({
                type: 'store',
                message: 'Cửa hàng mới được phê duyệt',
                time: new Date(seller.createdAt || seller._id),
                count: 1
            })) : [];
        
        // Combine and sort recent activities
        const recentActivities = [...recentUsers, ...recentOrders, ...recentStores]
            .sort((a, b) => b.time - a.time)
            .slice(0, 10)
            .map(activity => {
                const timeDiff = now - activity.time;
                const minutes = Math.floor(timeDiff / 60000);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);
                
                let timeText = '';
                if (minutes < 1) timeText = 'Vừa xong';
                else if (minutes < 60) timeText = `${minutes} phút trước`;
                else if (hours < 24) timeText = `${hours} giờ trước`;
                else timeText = `${days} ngày trước`;
                
                return {
                    ...activity,
                    timeText
                };
            });
        
        res.json({
            success: true,
            stats: {
                users: {
                    total: totalUsers,
                    growth: userGrowthPercent,
                    thisMonth: usersThisMonth,
                    lastMonth: usersLastMonth
                },
                orders: {
                    total: totalOrders,
                    growth: orderGrowthPercent,
                    thisMonth: ordersThisMonth,
                    lastMonth: ordersLastMonth
                },
                stores: {
                    total: totalStores,
                    growth: storeGrowthPercent,
                    thisMonth: storesThisMonth,
                    lastMonth: storesLastMonth
                },
                revenue: {
                    total: totalRevenue,
                    growth: revenueGrowthPercent,
                    thisMonth: revenueThisMonth,
                    lastMonth: revenueLastMonth
                },
                recentActivities
            }
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Reports & Analytics API with AI Insights
app.get('/api/admin/reports', async (req, res) => {
    try {
        const { startDate, endDate, days = 30 } = req.query;
        const USER_SERVICE_URL = 'http://localhost:3002';
        const ORDER_SERVICE_URL = 'http://localhost:3006';
        const PRODUCT_SERVICE_URL = 'http://localhost:3001';
        
        // Calculate date range
        let dateStart, dateEnd;
        if (startDate && endDate) {
            dateStart = new Date(startDate);
            dateEnd = new Date(endDate);
            dateEnd.setHours(23, 59, 59, 999);
        } else {
            dateEnd = new Date();
            dateStart = new Date();
            dateStart.setDate(dateStart.getDate() - parseInt(days));
        }
        
        // Previous period for comparison
        const periodDays = Math.ceil((dateEnd - dateStart) / (1000 * 60 * 60 * 24));
        const prevDateStart = new Date(dateStart);
        prevDateStart.setDate(prevDateStart.getDate() - periodDays);
        const prevDateEnd = new Date(dateStart);
        
        // Get all orders
        const ordersResponse = await axios.get(`${ORDER_SERVICE_URL}/api/orders/admin/all`).catch(() => ({ data: [] }));
        const allOrders = ordersResponse.data || [];
        
        // Filter orders by date range
        const ordersInRange = allOrders.filter(order => {
            const orderDate = new Date(order.createdAt || order.NgayDat);
            return orderDate >= dateStart && orderDate <= dateEnd;
        });
        
        const ordersPrevRange = allOrders.filter(order => {
            const orderDate = new Date(order.createdAt || order.NgayDat);
            return orderDate >= prevDateStart && orderDate < prevDateEnd;
        });
        
        // Calculate revenue
        const totalRevenue = ordersInRange.reduce((sum, order) => sum + (parseFloat(order.TongTien) || 0), 0);
        const prevRevenue = ordersPrevRange.reduce((sum, order) => sum + (parseFloat(order.TongTien) || 0), 0);
        const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : (totalRevenue > 0 ? 100 : 0);
        
        // Calculate orders
        const totalOrders = ordersInRange.length;
        const prevOrders = ordersPrevRange.length;
        const ordersGrowth = prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders * 100) : (totalOrders > 0 ? 100 : 0);
        
        // Get users
        const usersResponse = await axios.get(`${USER_SERVICE_URL}/api/auth/`, {
            headers: { Authorization: `Bearer ${req.headers.authorization?.split(' ')[1] || ''}` }
        }).catch(() => ({ data: { success: true, data: [] } }));
        const allUsers = usersResponse.data?.data || [];
        
        const newCustomers = allUsers.filter(user => {
            const userDate = new Date(user.createdAt || user.id);
            return userDate >= dateStart && userDate <= dateEnd;
        }).length;
        
        const prevCustomers = allUsers.filter(user => {
            const userDate = new Date(user.createdAt || user.id);
            return userDate >= prevDateStart && userDate < prevDateEnd;
        }).length;
        const customersGrowth = prevCustomers > 0 ? ((newCustomers - prevCustomers) / prevCustomers * 100) : (newCustomers > 0 ? 100 : 0);
        
        // Get stores
        const allSellers = allUsers.filter(user => user.role === 'seller' || user.userBanId);
        const newStores = allSellers.filter(seller => {
            const sellerDate = new Date(seller.createdAt || seller._id);
            return sellerDate >= dateStart && sellerDate <= dateEnd;
        }).length;
        const prevStores = allSellers.filter(seller => {
            const sellerDate = new Date(seller.createdAt || seller._id);
            return sellerDate >= prevDateStart && sellerDate < prevDateEnd;
        }).length;
        const storesGrowth = prevStores > 0 ? ((newStores - prevStores) / prevStores * 100) : (newStores > 0 ? 100 : 0);
        
        // Revenue by day for chart
        const revenueByDay = {};
        ordersInRange.forEach(order => {
            const day = new Date(order.createdAt || order.NgayDat).toISOString().split('T')[0];
            revenueByDay[day] = (revenueByDay[day] || 0) + (parseFloat(order.TongTien) || 0);
        });
        
        // Get top products (from orders with orderItems)
        const productStats = {};
        ordersInRange.forEach(order => {
            if (order.orderItems && Array.isArray(order.orderItems)) {
                order.orderItems.forEach(item => {
                    const productName = item.TenSp || 'Unknown';
                    if (!productStats[productName]) {
                        productStats[productName] = {
                            name: productName,
                            sold: 0,
                            revenue: 0,
                            orders: new Set()
                        };
                    }
                    productStats[productName].sold += (item.SoLuong || 0);
                    productStats[productName].revenue += (parseFloat(item.Gia) || 0) * (item.SoLuong || 0);
                    productStats[productName].orders.add(order._id?.toString());
                });
            }
        });
        
        const topProducts = Object.values(productStats)
            .map(p => ({
                name: p.name,
                sold: p.sold,
                revenue: p.revenue,
                orders: p.orders.size
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        
        // Category stats (simplified - would need product service integration)
        const categoryStats = {
            'Điện thoại': 45,
            'Laptop': 30,
            'Phụ kiện': 15,
            'Khác': 10
        };
        
        // Calculate metrics
        const conversionRate = totalOrders > 0 ? (totalOrders / (allUsers.length || 1) * 100) : 0;
        const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
        const retentionRate = 78; // Would need more complex calculation
        
        // AI Insights (simulated - in production would use actual AI)
        const aiInsights = generateAIInsights({
            revenueGrowth,
            ordersGrowth,
            customersGrowth,
            topProducts,
            conversionRate,
            avgOrderValue
        });
        
        res.json({
            success: true,
            data: {
                overview: {
                    revenue: {
                        total: totalRevenue,
                        growth: revenueGrowth,
                        prev: prevRevenue
                    },
                    orders: {
                        total: totalOrders,
                        growth: ordersGrowth,
                        prev: prevOrders
                    },
                    customers: {
                        total: newCustomers,
                        growth: customersGrowth,
                        prev: prevCustomers
                    },
                    stores: {
                        total: newStores,
                        growth: storesGrowth,
                        prev: prevStores
                    }
                },
                metrics: {
                    conversionRate,
                    avgOrderValue,
                    retentionRate
                },
                charts: {
                    revenueByDay: Object.entries(revenueByDay).sort((a, b) => a[0].localeCompare(b[0])),
                    categoryStats
                },
                topProducts,
                aiInsights
            }
        });
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// AI Insights Generator
function generateAIInsights(data) {
    const insights = [];
    
    // Revenue insight
    if (data.revenueGrowth > 20) {
        insights.push({
            type: 'success',
            icon: 'fa-chart-line',
            title: 'Doanh thu tăng trưởng mạnh',
            message: `Doanh thu tăng ${data.revenueGrowth.toFixed(1)}% so với kỳ trước. Đây là dấu hiệu tích cực cho thấy chiến lược marketing đang hiệu quả.`,
            action: 'Xem chi tiết chiến lược marketing',
            priority: 'high'
        });
    } else if (data.revenueGrowth < 0) {
        insights.push({
            type: 'warning',
            icon: 'fa-exclamation-triangle',
            title: 'Doanh thu giảm',
            message: `Doanh thu giảm ${Math.abs(data.revenueGrowth).toFixed(1)}% so với kỳ trước. Cần xem xét lại chiến lược bán hàng và marketing.`,
            action: 'Phân tích nguyên nhân',
            priority: 'high'
        });
    }
    
    // Conversion rate insight
    if (data.conversionRate < 2) {
        insights.push({
            type: 'info',
            icon: 'fa-lightbulb',
            title: 'Tỷ lệ chuyển đổi thấp',
            message: `Tỷ lệ chuyển đổi hiện tại là ${data.conversionRate.toFixed(2)}%. Cân nhắc tối ưu hóa trải nghiệm người dùng và cải thiện landing pages.`,
            action: 'Tối ưu hóa UX',
            priority: 'medium'
        });
    }
    
    // Top product insight
    if (data.topProducts && data.topProducts.length > 0) {
        const topProduct = data.topProducts[0];
        insights.push({
            type: 'success',
            icon: 'fa-star',
            title: 'Sản phẩm bán chạy nhất',
            message: `${topProduct.name} đang là sản phẩm bán chạy nhất với doanh thu ${(topProduct.revenue / 1000000).toFixed(1)}M VNĐ. Cân nhắc tăng inventory và quảng bá thêm.`,
            action: 'Xem chi tiết sản phẩm',
            priority: 'medium'
        });
    }
    
    // Average order value insight
    if (data.avgOrderValue < 200000) {
        insights.push({
            type: 'info',
            icon: 'fa-shopping-cart',
            title: 'Giá trị đơn hàng trung bình',
            message: `Giá trị đơn hàng trung bình là ${data.avgOrderValue.toLocaleString('vi-VN')}đ. Cân nhắc cross-selling và upselling để tăng giá trị đơn hàng.`,
            action: 'Thiết lập cross-selling',
            priority: 'low'
        });
    }
    
    return insights;
}

app.get('/api/recommendations/guest', async (_req, res) => {
    if (!RECOMMENDATION_URL || !RECOMMENDATION_API_KEY) {
        return res.status(503).json({ error: 'Recommendation service is not configured' });
    }
    try {
        const response = await axios.get(`${RECOMMENDATION_URL}/api/recommendations/guest`, {
            headers: { 'x-internal-key': RECOMMENDATION_API_KEY }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Failed to fetch guest recommendations', error.message);
        res.status(error.response?.status || 500).json({ error: 'Failed to fetch recommendations' });
    }
});



// Khởi động server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 

app.use('/',route);