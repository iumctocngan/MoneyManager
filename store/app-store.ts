import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  AppSettings,
  AppSnapshot,
  AuthResponse,
  AuthUser,
  Budget,
  Transaction,
  Wallet,
} from '@/constants/types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants';
import { api } from '@/utils/api';

const defaultSettings: AppSettings = {
  language: 'vi',
  theme: 'light',
  firstDayOfMonth: 1,
  showBalance: true,
  biometricEnabled: false,
};

type AuthStatus = 'signed_out' | 'signed_in';

interface AppState {
  transactions: Transaction[];
  wallets: Wallet[];
  budgets: Budget[];
  settings: AppSettings;
  selectedWalletId: string | null;
  authToken: string | null;
  user: AuthUser | null;
  authStatus: AuthStatus;
  isHydrated: boolean;
  isInitialized: boolean;
  isBusy: boolean;

  setHydrated: () => void;
  initializeApp: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: { email: string; password: string; name?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshState: () => Promise<void>;
  importCurrentState: () => Promise<void>;

  addTransaction: (transaction: Transaction) => Promise<void>;
  addTransactionsBatch: (transactions: Transaction[]) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  addWallet: (wallet: Wallet) => Promise<void>;
  updateWallet: (id: string, wallet: Partial<Wallet>) => Promise<void>;
  deleteWallet: (id: string) => Promise<void>;
  setSelectedWallet: (id: string | null) => void;
  transferMoney: (fromWalletId: string, toWalletId: string, amount: number, note: string) => Promise<void>;

  addBudget: (budget: Budget) => Promise<void>;
  updateBudget: (id: string, budget: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;

  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;

  getTotalBalance: () => number;
  getWalletBalance: (walletId: string) => number;
  getTransactionsByWallet: (walletId: string) => Transaction[];
  getTransactionsByMonth: (year: number, month: number) => Transaction[];
  getCategoryById: (id: string) => any;
  getBudgetProgress: (budgetId: string) => number;
}

function snapshotFromState(
  state: Pick<AppState, 'wallets' | 'transactions' | 'budgets' | 'settings'>
): AppSnapshot {
  return {
    wallets: state.wallets,
    transactions: state.transactions,
    budgets: state.budgets,
    settings: state.settings,
  };
}

function isSnapshotEmpty(snapshot: AppSnapshot) {
  return (
    snapshot.wallets.length === 0 &&
    snapshot.transactions.length === 0 &&
    snapshot.budgets.length === 0
  );
}

function normalizeSelectedWallet(selectedWalletId: string | null, wallets: Wallet[]) {
  if (selectedWalletId && wallets.some((wallet) => wallet.id === selectedWalletId)) {
    return selectedWalletId;
  }

  return wallets[0]?.id ?? null;
}

function requireToken(state: AppState) {
  if (!state.authToken) {
    throw new Error('Ban can dang nhap de dong bo du lieu.');
  }

  return state.authToken;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Da co loi xay ra.';
}

async function completeAuth(result: AuthResponse, localSnapshot: AppSnapshot) {
  useStore.setState({
    authToken: result.accessToken,
    user: result.user,
    authStatus: 'signed_in',
  });

  const remoteSnapshot = await api.getState(result.accessToken);
  const shouldImportLocalState = isSnapshotEmpty(remoteSnapshot) && !isSnapshotEmpty(localSnapshot);

  if (shouldImportLocalState) {
    const importedSnapshot = await api.importState(result.accessToken, localSnapshot);
    useStore.getState().applySnapshot(importedSnapshot);
    return;
  }

  useStore.getState().applySnapshot(remoteSnapshot);
}

type InternalState = AppState & {
  applySnapshot: (snapshot: AppSnapshot) => void;
  resetSessionState: () => void;
};

export const useStore = create<InternalState>()(
  persist(
    (set, get) => ({
      transactions: [],
      wallets: [],
      budgets: [],
      settings: defaultSettings,
      selectedWalletId: null,
      authToken: null,
      user: null,
      authStatus: 'signed_out',
      isHydrated: false,
      isInitialized: false,
      isBusy: false,

      applySnapshot: (snapshot) =>
        set((state) => ({
          transactions: snapshot.transactions,
          wallets: snapshot.wallets,
          budgets: snapshot.budgets,
          settings: snapshot.settings,
          selectedWalletId: normalizeSelectedWallet(state.selectedWalletId, snapshot.wallets),
        })),

      resetSessionState: () =>
        set({
          transactions: [],
          wallets: [],
          budgets: [],
          settings: defaultSettings,
          selectedWalletId: null,
          authToken: null,
          user: null,
          authStatus: 'signed_out',
        }),

      setHydrated: () => set({ isHydrated: true }),

      initializeApp: async () => {
        if (get().isInitialized || get().isBusy) {
          return;
        }

        set({ isBusy: true });

        try {
          const token = get().authToken;

          if (!token) {
            set({ isInitialized: true, authStatus: 'signed_out' });
            return;
          }

          const me = await api.me(token);
          const snapshot = await api.getState(token);

          set({
            user: me.user,
            authStatus: 'signed_in',
          });
          get().applySnapshot(snapshot);
          set({ isInitialized: true });
        } catch {
          get().resetSessionState();
          set({ isInitialized: true });
        } finally {
          set({ isBusy: false });
        }
      },

      signIn: async (email, password) => {
        const localSnapshot = snapshotFromState(get());

        set({ isBusy: true });

        try {
          const result = await api.login({ email, password });
          await completeAuth(result, localSnapshot);
          set({ isInitialized: true });
        } catch (error) {
          throw new Error(getErrorMessage(error));
        } finally {
          set({ isBusy: false });
        }
      },

      signUp: async ({ email, password, name }) => {
        const localSnapshot = snapshotFromState(get());

        set({ isBusy: true });

        try {
          const result = await api.register({ email, password, name });
          await completeAuth(result, localSnapshot);
          set({ isInitialized: true });
        } catch (error) {
          throw new Error(getErrorMessage(error));
        } finally {
          set({ isBusy: false });
        }
      },

      signOut: async () => {
        get().resetSessionState();
        set({ isInitialized: true });
      },

      refreshState: async () => {
        const token = requireToken(get());
        const snapshot = await api.getState(token);
        get().applySnapshot(snapshot);
      },

      importCurrentState: async () => {
        const token = requireToken(get());
        const snapshot = snapshotFromState(get());
        const importedSnapshot = await api.importState(token, snapshot);
        get().applySnapshot(importedSnapshot);
      },

      addTransaction: async (transaction) => {
        const token = requireToken(get());
        await api.createTransaction(token, transaction);
        await get().refreshState();
      },
      
      addTransactionsBatch: async (transactions) => {
        const token = requireToken(get());
        set({ isBusy: true });
        try {
          for (const tx of transactions) {
            await api.createTransaction(token, tx);
          }
          await get().refreshState();
        } finally {
          set({ isBusy: false });
        }
      },

      updateTransaction: async () => {
        throw new Error('Tinh nang chinh sua giao dich chua duoc noi vao frontend.');
      },

      deleteTransaction: async (id) => {
        const token = requireToken(get());
        await api.deleteTransaction(token, id);
        await get().refreshState();
      },

      addWallet: async (wallet) => {
        const token = requireToken(get());
        await api.createWallet(token, wallet);
        await get().refreshState();
      },

      updateWallet: async (id, wallet) => {
        const token = requireToken(get());
        await api.updateWallet(token, id, wallet);
        await get().refreshState();
      },

      deleteWallet: async (id) => {
        const token = requireToken(get());
        await api.deleteWallet(token, id);
        await get().refreshState();
      },

      setSelectedWallet: (id) => set({ selectedWalletId: id }),

      transferMoney: async (fromWalletId, toWalletId, amount, note) => {
        const token = requireToken(get());

        // One transfer transaction: backend deducts fromWallet and credits toWallet
        await api.createTransaction(token, {
          id: Date.now().toString() + '-transfer',
          type: 'transfer',
          amount,
          categoryId: 'transfer',
          walletId: fromWalletId,
          toWalletId,
          note: note || 'Chuyển tiền',
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        } as Transaction);

        await get().refreshState();
      },

      addBudget: async (budget) => {
        const token = requireToken(get());
        await api.createBudget(token, budget);
        await get().refreshState();
      },

      updateBudget: async () => {
        throw new Error('Tinh nang chinh sua ngan sach chua duoc noi vao frontend.');
      },

      deleteBudget: async (id) => {
        const token = requireToken(get());
        await api.deleteBudget(token, id);
        await get().refreshState();
      },

      updateSettings: async (nextSettings) => {
        const token = requireToken(get());
        const updatedSettings = await api.updateSettings(token, nextSettings);
        set({ settings: updatedSettings });
      },

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

        if (!budget) {
          return 0;
        }

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
    }),
    {
      name: 'money-lover-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        transactions: state.transactions,
        wallets: state.wallets,
        budgets: state.budgets,
        settings: state.settings,
        selectedWalletId: state.selectedWalletId,
        authToken: state.authToken,
        user: state.user,
        authStatus: state.authStatus,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
