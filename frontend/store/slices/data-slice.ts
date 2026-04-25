import { StateCreator } from 'zustand';
import { AppState, PendingMutation } from '../types';
import { api } from '@/utils/api';
import {
  deleteBudgetSqlite,
  deleteTransactionSqlite,
  deleteWalletSqlite,
  saveBudgetSqlite,
  saveTransactionSqlite,
  saveWalletSqlite,
  syncSnapshotToSqlite,
} from '@/database/queries';
import {
  getErrorMessage,
  normalizeSelectedWallet,
  requireToken,
  snapshotFromState,
} from '../store-utils';
import { AppSnapshot, Budget, Transaction, Wallet } from '@/constants/types';

export interface DataSlice {
  transactions: Transaction[];
  wallets: Wallet[];
  budgets: Budget[];
  pendingMutations: PendingMutation[];
  lastSyncError: string | null;

  refreshState: () => Promise<void>;
  importCurrentState: () => Promise<void>;
  applySnapshot: (snapshot: AppSnapshot) => void;
  mergeRemoteSnapshot: (snapshot: AppSnapshot) => Promise<void>;
  replayPendingMutations: () => Promise<void>;
  syncPendingMutations: () => Promise<void>;

  addTransaction: (tx: Transaction) => Promise<void>;
  addTransactionsBatch: (txs: Transaction[]) => Promise<void>;
  updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  addWallet: (wallet: Wallet) => Promise<void>;
  updateWallet: (id: string, wallet: Partial<Wallet>) => Promise<void>;
  deleteWallet: (id: string) => Promise<void>;

