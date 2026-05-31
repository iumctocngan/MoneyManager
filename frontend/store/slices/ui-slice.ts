import { StateCreator } from 'zustand';
import { AppState } from '../types';
import { api } from '@/utils/api';
import { getSnapshotFromSqlite } from '@/database/queries';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants';
import { Transaction, Wallet } from '@/constants/types';

export interface UISlice {
  selectedWalletId: string | null;
  // true sau khi Zustand rehydrate xong từ AsyncStorage — dùng để kiểm soát splash screen
  isHydrated: boolean;
  // true sau khi initializeApp hoàn tất — ngăn chạy lại init nhiều lần
  isInitialized: boolean;
  // Cờ loading toàn cục — chia sẻ giữa các slice (auth, data, chat)
  isBusy: boolean;
  aiAssistantEnabled: boolean;

  setHydrated: () => void;
  initializeApp: () => Promise<void>;
  setSelectedWallet: (id: string | null) => void;
  setAiAssistantEnabled: (enabled: boolean) => void;

  getTotalBalance: () => number;
  getWalletBalance: (walletId: string) => number;
  getTransactionsByWallet: (walletId: string) => Transaction[];
  getTransactionsByMonth: (year: number, month: number) => Transaction[];
  getCategoryById: (id: string) => any;
  getBudgetProgress: (budgetId: string) => number;
}



export const createUISlice: StateCreator<
  AppState,
  [],
  [],
  UISlice
> = (set, get) => ({
  selectedWalletId: null,
  isHydrated: false,
  isInitialized: false,
  isBusy: false,
  // Bật AI mặc định — người dùng có thể tắt trong cài đặt, trạng thái được persist
  aiAssistantEnabled: true,

  // Được gọi bởi onRehydrateStorage của Zustand persist — báo hiệu storage đã load xong
  setHydrated: () => set({ isHydrated: true }),

  /**
   * Khởi tạo app sau khi rehydrate:
   * 1. Load SQLite local ngay để UI có dữ liệu tức thì (offline-first).
   * 2. Nếu có token → xác minh, sync pending mutations, rồi merge snapshot từ server.
   * 3. Nếu lỗi 401 → tự động đăng xuất.
   */
  initializeApp: async () => {
    // Guard: tránh chạy lại nếu đã init hoặc đang chạy
    if (get().isInitialized || get().isBusy) return;
    set({ isBusy: true });

    try {
      const token = get().authToken;
      
      try {
        // Load SQLite trước để hiển thị dữ liệu ngay — kể cả khi offline
        const localData = await getSnapshotFromSqlite();
        set({
          transactions: localData.transactions,
          wallets: localData.wallets,
          budgets: localData.budgets,
        });
      } catch (e) { /* SQLite not ready */ }

      if (!token) {
        // Không có token → người dùng chưa đăng nhập, dừng tại đây
        set({ isInitialized: true, authStatus: 'signed_out' });
        return;
      }
      
      // Xác minh token còn hợp lệ và lấy thông tin user mới nhất
      const me = await api.me(token);
      await get().syncPendingMutations();
      const snapshot = await api.getState(token);

      set({ user: me.user, authStatus: 'signed_in' });
      await get().mergeRemoteSnapshot(snapshot);
      set({ isInitialized: true });
    } catch (error: any) {
      // Token hết hạn → đăng xuất để tránh giữ session không hợp lệ
      if (error.status === 401) {
        await get().signOut();
      }
      // Dù lỗi gì, vẫn đánh dấu initialized để app không bị kẹt ở màn loading
      set({ isInitialized: true });
    } finally {
      set({ isBusy: false });
    }
  },

  setSelectedWallet: (id) => set({ selectedWalletId: id }),

  setAiAssistantEnabled: (enabled) => set({ aiAssistantEnabled: enabled }),

  /**
   * Tính tổng số dư của tất cả ví có includeInTotal = true.
   * Các ví tiết kiệm / nợ thường được loại khỏi tổng này.
   */
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

  // Bao gồm cả giao dịch chuyển khoản có ví này là nguồn hoặc đích
  getTransactionsByWallet: (walletId) =>
    get().transactions.filter(
      (transaction) => transaction.walletId === walletId || transaction.toWalletId === walletId
    ),

  // Lọc theo tháng/năm dựa trên trường date của giao dịch (ISO string)
  getTransactionsByMonth: (year, month) =>
    get().transactions.filter((transaction) => {
      const date = new Date(transaction.date);
      return date.getFullYear() === year && date.getMonth() === month;
    }),

  // Tìm trong cả danh sách chi tiêu lẫn thu nhập — trả về undefined nếu không tìm thấy
  getCategoryById: (id) =>
    EXPENSE_CATEGORIES.find((category) => category.id === id) ||
    INCOME_CATEGORIES.find((category) => category.id === id),

  /**
   * Tính phần trăm sử dụng của một ngân sách (0–100+).
   * Chỉ tính giao dịch expense trong đúng khoảng thời gian và category của ngân sách.
   */
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

    // Tránh chia cho 0 nếu budget.amount chưa được thiết lập
    return budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  },
});
