import { randomUUID } from 'node:crypto';
import { execute, query } from '../config/database.js';
import { toMysqlDateTime } from '../utils/datetime.js';
import { HttpError } from '../utils/http-error.js';
import { mapBudget } from '../utils/serializers.js';
import { assertWalletExists } from './wallet.service.js';

const BUDGET_SELECT = `
  SELECT
    b.id,
    b.category_id,
    b.amount,
    b.period,
    b.start_date,
    b.end_date,
    b.wallet_id,
    COALESCE((
      SELECT SUM(t.amount)
      FROM transactions t
      WHERE t.type = 'expense'
        AND t.user_id = b.user_id
        AND t.category_id = b.category_id
        AND t.transaction_date BETWEEN b.start_date AND b.end_date
        AND (b.wallet_id IS NULL OR t.wallet_id = b.wallet_id)
    ), 0) AS spent
  FROM budgets b
`;

export async function listBudgets(userId, executor = query) {
  const rows = await execute(
    executor,
    `${BUDGET_SELECT} WHERE b.user_id = :userId ORDER BY b.start_date DESC, b.created_at DESC`,
    { userId }
  );

  return rows.map(mapBudget);
}

export async function getBudgetById(userId, id, executor = query) {
  const rows = await execute(
    executor,
    `${BUDGET_SELECT} WHERE b.user_id = :userId AND b.id = :id LIMIT 1`,
    { userId, id }
  );

  return rows[0] ? mapBudget(rows[0]) : null;
}

export async function createBudget(userId, payload) {
  if (payload.walletId) {
    await assertWalletExists(query, userId, payload.walletId, 'walletId');
  }

  const id = payload.id ?? randomUUID();

  await query(
    `
      INSERT INTO budgets (
        id,
        user_id,
        category_id,
        amount,
        period,
        start_date,
        end_date,
        wallet_id
      )
      VALUES (
        :id,
        :userId,
        :categoryId,
        :amount,
        :period,
        :startDate,
        :endDate,
        :walletId
      )
    `,
    {
      id,
      userId,
      categoryId: payload.categoryId,
      amount: payload.amount,
      period: payload.period,
      startDate: toMysqlDateTime(payload.startDate),
      endDate: toMysqlDateTime(payload.endDate),
      walletId: payload.walletId ?? null,
    }
  );

  return getBudgetById(userId, id);
}

export async function updateBudget(userId, id, payload, normalizeFullPayload) {
  const current = await getBudgetById(userId, id);

  if (!current) {
    throw new HttpError(404, 'Budget not found.');
  }

  const nextBudget = normalizeFullPayload({ ...current, ...payload });
  const mysqlStartDate = toMysqlDateTime(nextBudget.startDate);
  const mysqlEndDate = toMysqlDateTime(nextBudget.endDate);

  if (nextBudget.walletId) {
    await assertWalletExists(query, userId, nextBudget.walletId, 'walletId');
  }

  await query(
    `
      UPDATE budgets
      SET
        category_id = :categoryId,
        amount = :amount,
        period = :period,
        start_date = :startDate,
        end_date = :endDate,
        wallet_id = :walletId
      WHERE user_id = :userId AND id = :id
    `,
    {
      id,
      userId,
      categoryId: nextBudget.categoryId,
      amount: nextBudget.amount,
      period: nextBudget.period,
      startDate: mysqlStartDate,
      endDate: mysqlEndDate,
      walletId: nextBudget.walletId ?? null,
    }
  );

  return getBudgetById(userId, id);
}

export async function deleteBudget(userId, id) {
  const budget = await getBudgetById(userId, id);

  if (!budget) {
    throw new HttpError(404, 'Budget not found.');
  }

  await query('DELETE FROM budgets WHERE user_id = :userId AND id = :id', { id, userId });
}
