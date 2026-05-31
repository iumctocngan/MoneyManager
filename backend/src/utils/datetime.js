// Đệm số với '0' ở đầu để đảm bảo định dạng 2 chữ số (vd: 9 → '09')
function pad(value) {
  return String(value).padStart(2, '0');
}

/**
 * Chuyển đổi Date (hoặc giá trị có thể parse thành Date) sang chuỗi datetime MySQL.
 * Dùng UTC để tránh lệch múi giờ giữa server và MySQL — MySQL lưu DATETIME không có timezone.
 */
export function toMysqlDateTime(value = new Date()) {
  // Chấp nhận cả Date object và chuỗi/số để linh hoạt khi gọi
  const date = value instanceof Date ? value : new Date(value);

  // Phát hiện sớm giá trị không hợp lệ thay vì sinh ra '1970-01-01' im lặng
  if (Number.isNaN(date.getTime())) {
    throw new TypeError('Invalid date value.');
  }

  // Lấy các thành phần UTC — tránh lệch ngày do timezone local của server
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());

  // Định dạng 'YYYY-MM-DD HH:mm:ss' — đúng chuẩn MySQL DATETIME
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
