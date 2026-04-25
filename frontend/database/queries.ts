import * as SQLite from 'expo-sqlite';
import { AppSnapshot, Budget, ChatMessage, ChatSession, Transaction, Wallet } from '@/constants/types';
import { initializeDb } from './db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let isDbInitialized = false;

export const getDbConnection = async () => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('money_manager.db');
  }
  if (!isDbInitialized) {
    await initializeDb(dbInstance);
    isDbInitialized = true;
  }
  return dbInstance;
};

export const syncSnapshotToSqlite = async (snapshot: Partial<AppSnapshot>) => {
  const db = await getDbConnection();

  await db.withTransactionAsync(async () => {
    // Clear old data
    await db.execAsync('DELETE FROM transactions; DELETE FROM wallets; DELETE FROM budgets;');

    // Insert wallets
    if (snapshot.wallets) {
      for (const wallet of snapshot.wallets) {
        await db.runAsync(
          `INSERT INTO wallets (id, name, balance, icon, color, includeInTotal, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            wallet.id,
            wallet.name,
            wallet.balance,
            wallet.icon,
            wallet.color,
            wallet.includeInTotal ? 1 : 0,
            wallet.createdAt,
          ]
        );
      }
    }

    // Insert budgets
    if (snapshot.budgets) {
      for (const budget of snapshot.budgets) {
        await db.runAsync(
          `INSERT INTO budgets (id, categoryId, amount, period, startDate, endDate, walletId) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [budget.id, budget.categoryId, budget.amount, budget.period || 'monthly', budget.startDate, budget.endDate, budget.walletId || null]
        );
      }
    }

    // Insert transactions
    if (snapshot.transactions) {
      for (const tx of snapshot.transactions) {
        await db.runAsync(
          `INSERT INTO transactions (id, amount, categoryId, type, walletId, toWalletId, note, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tx.id,
            tx.amount,
            tx.categoryId,
            tx.type,
            tx.walletId,
            tx.toWalletId || null,
            tx.note || '',
            tx.date,
            tx.createdAt,
          ]
        );
      }
    }
  });
};

export const getSnapshotFromSqlite = async (): Promise<
  Pick<AppSnapshot, 'transactions' | 'wallets' | 'budgets'>
> => {
  const db = await getDbConnection();

  const wallets = await db.getAllAsync<any>('SELECT * FROM wallets');
  const mappedWallets = wallets.map((w) => ({
    ...w,
    includeInTotal: w.includeInTotal === 1,
  })) as Wallet[];

  const budgets = await db.getAllAsync<Budget>('SELECT * FROM budgets');
  const transactions = await db.getAllAsync<Transaction>('SELECT * FROM transactions ORDER BY date DESC');

  return {
    wallets: mappedWallets,
    budgets,
    transactions,
  };
};

// --- Granular Operations for Offline-First ---

export const saveTransactionSqlite = async (tx: Transaction) => {
  const db = await getDbConnection();
  await db.runAsync(
    `INSERT OR REPLACE INTO transactions (id, amount, categoryId, type, walletId, toWalletId, note, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tx.id, tx.amount, tx.categoryId, tx.type, tx.walletId, tx.toWalletId || null, tx.note || '', tx.date, tx.createdAt]
  );
};

export const deleteTransactionSqlite = async (id: string | string[]) => {
  const ids = Array.isArray(id) ? id : [id];
  if (ids.length === 0) return;
  const db = await getDbConnection();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM transactions WHERE id IN (${placeholders})`, ids);
};

export const saveWalletSqlite = async (wallet: Wallet) => {
  const db = await getDbConnection();
  await db.runAsync(
    `INSERT OR REPLACE INTO wallets (id, name, balance, icon, color, includeInTotal, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [wallet.id, wallet.name, wallet.balance, wallet.icon, wallet.color, wallet.includeInTotal ? 1 : 0, wallet.createdAt]
  );
};

export const deleteWalletSqlite = async (id: string) => {
  const db = await getDbConnection();
  await db.runAsync('DELETE FROM wallets WHERE id = ?', [id]);
};

export const saveBudgetSqlite = async (budget: Budget) => {
  const db = await getDbConnection();
  await db.runAsync(
    `INSERT OR REPLACE INTO budgets (id, categoryId, amount, period, startDate, endDate, walletId) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [budget.id, budget.categoryId, budget.amount, budget.period, budget.startDate, budget.endDate, budget.walletId || null]
  );
};

export const deleteBudgetSqlite = async (id: string | string[]) => {
  const ids = Array.isArray(id) ? id : [id];
  if (ids.length === 0) return;
  const db = await getDbConnection();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM budgets WHERE id IN (${placeholders})`, ids);
};

// --- Chat Operations ---

export const saveChatSessionSqlite = async (session: ChatSession) => {
  const db = await getDbConnection();
  await db.runAsync(
    'INSERT OR REPLACE INTO chat_sessions (id, title, createdAt) VALUES (?, ?, ?)',
    [session.id, session.title, session.created_at]
  );
};

export const upsertChatSessionsSqlite = async (sessions: ChatSession[]) => {
  if (sessions.length === 0) return;
  const db = await getDbConnection();
  await db.withTransactionAsync(async () => {
    for (const s of sessions) {
      await db.runAsync(
        'INSERT OR REPLACE INTO chat_sessions (id, title, createdAt) VALUES (?, ?, ?)',
        [s.id, s.title, s.created_at]
      );
    }
  });
};

export const getChatSessionsSqlite = async (): Promise<ChatSession[]> => {
  const db = await getDbConnection();
  const rows = await db.getAllAsync<any>('SELECT * FROM chat_sessions ORDER BY createdAt DESC');
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    created_at: r.createdAt
  }));
};

export const saveChatMessageSqlite = async (message: ChatMessage, sessionId: string) => {
  const db = await getDbConnection();
  await db.runAsync(
    'INSERT OR REPLACE INTO chat_messages (id, sessionId, role, content, timestamp, fileUri) VALUES (?, ?, ?, ?, ?, ?)',
    [message.id, sessionId, message.role, message.content, message.timestamp, message.fileUri || null]
  );
};

export const upsertChatMessagesSqlite = async (messages: ChatMessage[], sessionId: string) => {
  if (messages.length === 0) return;
  const db = await getDbConnection();
  await db.withTransactionAsync(async () => {
    for (const m of messages) {
      await db.runAsync(
        'INSERT OR REPLACE INTO chat_messages (id, sessionId, role, content, timestamp, fileUri) VALUES (?, ?, ?, ?, ?, ?)',
        [m.id, sessionId, m.role, m.content, m.timestamp, m.fileUri || null]
      );
    }
  });
};

export const getChatMessagesSqlite = async (sessionId: string): Promise<ChatMessage[]> => {
  const db = await getDbConnection();
  const rows = await db.getAllAsync<any>('SELECT * FROM chat_messages WHERE sessionId = ? ORDER BY timestamp ASC', [sessionId]);
  return rows.map(r => ({
    id: r.id,
    role: r.role as any,
    content: r.content,
    timestamp: r.timestamp,
    fileUri: r.fileUri
  }));
};

export const clearChatMessagesSqlite = async (sessionId: string) => {
  const db = await getDbConnection();
  await db.runAsync('DELETE FROM chat_messages WHERE sessionId = ?', [sessionId]);
};

export const deleteChatSessionSqlite = async (sessionId: string) => {
  const db = await getDbConnection();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM chat_messages WHERE sessionId = ?', [sessionId]);
    await db.runAsync('DELETE FROM chat_sessions WHERE id = ?', [sessionId]);
  });
};
