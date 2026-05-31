/**
 * Lỗi HTTP có ý nghĩa — mang statusCode và details tùy chọn.
 * errorHandler kiểm tra instanceof HttpError để phân biệt lỗi nghiệp vụ (4xx) với lỗi bất ngờ (5xx).
 */
export class HttpError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    // details: thông tin bổ sung tùy chọn (vd: danh sách field validation lỗi)
    this.details = details;
  }
}
