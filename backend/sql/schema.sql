CREATE DATABASE IF NOT EXISTS money_manager
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE money_manager;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_settings (
  user_id VARCHAR(64) NOT NULL PRIMARY KEY,
  language VARCHAR(10) NOT NULL DEFAULT 'vi',
  theme ENUM('light', 'dark', 'auto') NOT NULL DEFAULT 'light',
  first_day_of_month TINYINT UNSIGNED NOT NULL DEFAULT 1,
  show_balance BOOLEAN NOT NULL DEFAULT TRUE,
  biometric_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_settings_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallets (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  name VARCHAR(100) NOT NULL,
  opening_balance DECIMAL(15, 0) NOT NULL DEFAULT 0,
  balance DECIMAL(15, 0) NOT NULL DEFAULT 0,
  color VARCHAR(20) NOT NULL,
  icon VARCHAR(32) NOT NULL,
  include_in_total BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wallets_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS budgets (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  category_id VARCHAR(64) NOT NULL,
  amount DECIMAL(15, 0) NOT NULL,
  period ENUM('monthly', 'weekly', 'yearly') NOT NULL DEFAULT 'monthly',
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  wallet_id VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_budgets_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_budgets_wallet
    FOREIGN KEY (wallet_id) REFERENCES wallets(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  type ENUM('expense', 'income', 'transfer') NOT NULL,
  amount DECIMAL(15, 0) NOT NULL,
  category_id VARCHAR(64) NOT NULL,
  wallet_id VARCHAR(64) NOT NULL,
  to_wallet_id VARCHAR(64) NULL,
  note TEXT NULL,
  transaction_date DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_transactions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_transactions_wallet
    FOREIGN KEY (wallet_id) REFERENCES wallets(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_transactions_to_wallet
    FOREIGN KEY (to_wallet_id) REFERENCES wallets(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_sessions (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content MEDIUMTEXT NOT NULL,
  file_uri TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_messages_session
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wallets
CREATE INDEX idx_wallets_user_id ON wallets (user_id);

-- Transactions
CREATE INDEX idx_transactions_user_date ON transactions (user_id, transaction_date, created_at);
CREATE INDEX idx_transactions_reporting ON transactions (user_id, category_id, type, transaction_date, amount);
CREATE INDEX idx_transactions_wallet_id ON transactions (wallet_id);
CREATE INDEX idx_transactions_to_wallet_id ON transactions (to_wallet_id);

-- Chat
CREATE INDEX idx_chat_sessions_user_created ON chat_sessions (user_id, created_at);
CREATE INDEX idx_chat_messages_session_created ON chat_messages (session_id, created_at);

-- Budgets
CREATE INDEX idx_budgets_user_category ON budgets (user_id, category_id);
CREATE INDEX idx_budgets_time_range ON budgets (user_id, start_date, end_date);
CREATE INDEX idx_budgets_wallet_id ON budgets (wallet_id);
