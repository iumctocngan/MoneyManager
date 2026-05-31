import * as SQLite from 'expo-sqlite';
import { AppSnapshot, Budget, ChatMessage, ChatSession, Transaction, Wallet } from '@/constants/types';
import { initializeDb } from './db';

// Singleton DB instance — tránh mở nhiều kết nối tới cùng một file DB
let dbInstance: SQLite.SQLiteDatabase | null = null;
let isDbInitialized = false;

/**
 * Trả về kết nối DB duy nhất, khởi tạo schema nếu chưa làm.
 * Pattern singleton đảm bảo chỉ gọi initializeDb một lần duy nhất trong vòng đời app.
 */
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

/**
 * Ghi đè toàn bộ dữ liệu local bằng snapshot từ server.
 * Dùng transaction để đảm bảo tính atomic — nếu có lỗi giữa chừng thì không mất dữ liệu cũ.
 */
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
            wallet.includeInTotal ? 1 : 0, // Chuyển boolean sang 0/1 vì SQLite không có kiểu boolean
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

/**
 * Đọc toàn bộ dữ liệu từ SQLite local để khôi phục state khi app khởi động (hydration).
 */
export const getSnapshotFromSqlite = async (): Promise<
  Pick<AppSnapshot, 'transactions' | 'wallets' | 'budgets'>
> => {
  const db = await getDbConnection();

  const wallets = await db.getAllAsync<any>('SELECT * FROM wallets');
  // Chuyển đổi cột includeInTotal từ 0/1 (SQLite) sang boolean (TypeScript)
  const mappedWallets = wallets.map((w) => ({
    ...w,
    includeInTotal: w.includeInTotal === 1,
  })) as Wallet[];

  const budgets = await db.getAllAsync<Budget>('SELECT * FROM budgets');
  // Sắp xếp transactions theo ngày giảm dần để hiển thị mới nhất trước
  const transactions = await db.getAllAsync<Transaction>('SELECT * FROM transactions ORDER BY date DESC');

  return {
    wallets: mappedWallets,
    budgets,
    transactions,
  };
};

// --- Granular Operations for Offline-First ---
// Các hàm bên dưới thao tác trực tiếp từng record thay vì sync toàn bộ snapshot,
// phù hợp cho các mutation nhỏ lẻ sau khi app đã được hydrate.

/**
 * Lưu hoặc cập nhật một giao dịch vào SQLite (INSERT OR REPLACE).
 */
export const saveTransactionSqlite = async (tx: Transaction) => {
  const db = await getDbConnection();
  await db.runAsync(
    `INSERT OR REPLACE INTO transactions (id, amount, categoryId, type, walletId, toWalletId, note, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tx.id, tx.amount, tx.categoryId, tx.type, tx.walletId, tx.toWalletId || null, tx.note || '', tx.date, tx.createdAt]
  );
};

/**
 * Xóa một hoặc nhiều giao dịch theo id.
 * Dùng IN clause với dynamic placeholders để xử lý batch trong một câu query duy nhất.
 */
export const deleteTransactionSqlite = async (id: string | string[]) => {
  const ids = Array.isArray(id) ? id : [id];
  if (ids.length === 0) return;
  const db = await getDbConnection();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM transactions WHERE id IN (${placeholders})`, ids);
};

/** Lưu hoặc cập nhật một ví vào SQLite. */
export const saveWalletSqlite = async (wallet: Wallet) => {
  const db = await getDbConnection();
  await db.runAsync(
    `INSERT OR REPLACE INTO wallets (id, name, balance, icon, color, includeInTotal, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [wallet.id, wallet.name, wallet.balance, wallet.icon, wallet.color, wallet.includeInTotal ? 1 : 0, wallet.createdAt]
  );
};

/** Xóa một ví theo id. */
export const deleteWalletSqlite = async (id: string) => {
  const db = await getDbConnection();
  await db.runAsync('DELETE FROM wallets WHERE id = ?', [id]);
};

/** Lưu hoặc cập nhật một ngân sách vào SQLite. */
export const saveBudgetSqlite = async (budget: Budget) => {
  const db = await getDbConnection();
  await db.runAsync(
    `INSERT OR REPLACE INTO budgets (id, categoryId, amount, period, startDate, endDate, walletId) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [budget.id, budget.categoryId, budget.amount, budget.period, budget.startDate, budget.endDate, budget.walletId || null]
  );
};

