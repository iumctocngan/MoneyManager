import { HttpError } from '../utils/http-error.js';
import { sendError } from '../utils/response.js';

/**
 * Middleware bắt route không tồn tại — tạo HttpError 404 rồi chuyển sang errorHandler.
 */
export function notFoundHandler(request, response, next) {
  next(new HttpError(404, `Cannot ${request.method} ${request.originalUrl}`));
}

/**
 * Middleware xử lý lỗi tập trung — phải có đúng 4 tham số để Express nhận dạng là error handler.
 * Chuyển đổi các lỗi DB thành response thân thiện, ghi log lỗi 5xx.
 */
export function errorHandler(error, request, response, next) {
  // Nếu response đã bắt đầu gửi (streaming), delegate lại cho Express xử lý mặc định
  if (response.headersSent) {
    next(error);
    return;
  }

  // Lỗi duplicate key MySQL — trả 409 Conflict với thông báo chung chung, không lộ tên cột
  if (error.code === 'ER_DUP_ENTRY') {
    return sendError(response, 'A record with the same identifier already exists.', 409);
  }

  // Lỗi foreign key MySQL — record liên quan không tồn tại, trả 400 thay vì 500
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return sendError(response, 'Related record was not found.', 400);
  }

  // HttpError mang statusCode riêng; lỗi khác mặc định là 500
  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  
  // Chỉ log lỗi server (5xx) — lỗi client (4xx) không cần ghi log
  if (statusCode >= 500) {
    console.error(error);
  }

  sendError(
    response,
    error.message || 'Internal server error.',
    statusCode,
    null,
    // Truyền details nếu có (HttpError hỗ trợ thêm thông tin chi tiết lỗi validation)
    error instanceof HttpError ? error.details : null
  );
}
