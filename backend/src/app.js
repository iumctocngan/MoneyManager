import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requireAuth } from './middleware/require-auth.js';
import authRoutes from './routes/auth.routes.js';
import healthRoutes from './routes/health.routes.js';
import apiRoutes from './routes/index.js';
import { sendSuccess } from './utils/response.js';

const app = express();

// Nếu CORS_ORIGIN là '*', cho phép tất cả origin; ngược lại parse danh sách domain cụ thể từ chuỗi phân tách bởi dấu phẩy
const corsConfig =
  env.corsOrigin === '*'
    ? { origin: true }
    : { origin: env.corsOrigin.split(',').map((item) => item.trim()) };

app.use(cors(corsConfig));
// Giới hạn body 1mb để tránh tấn công DoS qua payload khổng lồ
app.use(express.json({ limit: '1mb' }));
// Dùng format 'combined' trên production để log đầy đủ hơn cho việc audit; 'dev' cho môi trường phát triển
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Route gốc trả về thông tin API — hữu ích để kiểm tra server còn sống
app.get('/', (request, response) => {
  sendSuccess(response, {
    name: 'Money Manager API',
    version: '1.0.0',
    docs: '/health, /api/auth/*, and protected /api/*',
  });
});

// /health không cần xác thực — dùng cho health check của load balancer hoặc monitor
app.use('/health', healthRoutes);
// /api/auth là route công khai (đăng ký, đăng nhập)
app.use('/api/auth', authRoutes);
// Phục vụ file tĩnh (ảnh upload) mà không cần xác thực
app.use('/uploads', express.static('uploads'));
// Tất cả route /api/* đều yêu cầu xác thực JWT qua requireAuth
app.use('/api', requireAuth, apiRoutes);
// Xử lý route không tồn tại — phải đặt sau tất cả route
app.use(notFoundHandler);
// Xử lý lỗi tập trung — phải đặt cuối cùng (4 tham số)
app.use(errorHandler);

export default app;