/**
 * Xóa một hoặc nhiều ngân sách theo id.
 * Tương tự deleteTransactionSqlite, dùng IN clause để batch delete hiệu quả.
 */
export const deleteBudgetSqlite = async (id: string | string[]) => {
  const ids = Array.isArray(id) ? id : [id];
  if (ids.length === 0) return;
  const db = await getDbConnection();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM budgets WHERE id IN (${placeholders})`, ids);
};

// --- Chat Operations ---

/** Lưu hoặc cập nhật một phiên chat. */
export const saveChatSessionSqlite = async (session: ChatSession) => {
  const db = await getDbConnection();
  await db.runAsync(
    'INSERT OR REPLACE INTO chat_sessions (id, title, createdAt) VALUES (?, ?, ?)',
    [session.id, session.title, session.created_at]
  );
};

/**
 * Upsert nhiều phiên chat trong một transaction.
 * Dùng withTransactionAsync để tránh nhiều lần I/O riêng lẻ khi đồng bộ từ server.
 */
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

/**
 * Lấy tất cả phiên chat, sắp xếp mới nhất lên đầu.
 * Map lại field createdAt → created_at để khớp với interface ChatSession.
 */
export const getChatSessionsSqlite = async (): Promise<ChatSession[]> => {
  const db = await getDbConnection();
  const rows = await db.getAllAsync<any>('SELECT * FROM chat_sessions ORDER BY createdAt DESC');
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    created_at: r.createdAt
  }));
};

/** Lưu hoặc cập nhật một tin nhắn chat. */
export const saveChatMessageSqlite = async (message: ChatMessage, sessionId: string) => {
  const db = await getDbConnection();
  await db.runAsync(
    'INSERT OR REPLACE INTO chat_messages (id, sessionId, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
    [message.id, sessionId, message.role, message.content, message.timestamp]
  );
};

/**
 * Upsert nhiều tin nhắn chat trong một transaction.
 * Dùng khi tải lịch sử tin nhắn từ server để giảm số lần commit xuống DB.
 */
export const upsertChatMessagesSqlite = async (messages: ChatMessage[], sessionId: string) => {
  if (messages.length === 0) return;
  const db = await getDbConnection();
  await db.withTransactionAsync(async () => {
    for (const m of messages) {
      await db.runAsync(
        'INSERT OR REPLACE INTO chat_messages (id, sessionId, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
        [m.id, sessionId, m.role, m.content, m.timestamp]
      );
    }
  });
};

/**
 * Lấy tất cả tin nhắn của một phiên chat, sắp xếp theo thời gian tăng dần (cũ → mới).
 */
export const getChatMessagesSqlite = async (sessionId: string): Promise<ChatMessage[]> => {
  const db = await getDbConnection();
  const rows = await db.getAllAsync<any>('SELECT * FROM chat_messages WHERE sessionId = ? ORDER BY timestamp ASC', [sessionId]);
  return rows.map(r => ({
    id: r.id,
    role: r.role as any,
    content: r.content,
    timestamp: r.timestamp
  }));
};

/** Xóa tất cả tin nhắn của một phiên (dùng khi người dùng muốn xóa lịch sử chat). */
export const clearChatMessagesSqlite = async (sessionId: string) => {
  const db = await getDbConnection();
  await db.runAsync('DELETE FROM chat_messages WHERE sessionId = ?', [sessionId]);
};

/**
 * Xóa một phiên chat cùng toàn bộ tin nhắn trong transaction.
 * Xóa messages trước để tránh vi phạm FK constraint (dù đã có ON DELETE CASCADE).
 */
export const deleteChatSessionSqlite = async (sessionId: string) => {
  const db = await getDbConnection();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM chat_messages WHERE sessionId = ?', [sessionId]);
    await db.runAsync('DELETE FROM chat_sessions WHERE id = ?', [sessionId]);
  });
};
