# Money Manager Backend

Backend REST API cho ứng dụng quản lý chi tiêu (Money Manager), sử dụng Node.js, Express và MySQL. Toàn bộ dữ liệu được xác thực và phân tách theo từng người dùng.

## 1. Yêu cầu hệ thống

- Node.js (v18+)
- MySQL (v8.0+)
- File môi trường `.env` (xem mục Cấu hình bên dưới)

## 2. Thiết lập cơ sở dữ liệu

Chạy file schema để khởi tạo cấu trúc bảng (bao gồm bảng `users`, `wallets`, `transactions`, ...):

```sql
SOURCE sql/schema.sql;
```

*Lưu ý: Schema đã bao gồm các ràng buộc khóa ngoại (Foreign Keys) để tự động xóa dữ liệu liên quan khi xóa tài khoản.*

## 3. Cấu hình môi trường

Tạo file `backend/.env` từ file mẫu:

```bash
cp .env.example .env
```

Cấu hình các biến chính:
- `PORT`: Cổng chạy API (mặc định: `4000`)
- `DB_*`: Thông tin kết nối MySQL
- `AUTH_TOKEN_SECRET`: Chuỗi ký tự bí mật để ký JWT Token (Rất quan trọng)
- `ACCESS_TOKEN_TTL_HOURS`: Thời hạn của Token (mặc định: `24` giờ)

## 4. Cài đặt và Chạy

```bash
cd backend
npm install
npm run dev   # Chế độ phát triển (tự động reload)
```

## 5. Xác thực (Authentication)

Backend sử dụng cơ chế **Email/Password** và trả về **Bearer Access Token**.

### Các Endpoint xác thực công khai:
- `POST /api/auth/register`: Đăng ký tài khoản mới (`email`, `password`, `name`)
- `POST /api/auth/login`: Đăng nhập lấy Token (`email`, `password`)
- `GET /api/auth/me`: Kiểm tra thông tin người dùng hiện tại (yêu cầu token)

### Cách sử dụng Token:
Sau khi đăng nhập thành công, bạn phải gửi Token trong header của mọi yêu cầu bảo mật:
```http
Authorization: Bearer <accessToken>
```

## 6. Các API chính (Yêu cầu Token)

Tất cả dữ liệu trả về đều được lọc theo `user_id` của Token đã gửi.

- `GET /api/state`: Lấy toàn bộ dữ liệu (ví, giao dịch, ngân sách, cài đặt)
- `POST /api/state/import`: Nhập dữ liệu từ bản sao lưu local
- **Ví (`/api/wallets`)**: CRUD danh sách ví tiền
- **Giao dịch (`/api/transactions`)**: CRUD các khoản thu/chi/chuyển khoản
- **Ngân sách (`/api/budgets`)**: Quản lý hạn mức chi tiêu
- **Cài đặt (`/api/settings`)**: Lưu trữ các tùy chọn hiển thị/ngôn ngữ

---
*Mã nguồn được thiết kế theo mô hình Service Layer để đảm bảo logic nghiệp vụ (như tự động cập nhật số dư ví khi có giao dịch) luôn chính xác.*
