import { useState, useCallback, useMemo } from 'react';
import { useStore } from '@/store/app-store';
import { api } from '@/utils/api';
import { AppSettings, Transaction } from '@/constants/types';

/**
 * Hook quản lý và thực hiện các đột biến (mutations) dữ liệu,
 * cung cấp trạng thái đang tải (isMutating) khi có request bất đồng bộ đang chạy.
 */
export function useMutations() {
  const [pendingCount, setPendingCount] = useState(0);

  // Lấy các mutation hành động trực tiếp từ Zustand store
  const {
    addBudget,
    addTransaction,
    addTransactionsBatch,
    addWallet,
    deleteBudget,
    deleteTransaction,
    deleteWallet,
    updateBudget,
    updateTransaction,
    updateWallet,
  } = useStore();

  // Hàm helper dùng để bọc các hành động bất đồng bộ và quản lý trạng thái loading (pendingCount)
  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    setPendingCount((count) => count + 1);
    try {
      return await action();
    } finally {
      setPendingCount((count) => Math.max(count - 1, 0));
    }
  }, []);

  // Hàm chuyển tiền giữa hai ví
  const transferMoney = useCallback((
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    note: string
  ) => {
    const tx: Transaction = {
      id: `${Date.now()}-transfer`,
      type: 'transfer',
      amount,
      categoryId: 'transfer',
      walletId: fromWalletId,
      toWalletId,
      note: note || 'Chuyển tiền',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    return run(() => addTransaction(tx));
  }, [run, addTransaction]);

  // Cập nhật cấu hình ứng dụng và đồng bộ hóa với Server
  const updateSettings = useCallback(async (nextSettings: Partial<AppSettings>) => {
    const token = useStore.getState().authToken;
    if (!token) {
      throw new Error('Bạn cần đăng nhập để đồng bộ dữ liệu.');
    }

    try {
      // Gọi API cập nhật lên cloud
      const updatedSettings = await api.updateSettings(token, nextSettings);
      useStore.setState({ settings: updatedSettings });
    } catch {
      // Nếu mất mạng hoặc API lỗi, lưu tạm thời tại local store
      useStore.setState((state) => ({
        settings: { ...state.settings, ...nextSettings },
      }));
    }
  }, []);

  // Trả về một object đã được memoize để tránh gây re-render không cần thiết cho component gọi hook
  return useMemo(() => ({
    isMutating: pendingCount > 0,
    
    // Quản lý giao dịch
    addTransaction: (tx: Transaction) => run(() => addTransaction(tx)),
    addTransactionsBatch: (txs: Transaction[]) => run(() => addTransactionsBatch(txs)),
    updateTransaction: (id: string, tx: Partial<Transaction>) => run(() => updateTransaction(id, tx)),
    deleteTransaction: (id: string) => run(() => deleteTransaction(id)),
    
    // Quản lý ví
    addWallet: (wallet: Parameters<typeof addWallet>[0]) => run(() => addWallet(wallet)),
    updateWallet: (id: string, wallet: Parameters<typeof updateWallet>[1]) => run(() => updateWallet(id, wallet)),
    deleteWallet: (id: string) => run(() => deleteWallet(id)),
    transferMoney,
    
    // Quản lý ngân sách (Budget)
    addBudget: (budget: Parameters<typeof addBudget>[0]) => run(() => addBudget(budget)),
    updateBudget: (id: string, budget: Parameters<typeof updateBudget>[1]) => run(() => updateBudget(id, budget)),
    deleteBudget: (id: string) => run(() => deleteBudget(id)),
    
    updateSettings,
  }), [
    pendingCount,
    run,
    addTransaction,
    addTransactionsBatch,
    updateTransaction,
    deleteTransaction,
    addWallet,
    updateWallet,
    deleteWallet,
    transferMoney,
    addBudget,
    updateBudget,
    deleteBudget,
    updateSettings,
  ]);
}
