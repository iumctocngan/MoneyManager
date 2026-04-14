function toIsoString(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const normalized = value.includes('T')
      ? value
      : `${value.replace(' ', 'T')}Z`;
    const parsed = new Date(normalized);

    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function mapWallet(row) {
  return {
    id: row.id,
    name: row.name,
    balance: Number(row.balance),
    color: row.color,
    icon: row.icon,
    includeInTotal: Boolean(row.include_in_total),
    hasTransactions: Boolean(row.has_transactions),
    createdAt: toIsoString(row.created_at),
  };
}

export function mapTransaction(row) {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    categoryId: row.category_id,
    walletId: row.wallet_id,
    toWalletId: row.to_wallet_id ?? undefined,
    note: row.note ?? '',
    date: toIsoString(row.transaction_date),
    createdAt: toIsoString(row.created_at),
  };
}

export function mapBudget(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    amount: Number(row.amount),
    spent: Number(row.spent ?? 0),
    period: row.period,
    startDate: toIsoString(row.start_date),
    endDate: toIsoString(row.end_date),
    walletId: row.wallet_id ?? undefined,
  };
}

export function mapSettings(row) {
  return {
    language: row.language,
    theme: row.theme,
    firstDayOfMonth: Number(row.first_day_of_month),
    showBalance: Boolean(row.show_balance),
    biometricEnabled: Boolean(row.biometric_enabled),
  };
}

export function mapUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    lastLoginAt: toIsoString(row.last_login_at),
    createdAt: toIsoString(row.created_at),
  };
}
