# Money Manager App

Dưới đây là hướng dẫn cài đặt và chạy dự án sau khi bạn tải (pull) từ GitHub về.

## 1. Cài đặt thư viện (Dependencies)
Vì thư mục `node_modules` không được đẩy lên GitHub để giảm dung lượng, bạn cần cài đặt lại chúng:

### Frontend (Expo App):
Mở terminal tại thư mục gốc của dự án (`e:\MyAwesomeApp`) và chạy:
```bash
npm install
```

### Backend:
Di chuyển vào thư mục `backend` và cài đặt:
```bash
cd backend
npm install
```

## 2. Cấu hình Cơ sở dữ liệu
1. Vào thư mục `backend/sql/schema.sql`.
2. Copy nội dung file này và chạy trong công cụ quản lý MySQL của bạn để tạo database và bảng.

## 3. Cấu hình biến môi trường (.env)
1. Trong thư mục `backend`, copy file `.env.example` thành `.env`.
2. Chỉnh sửa thông tin kết nối Database cho đúng với máy của bạn.
3. Tạo API Key tại [Google AI Studio](https://aistudio.google.com/) và gán vào:
   `GEMINI_API_KEY=your_api_key_here`

## 4. Chạy dự án

### Chạy Backend:
```bash
cd backend
npm run dev
```

### Chạy Frontend (Expo):
Mở một terminal mới (tại thư mục gốc) và chạy:
```bash
npx expo start
```
Sau đó quét mã QR bằng ứng dụng Expo Go trên điện thoại.

---
*Nếu gặp lỗi không chạy được, hãy hỏi AI để được hỗ trợ!*