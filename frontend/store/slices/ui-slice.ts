import { StateCreator } from 'zustand';
import { AppState } from '../types';
import { api } from '@/utils/api';
import { getSnapshotFromSqlite } from '@/database/queries';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants';
import { AppSettings, Transaction, Wallet } from '@/constants/types';

export interface UISlice {
  settings: AppSettings;
  selectedWalletId: string | null;
  isHydrated: boolean;
  isInitialized: boolean;
  isBusy: boolean;
  aiAssistantEnabled: boolean;

  setHydrated: () => void;
  initializeApp: () => Promise<void>;
  setSelectedWallet: (id: string | null) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setAiAssistantEnabled: (enabled: boolean) => void;

  getTotalBalance: () => number;
  getWalletBalance: (walletId: string) => number;
  getTransactionsByWallet: (walletId: string) => Transaction[];
  getTransactionsByMonth: (year: number, month: number) => Transaction[];
  getCategoryById: (id: string) => any;
  getBudgetProgress: (budgetId: string) => number;
}

const DEFAULT_SETTINGS: AppSettings = {
  language: 'vi',
  theme: 'light',
  firstDayOfMonth: 1,
  showBalance: true,
  biometricEnabled: false,
};

export const createUISlice: StateCreator<
  AppState,
  [],
  [],
  UISlice
> = (set, get) => ({
  settings: DEFAULT_SETTINGS,
  selectedWalletId: null,
  isHydrated: false,
  isInitialized: false,
  isBusy: false,
  aiAssistantEnabled: true,

  setHydrated: () => set({ isHydrated: true }),

  initializeApp: async () => {
    if (get().isInitialized || get().isBusy) return;
    set({ isBusy: true, aiAssistantEnabled: true });

    try {
      const token = get().authToken;
      
      try {
        const localData = await getSnapshotFromSqlite();
        set({
          transactions: localData.transactions,
          wallets: localData.wallets,
          budgets: localData.budgets,
        });
      } catch (e) { /* SQLite not ready */ }

      if (!token) {
        set({ isInitialized: true, authStatus: 'signed_out' });
        return;
      }
      
      const me = await api.me(token);
      await get().syncPendingMutations();
      const snapshot = await api.getState(token);

      set({ user: me.user, authStatus: 'signed_in' });
      await get().mergeRemoteSnapshot(snapshot);
      set({ isInitialized: true });
    } catch (error) {
      set({ isInitialized: true });
    } finally {
      set({ isBusy: false });
    }
  },

  setSelectedWallet: (id) => set({ selectedWalletId: id }),

  setAiAssistantEnabled: (enabled) => set({ aiAssistantEnabled: enabled }),

  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  getTotalBalance: () => {
    const { wallets } = get();
    return wallets
      .filter((wallet) => wallet.includeInTotal)
      .reduce((sum, wallet) => sum + wallet.balance, 0);
  },

  getWalletBalance: (walletId) => {
    const wallet = get().wallets.find((item) => item.id === walletId);
    return wallet?.balance ?? 0;
  },

  getTransactionsByWallet: (walletId) =>
    get().transactions.filter(
      (transaction) => transaction.walletId === walletId || transaction.toWalletId === walletId
    ),

  getTransactionsByMonth: (year, month) =>
    get().transactions.filter((transaction) => {
      const date = new Date(transaction.date);
      return date.getFullYear() === year && date.getMonth() === month;
    }),

  getCategoryById: (id) =>
    EXPENSE_CATEGORIES.find((category) => category.id === id) ||
    INCOME_CATEGORIES.find((category) => category.id === id),

  getBudgetProgress: (budgetId) => {
    const { budgets, transactions } = get();
    const budget = budgets.find((item) => item.id === budgetId);
    if (!budget) return 0;

    const spent = transactions
      .filter(
        (transaction) =>
          transaction.categoryId === budget.categoryId &&
          transaction.type === 'expense' &&
          new Date(transaction.date) >= new Date(budget.startDate) &&
          new Date(transaction.date) <= new Date(budget.endDate)
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  },
});
