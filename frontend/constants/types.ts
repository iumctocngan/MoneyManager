export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type?: TransactionType;
}

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  color: string;
  icon: string;
  includeInTotal: boolean;
  hasTransactions: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  walletId: string;
  toWalletId?: string;
  note: string;
  date: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  spent: number;
  period: 'monthly' | 'weekly' | 'yearly';
  startDate: string;
  endDate: string;
  walletId?: string;
}

export interface AppSettings {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  firstDayOfMonth: number;
  showBalance: boolean;
  biometricEnabled: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  fileUri?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface AppSnapshot {
  wallets: Wallet[];
  transactions: Transaction[];
  budgets: Budget[];
  settings: AppSettings;
}

export type NotificationType =
  | 'budget_warning'
  | 'budget_exceeded'
  | 'no_activity'
  | 'saving_good';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon: string;
  color: string;
  timestamp: string;
  budgetId?: string;
}
