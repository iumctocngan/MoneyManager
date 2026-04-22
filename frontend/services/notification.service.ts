import { AppNotification, Budget, Category, Transaction } from '@/constants/types';
import { formatCurrency } from '@/utils';

type CategoryResolver = (id: string) => Category | undefined;

/**
 * Generates in-app notifications based on current budgets and transactions.
 * Purely computed — no side effects, no backend calls.
 */
export function generateNotifications(
  budgets: Budget[],
  transactions: Transaction[],
  getCategoryById: CategoryResolver
): AppNotification[] {
  const now = new Date();
  const notifications: AppNotification[] = [];

  // ── Budget alerts ─────────────────────────────────────────────
  for (const budget of budgets) {
    const start = new Date(budget.startDate);
    const end = new Date(budget.endDate);

    // Only check active budgets
    if (now < start || now > end) continue;

    const spent = transactions
      .filter(
        (tx) =>
          tx.categoryId === budget.categoryId &&
          tx.type === 'expense' &&
          new Date(tx.date) >= start &&
          new Date(tx.date) <= end
      )
      .reduce((sum, tx) => sum + tx.amount, 0);

    const pct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    const category = getCategoryById(budget.categoryId);
    const catName = category?.name || 'Danh mục';

    if (pct >= 100) {
      notifications.push({
        id: `exceeded-${budget.id}`,
        type: 'budget_exceeded',
        title: 'Vượt ngân sách!',
        message: `${catName}: Đã chi ${formatCurrency(spent)} / ${formatCurrency(budget.amount)} (${Math.round(pct)}%)`,
        icon: 'alert-circle',
        color: '#FF6B78',
        timestamp: now.toISOString(),
        budgetId: budget.id,
      });
    } else if (pct >= 80) {
      notifications.push({
        id: `warning-${budget.id}`,
        type: 'budget_warning',
        title: 'Sắp hết ngân sách',
        message: `${catName}: Đã chi ${formatCurrency(spent)} / ${formatCurrency(budget.amount)} (${Math.round(pct)}%)`,
        icon: 'warning-outline',
        color: '#FFC94D',
        timestamp: now.toISOString(),
        budgetId: budget.id,
      });
    }

    // End-of-month savings reward: last 5 days, spent < 50%
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 5 && daysLeft >= 0 && pct < 50 && pct > 0) {
      notifications.push({
        id: `saving-${budget.id}`,
        type: 'saving_good',
        title: 'Tiết kiệm tốt! 🎉',
        message: `${catName}: Mới sử dụng ${Math.round(pct)}% ngân sách, còn ${daysLeft} ngày.`,
        icon: 'trophy-outline',
        color: '#36D879',
        timestamp: now.toISOString(),
        budgetId: budget.id,
      });
    }
  }

  // ── No-activity reminder ──────────────────────────────────────
  if (transactions.length > 0) {
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const lastTxDate = new Date(sorted[0].date);
    const daysSince = Math.floor(
      (now.getTime() - lastTxDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSince >= 7) {
      notifications.push({
        id: `no-activity-${daysSince}`,
        type: 'no_activity',
        title: 'Nhắc ghi chép',
        message: `Bạn chưa ghi chép chi tiêu ${daysSince} ngày rồi. Hãy cập nhật nhé!`,
        icon: 'time-outline',
        color: '#74A7FF',
        timestamp: now.toISOString(),
      });
    }
  } else {
    notifications.push({
      id: 'no-activity-first',
      type: 'no_activity',
      title: 'Bắt đầu ghi chép',
      message: 'Thêm giao dịch đầu tiên để bắt đầu quản lý chi tiêu!',
      icon: 'add-circle-outline',
      color: '#74A7FF',
      timestamp: now.toISOString(),
    });
  }

  // Sort by severity: exceeded > warning > saving > no_activity
  const PRIORITY: Record<string, number> = {
    budget_exceeded: 0,
    budget_warning: 1,
    saving_good: 2,
    no_activity: 3,
  };

  notifications.sort(
    (a, b) => (PRIORITY[a.type] ?? 99) - (PRIORITY[b.type] ?? 99)
  );

  return notifications;
}
