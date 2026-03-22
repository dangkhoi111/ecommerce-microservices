# Recommendation Service

Hệ thống gợi ý sản phẩm với 3 mô hình: Collaborative Filtering (CF), Rule-based, và GNN (Graph Neural Network).

## Cài đặt

```bash
npm install
```

## Cấu hình

Tạo file `.env`:

```
PORT=3011
MONGODB_URI=mongodb://localhost:27017/ecommerce
PRODUCT_SERVICE_URL=http://localhost:3001
```

## Chạy service

```bash
npm start
```

## API Endpoints

### 1. Track User Behavior
**POST** `/api/recommendation/track`

Lưu hành vi người dùng (xem, click, thêm giỏ, mua).

**Request Body:**
```json
{
  "maKH": "user_id",
  "maSP": "product_id",
  "hanhDong": "view|click|add_to_cart|purchase",
  "metadata": {
    "category": "Danh mục",
    "giaGiam": 1000000,
    "giaGoc": 1200000
  }
}
```

### 2. Get Recommendations
**GET** `/api/recommendation/recommendations`

Lấy danh sách sản phẩm gợi ý.

**Query Parameters:**
- `maKH` (optional): Mã khách hàng
- `limit` (optional, default: 10): Số lượng sản phẩm
- `model` (optional, default: 'hybrid'): Mô hình gợi ý ('cf', 'rule', 'gnn', 'hybrid')

**Response:**
```json
{
  "success": true,
  "model": "hybrid",
  "products": [...],
  "count": 10
}
```

### 3. Get User Behavior History
**GET** `/api/recommendation/behavior/:maKH`

Lấy lịch sử hành vi của người dùng.

### 4. Get Statistics
**GET** `/api/recommendation/stats`

Lấy thống kê hệ thống gợi ý.

## Mô hình gợi ý

### 1. Collaborative Filtering (CF)
- Tìm người dùng tương tự dựa trên hành vi xem sản phẩm
- Gợi ý sản phẩm mà người dùng tương tự đã xem

### 2. Rule-Based
- Gợi ý dựa trên luật:
  - Sản phẩm cùng danh mục
  - Sản phẩm cùng khoảng giá
  - Sản phẩm phổ biến

### 3. GNN (Graph Neural Network)
- Xây dựng đồ thị User-Product-User
- Tìm sản phẩm liên quan qua mạng lưới người dùng

### 4. Hybrid
- Kết hợp 3 mô hình với trọng số:
  - CF: 40%
  - Rule-based: 30%
  - GNN: 30%

## Database Schema

### UserBehavior
```javascript
{
  maKH: ObjectId,        // Mã khách hàng
  maSP: ObjectId,        // Mã sản phẩm
  hanhDong: String,      // 'view', 'click', 'add_to_cart', 'purchase'
  thoiGian: Date,        // Thời gian
  metadata: {
    category: String,
    giaGiam: Number,
    giaGoc: Number,
    duration: Number,
    referrer: String
  }
}
```

