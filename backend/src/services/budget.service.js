import { randomUUID } from 'node:crypto';
import { execute, query, withTransaction } from '../config/database.js';
import { toMysqlDateTime } from '../utils/datetime.js';
import { HttpError } from '../utils/http-error.js';
import { mapBudget } from '../utils/serializers.js';
import { assertWalletExists } from './wallet.service.js';

/**
 * Query chuẩn để lấy ngân sách kèm số tiền đã chi (spent) tính inline bằng subquery.
 * COALESCE(..., 0) đảm bảo spent = 0 khi chưa có giao dịch nào thay vì NULL.
 * Điều kiện (b.wallet_id IS NULL OR t.wallet_id = b.wallet_id) cho phép ngân sách
 * áp dụng toàn bộ ví (khi wallet_id NULL) hoặc chỉ một ví cụ thể.
 */
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

/** Lấy danh sách tất cả ngân sách của user, kèm số tiền đã chi thực tế. */
export async function listBudgets(userId, executor = query) {
  const rows = await execute(
    executor,
    `${BUDGET_SELECT} WHERE b.user_id = :userId ORDER BY b.start_date DESC, b.created_at DESC`,
    { userId }
  );

  return rows.map(mapBudget);
}

/** Lấy một ngân sách theo ID, trả về null nếu không tìm thấy. */
export async function getBudgetById(userId, id, executor = query) {
  const rows = await execute(
    executor,
    `${BUDGET_SELECT} WHERE b.user_id = :userId AND b.id = :id LIMIT 1`,
    { userId, id }
  );

  return rows[0] ? mapBudget(rows[0]) : null;
}

/**
 * Tạo ngân sách mới.
 * Xác minh ví tồn tại trước khi insert để tránh foreign key lỗi âm thầm.
 * Cho phép client gửi kèm ID (payload.id) để hỗ trợ đồng bộ offline-first.
 */
export async function createBudget(userId, payload) {
  if (payload.walletId) {
    await assertWalletExists(query, userId, payload.walletId, 'walletId');
  }

  // Ưu tiên ID từ client (đồng bộ offline); nếu không có thì tạo mới
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

/**
 * Cập nhật ngân sách theo kiểu merge: đọc bản ghi hiện tại trong transaction,
 * trộn với payload mới qua normalizeFullPayload, rồi ghi lại toàn bộ các cột.
 * withTransaction bảo vệ tính nhất quán khi có nhiều request đồng thời.
 */
export async function updateBudget(userId, id, payload, normalizeFullPayload) {
  return withTransaction(async (connection) => {
    // Đọc trong cùng transaction để đảm bảo dữ liệu nhất quán khi ghi
    const current = await getBudgetById(userId, id, connection);

    if (!current) {
      throw new HttpError(404, 'Budget not found.');
    }

    // Merge dữ liệu cũ với payload mới, sau đó validate toàn bộ qua normalizeFullPayload
    const nextBudget = normalizeFullPayload({ ...current, ...payload });
    const mysqlStartDate = toMysqlDateTime(nextBudget.startDate);
    const mysqlEndDate = toMysqlDateTime(nextBudget.endDate);

    if (nextBudget.walletId) {
      await assertWalletExists(connection, userId, nextBudget.walletId, 'walletId');
    }

    await execute(
      connection,
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

    // Trả về bản ghi mới nhất từ DB (kèm spent đã tính) thay vì trả payload
    return getBudgetById(userId, id, connection);
  });
}

/**
 * Xóa ngân sách theo ID.
 * Kiểm tra tồn tại trước để trả 404 rõ ràng thay vì xóa 0 hàng một cách âm thầm.
 */
export async function deleteBudget(userId, id) {
  const budget = await getBudgetById(userId, id);

  if (!budget) {
    throw new HttpError(404, 'Budget not found.');
  }

  await query('DELETE FROM budgets WHERE user_id = :userId AND id = :id', { id, userId });
}
