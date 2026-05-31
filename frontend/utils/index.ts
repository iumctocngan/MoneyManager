/**
 * Định dạng số tiền VNĐ theo chuẩn locale Việt Nam.
 * @param showSign - Nếu true, thêm dấu '+' cho số dương (dùng trong màn hình hiển thị thu nhập).
 */
export const formatCurrency = (
  amount: number,
  showSign: boolean = false
): string => {
  // Chỉ thêm '+' cho số dương khi showSign = true; số âm đã tự có dấu '-' từ Intl
  const sign = showSign ? (amount >= 0 ? '+' : '') : '';

  return (
    sign +
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0, // VNĐ không có phần thập phân
    }).format(amount)
  );
};

/** Định dạng số nguyên có dấu phân cách nghìn theo locale Việt Nam (vd: 1.000.000). */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('vi-VN').format(num);
};

/**
 * Định dạng ngày thân thiện: hiển thị "Hôm nay" / "Hôm qua" thay vì ngày cụ thể
 * để người dùng dễ nhận biết giao dịch gần đây.
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Hôm nay';
  if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/** Định dạng ngày đầy đủ bao gồm thứ trong tuần (vd: "Thứ Hai, 01 tháng 1 2024"). */
export const formatDateFull = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

/** Định dạng tháng/năm dùng trong tiêu đề bộ lọc (vd: "Tháng 1 2024"). */
export const formatMonthYear = (year: number, month: number): string => {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
};

/**
 * Tạo ID ngẫu nhiên kết hợp timestamp (base36) và random suffix.
 * Đủ unique cho môi trường offline-first; không dùng UUID để giữ chuỗi ngắn hơn.
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
};
