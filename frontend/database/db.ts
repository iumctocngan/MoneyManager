import * as SQLite from 'expo-sqlite';

/**
 * Khởi tạo schema SQLite khi app khởi động lần đầu.
 * Dùng execAsync một lần để tránh nhiều round-trip tới DB.
 */
export async function initializeDb(db: SQLite.SQLiteDatabase) {
  // PRAGMA journal_mode = WAL; improves performance
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = -8000;
    PRAGMA temp_store = MEMORY;

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      amount INTEGER NOT NULL,        -- Lưu dạng INTEGER (VNĐ) để tránh lỗi dấu phẩy động
      categoryId TEXT NOT NULL,
      type TEXT NOT NULL,
      walletId TEXT NOT NULL,
      toWalletId TEXT,               -- Chỉ có giá trị khi type = 'transfer'
      note TEXT,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      balance INTEGER NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      includeInTotal INTEGER NOT NULL, -- SQLite không có BOOLEAN, dùng 0/1
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY NOT NULL,
      categoryId TEXT NOT NULL,
      amount INTEGER NOT NULL,
      period TEXT NOT NULL DEFAULT 'monthly',
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      walletId TEXT               -- NULL = áp dụng cho tất cả ví
    );

    -- Index tăng tốc truy vấn lọc theo ngày, ví, loại, danh mục
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(walletId);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(categoryId);

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY NOT NULL,
      sessionId TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      -- ON DELETE CASCADE: xóa session sẽ tự xóa toàn bộ tin nhắn liên quan
      FOREIGN KEY(sessionId) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(sessionId);
  `);

  // Migration: Add period and walletId to budgets if not exists
  // Dùng try/catch vì ALTER TABLE sẽ báo lỗi nếu cột đã tồn tại (SQLite không hỗ trợ IF NOT EXISTS cho cột)
  try {
    await db.execAsync("ALTER TABLE budgets ADD COLUMN period TEXT NOT NULL DEFAULT 'monthly'");
  } catch (e) {}
  try {
    await db.execAsync("ALTER TABLE budgets ADD COLUMN walletId TEXT");
  } catch (e) {}
}
