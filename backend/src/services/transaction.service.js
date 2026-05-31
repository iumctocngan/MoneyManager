import { randomUUID } from 'node:crypto';
import { execute, query, withTransaction } from '../config/database.js';
import { toMysqlDateTime } from '../utils/datetime.js';
import { HttpError } from '../utils/http-error.js';
import { mapTransaction } from '../utils/serializers.js';
import { adjustWalletBalance, assertWalletExists } from './wallet.service.js';

// Các cột cần lấy khi query giao dịch — không lấy user_id để tránh lộ thông tin thừa
const TRANSACTION_SELECT = `
  SELECT
    id,
    type,
    amount,
    category_id,
    wallet_id,
    to_wallet_id,
    note,
    transaction_date,
    created_at
  FROM transactions
`;

/**
 * Xác minh ví hợp lệ trước khi tạo/cập nhật giao dịch.
 * Với loại 'transfer', bắt buộc phải có toWalletId và hai ví phải khác nhau.
 */
async function assertTransactionWallets(connection, userId, transaction) {
  await assertWalletExists(connection, userId, transaction.walletId, 'walletId');

  if (transaction.type === 'transfer') {
    if (!transaction.toWalletId) {
      throw new HttpError(400, 'toWalletId is required when type is transfer.');
    }

    if (transaction.toWalletId === transaction.walletId) {
      throw new HttpError(400, 'toWalletId must be different from walletId for transfers.');
    }

    await assertWalletExists(connection, userId, transaction.toWalletId, 'toWalletId');
  }
}

/**
 * Áp dụng hoặc hoàn tác ảnh hưởng của giao dịch lên số dư ví.
 * factor = 1: áp dụng (tạo mới / khôi phục).
 * factor = -1: hoàn tác (xóa / trước khi cập nhật).
 * Thiết kế này giúp tái sử dụng logic cho cả create, update, delete.
 */
async function applyTransactionEffect(connection, userId, transaction, factor) {
  const signedAmount = Number(transaction.amount) * factor;

  if (transaction.type === 'income') {
    await adjustWalletBalance(connection, userId, transaction.walletId, signedAmount);
    return;
  }

  if (transaction.type === 'expense') {
    // Chi tiêu làm giảm số dư, nên nhân thêm -1
    await adjustWalletBalance(connection, userId, transaction.walletId, -signedAmount);
    return;
  }

  // transfer: deduct from source wallet, credit destination wallet (all VND)
  await adjustWalletBalance(connection, userId, transaction.walletId, -signedAmount);
  await adjustWalletBalance(connection, userId, transaction.toWalletId, signedAmount);
}

/**
 * Lấy danh sách giao dịch với các bộ lọc tùy chọn.
 * Query được xây dựng động dựa trên filters để tránh inject SQL,
 * sử dụng named parameters (:param) thay vì nối chuỗi trực tiếp.
 * walletId lọc cả wallet_id lẫn to_wallet_id để bắt giao dịch chuyển khoản.
 */
