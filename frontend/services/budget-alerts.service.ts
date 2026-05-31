import { Budget, Transaction } from '@/constants/types';

// Ba mức cảnh báo: vượt ngân sách, gần hết, hoặc đang tiết kiệm tốt
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

/**
 * Tính toán snapshot tiến độ của một ngân sách tại thời điểm `now`.
 * Lọc giao dịch theo danh mục, loại expense, khoảng thời gian và ví (nếu có).
 */
export function getBudgetProgressSnapshot(
  budget: Budget,
  transactions: Transaction[],
  now = new Date()
): BudgetProgressSnapshot {
  const start = new Date(budget.startDate);
  const end = new Date(budget.endDate);
  // Ngân sách chỉ được coi là active khi ngày hiện tại nằm trong khoảng [start, end]
  const isActive = now >= start && now <= end;

  const spent = transactions
    .filter(
      (transaction) =>
        transaction.categoryId === budget.categoryId &&
        transaction.type === 'expense' &&
        new Date(transaction.date) >= start &&
        new Date(transaction.date) <= end &&
        // walletId = null nghĩa là ngân sách áp dụng cho tất cả ví
        (!budget.walletId || transaction.walletId === budget.walletId)
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    spent,
    // Tránh chia cho 0 khi budget.amount = 0
    pct: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
    // ceil để nếu còn vài giờ vẫn tính là còn 1 ngày, tránh báo "0 ngày" sớm
    daysLeft: Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    isActive,
  };
}

/**
 * Trả về cảnh báo phù hợp nhất cho một ngân sách, hoặc null nếu không cần cảnh báo.
 * Thứ tự ưu tiên kiểm tra: exceeded → warning → saving_good.
 */
export function getBudgetAlert(
  budget: Budget,
  transactions: Transaction[],
  now = new Date()
): BudgetAlert | null {
  const progress = getBudgetProgressSnapshot(budget, transactions, now);
  // Không sinh cảnh báo cho ngân sách đã hết hạn hoặc chưa bắt đầu
  if (!progress.isActive) {
    return null;
  }

  // Ưu tiên cao nhất: đã vượt 100% ngân sách
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

  // Cảnh báo sớm khi đã dùng từ 80% trở lên
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

  // Khen thưởng: sắp hết kỳ (≤5 ngày) nhưng mới dùng dưới 50% — tiết kiệm tốt
  // pct > 0 để tránh thông báo trên ngân sách chưa có giao dịch nào
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

/**
 * Lấy toàn bộ cảnh báo cho danh sách ngân sách, bỏ qua các entry không cần cảnh báo.
 */
export function getBudgetAlerts(
  budgets: Budget[],
  transactions: Transaction[],
  now = new Date()
) {
  return budgets
    .map((budget) => getBudgetAlert(budget, transactions, now))
    // Type predicate loại bỏ null để TypeScript suy ra kiểu BudgetAlert[]
    .filter((alert): alert is BudgetAlert => alert !== null);
}
