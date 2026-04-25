import { useMemo } from 'react';
import { useStore } from '@/store/app-store';


export function useMonthTransactions(year: number, month: number, walletId?: string | null) {
  const { transactions, getCategoryById } = useStore();

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      if (d.getFullYear() !== year || d.getMonth() !== month) return false;
      
      // If filtering by specific wallet, include if it is source OR destination
      if (walletId) {
        return t.walletId === walletId || t.toWalletId === walletId;
      }
      
      return true;
    });
  }, [transactions, year, month, walletId]);

  const income = useMemo(
    () => filtered
      .filter(t => {
        // Global view: only explicit income
        if (!walletId) return t.type === 'income';
        // Wallet view: explicit income OR receiving transfer
        return t.type === 'income' || (t.type === 'transfer' && t.toWalletId === walletId);
      })
      .reduce((sum, t) => sum + t.amount, 0),
    [filtered, walletId]
  );

  const expense = useMemo(
    () => filtered
      .filter(t => {
        // Global view: only explicit expense
        if (!walletId) return t.type === 'expense';
        // Wallet view: explicit expense OR sending transfer
        return t.type === 'expense' || (t.type === 'transfer' && t.walletId === walletId);
      })
      .reduce((sum, t) => sum + t.amount, 0),
    [filtered, walletId]
  );



  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { category: any; amount: number; count: number }> = {};
    filtered.filter(t => t.type === 'expense').forEach(t => {
      if (!map[t.categoryId]) {
        map[t.categoryId] = { category: getCategoryById(t.categoryId), amount: 0, count: 0 };
      }
      map[t.categoryId].amount += t.amount;
      map[t.categoryId].count += 1;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [filtered, getCategoryById]);

  return { filtered, income, expense, categoryBreakdown };
}

export function useWalletStats(walletId: string) {
  const { transactions, wallets } = useStore();
  const wallet = wallets.find(w => w.id === walletId);

  const walletTxs = useMemo(
    () => transactions.filter(t => t.walletId === walletId || t.toWalletId === walletId),
    [transactions, walletId]
  );

  const now = new Date();
  const thisMonthTxs = walletTxs.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const monthIncome = thisMonthTxs
    .filter(t => t.type === 'income' || (t.type === 'transfer' && t.toWalletId === walletId))
    .reduce((sum, t) => sum + t.amount, 0);

  const monthExpense = thisMonthTxs
    .filter(t => t.type === 'expense' || (t.type === 'transfer' && t.walletId === walletId))
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    wallet,
    totalTransactions: walletTxs.length,
    monthIncome,
    monthExpense,
  };
}
