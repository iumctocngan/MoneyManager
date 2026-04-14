# Money Manager App

Ứng dụng quản lý tài chính cá nhân toàn diện với Frontend (Expo/React Native) và Backend (Node.js/Express).

## 1. Cấu trúc dự án
- `frontend/`: Ứng dụng mobile (Expo 54, React Native 0.81)
- `backend/`: Server API (Node.js, Express & MySQL)

## 2. Cài đặt nhanh (Quick Setup)

Chỉ cần chạy lệnh sau tại thư mục gốc để cài đặt toàn bộ môi trường:
```bash
npm run install:all
```

## 3. Cấu hình Cơ sở dữ liệu
1. Truy cập `backend/sql/schema.sql`.
2. Thực thi nội dung file này trong MySQL của bạn để tạo database và các bảng.

## 4. Cấu hình biến môi trường (.env)
1. Trong thư mục `backend/`, copy file `.env.example` thành `.env`.
2. Cập nhật thông tin kết nối Database (`DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`).
3. (Tùy chọn) Gán `GEMINI_API_KEY` nếu dùng AI.

## 5. Chạy dự án (Từ thư mục gốc)

### Chạy Backend (API):
```bash
npm run backend:dev
```

### Chạy Frontend (Expo Mobile):
```bash
npm run frontend:start
```
*Sau đó quét mã QR bằng ứng dụng **Expo Go** (Android) hoặc **Camera** (iOS).*

## 6. Lệnh kiểm tra và bảo trì

Bạn có thể kiểm tra lỗi code (lint) và kiểu dữ liệu (typescript) từ thư mục gốc:

- **Kiểm tra tất cả**: `npm run lint:all`
- **Kiểm tra Frontend**: `npm run frontend:check`
- **Kiểm tra Backend**: `npm run backend:check`

---
*Để biết thêm chi tiết về quy trình phát triển, vui lòng xem file `AGENTS.md`.*