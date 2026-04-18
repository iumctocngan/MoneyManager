# Money Manager Backend

Backend REST API cho ứng dụng quản lý chi tiêu (Money Manager), sử dụng Node.js, Express và MySQL.

## 1. Yêu cầu hệ thống
- Node.js (v18+)
- MySQL (v8.0+)
- Biến môi trường `.env`

## 2. Thiết lập cơ sở dữ liệu
Chạy file schema để khởi tạo cấu trúc bảng:
```sql
SOURCE sql/schema.sql;
```

## 3. Cấu hình môi trường
Tạo file `.env` từ file mẫu:
```bash
cp .env.example .env
```
Cấu hình các biến chính:
- `PORT`: Cổng chạy API (mặc định: `4000`)
- `DB_*`: Thông tin kết nối MySQL
- `AUTH_TOKEN_SECRET`: Chuỗi bí mật ký JWT (Rất quan trọng)
- `GEMINI_API_KEY`: Key cho Google Generative AI (nếu dùng tính năng AI)
- `GROQ_API_KEY`: Key cho Groq AI (nếu dùng Groq SDK)

## 4. Cài đặt và Chạy
```bash
npm install
npm run dev   # Chế độ phát triển (watch mode)
```

## 5. Xác thực (Authentication)
Dùng **Bearer Access Token** trong Header: `Authorization: Bearer <token>`.

### Endpoint công khai:
- `POST /api/auth/register`: Đăng ký
- `POST /api/auth/login`: Đăng nhập

### Endpoint yêu cầu Token:
- `GET /api/auth/me`: Thông tin người dùng hiện tại
- `GET /api/state`: Lấy toàn bộ dữ liệu (ví, giao dịch, ngân sách, cài đặt)
- `POST /api/state/import`: Nhập dữ liệu từ backup

## 6. Các API Nghiệp vụ (Yêu cầu Token)
- **Ví (`/api/wallets`)**: CRUD danh sách ví tiền
- **Giao dịch (`/api/transactions`)**: CRUD thu/chi/chuyển khoản
- **Ngân sách (`/api/budgets`)**: Quản lý hạn mức
- **Cài đặt (`/api/settings`)**: Tùy chọn hiển thị
- **AI (`/api/ai`)**:
  - `POST /api/ai/transcribe`: Chuyển đổi giọng nói thành văn bản cho giao dịch (yêu cầu file audio)

## 7. Kiểm tra sức khỏe
- `GET /health\": Trạng thái kết nối Database và Server.

---
*Mã nguồn được tổ chức theo cấu trúc Route -> Controller -> Service để dễ bảo trì.*

