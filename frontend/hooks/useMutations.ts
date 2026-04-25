import { useState } from 'react';
import { useStore } from '@/store/app-store';
import { api } from '@/utils/api';
import { AppSettings, Transaction } from '@/constants/types';

export function useMutations() {
  const [pendingCount, setPendingCount] = useState(0);

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

  const run = async <T,>(action: () => Promise<T>) => {
    setPendingCount((count) => count + 1);
    try {
      return await action();
    } finally {
      setPendingCount((count) => Math.max(count - 1, 0));
    }
  };

  const transferMoney = (
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
  };

  const updateSettings = async (nextSettings: Partial<AppSettings>) => {
    const token = useStore.getState().authToken;
    if (!token) {
      throw new Error('Bạn cần đăng nhập để đồng bộ dữ liệu.');
    }

    try {
      const updatedSettings = await api.updateSettings(token, nextSettings);
      useStore.setState({ settings: updatedSettings });
    } catch {
      useStore.setState((state) => ({
        settings: { ...state.settings, ...nextSettings },
      }));
    }
  };

  return {
    isMutating: pendingCount > 0,
    addTransaction: (tx: Transaction) => run(() => addTransaction(tx)),
    addTransactionsBatch: (txs: Transaction[]) => run(() => addTransactionsBatch(txs)),
    updateTransaction: (id: string, tx: Partial<Transaction>) =>
      run(() => updateTransaction(id, tx)),
    deleteTransaction: (id: string) => run(() => deleteTransaction(id)),
    addWallet: (wallet: Parameters<typeof addWallet>[0]) => run(() => addWallet(wallet)),
    updateWallet: (id: string, wallet: Parameters<typeof updateWallet>[1]) =>
      run(() => updateWallet(id, wallet)),
    deleteWallet: (id: string) => run(() => deleteWallet(id)),
    transferMoney,
    addBudget: (budget: Parameters<typeof addBudget>[0]) => run(() => addBudget(budget)),
    updateBudget: (id: string, budget: Parameters<typeof updateBudget>[1]) =>
      run(() => updateBudget(id, budget)),
    deleteBudget: (id: string) => run(() => deleteBudget(id)),
    updateSettings,
  };
}
