
Giới thiệu:
- Đây là hệ thống thương mại điện tử được xây dựng theo kiến trúc Microservices, hỗ trợ đầy đủ các chức năng mua bán trực tuyến, quản lý sản phẩm, đơn hàng và tương tác người dùng.
- Hệ thống được thiết kế nhằm tăng khả năng mở rộng, dễ bảo trì và mô phỏng kiến trúc backend thực tế trong doanh nghiệp.
Kiến trúc hệ thống:
- Microservices Architecture
- API Gateway Pattern
- Service-to-Service Communication (Axios)

Công nghệ sử dụng:
- Backend (Microservices):
+ Node.js
+ Express.js
+ MongoDB (Mongoose)
+ JWT (Authentication)
+ Axios (Service communication)
+ Multer + Cloudinary (Upload & lưu ảnh)
+ Nodemailer (Email service)
+ CORS
+ Dotenv

-Frontend:
+ EJS (Server-side rendering)
+ Vanilla JavaScript
+ CSS3 (Responsive Design)
 -Dev Tools
Nodemon
Concurrently

-Các Microservices:
Hệ thống gồm 13 services:
User Service
Product Service
Order Service
Cart Service
Payment Service
Shipping Service
Address Service
Review Service
Notification Service
Chat Service
Recommendation Service
Analytics Service
Gateway Service (API Gateway)
-Tính năng chính:
 +Người dùng:
Đăng ký / Đăng nhập (JWT Authentication)
Xem sản phẩm
Thêm vào giỏ hàng
Đặt hàng & thanh toán
Đánh giá sản phẩm
Chat hỗ trợ
+ Người bán / Admin
CRUD sản phẩm
Quản lý đơn hàng
Theo dõi thống kê (Analytics)
+ Hệ thống
Phân quyền người dùng
Giao tiếp giữa các service
Upload ảnh sản phẩm lên Cloudinary
Gửi email (Nodemailer)
>>>>>>> 3544723 (init: ecommerce microservices project)
