import { randomUUID } from 'node:crypto';
import { execute, withTransaction } from '../config/database.js';
import { toMysqlDateTime } from '../utils/datetime.js';
import { listBudgets } from './budget.service.js';
import { listTransactions } from './transaction.service.js';
import { listWallets } from './wallet.service.js';

/**
 * Lấy toàn bộ dữ liệu của user (ví, giao dịch, ngân sách) trong một lần gọi.
 * Promise.all chạy song song 3 query để giảm tổng thời gian chờ.
 * Được dùng làm payload đồng bộ cho frontend offline-first.
 */
export async function getStateSnapshot(userId) {
  const [wallets, transactions, budgets] = await Promise.all([
    listWallets(userId),
    listTransactions(userId),
    listBudgets(userId),
  ]);

  return {
    wallets,
    transactions,
    budgets,
  };
}

/**
 * Nhập toàn bộ dữ liệu từ snapshot (thường từ client đồng bộ offline).
 * Chiến lược: xóa sạch dữ liệu cũ rồi insert lại — đơn giản và đảm bảo nhất quán.
 * withTransaction bao bọc toàn bộ quá trình: nếu bất kỳ bước nào thất bại,
 * tất cả rollback để tránh trạng thái dữ liệu bị thiếu/lỗi.
 *
 * Thứ tự xóa: transactions → budgets → wallets (tránh vi phạm foreign key).
 * Thứ tự insert: wallets → budgets → transactions (cùng lý do).
 */
export async function importStateSnapshot(userId, snapshot) {
  await withTransaction(async (connection) => {
    // Xóa theo thứ tự phụ thuộc: bảng con trước, bảng cha sau
    await execute(connection, 'DELETE FROM transactions WHERE user_id = :userId', { userId });
    await execute(connection, 'DELETE FROM budgets WHERE user_id = :userId', { userId });
    await execute(connection, 'DELETE FROM wallets WHERE user_id = :userId', { userId });

    // Insert ví trước vì giao dịch và ngân sách tham chiếu đến wallet_id
    for (const wallet of snapshot.wallets) {
      // Ưu tiên ID từ client để giữ tham chiếu nhất quán với giao dịch/ngân sách
      const id = wallet.id ?? randomUUID();
      const createdAt = toMysqlDateTime(wallet.createdAt ?? new Date());

      await execute(
        connection,
        `
          INSERT INTO wallets (
            id,
            user_id,
            name,
            balance,
            color,
            icon,
            include_in_total,
            created_at
          )
          VALUES (
            :id,
            :userId,
            :name,
            :balance,
            :color,
            :icon,
            :includeInTotal,
            :createdAt
          )
        `,
        {
          id,
          userId,
          name: wallet.name,
          balance: wallet.balance,
          color: wallet.color,
          icon: wallet.icon,
          // Mặc định includeInTotal = true nếu snapshot cũ không có trường này
          includeInTotal: wallet.includeInTotal ?? true,
          createdAt,
        }
      );
    }

    for (const budget of snapshot.budgets) {
      const id = budget.id ?? randomUUID();
      const startDate = toMysqlDateTime(budget.startDate);
      const endDate = toMysqlDateTime(budget.endDate);

      await execute(
        connection,
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
          categoryId: budget.categoryId,
          amount: budget.amount,
          period: budget.period,
          startDate,
          endDate,
          walletId: budget.walletId ?? null,
        }
      );
    }

    for (const transaction of snapshot.transactions) {
      const id = transaction.id ?? randomUUID();
      const createdAt = toMysqlDateTime(transaction.createdAt ?? new Date());
      const transactionDate = toMysqlDateTime(transaction.date);

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
          id,
          userId,
          type: transaction.type,
          amount: transaction.amount,
          categoryId: transaction.categoryId,
          walletId: transaction.walletId,
          toWalletId: transaction.toWalletId ?? null,
          note: transaction.note ?? '',
          date: transactionDate,
          createdAt,
        }
      );
    }
  });

  // Trả về snapshot mới nhất từ DB sau khi import thành công
  return getStateSnapshot(userId);
}
