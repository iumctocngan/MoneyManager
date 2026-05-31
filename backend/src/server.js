import app from './app.js';
import { env } from './config/env.js';
import { testConnection } from './config/database.js';

// Khởi động server theo thứ tự: kiểm tra DB trước, sau mới lắng nghe request
// — đảm bảo không nhận traffic khi database chưa sẵn sàng
async function startServer() {
  // Kiểm tra kết nối MySQL; ném lỗi ngay nếu không thể kết nối
  await testConnection();

  app.listen(env.port, () => {
    console.log(`Backend is running on http://localhost:${env.port}`);
  });
}

// Bắt lỗi không mong đợi khi khởi động và thoát process để tránh server chạy ở trạng thái lỗi
startServer().catch((error) => {
  console.error('Failed to start backend server.');
  console.error(error);
  process.exit(1);
});
