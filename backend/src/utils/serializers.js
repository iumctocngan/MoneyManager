/**
 * Chuẩn hóa giá trị ngày tháng từ DB về ISO 8601 string.
 * MySQL trả về DATETIME dạng chuỗi "YYYY-MM-DD HH:mm:ss" (không có 'T') khi dateStrings: true,
 * nên cần thêm 'T' và 'Z' trước khi parse để trình duyệt/JS hiểu đúng múi giờ UTC.
 */
function toIsoString(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    // Nếu chưa có 'T' (format MySQL), chuyển khoảng trắng → 'T' và thêm 'Z' để đánh dấu UTC
    const normalized = value.includes('T')
      ? value
      : `${value.replace(' ', 'T')}Z`;
    const parsed = new Date(normalized);

    // Trả về giá trị gốc nếu parse thất bại thay vì trả null — giúp debug dễ hơn
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Chuyển row DB (snake_case) thành wallet object (camelCase) cho API response.
 * Number() ép kiểu balance tránh trường hợp MySQL trả về string khi dùng DECIMAL.
 */
export function mapWallet(row) {
  return {
    id: row.id,
    name: row.name,
    balance: Number(row.balance),
    color: row.color,
    icon: row.icon,
    // Boolean() chuyển tinyint(1) từ MySQL (0/1) thành boolean JS
    includeInTotal: Boolean(row.include_in_total),
    hasTransactions: Boolean(row.has_transactions),
    createdAt: toIsoString(row.created_at),
  };
}

/**
 * Chuyển row DB thành transaction object cho API response.
 * toWalletId dùng ?? undefined để loại bỏ key khỏi object nếu null (không phải transfer).
 */
export function mapTransaction(row) {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    categoryId: row.category_id,
    walletId: row.wallet_id,
    // undefined thay vì null để key không xuất hiện trong JSON khi không phải transfer
    toWalletId: row.to_wallet_id ?? undefined,
    note: row.note ?? '',
    date: toIsoString(row.transaction_date),
    createdAt: toIsoString(row.created_at),
  };
}

/**
 * Chuyển row DB thành budget object cho API response.
 * spent mặc định 0 khi query không JOIN bảng chi tiêu (vd: khi tạo mới budget).
 */
export function mapBudget(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    amount: Number(row.amount),
    // spent có thể null nếu không JOIN — dùng ?? 0 làm giá trị mặc định an toàn
    spent: Number(row.spent ?? 0),
    period: row.period,
    startDate: toIsoString(row.start_date),
    endDate: toIsoString(row.end_date),
    walletId: row.wallet_id ?? undefined,
  };
}



/**
 * Chuyển row DB thành user object cho API response.
 * Loại bỏ password_hash và các field nhạy cảm — chỉ trả dữ liệu cần thiết.
 */
export function mapUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    lastLoginAt: toIsoString(row.last_login_at),
    createdAt: toIsoString(row.created_at),
  };
}
