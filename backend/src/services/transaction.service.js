import { randomUUID } from 'node:crypto';
import { execute, query, withTransaction } from '../config/database.js';
import { toMysqlDateTime } from '../utils/datetime.js';
import { HttpError } from '../utils/http-error.js';
import { mapTransaction } from '../utils/serializers.js';
import { assertWalletExists, adjustWalletBalance, getWalletById } from './wallet.service.js';

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

async function applyTransactionEffect(connection, userId, transaction, factor) {
  const signedAmount = Number(transaction.amount) * factor;

  if (transaction.type === 'income') {
    await adjustWalletBalance(connection, userId, transaction.walletId, signedAmount);
    return;
  }

  if (transaction.type === 'expense') {
    await adjustWalletBalance(connection, userId, transaction.walletId, -signedAmount);
    return;
  }

  // transfer: deduct from source wallet, credit destination wallet (all VND)
  await adjustWalletBalance(connection, userId, transaction.walletId, -signedAmount);
  await adjustWalletBalance(connection, userId, transaction.toWalletId, signedAmount);
}

export async function listTransactions(userId, filters = {}, executor = query) {
  const conditions = [];
  const params = { userId };

  conditions.push('user_id = :userId');

  if (filters.walletId) {
    conditions.push('(wallet_id = :walletId OR to_wallet_id = :walletId)');
    params.walletId = filters.walletId;
  }

  if (filters.type) {
    conditions.push('type = :type');
    params.type = filters.type;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await execute(
    executor,
    `${TRANSACTION_SELECT} ${whereClause} ORDER BY transaction_date DESC, created_at DESC`,
    params
  );

  return rows.map(mapTransaction);
}

export async function getTransactionById(userId, id, executor = query) {
  const rows = await execute(
    executor,
    `${TRANSACTION_SELECT} WHERE user_id = :userId AND id = :id LIMIT 1`,
    { userId, id }
  );

  return rows[0] ? mapTransaction(rows[0]) : null;
}

export async function createTransaction(userId, payload) {
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

    await applyTransactionEffect(connection, userId, transaction, 1);
  });

  return getTransactionById(userId, id);
}

export async function updateTransaction(userId, id, payload, normalizeFullPayload) {
  return withTransaction(async (connection) => {
    const current = await getTransactionById(userId, id, connection);

    if (!current) {
      throw new HttpError(404, 'Transaction not found.');
    }

    const nextTransaction = normalizeFullPayload({ ...current, ...payload });
    const mysqlTransactionDate = toMysqlDateTime(nextTransaction.date);
    await assertTransactionWallets(connection, userId, nextTransaction);
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
