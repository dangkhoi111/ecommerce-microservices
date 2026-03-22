# Kiến trúc Hệ thống Recommendation

## Nguyên tắc hoạt động

**Hệ thống chỉ lưu hành vi người dùng vào MongoDB, sau đó từ hành vi đó tính toán và xuất ra các sản phẩm recommendation.**

## Luồng dữ liệu

```
1. User tương tác với sản phẩm (click, view, add_to_cart, purchase)
   ↓
2. Frontend gọi API: POST /api/recommendation/track
   ↓
3. Lưu hành vi vào MongoDB Collection: userbehaviors
   {
     maKH: ObjectId (hoặc null nếu chưa đăng nhập),
     maSP: ObjectId,
     hanhDong: 'view' | 'click' | 'add_to_cart' | 'purchase',
     thoiGian: Date,
     metadata: {
       category: String,
       giaGiam: Number,
       giaGoc: Number
     }
   }
   ↓
4. Khi cần gợi ý: GET /api/recommendation/recommendations?maKH=xxx
   ↓
5. Recommendation Service đọc TẤT CẢ dữ liệu từ Collection userbehaviors
   ↓
6. Tính toán recommendation dựa trên 3 mô hình (CHỈ DÙNG DỮ LIỆU TỪ HÀNH VI)
   ↓
7. Trả về danh sách maSP (chỉ ID sản phẩm)
   ↓
8. Controller gọi Product Service để lấy thông tin chi tiết sản phẩm
   ↓
9. Trả về danh sách sản phẩm đầy đủ cho Frontend
```

## 3 Mô hình Recommendation (CHỈ DÙNG DỮ LIỆU TỪ HÀNH VI)

### 1. Collaborative Filtering (CF)

**Nguồn dữ liệu:** Chỉ từ Collection `userbehaviors`

**Cách hoạt động:**
1. Lấy danh sách sản phẩm user đã xem từ `userbehaviors`
2. Tìm người dùng khác đã xem các sản phẩm tương tự (từ `userbehaviors`)
3. Tính độ tương đồng giữa các user
4. Lấy sản phẩm mà user tương tự đã xem nhưng user hiện tại chưa xem
5. Tính điểm dựa trên số lần tương tác và loại hành động (purchase > add_to_cart > click > view)

**Không gọi API Product Service trong quá trình tính toán**

### 2. Rule-Based Recommendation

**Nguồn dữ liệu:** Chỉ từ Collection `userbehaviors`

**Các luật:**

**Rule 1: Cùng danh mục**
- Lấy danh mục từ `metadata.category` của hành vi user đã xem
- Tìm sản phẩm cùng danh mục từ hành vi của user khác
- Sắp xếp theo số lần được xem

**Rule 2: Cùng khoảng giá**
- Tính giá trung bình từ `metadata.giaGiam` của hành vi user đã xem
- Tìm sản phẩm cùng khoảng giá (50% - 150%) từ hành vi của user khác
- Sắp xếp theo số lần được xem

**Rule 3: Sản phẩm phổ biến**
- Tính điểm phổ biến từ hành vi của TẤT CẢ user:
  - view: 1 điểm
  - click: 2 điểm
  - add_to_cart: 3 điểm
  - purchase: 5 điểm
- Sắp xếp theo điểm từ cao xuống thấp

**Không gọi API Product Service trong quá trình tính toán**

### 3. Graph Neural Network (GNN) - Simplified

**Nguồn dữ liệu:** Chỉ từ Collection `userbehaviors`

**Cách hoạt động:**
1. Xây dựng đồ thị: User → Product → User
2. Tìm các user khác đã xem sản phẩm giống user hiện tại
3. Tìm sản phẩm mà các user đó đã xem (nhưng user hiện tại chưa xem)
4. Tính trọng số dựa trên:
   - Số sản phẩm chung
   - Loại hành động (purchase có trọng số cao hơn view)

**Không gọi API Product Service trong quá trình tính toán**

### 4. Hybrid (Kết hợp 3 mô hình)

- CF: 40% trọng số
- Rule-based: 30% trọng số
- GNN: 30% trọng số

## Lưu ý quan trọng

1. **Tất cả tính toán recommendation CHỈ dùng dữ liệu từ Collection `userbehaviors`**
2. **Product Service chỉ được gọi ở Controller để lấy thông tin chi tiết sản phẩm SAU KHI đã có danh sách ID**
3. **Không có dữ liệu nào khác được lưu trong recommendation service ngoài hành vi người dùng**
4. **Metadata trong hành vi (category, giaGiam) được lưu để phục vụ rule-based, không cần query Product Service**

## Database Schema

### Collection: userbehaviors

```javascript
{
  _id: ObjectId,
  maKH: ObjectId | null,  // null nếu user chưa đăng nhập
  maSP: ObjectId,          // Mã sản phẩm
  hanhDong: String,        // 'view', 'click', 'add_to_cart', 'purchase'
  thoiGian: Date,          // Thời gian hành vi
  metadata: {
    category: String,      // Danh mục sản phẩm (lưu từ lúc track)
    giaGiam: Number,       // Giá giảm (lưu từ lúc track)
    giaGoc: Number,        // Giá gốc (lưu từ lúc track)
    duration: Number,      // Thời gian xem (giây)
    referrer: String       // Nguồn truy cập
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Indexes

Để tối ưu query, các index sau được tạo:

```javascript
userBehaviorSchema.index({ maKH: 1, thoiGian: -1 });
userBehaviorSchema.index({ maSP: 1, thoiGian: -1 });
userBehaviorSchema.index({ maKH: 1, maSP: 1 });
userBehaviorSchema.index({ 'metadata.category': 1 });
userBehaviorSchema.index({ 'metadata.giaGiam': 1 });
```

