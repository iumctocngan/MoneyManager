/**
 * Chuẩn hóa response thành công — luôn có cấu trúc { success: true, data }.
 * Mặc định 200; truyền statusCode khác khi cần (vd: 201 Created).
 */
export function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

/**
 * Chuẩn hóa response lỗi — luôn có cấu trúc { success: false, error: { message, code, details } }.
 * code và details là tùy chọn — dùng để phân loại lỗi phía client nếu cần.
 */
export function sendError(res, message, statusCode = 500, code = null, details = null) {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      details,
    },
  });
}