export async function listTransactions(userId, filters = {}, executor = query) {
  const conditions = [];
  const params = { userId };

  conditions.push('user_id = :userId');

  if (filters.walletId) {
    // Lọc cả hai chiều của giao dịch chuyển khoản
    conditions.push('(wallet_id = :walletId OR to_wallet_id = :walletId)');
    params.walletId = filters.walletId;
  }

  if (filters.type) {
    conditions.push('type = :type');
    params.type = filters.type;
  }

  // Lọc theo danh sách ID — dùng cho batch fetch sau khi import
  if (Array.isArray(filters.ids) && filters.ids.length > 0) {
    conditions.push('id IN (:ids)');
    params.ids = filters.ids;
  }

  if (filters.startDate) {
    conditions.push('transaction_date >= :startDate');
    params.startDate = filters.startDate;
  }

  if (filters.endDate) {
    conditions.push('transaction_date <= :endDate');
    params.endDate = filters.endDate;
  }

  // LIMIT chỉ được thêm khi có giá trị hợp lệ — tránh inject SQL bằng Number()
  let limitClause = '';
  if (typeof filters.limit === 'number' && filters.limit > 0) {
    limitClause = ` LIMIT ${Number(filters.limit)}`;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await execute(
    executor,
    `${TRANSACTION_SELECT} ${whereClause} ORDER BY transaction_date DESC, created_at DESC${limitClause}`,
    params
  );

  return rows.map(mapTransaction);
}

/** Lấy một giao dịch theo ID, trả về null nếu không tìm thấy. */
export async function getTransactionById(userId, id, executor = query) {
  const rows = await execute(
    executor,
    `${TRANSACTION_SELECT} WHERE user_id = :userId AND id = :id LIMIT 1`,
    { userId, id }
  );

  return rows[0] ? mapTransaction(rows[0]) : null;
}

/**
 * Tạo giao dịch mới và cập nhật số dư ví trong cùng một transaction DB.
 * withTransaction đảm bảo nếu insert thành công nhưng adjustWalletBalance thất bại,
 * toàn bộ sẽ rollback — tránh giao dịch "ma" không ảnh hưởng số dư.
 */
export async function createTransaction(userId, payload) {
  // Ưu tiên ID từ client để hỗ trợ đồng bộ offline-first
  const id = payload.id ?? randomUUID();
  const createdAt = toMysqlDateTime(payload.createdAt ?? new Date());
  const transaction = {
    ...payload,
    id,
    note: payload.note ?? '',
    createdAt,
    date: toMysqlDateTime(payload.date),
  };

  await withTransaction(async (connection) => {
    await assertTransactionWallets(connection, userId, transaction);

    await execute(
      connection,
      `
        INSERT INTO transactions (
          id,
          user_id,
          type,
          amount,
          category_id,
          wallet_id,
          to_wallet_id,
          note,
          transaction_date,
          created_at
        )
        VALUES (
          :id,
          :userId,
          :type,
          :amount,
          :categoryId,
          :walletId,
          :toWalletId,
          :note,
          :date,
          :createdAt
        )
      `,
      {
        id: transaction.id,
        userId,
        type: transaction.type,
        amount: transaction.amount,
        categoryId: transaction.categoryId,
        walletId: transaction.walletId,
        toWalletId: transaction.toWalletId ?? null,
        note: transaction.note,
        date: transaction.date,
        createdAt: transaction.createdAt,
      }
    );

    // Áp dụng ảnh hưởng lên số dư ví ngay sau khi insert thành công
    await applyTransactionEffect(connection, userId, transaction, 1);
  });

  return getTransactionById(userId, id);
}

/**
 * Cập nhật giao dịch theo chiến lược: hoàn tác ảnh hưởng cũ → ghi mới → áp dụng ảnh hưởng mới.
 * Tất cả trong một transaction DB để đảm bảo số dư ví luôn nhất quán.
 * normalizeFullPayload được gọi trên dữ liệu đã merge để đảm bảo validation đầy đủ.
 */
export async function updateTransaction(userId, id, payload, normalizeFullPayload) {
  return withTransaction(async (connection) => {
    const current = await getTransactionById(userId, id, connection);

    if (!current) {
      throw new HttpError(404, 'Transaction not found.');
    }

    // Merge dữ liệu cũ với payload rồi normalize toàn bộ để đảm bảo hợp lệ
    const nextTransaction = normalizeFullPayload({ ...current, ...payload });
    const mysqlTransactionDate = toMysqlDateTime(nextTransaction.date);
    await assertTransactionWallets(connection, userId, nextTransaction);

    // Revert số dư cũ trước, rồi áp dụng số dư mới — đảm bảo wallet balance luôn chính xác
    await applyTransactionEffect(connection, userId, current, -1);

    await execute(
      connection,
      `
        UPDATE transactions
        SET
          type = :type,
          amount = :amount,
          category_id = :categoryId,
          wallet_id = :walletId,
          to_wallet_id = :toWalletId,
          note = :note,
          transaction_date = :date
        WHERE user_id = :userId AND id = :id
      `,
      {
        id,
        userId,
        type: nextTransaction.type,
        amount: nextTransaction.amount,
        categoryId: nextTransaction.categoryId,
        walletId: nextTransaction.walletId,
        toWalletId: nextTransaction.toWalletId ?? null,
        note: nextTransaction.note ?? '',
        date: mysqlTransactionDate,
      }
    );

    await applyTransactionEffect(connection, userId, nextTransaction, 1);

    return getTransactionById(userId, id, connection);
  });
}

/**
 * Xóa giao dịch và hoàn tác ảnh hưởng lên số dư ví trong cùng một transaction DB.
 * Thứ tự: revert balance trước, xóa record sau — nếu xóa thất bại thì balance cũng rollback.
 */
export async function deleteTransaction(userId, id) {
  await withTransaction(async (connection) => {
    const transaction = await getTransactionById(userId, id, connection);

    if (!transaction) {
      throw new HttpError(404, 'Transaction not found.');
    }

    await applyTransactionEffect(connection, userId, transaction, -1);
    await execute(connection, 'DELETE FROM transactions WHERE user_id = :userId AND id = :id', {
      id,
      userId,
    });
  });
}

/**
 * FIX: Thêm Batch API xử lý hàng loạt giao dịch từ AI scan.
 * Giảm số lượng request HTTP và đảm bảo tính toàn vẹn (tất cả thành công hoặc thất bại).
 */
export async function createTransactionsBatch(userId, transactionsPayload) {
  if (!Array.isArray(transactionsPayload) || transactionsPayload.length === 0) {
    return [];
  }

  const results = [];

  return await withTransaction(async (connection) => {
    for (const payload of transactionsPayload) {
      const id = payload.id ?? randomUUID();
      const createdAt = toMysqlDateTime(payload.createdAt ?? new Date());
      const transaction = {
        ...payload,
        id,
        note: payload.note ?? '',
        createdAt,
        date: toMysqlDateTime(payload.date),
      };

      // 1. Kiểm tra ví tồn tại
      await assertTransactionWallets(connection, userId, transaction);

      // 2. Insert giao dịch
      await execute(
        connection,
        `
          INSERT INTO transactions (
            id, user_id, type, amount, category_id,
            wallet_id, to_wallet_id, note, transaction_date, created_at
          )
          VALUES (
            :id, :userId, :type, :amount, :categoryId,
            :walletId, :toWalletId, :note, :date, :createdAt
          )
        `,
        {
          id: transaction.id,
          userId,
          type: transaction.type,
          amount: transaction.amount,
          categoryId: transaction.categoryId,
          walletId: transaction.walletId,
          toWalletId: transaction.toWalletId ?? null,
          note: transaction.note,
          date: transaction.date,
          createdAt: transaction.createdAt,
        }
      );

      // 3. Cập nhật số dư ví
      await applyTransactionEffect(connection, userId, transaction, 1);

      results.push(transaction.id);
    }

    // Trả về danh sách đầy đủ sau khi đã commit thành công
    return await listTransactions(userId, { ids: results }, connection);
  });
}
