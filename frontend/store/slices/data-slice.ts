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

// Subset của AppState dùng cho các hàm tính toán thuần (không cần toàn bộ state)
type DataStateView = Pick<
  AppState,
  'transactions' | 'wallets' | 'budgets' | 'selectedWalletId'
>;

/**
 * Áp dụng hoặc hoàn tác hiệu ứng tài chính của một giao dịch lên danh sách ví.
 * factor = 1 để áp dụng, factor = -1 để hoàn tác (revert).
 * Dùng chung cho add / update / delete để đảm bảo logic nhất quán.
 */
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
      // expense giảm số dư → cộng thêm signedAmount âm (khi revert) hoặc trừ (khi apply)
      return { ...wallet, balance: wallet.balance - signedAmount };
    }

    if (transaction.type === 'transfer') {
      if (wallet.id === transaction.walletId) {
        // Ví nguồn: trừ tiền
        return { ...wallet, balance: wallet.balance - signedAmount };
      }

      if (wallet.id === transaction.toWalletId) {
        // Ví đích: cộng tiền
        return { ...wallet, balance: wallet.balance + signedAmount };
      }
    }

    return wallet;
  });
}

/**
 * Tính state mới sau khi thêm giao dịch.
 * Nếu id đã tồn tại → upsert (tránh trùng lặp khi replay pending mutations).
 */
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

/**
 * Tính state mới sau khi cập nhật giao dịch.
 * Revert số dư cũ trước, rồi áp dụng số dư mới — đảm bảo wallet balance luôn chính xác
 * dù walletId hay amount có thay đổi.
 */
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
  // Bước 1: hoàn tác hiệu ứng của giao dịch cũ
  const revertedWallets = applyTransactionEffect(state.wallets, current, -1);

  return {
    ...state,
    transactions: state.transactions.map((item) =>
      item.id === id ? nextTransaction : item
    ),
    // Bước 2: áp dụng hiệu ứng của giao dịch mới
    wallets: applyTransactionEffect(revertedWallets, nextTransaction, 1),
  };
}

/**
 * Tính state mới sau khi xóa giao dịch — hoàn tác hiệu ứng tài chính của nó.
 */
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

/**
 * Thêm ví vào state; nếu id đã tồn tại → upsert thay vì thêm trùng.
 */
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

/**
 * Xóa ví và tự động dọn sạch toàn bộ giao dịch & ngân sách liên quan.
 * selectedWalletId được chuẩn hóa để tránh trỏ tới ví không còn tồn tại.
 */
function deleteWalletState(state: DataStateView, id: string): DataStateView {
  const wallets = state.wallets.filter((wallet) => wallet.id !== id);

  return {
    ...state,
    wallets,
    // Xóa cả giao dịch chuyển khoản có ví nguồn hoặc ví đích bị xóa
    transactions: state.transactions.filter(
      (transaction) => transaction.walletId !== id && transaction.toWalletId !== id
    ),
    budgets: state.budgets.filter((budget) => budget.walletId !== id),
    selectedWalletId: normalizeSelectedWallet(state.selectedWalletId, wallets),
  };
}

/**
 * Thêm ngân sách; nếu id đã tồn tại → upsert.
 */
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

// Guard chống chạy đồng thời nhiều sync — đảm bảo mutations được gửi theo thứ tự FIFO
let syncInFlight: Promise<void> | null = null;