  addBudget: (budget: Budget) => Promise<void>;
  updateBudget: (id: string, budget: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;

  addTransactionLocally: (tx: Transaction) => Promise<void>;
  updateTransactionLocally: (id: string, tx: Partial<Transaction>) => Promise<void>;
  deleteTransactionLocally: (id: string) => Promise<void>;

  addWalletLocally: (wallet: Wallet) => Promise<void>;
  updateWalletLocally: (id: string, wallet: Partial<Wallet>) => Promise<void>;
  deleteWalletLocally: (id: string) => Promise<void>;

  addBudgetLocally: (budget: Budget) => Promise<void>;
  updateBudgetLocally: (id: string, budget: Partial<Budget>) => Promise<void>;
  deleteBudgetLocally: (id: string) => Promise<void>;
}

type DataStateView = Pick<
  AppState,
  'transactions' | 'wallets' | 'budgets' | 'selectedWalletId'
>;

function applyTransactionEffect(
  wallets: Wallet[],
  transaction: Transaction,
  factor: 1 | -1
) {
  const signedAmount = Number(transaction.amount) * factor;

  return wallets.map((wallet) => {
    if (transaction.type === 'income' && wallet.id === transaction.walletId) {
      return { ...wallet, balance: wallet.balance + signedAmount };
    }

    if (transaction.type === 'expense' && wallet.id === transaction.walletId) {
      return { ...wallet, balance: wallet.balance - signedAmount };
    }

    if (transaction.type === 'transfer') {
      if (wallet.id === transaction.walletId) {
        return { ...wallet, balance: wallet.balance - signedAmount };
      }

      if (wallet.id === transaction.toWalletId) {
        return { ...wallet, balance: wallet.balance + signedAmount };
      }
    }

    return wallet;
  });
}

function addTransactionState(state: DataStateView, transaction: Transaction): DataStateView {
  const existing = state.transactions.some((item) => item.id === transaction.id);

  return {
    ...state,
    transactions: existing
      ? state.transactions.map((item) => (item.id === transaction.id ? transaction : item))
      : [transaction, ...state.transactions],
    wallets: applyTransactionEffect(state.wallets, transaction, 1),
  };
}

function updateTransactionState(
  state: DataStateView,
  id: string,
  updates: Partial<Transaction>
): DataStateView {
  const current = state.transactions.find((item) => item.id === id);
  if (!current) {
    return state;
  }

  const nextTransaction = { ...current, ...updates };
  const revertedWallets = applyTransactionEffect(state.wallets, current, -1);

  return {
    ...state,
    transactions: state.transactions.map((item) =>
      item.id === id ? nextTransaction : item
    ),
    wallets: applyTransactionEffect(revertedWallets, nextTransaction, 1),
  };
}

function deleteTransactionState(state: DataStateView, id: string): DataStateView {
  const current = state.transactions.find((item) => item.id === id);
  if (!current) {
    return state;
  }

  return {
    ...state,
    transactions: state.transactions.filter((item) => item.id !== id),
    wallets: applyTransactionEffect(state.wallets, current, -1),
  };
}

function addWalletState(state: DataStateView, wallet: Wallet): DataStateView {
  const existing = state.wallets.some((item) => item.id === wallet.id);

  return {
    ...state,
    wallets: existing
      ? state.wallets.map((item) => (item.id === wallet.id ? wallet : item))
      : [...state.wallets, wallet],
  };
}

function updateWalletState(
  state: DataStateView,
  id: string,
  updates: Partial<Wallet>
): DataStateView {
  return {
    ...state,
    wallets: state.wallets.map((wallet) =>
      wallet.id === id ? { ...wallet, ...updates } : wallet
    ),
  };
}

function deleteWalletState(state: DataStateView, id: string): DataStateView {
  const wallets = state.wallets.filter((wallet) => wallet.id !== id);

  return {
    ...state,
    wallets,
    transactions: state.transactions.filter(
      (transaction) => transaction.walletId !== id && transaction.toWalletId !== id
    ),
    budgets: state.budgets.filter((budget) => budget.walletId !== id),
    selectedWalletId: normalizeSelectedWallet(state.selectedWalletId, wallets),
  };
}

function addBudgetState(state: DataStateView, budget: Budget): DataStateView {
  const existing = state.budgets.some((item) => item.id === budget.id);

  return {
    ...state,
    budgets: existing
      ? state.budgets.map((item) => (item.id === budget.id ? budget : item))
      : [...state.budgets, budget],
  };
}

function updateBudgetState(
  state: DataStateView,
  id: string,
  updates: Partial<Budget>
): DataStateView {
  return {
    ...state,
    budgets: state.budgets.map((budget) =>
      budget.id === id ? { ...budget, ...updates } : budget
    ),
  };
}

function deleteBudgetState(state: DataStateView, id: string): DataStateView {
  return {
    ...state,
    budgets: state.budgets.filter((budget) => budget.id !== id),
  };
}

let syncInFlight: Promise<void> | null = null;

export const createDataSlice: StateCreator<AppState, [], [], DataSlice> = (set, get) => {
  const setDataState = (state: DataStateView) => {
    set({
      transactions: state.transactions,
      wallets: state.wallets,
      budgets: state.budgets,
      selectedWalletId: state.selectedWalletId,
    });
  };

  const enqueueMutation = (mutation: PendingMutation) => {
    set((state) => ({
      pendingMutations: [...state.pendingMutations, mutation],
    }));
  };

  const removeMutation = (mutationId: string) => {
    set((state) => ({
      pendingMutations: state.pendingMutations.filter((item) => item.id !== mutationId),
    }));
  };

  const executeRemoteMutation = async (mutation: PendingMutation, token: string) => {
    switch (mutation.kind) {
      case 'transaction.create':
        await api.createTransaction(token, mutation.transaction);
        break;
      case 'transaction.batchCreate':
        await api.createTransactionsBatch(token, mutation.transactions);
        break;
      case 'transaction.update':
        await api.updateTransaction(token, mutation.transactionId, mutation.updates);
        break;
      case 'transaction.delete':
        await api.deleteTransaction(token, mutation.transactionId);
        break;
      case 'wallet.create':
        await api.createWallet(token, mutation.wallet);
        break;
      case 'wallet.update':
        await api.updateWallet(token, mutation.walletId, mutation.updates);
        break;
      case 'wallet.delete':
        await api.deleteWallet(token, mutation.walletId);
        break;
      case 'budget.create':
        await api.createBudget(token, mutation.budget);
        break;
      case 'budget.update':
        await api.updateBudget(token, mutation.budgetId, mutation.updates);
        break;
      case 'budget.delete':
        await api.deleteBudget(token, mutation.budgetId);
        break;
    }
  };

  const runQueuedMutation = async (
    mutation: PendingMutation,
    applyLocal: () => Promise<void>
  ) => {
    await applyLocal();
    enqueueMutation(mutation);
    await get().syncPendingMutations();
  };

  return {
    transactions: [],
    wallets: [],
    budgets: [],
    pendingMutations: [],
    lastSyncError: null,

    refreshState: async () => {
      const token = requireToken(get());
      await get().syncPendingMutations();
      const snapshot = await api.getState(token);
      await get().mergeRemoteSnapshot(snapshot);
    },

    importCurrentState: async () => {
      const token = requireToken(get());
      const snapshot = snapshotFromState(get());
      const importedSnapshot = await api.importState(token, snapshot);
      set({ pendingMutations: [], lastSyncError: null });
      await get().mergeRemoteSnapshot(importedSnapshot);
    },

    applySnapshot: (snapshot) =>
      set((state) => ({
        transactions: snapshot.transactions,
        wallets: snapshot.wallets,
        budgets: snapshot.budgets,
        settings: snapshot.settings,
        selectedWalletId: normalizeSelectedWallet(
          state.selectedWalletId,
          snapshot.wallets
        ),
      })),

    mergeRemoteSnapshot: async (snapshot) => {
      await syncSnapshotToSqlite(snapshot);
      get().applySnapshot(snapshot);
      await get().replayPendingMutations();
    },

    replayPendingMutations: async () => {
      for (const mutation of get().pendingMutations) {
        switch (mutation.kind) {
          case 'transaction.create':
            await get().addTransactionLocally(mutation.transaction);
            break;
          case 'transaction.batchCreate':
            for (const transaction of mutation.transactions) {
              await get().addTransactionLocally(transaction);
            }
            break;
          case 'transaction.update':
            await get().updateTransactionLocally(
              mutation.transactionId,
              mutation.updates
            );
            break;
          case 'transaction.delete':
            await get().deleteTransactionLocally(mutation.transactionId);
            break;
          case 'wallet.create':
            await get().addWalletLocally(mutation.wallet);
            break;
          case 'wallet.update':
            await get().updateWalletLocally(mutation.walletId, mutation.updates);
            break;
          case 'wallet.delete':
            await get().deleteWalletLocally(mutation.walletId);
            break;
          case 'budget.create':
            await get().addBudgetLocally(mutation.budget);
            break;
          case 'budget.update':
            await get().updateBudgetLocally(mutation.budgetId, mutation.updates);
            break;
          case 'budget.delete':
            await get().deleteBudgetLocally(mutation.budgetId);
            break;
        }
      }
    },

    syncPendingMutations: async () => {
      if (syncInFlight) {
        await syncInFlight;
        return;
      }

      syncInFlight = (async () => {
        const token = requireToken(get());

        while (get().pendingMutations.length > 0) {
          const nextMutation = get().pendingMutations[0];
          if (!nextMutation) {
            break;
          }

          try {
            await executeRemoteMutation(nextMutation, token);
            removeMutation(nextMutation.id);
            set({ lastSyncError: null });
          } catch (error) {
            set({ lastSyncError: getErrorMessage(error) });
            return;
          }
        }
      })();

      try {
        await syncInFlight;
      } finally {
        syncInFlight = null;
      }
    },

    addTransaction: async (tx) =>
      runQueuedMutation(
        { id: `transaction.create:${tx.id}:${Date.now()}`, kind: 'transaction.create', transaction: tx },
        () => get().addTransactionLocally(tx)
      ),

    addTransactionsBatch: async (txs) =>
      runQueuedMutation(
        {
          id: `transaction.batchCreate:${txs.map((item) => item.id).join(',')}:${Date.now()}`,
          kind: 'transaction.batchCreate',
          transactions: txs,
        },
        async () => {
          for (const tx of txs) {
            await get().addTransactionLocally(tx);
          }
        }
      ),

    updateTransaction: async (id, tx) =>
      runQueuedMutation(
        {
          id: `transaction.update:${id}:${Date.now()}`,
          kind: 'transaction.update',
          transactionId: id,
          updates: tx,
        },
        () => get().updateTransactionLocally(id, tx)
      ),

    deleteTransaction: async (id) =>
      runQueuedMutation(
        { id: `transaction.delete:${id}:${Date.now()}`, kind: 'transaction.delete', transactionId: id },
        () => get().deleteTransactionLocally(id)
      ),

    addWallet: async (wallet) =>
      runQueuedMutation(
        { id: `wallet.create:${wallet.id}:${Date.now()}`, kind: 'wallet.create', wallet },
        () => get().addWalletLocally(wallet)
      ),

    updateWallet: async (id, wallet) =>
      runQueuedMutation(
        { id: `wallet.update:${id}:${Date.now()}`, kind: 'wallet.update', walletId: id, updates: wallet },
        () => get().updateWalletLocally(id, wallet)
      ),

    deleteWallet: async (id) =>
      runQueuedMutation(
        { id: `wallet.delete:${id}:${Date.now()}`, kind: 'wallet.delete', walletId: id },
        () => get().deleteWalletLocally(id)
      ),

    addBudget: async (budget) =>
      runQueuedMutation(
        { id: `budget.create:${budget.id}:${Date.now()}`, kind: 'budget.create', budget },
        () => get().addBudgetLocally(budget)
      ),

    updateBudget: async (id, budget) =>
      runQueuedMutation(
        { id: `budget.update:${id}:${Date.now()}`, kind: 'budget.update', budgetId: id, updates: budget },
        () => get().updateBudgetLocally(id, budget)
      ),

    deleteBudget: async (id) =>
      runQueuedMutation(
        { id: `budget.delete:${id}:${Date.now()}`, kind: 'budget.delete', budgetId: id },
        () => get().deleteBudgetLocally(id)
      ),

    addTransactionLocally: async (tx) => {
      const nextState = addTransactionState(get(), tx);
      setDataState(nextState);

      await saveTransactionSqlite(tx);
      for (const wallet of nextState.wallets) {
        if (
          wallet.id === tx.walletId ||
          (tx.type === 'transfer' && wallet.id === tx.toWalletId)
        ) {
          await saveWalletSqlite(wallet);
        }
      }
    },

    updateTransactionLocally: async (id, txUpdate) => {
      const current = get().transactions.find((item) => item.id === id);
      if (!current) {
        return;
      }

      const updatedTx = { ...current, ...txUpdate };
      const nextState = updateTransactionState(get(), id, txUpdate);
      setDataState(nextState);

      await saveTransactionSqlite(updatedTx);
      const impactedWalletIds = new Set(
        [current.walletId, current.toWalletId, updatedTx.walletId, updatedTx.toWalletId].filter(
          Boolean
        )
      );

      for (const wallet of nextState.wallets) {
        if (impactedWalletIds.has(wallet.id)) {
          await saveWalletSqlite(wallet);
        }
      }
    },

    deleteTransactionLocally: async (id) => {
      const tx = get().transactions.find((item) => item.id === id);
      if (!tx) {
        return;
      }

      const nextState = deleteTransactionState(get(), id);
      setDataState(nextState);

      await deleteTransactionSqlite(id);
      for (const wallet of nextState.wallets) {
        if (
          wallet.id === tx.walletId ||
          (tx.type === 'transfer' && wallet.id === tx.toWalletId)
        ) {
          await saveWalletSqlite(wallet);
        }
      }
    },

    addWalletLocally: async (wallet) => {
      const nextState = addWalletState(get(), wallet);
      setDataState(nextState);
      await saveWalletSqlite(wallet);
    },

    updateWalletLocally: async (id, walletUpdate) => {
      const current = get().wallets.find((item) => item.id === id);
      if (!current) {
        return;
      }

      const updatedWallet = { ...current, ...walletUpdate };
      const nextState = updateWalletState(get(), id, walletUpdate);
      setDataState(nextState);
      await saveWalletSqlite(updatedWallet);
    },

    deleteWalletLocally: async (id) => {
      const relatedTransactionIds = get()
        .transactions
        .filter((transaction) => transaction.walletId === id || transaction.toWalletId === id)
        .map((transaction) => transaction.id);
      const relatedBudgetIds = get()
        .budgets
        .filter((budget) => budget.walletId === id)
        .map((budget) => budget.id);

      const nextState = deleteWalletState(get(), id);
      setDataState(nextState);

      await deleteTransactionSqlite(relatedTransactionIds);
      await deleteBudgetSqlite(relatedBudgetIds);
      await deleteWalletSqlite(id);
    },

    addBudgetLocally: async (budget) => {
      const nextState = addBudgetState(get(), budget);
      setDataState(nextState);
      await saveBudgetSqlite(budget);
    },

    updateBudgetLocally: async (id, budgetUpdate) => {
      const current = get().budgets.find((item) => item.id === id);
      if (!current) {
        return;
      }

      const updatedBudget = { ...current, ...budgetUpdate };
      const nextState = updateBudgetState(get(), id, budgetUpdate);
      setDataState(nextState);
      await saveBudgetSqlite(updatedBudget);
    },

    deleteBudgetLocally: async (id) => {
      const nextState = deleteBudgetState(get(), id);
      setDataState(nextState);
      await deleteBudgetSqlite(id);
    },
  };
};
