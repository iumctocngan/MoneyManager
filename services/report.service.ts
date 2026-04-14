import { Transaction } from '@/constants/types';

export type TimePeriod = 'today' | 'week' | 'month' | 'quarter' | 'year';

export interface CategoryBreakdownItem {
  id: string;
  amount: number;
}

export interface ReportData {
  activeTxs: Transaction[];
  totalAmount: number;
  categoryBreakdown: CategoryBreakdownItem[];
  top4Cats: CategoryBreakdownItem[];
  othersAmount: number;
  realTotal: number;
}

export function filterTransactionsByPeriod(transactions: Transaction[], period: string): Transaction[] {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return transactions.filter((transaction) => {
    const date = new Date(transaction.date);
    const txDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    switch (period) {
      case 'today':
        return txDate === today;
      case 'week': {
        const startOfWeek = new Date();
        startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
        startOfWeek.setHours(0, 0, 0, 0);
        return txDate >= startOfWeek.getTime();
      }
      case 'quarter': {
        const currentQuarter = Math.floor(currentMonth / 3);
        const txQuarter = Math.floor(date.getMonth() / 3);
        return date.getFullYear() === currentYear && txQuarter === currentQuarter;
      }
      case 'year':
        return date.getFullYear() === currentYear;
      case 'month':
      default:
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }
  });
}

export function generateFinancialReport(
  transactions: Transaction[],
  period: string,
  activeTab: 'expense' | 'income',
  convertAmount?: (tx: Transaction) => number
): ReportData {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const convert = convertAmount || ((tx: Transaction) => tx.amount);

  // 1. Filter by Period
  const filteredTxs = filterTransactionsByPeriod(transactions, period);

  // 2. Filter by Type
  const activeTxs = filteredTxs.filter((tx) => tx.type === activeTab);
  
  // 3. Calculate Total
  const totalAmount = activeTxs.reduce((sum, tx) => sum + convert(tx), 0);

  // 4. Breakdown Categories
  const map: Record<string, number> = {};
  activeTxs.forEach((tx) => {
    map[tx.categoryId] = (map[tx.categoryId] || 0) + convert(tx);
  });
  
  const categoryBreakdown = Object.entries(map)
    .map(([id, amount]) => ({ id, amount }))
    .sort((a, b) => b.amount - a.amount);

  // 5. Partition for UI Charts
  const top4Cats = categoryBreakdown.slice(0, 4);
  const othersAmount = categoryBreakdown.slice(4).reduce((sum, item) => sum + item.amount, 0);
  const realTotal = totalAmount || 1;

  return {
    activeTxs,
    totalAmount,
    categoryBreakdown,
    top4Cats,
    othersAmount,
    realTotal,
  };
}
