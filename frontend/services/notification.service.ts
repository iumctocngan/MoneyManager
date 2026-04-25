import { AppNotification, Budget, Category, Transaction } from '@/constants/types';
import { getBudgetAlerts } from '@/services/budget-alerts.service';
import { formatCurrency } from '@/utils';

type CategoryResolver = (id: string) => Category | undefined;

export function generateNotifications(
  budgets: Budget[],
  transactions: Transaction[],
  getCategoryById: CategoryResolver
): AppNotification[] {
  const now = new Date();
  const notifications: AppNotification[] = [];

  for (const alert of getBudgetAlerts(budgets, transactions, now)) {
    const budget = budgets.find((item) => item.id === alert.budgetId);
    if (!budget) {
      continue;
    }

    const category = getCategoryById(alert.categoryId);
    const categoryName = category?.name || 'Danh mục';

    if (alert.type === 'budget_exceeded') {
      notifications.push({
        id: `exceeded-${alert.budgetId}`,
        type: alert.type,
        title: 'Vượt ngân sách!',
        message: `${categoryName}: Đã chi ${formatCurrency(alert.spent)} / ${formatCurrency(budget.amount)} (${Math.round(alert.pct)}%)`,
        icon: 'alert-circle',
        color: '#FF6B78',
        timestamp: now.toISOString(),
        budgetId: alert.budgetId,
      });
      continue;
    }

    if (alert.type === 'budget_warning') {
      notifications.push({
        id: `warning-${alert.budgetId}`,
        type: alert.type,
        title: 'Sắp hết ngân sách',
        message: `${categoryName}: Đã chi ${formatCurrency(alert.spent)} / ${formatCurrency(budget.amount)} (${Math.round(alert.pct)}%)`,
        icon: 'warning-outline',
        color: '#FFC94D',
        timestamp: now.toISOString(),
        budgetId: alert.budgetId,
      });
      continue;
    }

    notifications.push({
      id: `saving-${alert.budgetId}`,
      type: alert.type,
      title: 'Tiết kiệm tốt!',
      message: `${categoryName}: Mới sử dụng ${Math.round(alert.pct)}% ngân sách, còn ${alert.daysLeft} ngày.`,
      icon: 'trophy-outline',
      color: '#36D879',
      timestamp: now.toISOString(),
      budgetId: alert.budgetId,
    });
  }

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

  const priority: Record<string, number> = {
    budget_exceeded: 0,
    budget_warning: 1,
    saving_good: 2,
    no_activity: 3,
  };

  notifications.sort(
    (a, b) => (priority[a.type] ?? 99) - (priority[b.type] ?? 99)
  );

  return notifications;
}
