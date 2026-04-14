import { randomUUID } from 'node:crypto';
import { execute, withTransaction } from '../config/database.js';
import { toMysqlDateTime } from '../utils/datetime.js';
import { listBudgets } from './budget.service.js';
import { getSettings } from './settings.service.js';
import { listTransactions } from './transaction.service.js';
import { listWallets } from './wallet.service.js';

export async function getStateSnapshot(userId) {
  const [wallets, transactions, budgets, settings] = await Promise.all([
    listWallets(userId),
    listTransactions(userId),
    listBudgets(userId),
    getSettings(userId),
  ]);

  return {
    wallets,
    transactions,
    budgets,
    settings,
  };
}

export async function importStateSnapshot(userId, snapshot) {
  await withTransaction(async (connection) => {
    await execute(connection, 'DELETE FROM transactions WHERE user_id = :userId', { userId });
    await execute(connection, 'DELETE FROM budgets WHERE user_id = :userId', { userId });
    await execute(connection, 'DELETE FROM wallets WHERE user_id = :userId', { userId });
    await execute(connection, 'DELETE FROM app_settings WHERE user_id = :userId', { userId });

    const settings = {
      language: snapshot.settings.language ?? 'vi',
      theme: snapshot.settings.theme ?? 'light',
      firstDayOfMonth: snapshot.settings.firstDayOfMonth ?? 1,
      showBalance: snapshot.settings.showBalance ?? true,
      biometricEnabled: snapshot.settings.biometricEnabled ?? false,
    };

    await execute(
      connection,
      `
        INSERT INTO app_settings (
          user_id,
          language,
          theme,
          first_day_of_month,
          show_balance,
          biometric_enabled
        )
        VALUES (
          :userId,
          :language,
          :theme,
          :firstDayOfMonth,
          :showBalance,
          :biometricEnabled
        )
      `,
      {
        ...settings,
        userId,
      }
    );

    for (const wallet of snapshot.wallets) {
      const id = wallet.id ?? randomUUID();
      const createdAt = toMysqlDateTime(wallet.createdAt ?? new Date());

      await execute(
        connection,
        `
          INSERT INTO wallets (
            id,
            user_id,
            name,
            opening_balance,
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
            :openingBalance,
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
          openingBalance: wallet.balance,
          balance: wallet.balance,
          color: wallet.color,
          icon: wallet.icon,
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

  return getStateSnapshot(userId);
}
