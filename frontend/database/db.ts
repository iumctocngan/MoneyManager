import * as SQLite from 'expo-sqlite';

export async function initializeDb(db: SQLite.SQLiteDatabase) {
  // PRAGMA journal_mode = WAL; improves performance
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = -8000;
    PRAGMA temp_store = MEMORY;

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      amount REAL NOT NULL,
      categoryId TEXT NOT NULL,
      type TEXT NOT NULL,
      walletId TEXT NOT NULL,
      toWalletId TEXT,
      note TEXT,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      balance REAL NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      includeInTotal INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY NOT NULL,
      categoryId TEXT NOT NULL,
      amount REAL NOT NULL,
      period TEXT NOT NULL DEFAULT 'monthly',
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      walletId TEXT
    );

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
      fileUri TEXT,
      FOREIGN KEY(sessionId) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(sessionId);
  `);

  // Migration: Add period and walletId to budgets if not exists
  try {
    await db.execAsync("ALTER TABLE budgets ADD COLUMN period TEXT NOT NULL DEFAULT 'monthly'");
  } catch (e) {}
  try {
    await db.execAsync("ALTER TABLE budgets ADD COLUMN walletId TEXT");
  } catch (e) {}
}
