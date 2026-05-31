import mysql from 'mysql2/promise';
import { env } from './env.js';

// Connection pool giúp tái sử dụng kết nối, tránh overhead tạo mới mỗi request
export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  // Tối đa 10 connection đồng thời — đủ cho workload thông thường, không tốn quá nhiều tài nguyên MySQL
  connectionLimit: 10,
  // queueLimit: 0 nghĩa là hàng chờ không giới hạn khi pool đầy
  queueLimit: 0,
  // Tự động ép kiểu DECIMAL về number JS thay vì string
  decimalNumbers: true,
  // Trả về ngày dưới dạng string để tránh timezone bị chuyển đổi ngầm bởi driver
  dateStrings: true,
  // Dùng named placeholder (:name) thay vì positional (?) cho câu query dễ đọc hơn
  namedPlaceholders: true,
  charset: 'utf8mb4',
});

/**
 * Thực thi một câu SQL đọc/ghi đơn giản sử dụng pool chung.
 * Dùng cho các thao tác không cần transaction.
 */
export async function query(sql, params = {}) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Thực thi SQL thông qua một executor linh hoạt — có thể là connection trong transaction
 * hoặc một hàm mock (dùng cho testing). Cho phép các service không cần biết ngữ cảnh transaction.
 */
export async function execute(executor, sql, params = {}) {
  // Nếu executor là function (mock/test), gọi trực tiếp
  if (typeof executor === 'function') {
    return executor(sql, params);
  }

  // Ngược lại, executor là connection hoặc pool — gọi .execute() chuẩn
  const [rows] = await executor.execute(sql, params);
  return rows;
}

/**
 * Bọc nhiều thao tác DB vào một transaction để đảm bảo tính nguyên tử (atomic).
 * Tự động rollback nếu có lỗi, luôn release connection về pool dù thành công hay thất bại.
 */
export async function withTransaction(work) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    // Rollback để hoàn tác toàn bộ thay đổi trong transaction khi có lỗi
    await connection.rollback();
    throw error;
  } finally {
    // Luôn trả connection về pool để tránh connection leak
    connection.release();
  }
}

/**
 * Kiểm tra kết nối MySQL khi khởi động server.
 * Chỉ chạy SELECT 1 để xác nhận pool có thể lấy connection — không thực thi logic nghiệp vụ.
 */
export async function testConnection() {
  const connection = await pool.getConnection();

  try {
    await connection.query('SELECT 1');
  } finally {
    connection.release();
  }
}
