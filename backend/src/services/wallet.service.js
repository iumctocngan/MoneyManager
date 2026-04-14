import { randomUUID } from 'node:crypto';
import { execute, query, withTransaction } from '../config/database.js';
import { toMysqlDateTime } from '../utils/datetime.js';
import { HttpError } from '../utils/http-error.js';
import { mapWallet } from '../utils/serializers.js';


const WALLET_SELECT = `
  SELECT
    id,
    name,
    balance,
    color,
    icon,
    include_in_total,
    created_at,
    (
      SELECT COUNT(*)
      FROM transactions t
      WHERE t.wallet_id = wallets.id OR t.to_wallet_id = wallets.id
      LIMIT 1
    ) > 0 AS has_transactions
  FROM wallets
`;

export async function adjustWalletBalance(executor, userId, walletId, delta) {
  await execute(
    executor,
    `
      UPDATE wallets
      SET balance = balance + :delta
      WHERE id = :walletId AND user_id = :userId
    `,
    { delta, walletId, userId }
  );
}

export async function walletExists(executor, userId, walletId) {
  const rows = await execute(
    executor,
    `
      SELECT id
      FROM wallets
      WHERE id = :walletId AND user_id = :userId
      LIMIT 1
    `,
    { walletId, userId }
  );

  return rows.length > 0;
}

export async function assertWalletExists(executor, userId, walletId, fieldName = 'walletId') {
  const exists = await walletExists(executor, userId, walletId);

  if (!exists) {
    throw new HttpError(400, `${fieldName} "${walletId}" does not exist.`);
  }
}

export async function listWallets(userId, executor = query) {
  const rows = await execute(
    executor,
    `${WALLET_SELECT} WHERE user_id = :userId ORDER BY created_at ASC`,
    { userId }
  );

  return rows.map(mapWallet);
}

export async function getWalletById(userId, id, executor = query) {
  const rows = await execute(
    executor,
    `${WALLET_SELECT} WHERE user_id = :userId AND id = :id LIMIT 1`,
    { userId, id }
  );

  return rows[0] ? mapWallet(rows[0]) : null;
}

export async function createWallet(userId, payload) {
  const id = payload.id ?? randomUUID();
  const createdAt = toMysqlDateTime(payload.createdAt ?? new Date());

  await query(
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
      name: payload.name,
      openingBalance: payload.balance,
      balance: payload.balance,
      color: payload.color,
      icon: payload.icon,
      includeInTotal: payload.includeInTotal ?? true,
      createdAt,
    }
  );

  return getWalletById(userId, id);
}

export async function updateWallet(userId, id, payload) {
  const current = await getWalletById(userId, id);

  if (!current) {
    throw new HttpError(404, 'Wallet not found.');
  }

  const updates = [];
  const params = { id, userId };

  if (payload.name !== undefined) {
    updates.push('name = :name');
    params.name = payload.name;
  }

  if (payload.balance !== undefined) {
    updates.push('balance = :balance');
    params.balance = payload.balance;
  }

  if (payload.color !== undefined) {
    updates.push('color = :color');
    params.color = payload.color;
  }

  if (payload.icon !== undefined) {
    updates.push('icon = :icon');
    params.icon = payload.icon;
  }

  if (payload.includeInTotal !== undefined) {
    updates.push('include_in_total = :includeInTotal');
    params.includeInTotal = payload.includeInTotal;
  }

  if (updates.length > 0) {
    await query(
      `
        UPDATE wallets
        SET ${updates.join(', ')}
        WHERE id = :id AND user_id = :userId
      `,
      params
    );
  }

  return getWalletById(userId, id);
}

export async function deleteWallet(userId, id) {
  await withTransaction(async (connection) => {
    const wallets = await listWallets(userId, connection);
    const walletMap = new Map(wallets.map((w) => [w.id, w]));
    const wallet = walletMap.get(id);

    if (!wallet) {
      throw new HttpError(404, 'Wallet not found.');
    }

    const relatedTransactions = await execute(
      connection,
      `
        SELECT
          id,
          type,
          amount,
          wallet_id,
          to_wallet_id
        FROM transactions
        WHERE user_id = :userId AND (wallet_id = :id OR to_wallet_id = :id)
      `,
      { id, userId }
    );

    for (const transaction of relatedTransactions) {
      if (transaction.type !== 'transfer') {
        continue;
      }

      // If we're deleting the source wallet, we need to subtract the amount
      // from the destination wallet to undo the credit.
      if (
        transaction.wallet_id === id &&
        transaction.to_wallet_id &&
        transaction.to_wallet_id !== id
      ) {
        const transactionAmount = Number(transaction.amount);

        await adjustWalletBalance(
          connection,
          userId,
          transaction.to_wallet_id,
          -transactionAmount
        );
      }

      // If we're deleting the destination wallet, we add the amount
      // back to the source wallet.
      if (
        transaction.to_wallet_id === id &&
        transaction.wallet_id &&
        transaction.wallet_id !== id
      ) {
        await adjustWalletBalance(
          connection,
          userId,
          transaction.wallet_id,
          Number(transaction.amount)
        );
      }
    }

    await execute(
      connection,
      'DELETE FROM transactions WHERE user_id = :userId AND (wallet_id = :id OR to_wallet_id = :id)',
      { id, userId }
    );
    await execute(
      connection,
      'DELETE FROM budgets WHERE user_id = :userId AND wallet_id = :id',
      { id, userId }
    );
    await execute(connection, 'DELETE FROM wallets WHERE user_id = :userId AND id = :id', {
      id,
      userId,
    });
  });
}
