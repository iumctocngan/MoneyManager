import { Budget, Transaction } from '@/constants/types';

export type BudgetAlertType = 'budget_warning' | 'budget_exceeded' | 'saving_good';

export interface BudgetAlert {
  budgetId: string;
  categoryId: string;
  spent: number;
  pct: number;
  daysLeft: number;
  type: BudgetAlertType;
}

export interface BudgetProgressSnapshot {
  spent: number;
  pct: number;
  daysLeft: number;
  isActive: boolean;
}

export function getBudgetProgressSnapshot(
  budget: Budget,
  transactions: Transaction[],
  now = new Date()
): BudgetProgressSnapshot {
  const start = new Date(budget.startDate);
  const end = new Date(budget.endDate);
  const isActive = now >= start && now <= end;

  const spent = transactions
    .filter(
      (transaction) =>
        transaction.categoryId === budget.categoryId &&
        transaction.type === 'expense' &&
        new Date(transaction.date) >= start &&
        new Date(transaction.date) <= end &&
        (!budget.walletId || transaction.walletId === budget.walletId)
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    spent,
    pct: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
    daysLeft: Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    isActive,
  };
}

export function getBudgetAlert(
  budget: Budget,
  transactions: Transaction[],
  now = new Date()
): BudgetAlert | null {
  const progress = getBudgetProgressSnapshot(budget, transactions, now);
  if (!progress.isActive) {
    return null;
  }

  if (progress.pct >= 100) {
    return {
      budgetId: budget.id,
      categoryId: budget.categoryId,
      spent: progress.spent,
      pct: progress.pct,
      daysLeft: progress.daysLeft,
      type: 'budget_exceeded',
    };
  }

  if (progress.pct >= 80) {
    return {
      budgetId: budget.id,
      categoryId: budget.categoryId,
      spent: progress.spent,
      pct: progress.pct,
      daysLeft: progress.daysLeft,
      type: 'budget_warning',
    };
  }

  if (progress.daysLeft <= 5 && progress.daysLeft >= 0 && progress.pct < 50 && progress.pct > 0) {
    return {
      budgetId: budget.id,
      categoryId: budget.categoryId,
      spent: progress.spent,
      pct: progress.pct,
      daysLeft: progress.daysLeft,
      type: 'saving_good',
    };
  }

  return null;
}

export function getBudgetAlerts(
  budgets: Budget[],
  transactions: Transaction[],
  now = new Date()
) {
  return budgets
    .map((budget) => getBudgetAlert(budget, transactions, now))
    .filter((alert): alert is BudgetAlert => alert !== null);
}
