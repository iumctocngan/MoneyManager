import dotenv from 'dotenv';

// Nạp biến môi trường từ file .env vào process.env (chỉ có tác dụng ở local/dev)
dotenv.config();

/**
 * Đọc biến môi trường kiểu số, trả về fallback nếu chưa đặt.
 * Ném lỗi ngay khi khởi động nếu giá trị không hợp lệ — fail-fast thay vì lỗi ngầm lúc runtime.
 */
function getNumber(name, fallback) {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue === '') {
    return fallback;
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value)) {
    throw new Error(`Environment variable ${name} must be a valid number.`);
  }

  return value;
}

/**
 * Đọc biến môi trường kiểu chuỗi, trả về fallback nếu chưa đặt hoặc rỗng.
 */
function getString(name, fallback = '') {
  const rawValue = process.env[name];
  return rawValue === undefined || rawValue === '' ? fallback : rawValue;
}

// Toàn bộ config được tập trung tại đây — các module khác chỉ import env, không đọc process.env trực tiếp
export const env = {
  nodeEnv: getString('NODE_ENV', 'development'),
  port: getNumber('PORT', 4000),
  // Mặc định '*' cho phép tất cả origin — cần thay bằng domain cụ thể trên production
  corsOrigin: getString('CORS_ORIGIN', '*'),
  auth: {
    // Fallback secret chỉ dùng cho dev; production phải đặt AUTH_TOKEN_SECRET thực sự
    tokenSecret: getString('AUTH_TOKEN_SECRET', 'dev-insecure-secret'),
    // TTL mặc định 168 giờ = 7 ngày — token tồn tại đủ lâu để không phải đăng nhập lại thường xuyên
    accessTokenTtlHours: getNumber('ACCESS_TOKEN_TTL_HOURS', 168),
  },
  db: {
    host: getString('DB_HOST', '127.0.0.1'),
    port: getNumber('DB_PORT', 3306),
    user: getString('DB_USER', 'root'),
    password: getString('DB_PASSWORD', ''),
    database: getString('DB_NAME', 'money_manager'),
  },
  postgresUrl: getString('POSTGRES_URL', 'postgresql://postgres:matkhaukholam123@127.0.0.1:5432/postgres'),
  ai: {
    geminiKey: getString('GEMINI_API_KEY'),
    groqKey: getString('GROQ_API_KEY'),
  },
};