export const createDataSlice: StateCreator<AppState, [], DataSlice> = (set, get) => {
  // Helper cập nhật đồng thời cả 4 trường dữ liệu trong một lần set
  const setDataState = (state: DataStateView) => {
    set({
      transactions: state.transactions,
      wallets: state.wallets,
      budgets: state.budgets,
      selectedWalletId: state.selectedWalletId,
    });
  };

  // Thêm một mutation vào cuối hàng đợi để sync sau
  const enqueueMutation = (mutation: PendingMutation) => {
    set((state) => ({
      pendingMutations: [...state.pendingMutations, mutation],
    }));
  };

  // Xóa một mutation khỏi hàng đợi sau khi server xác nhận thành công
  const removeMutation = (mutationId: string) => {
    set((state) => ({
      pendingMutations: state.pendingMutations.filter((item) => item.id !== mutationId),
    }));
  };

  /**
   * Gửi một PendingMutation lên server theo đúng loại (create/update/delete).
   * Được thiết kế để gọi tuần tự — không gọi song song để tránh race condition.
   */
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

  /**
   * Áp dụng mutation xuống local trước (optimistic update), enqueue rồi sync lên server ngay.
   * Optimistic update giúp UI phản hồi tức thì mà không cần đợi network.
   */
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

    /**
     * Đồng bộ toàn bộ trạng thái từ server — dùng sau khi AI thay đổi dữ liệu
     * hoặc khi cần đảm bảo state local khớp với server.
     */
    refreshState: async () => {
      const token = requireToken(get());
      await get().syncPendingMutations();
      const snapshot = await api.getState(token);
      await get().mergeRemoteSnapshot(snapshot);
    },

    /**
     * Xuất toàn bộ dữ liệu local lên server — dùng thủ công khi cần ghi đè server bằng local.
     */
    importCurrentState: async () => {
      const token = requireToken(get());
      const snapshot = snapshotFromState(get());
      const importedSnapshot = await api.importState(token, snapshot);
      // Xóa hàng đợi vì server đã nhận đầy đủ dữ liệu từ import
      set({ pendingMutations: [], lastSyncError: null });
      await get().mergeRemoteSnapshot(importedSnapshot);
    },

    /**
     * Ghi đè state in-memory bằng snapshot từ server.
     * Chuẩn hóa selectedWalletId đề phòng ví đang chọn không còn trong danh sách mới.
     */
    applySnapshot: (snapshot) =>
      set((state) => ({
        transactions: snapshot.transactions,
        wallets: snapshot.wallets,
        budgets: snapshot.budgets,

        selectedWalletId: normalizeSelectedWallet(
          state.selectedWalletId,
          snapshot.wallets
        ),
      })),

    /**
     * Nhận snapshot từ server → lưu vào SQLite → cập nhật in-memory → replay pending mutations.
     * Thứ tự quan trọng: replay sau apply để các thay đổi offline không bị snapshot ghi đè.
     */
    mergeRemoteSnapshot: async (snapshot) => {
      await syncSnapshotToSqlite(snapshot);
      get().applySnapshot(snapshot);
      // Tái áp dụng các thay đổi chưa sync để UI thể hiện đúng trạng thái optimistic
      await get().replayPendingMutations();
    },

    /**
     * Phát lại toàn bộ pending mutations lên in-memory state (không gửi server).
     * Dùng sau khi mergeRemoteSnapshot để khôi phục các thay đổi offline chưa được server xác nhận.
     */
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
      // Nếu đang có một tiến trình sync chạy, đợi nó xong rồi kiểm tra lại hàng đợi
      // (tránh race condition: mutations mới được enqueue trong lúc sync cũ đang chạy sẽ không bị bỏ qua)
      if (syncInFlight) {
        await syncInFlight;
        return get().syncPendingMutations();
      }

      syncInFlight = (async () => {
        const token = get().authToken;

        // Chưa đăng nhập — giữ mutations trong hàng đợi, sẽ sync lại sau khi đăng nhập
        if (!token) return;

        // Xử lý tuần tự từng mutation để đảm bảo thứ tự — dừng ngay khi gặp lỗi
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
            // Dừng sync khi gặp lỗi — giữ nguyên hàng đợi để thử lại sau
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

    // --- Public API: ghi local + enqueue + sync ---

    addTransaction: async (tx) =>
      runQueuedMutation(
        { id: `transaction.create:${tx.id}:${Date.now()}`, kind: 'transaction.create', transaction: tx },
        () => get().addTransactionLocally(tx)
      ),

    addTransactionsBatch: async (txs) =>
      runQueuedMutation(
        {
          // ID bao gồm tất cả id giao dịch để dễ debug khi xem hàng đợi
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

    // --- Local-only mutations: cập nhật in-memory + SQLite, không gụi server ---

    addTransactionLocally: async (tx) => {
      const nextState = addTransactionState(get(), tx);
      setDataState(nextState);

      await saveTransactionSqlite(tx);
      // Chỉ lưu lại những ví bị ảnh hưởng bởi giao dịch này để tránh write thừa
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
      // Thu thập tất cả ví liên quan (cũ và mới) để đảm bảo balance được lưu đúng
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
      // Cập nhật balance ví sau khi hoàn tác hiệu ứng của giao dịch bị xóa
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
      // Thu thập id liên quan trước khi xóa khỏi state để dùng cho SQLite delete
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

      // Xóa SQLite theo đúng thứ tự: giao dịch → ngân sách → ví (tránh vi phạm FK)
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
