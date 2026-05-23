import { useMemo } from 'react';
import { useStore } from '@/store/app-store';

/**
 * Hook lọc giao dịch theo tháng/năm và ví (nếu có),
 * đồng thời tính toán tổng thu nhập, chi tiêu và breakdown danh mục.
 */
export function useMonthTransactions(year: number, month: number, walletId?: string | null) {
  const { transactions, getCategoryById } = useStore();

  return useMemo(() => {
    // 1. Lọc giao dịch theo thời gian và ví
    const filtered = transactions.filter((t) => {
      const d = new Date(t.date);
      const isCorrectPeriod = d.getFullYear() === year && d.getMonth() === month;
      if (!isCorrectPeriod) return false;

      if (walletId) {
        return t.walletId === walletId || t.toWalletId === walletId;
      }
      return true;
    });

    // 2. Tính toán thu nhập, chi tiêu, và phân tích danh mục trong một lần duyệt duy nhất
    let income = 0;
    let expense = 0;
    const categoryMap: Record<string, { category: any; amount: number; count: number }> = {};

    for (const t of filtered) {
      // Xác định giao dịch là thu nhập hay chi tiêu đối với ngữ cảnh hiện tại
      const isIncomeTransaction = t.type === 'income' || (walletId && t.type === 'transfer' && t.toWalletId === walletId);
      const isExpenseTransaction = t.type === 'expense' || (walletId && t.type === 'transfer' && t.walletId === walletId);

      if (isIncomeTransaction) {
        income += t.amount;
      } else if (isExpenseTransaction) {
        expense += t.amount;
        
        // Chỉ phân tích danh mục cho các khoản chi tiêu thực sự (bỏ qua transfer)
        if (t.type === 'expense') {
          if (!categoryMap[t.categoryId]) {
            categoryMap[t.categoryId] = {
              category: getCategoryById(t.categoryId),
              amount: 0,
              count: 0,
            };
          }
          categoryMap[t.categoryId].amount += t.amount;
          categoryMap[t.categoryId].count += 1;
        }
      }
    }

    // Sắp xếp các danh mục chi tiêu nhiều nhất lên đầu
    const categoryBreakdown = Object.values(categoryMap).sort((a, b) => b.amount - a.amount);

    return { filtered, income, expense, categoryBreakdown };
  }, [transactions, year, month, walletId, getCategoryById]);
}

/**
 * Hook lấy thông tin ví và thống kê thu chi của ví đó trong tháng hiện tại.
 */
export function useWalletStats(walletId: string) {
  const { transactions, wallets } = useStore();

  const wallet = useMemo(() => wallets.find((w) => w.id === walletId), [wallets, walletId]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalTransactions = 0;
    let monthIncome = 0;
    let monthExpense = 0;

    for (const t of transactions) {
      const isRelatedToWallet = t.walletId === walletId || t.toWalletId === walletId;
      if (!isRelatedToWallet) continue;

      totalTransactions++;

      const d = new Date(t.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        if (t.type === 'income' || (t.type === 'transfer' && t.toWalletId === walletId)) {
          monthIncome += t.amount;
        } else if (t.type === 'expense' || (t.type === 'transfer' && t.walletId === walletId)) {
          monthExpense += t.amount;
        }
      }
    }

    return { totalTransactions, monthIncome, monthExpense };
  }, [transactions, walletId]);

  return { wallet, ...stats };
}
