import { HttpError } from './http-error.js';

// Dùng Object.prototype.hasOwnProperty.call để tránh lỗi với object không có prototype (Object.create(null))
const hasOwn = (payload, key) => Object.prototype.hasOwnProperty.call(payload, key);

// Đảm bảo payload là object thuần — từ chối null, array, string trước khi parse các field
function ensureObject(payload, label = 'Request body') {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    throw new HttpError(400, `${label} must be a JSON object.`);
  }
}

/**
 * Parse và validate giá trị string từ request body.
 * Tự động trim whitespace; hỗ trợ required/optional, allowEmpty, maxLength.
 */
function parseString(value, field, options = {}) {
  const { required = true, allowEmpty = false, maxLength } = options;

  if (value === undefined || value === null) {
    if (required) {
      throw new HttpError(400, `${field} is required.`);
    }
    // undefined = field không có trong payload → cho phép partial update bỏ qua field này
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} must be a string.`);
  }

  const normalized = value.trim();

  if (!allowEmpty && normalized.length === 0) {
    throw new HttpError(400, `${field} cannot be empty.`);
  }

  if (maxLength && normalized.length > maxLength) {
    throw new HttpError(400, `${field} must be at most ${maxLength} characters.`);
  }

  return normalized;
}

/**
 * Parse email — tái dụng parseString rồi kiểm tra thêm format email cơ bản.
 * Luôn lowercase để tránh duplicate do khác hoa thường.
 */
function parseEmail(value, field, options = {}) {
  const normalized = parseString(value, field, options)?.toLowerCase();

  if (normalized === undefined) {
    return undefined;
  }

  // Pattern đơn giản — đủ để lọc lỗi nhập liệu; không cần validate RFC 5322 đầy đủ
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalized)) {
    throw new HttpError(400, `${field} must be a valid email address.`);
  }

  return normalized;
}

/**
 * Parse mật khẩu với kiểm tra độ dài tối thiểu (mặc định 8) và tối đa (mặc định 128).
 */
function parsePassword(value, field, options = {}) {
  const { required = true, minLength = 8, maxLength = 128 } = options;
  const normalized = parseString(value, field, {
    required,
    allowEmpty: false,
    maxLength,
  });

  if (normalized === undefined) {
    return undefined;
  }

  if (normalized.length < minLength) {
    throw new HttpError(400, `${field} must be at least ${minLength} characters.`);
  }

  return normalized;
}

/**
 * Parse số — từ chối NaN, Infinity, và kiểu dữ liệu không phải number.
 * Tùy chọn: bắt buộc integer (cho tiền VNĐ), giá trị tối thiểu.
 */
function parseNumber(value, field, options = {}) {
  const { required = true, min, integer = false } = options;

  if (value === undefined || value === null) {
    if (required) {
      throw new HttpError(400, `${field} is required.`);
    }
    return undefined;
  }

  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new HttpError(400, `${field} must be a valid number.`);
  }

  // integer: true bắt buộc giá trị phải là số nguyên — dùng cho amount (VNĐ không có số thập phân)
  if (integer && !Number.isInteger(value)) {
    throw new HttpError(400, `${field} must be an integer.`);
  }

  if (min !== undefined && value < min) {
    throw new HttpError(400, `${field} must be greater than or equal to ${min}.`);
  }

  return value;
}

/**
 * Parse boolean — từ chối mọi giá trị không phải true/false thuần túy.
 */
function parseBoolean(value, field, options = {}) {
  const { required = true } = options;

  if (value === undefined || value === null) {
    if (required) {
      throw new HttpError(400, `${field} is required.`);
    }
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new HttpError(400, `${field} must be a boolean.`);
  }

  return value;
}

/**
 * Parse giá trị enum — đảm bảo value nằm trong tập giá trị cho phép.
 */
function parseEnum(value, field, allowedValues, options = {}) {
  const { required = true } = options;

  if (value === undefined || value === null) {
    if (required) {
      throw new HttpError(400, `${field} is required.`);
    }
    return undefined;
  }

  if (typeof value !== 'string' || !allowedValues.includes(value)) {
    throw new HttpError(400, `${field} must be one of: ${allowedValues.join(', ')}.`);
  }

  return value;
}

/**
 * Parse chuỗi ngày — chấp nhận mọi định dạng Date.parse() hiểu được,
 * chuẩn hóa output về ISO 8601 để lưu nhất quán.
 */
function parseDateString(value, field, options = {}) {
  const { required = true } = options;

  if (value === undefined || value === null) {
    if (required) {
      throw new HttpError(400, `${field} is required.`);
    }
    return undefined;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, `${field} must be a valid date.`);
  }

  return parsed.toISOString();
}

/**
 * Parse string có thể null — phân biệt 3 trường hợp:
 *   undefined → field vắng mặt (partial update bỏ qua)
 *   null → xóa giá trị (vd: xóa walletId khỏi budget)
 *   string → validate bình thường
 */
function parseNullableString(value, field, options = {}) {
  const { maxLength } = options;

  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return parseString(value, field, {
    required: true,
    allowEmpty: false,
    maxLength,
  });
}

// Loại bỏ các key có giá trị undefined để không ghi đè field khi partial update
function stripUndefined(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

/**
 * Validate và chuẩn hóa payload tạo/cập nhật wallet.
 * partial: true → chỉ validate các field có mặt trong payload (dùng cho PATCH).
 */
export function normalizeWalletPayload(payload, { partial = false } = {}) {
  ensureObject(payload);

  const result = {};

  if (hasOwn(payload, 'id')) {
    result.id = parseString(payload.id, 'id', { maxLength: 64 });
  }

  if (!partial || hasOwn(payload, 'name')) {
    result.name = parseString(payload.name, 'name', { required: !partial, maxLength: 100 });
  }

  if (!partial || hasOwn(payload, 'balance')) {
    // integer: true vì tiền VNĐ lưu dạng INTEGER, không có số thập phân
    result.balance = parseNumber(payload.balance, 'balance', { required: !partial, integer: true });
  }



  if (!partial || hasOwn(payload, 'color')) {
    result.color = parseString(payload.color, 'color', { required: !partial, maxLength: 20 });
  }

  if (!partial || hasOwn(payload, 'icon')) {
    result.icon = parseString(payload.icon, 'icon', { required: !partial, maxLength: 32 });
  }

  if (!partial || hasOwn(payload, 'includeInTotal')) {
    result.includeInTotal = parseBoolean(payload.includeInTotal, 'includeInTotal', {
      required: !partial,
    });
  }

  // createdAt chỉ xử lý khi client gửi — dùng cho sync offline (client giữ timestamp gốc)
  if (hasOwn(payload, 'createdAt')) {
    result.createdAt = parseDateString(payload.createdAt, 'createdAt', { required: false });
  }

  return stripUndefined(result);
}

/**
 * Validate và chuẩn hóa payload tạo/cập nhật transaction.
 * Có thêm cross-field validation: transfer bắt buộc toWalletId, và walletId ≠ toWalletId.
 */
export function normalizeTransactionPayload(payload, { partial = false } = {}) {
  ensureObject(payload);

  const result = {};

  if (hasOwn(payload, 'id')) {
    result.id = parseString(payload.id, 'id', { maxLength: 64 });
  }

  if (!partial || hasOwn(payload, 'type')) {
    result.type = parseEnum(payload.type, 'type', ['expense', 'income', 'transfer'], {
      required: !partial,
    });
  }

  if (!partial || hasOwn(payload, 'amount')) {
    // min: 0 — không cho phép số âm; integer: true cho VNĐ
    result.amount = parseNumber(payload.amount, 'amount', { required: !partial, min: 0, integer: true });
  }

  if (!partial || hasOwn(payload, 'categoryId')) {
    result.categoryId = parseString(payload.categoryId, 'categoryId', {
      required: !partial,
      maxLength: 64,
    });
  }

  if (!partial || hasOwn(payload, 'walletId')) {
    result.walletId = parseString(payload.walletId, 'walletId', {
      required: !partial,
      maxLength: 64,
    });
  }

  // toWalletId chỉ xử lý khi có mặt — nullable vì chỉ transfer mới cần
  if (hasOwn(payload, 'toWalletId')) {
    result.toWalletId = parseNullableString(payload.toWalletId, 'toWalletId', { maxLength: 64 });
  }

  if (!partial || hasOwn(payload, 'note')) {
    result.note = payload.note === undefined
      ? partial
        ? undefined
        // Khi tạo mới (không partial), note mặc định là chuỗi rỗng nếu không truyền
        : ''
      : parseString(payload.note, 'note', {
          required: false,
          allowEmpty: true,
          maxLength: 500,
        });
  }

  if (!partial || hasOwn(payload, 'date')) {
    result.date = parseDateString(payload.date, 'date', { required: !partial });
  }

  if (hasOwn(payload, 'createdAt')) {
    result.createdAt = parseDateString(payload.createdAt, 'createdAt', { required: false });
  }

  const normalized = stripUndefined(result);
  const type = normalized.type;
  const walletId = normalized.walletId;
  const toWalletId = normalized.toWalletId;

  // Cross-field validation: transfer phải có toWalletId và không được trùng với walletId nguồn
  if (type === 'transfer') {
    if (!toWalletId) {
      throw new HttpError(400, 'toWalletId is required when type is transfer.');
    }

    if (walletId && toWalletId === walletId) {
      throw new HttpError(400, 'toWalletId must be different from walletId for transfers.');
    }
  }

  return normalized;
}

/**
 * Validate và chuẩn hóa payload tạo/cập nhật budget.
 * Có cross-field validation: startDate phải trước hoặc bằng endDate.
 */
export function normalizeBudgetPayload(payload, { partial = false } = {}) {
  ensureObject(payload);

  const result = {};

  if (hasOwn(payload, 'id')) {
    result.id = parseString(payload.id, 'id', { maxLength: 64 });
  }

  if (!partial || hasOwn(payload, 'categoryId')) {
    result.categoryId = parseString(payload.categoryId, 'categoryId', {
      required: !partial,
      maxLength: 64,
    });
  }

  if (!partial || hasOwn(payload, 'amount')) {
    result.amount = parseNumber(payload.amount, 'amount', { required: !partial, min: 0, integer: true });
  }



  if (!partial || hasOwn(payload, 'period')) {
    result.period = parseEnum(payload.period, 'period', ['monthly', 'weekly', 'yearly'], {
      required: !partial,
    });
  }

  if (!partial || hasOwn(payload, 'startDate')) {
    result.startDate = parseDateString(payload.startDate, 'startDate', { required: !partial });
  }

  if (!partial || hasOwn(payload, 'endDate')) {
    result.endDate = parseDateString(payload.endDate, 'endDate', { required: !partial });
  }

  // walletId nullable — null nghĩa là budget áp dụng cho tất cả ví
  if (hasOwn(payload, 'walletId')) {
    result.walletId = parseNullableString(payload.walletId, 'walletId', { maxLength: 64 });
  }

  const normalized = stripUndefined(result);

  // Chỉ kiểm tra thứ tự ngày khi cả hai field đều có mặt trong payload
  if (normalized.startDate && normalized.endDate) {
    const start = new Date(normalized.startDate);
    const end = new Date(normalized.endDate);

    if (start > end) {
      throw new HttpError(400, 'startDate must be before or equal to endDate.');
    }
  }

  return normalized;
}



/**
 * Validate payload sync toàn bộ state từ client lên server (offline-first sync).
 * Kiểm tra tất cả 3 mảng bắt buộc, rồi validate từng item qua các normalizer tương ứng.
 */
export function normalizeStateSnapshot(payload) {
  ensureObject(payload, 'Request body');

  if (!Array.isArray(payload.wallets)) {
    throw new HttpError(400, 'wallets must be an array.');
  }

  if (!Array.isArray(payload.transactions)) {
    throw new HttpError(400, 'transactions must be an array.');
  }

  if (!Array.isArray(payload.budgets)) {
    throw new HttpError(400, 'budgets must be an array.');
  }

  return {
    wallets: payload.wallets.map((wallet) => normalizeWalletPayload(wallet)),
    transactions: payload.transactions.map((transaction) =>
      normalizeTransactionPayload(transaction)
    ),
    budgets: payload.budgets.map((budget) => normalizeBudgetPayload(budget)),
  };
}

/**
 * Validate payload đăng ký tài khoản — email, password bắt buộc; name tùy chọn.
 */
export function normalizeRegisterPayload(payload) {
  ensureObject(payload);

  return {
    email: parseEmail(payload.email, 'email', { maxLength: 191 }),
    password: parsePassword(payload.password, 'password'),
    // name không bắt buộc — chỉ parse nếu client gửi lên
    name: hasOwn(payload, 'name')
      ? parseString(payload.name, 'name', { required: false, allowEmpty: false, maxLength: 100 })
      : undefined,
  };
}

/**
 * Validate payload đăng nhập — chỉ cần email và password.
 */
export function normalizeLoginPayload(payload) {
  ensureObject(payload);

  return {
    email: parseEmail(payload.email, 'email', { maxLength: 191 }),
    password: parsePassword(payload.password, 'password'),
  };
}
