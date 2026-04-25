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

export interface DonutChartSegment {
  percentage: number;
  color: string;
}

export interface DonutLegendItem {
  id: string;
  amount: number;
  percentage: number;
  color: string;
  isOther?: boolean;
}

export function filterTransactionsByPeriod(
  transactions: Transaction[],
  period: string
): Transaction[] {
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
  const convert = convertAmount || ((tx: Transaction) => tx.amount);
  const filteredTxs = filterTransactionsByPeriod(transactions, period);
  const activeTxs = filteredTxs.filter((tx) => tx.type === activeTab);
  const totalAmount = activeTxs.reduce((sum, tx) => sum + convert(tx), 0);

  const categoryMap: Record<string, number> = {};
  activeTxs.forEach((tx) => {
    categoryMap[tx.categoryId] = (categoryMap[tx.categoryId] || 0) + convert(tx);
  });

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([id, amount]) => ({ id, amount }))
    .sort((a, b) => b.amount - a.amount);

  const top4Cats = categoryBreakdown.slice(0, 4);
  const othersAmount = categoryBreakdown
    .slice(4)
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    activeTxs,
    totalAmount,
    categoryBreakdown,
    top4Cats,
    othersAmount,
    realTotal: totalAmount || 1,
  };
}

export function buildDonutChartModel(
  topItems: CategoryBreakdownItem[],
  othersAmount: number,
  totalAmount: number,
  colors: string[],
  othersColor = 'rgba(174, 213, 188, 0.4)'
): { data: DonutChartSegment[]; legendItems: DonutLegendItem[] } {
  const safeTotal = Math.max(totalAmount, 1);

  const legendItems: DonutLegendItem[] = topItems.map((item, index) => ({
    id: item.id,
    amount: item.amount,
    percentage: (item.amount / safeTotal) * 100,
    color: colors[index % colors.length],
  }));

  if (othersAmount > 0) {
    legendItems.push({
      id: 'others',
      amount: othersAmount,
      percentage: (othersAmount / safeTotal) * 100,
      color: othersColor,
      isOther: true,
    });
  }

  return {
    data: legendItems.map((item) => ({
      percentage: item.amount / safeTotal,
      color: item.color,
    })),
    legendItems,
  };
}
