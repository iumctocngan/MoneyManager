import { HttpError } from './http-error.js';

const hasOwn = (payload, key) => Object.prototype.hasOwnProperty.call(payload, key);

function ensureObject(payload, label = 'Request body') {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    throw new HttpError(400, `${label} must be a JSON object.`);
  }
}

function parseString(value, field, options = {}) {
  const { required = true, allowEmpty = false, maxLength } = options;

  if (value === undefined || value === null) {
    if (required) {
      throw new HttpError(400, `${field} is required.`);
    }
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

function parseEmail(value, field, options = {}) {
  const normalized = parseString(value, field, options)?.toLowerCase();

  if (normalized === undefined) {
    return undefined;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalized)) {
    throw new HttpError(400, `${field} must be a valid email address.`);
  }

  return normalized;
}

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

  if (integer && !Number.isInteger(value)) {
    throw new HttpError(400, `${field} must be an integer.`);
  }

  if (min !== undefined && value < min) {
    throw new HttpError(400, `${field} must be greater than or equal to ${min}.`);
  }

  return value;
}

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

function stripUndefined(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

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

  if (hasOwn(payload, 'createdAt')) {
    result.createdAt = parseDateString(payload.createdAt, 'createdAt', { required: false });
  }

  return stripUndefined(result);
}

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

  if (hasOwn(payload, 'toWalletId')) {
    result.toWalletId = parseNullableString(payload.toWalletId, 'toWalletId', { maxLength: 64 });
  }

  if (!partial || hasOwn(payload, 'note')) {
    result.note = payload.note === undefined
      ? partial
        ? undefined
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

  if (hasOwn(payload, 'walletId')) {
    result.walletId = parseNullableString(payload.walletId, 'walletId', { maxLength: 64 });
  }

  const normalized = stripUndefined(result);

  if (normalized.startDate && normalized.endDate) {
    const start = new Date(normalized.startDate);
    const end = new Date(normalized.endDate);

    if (start > end) {
      throw new HttpError(400, 'startDate must be before or equal to endDate.');
    }
  }

  return normalized;
}

export function normalizeSettingsPayload(payload, { partial = false } = {}) {
  ensureObject(payload);

  const result = {};



  if (!partial || hasOwn(payload, 'language')) {
    result.language = parseString(payload.language, 'language', {
      required: !partial,
      maxLength: 10,
    });
  }

  if (!partial || hasOwn(payload, 'theme')) {
    result.theme = parseEnum(payload.theme, 'theme', ['light', 'dark', 'auto'], {
      required: !partial,
    });
  }

  if (!partial || hasOwn(payload, 'firstDayOfMonth')) {
    result.firstDayOfMonth = parseNumber(payload.firstDayOfMonth, 'firstDayOfMonth', {
      required: !partial,
      integer: true,
      min: 1,
    });
  }

  if (!partial || hasOwn(payload, 'showBalance')) {
    result.showBalance = parseBoolean(payload.showBalance, 'showBalance', {
      required: !partial,
    });
  }

  if (!partial || hasOwn(payload, 'biometricEnabled')) {
    result.biometricEnabled = parseBoolean(payload.biometricEnabled, 'biometricEnabled', {
      required: !partial,
    });
  }

  return stripUndefined(result);
}

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
    settings: normalizeSettingsPayload(payload.settings ?? {}, { partial: true }),
  };
}

export function normalizeRegisterPayload(payload) {
  ensureObject(payload);

  return {
    email: parseEmail(payload.email, 'email', { maxLength: 191 }),
    password: parsePassword(payload.password, 'password'),
    name: hasOwn(payload, 'name')
      ? parseString(payload.name, 'name', { required: false, allowEmpty: false, maxLength: 100 })
      : undefined,
  };
}

export function normalizeLoginPayload(payload) {
  ensureObject(payload);

  return {
    email: parseEmail(payload.email, 'email', { maxLength: 191 }),
    password: parsePassword(payload.password, 'password'),
  };
}
