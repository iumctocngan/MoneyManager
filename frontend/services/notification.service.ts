import { AppNotification, Budget, Category, Transaction } from '@/constants/types';
import { getBudgetAlerts } from '@/services/budget-alerts.service';
import { formatCurrency } from '@/utils';

// Hàm tra cứu danh mục theo id — được inject từ store để tránh phụ thuộc trực tiếp vào Zustand
type CategoryResolver = (id: string) => Category | undefined;

/**
 * Tổng hợp toàn bộ thông báo trong app dựa trên trạng thái ngân sách và lịch sử giao dịch.
 * Không gửi push notification — chỉ tạo danh sách để hiển thị trong UI.
 */
export function generateNotifications(
  budgets: Budget[],
  transactions: Transaction[],
  getCategoryById: CategoryResolver
): AppNotification[] {
  const now = new Date();
  const notifications: AppNotification[] = [];

  for (const alert of getBudgetAlerts(budgets, transactions, now)) {
    const budget = budgets.find((item) => item.id === alert.budgetId);
    // Bỏ qua nếu budget đã bị xóa khỏi store sau khi alert được tạo
    if (!budget) {
      continue;
    }

    const category = getCategoryById(alert.categoryId);
    // Fallback về 'Danh mục' nếu danh mục không tìm thấy (category bị xóa)
    const categoryName = category?.name || 'Danh mục';

    if (alert.type === 'budget_exceeded') {
      notifications.push({
        // id dùng prefix để tránh trùng khi có nhiều loại alert cho cùng budgetId
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

    // Trường hợp còn lại là saving_good
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

  // Kiểm tra tần suất ghi chép — nhắc người dùng nếu quá 7 ngày không có giao dịch mới
  if (transactions.length > 0) {
    // Spread để tránh mutate mảng gốc khi sort
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const lastTxDate = new Date(sorted[0].date);
    const daysSince = Math.floor(
      (now.getTime() - lastTxDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSince >= 7) {
      notifications.push({
        // Nhúng daysSince vào id để tránh cache notification cũ khi số ngày thay đổi
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
    // Người dùng mới — chưa có giao dịch nào, hướng dẫn bắt đầu
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

  // Sắp xếp theo mức độ nghiêm trọng: exceeded > warning > saving_good > no_activity
  const priority: Record<string, number> = {
    budget_exceeded: 0,
    budget_warning: 1,
    saving_good: 2,
    no_activity: 3,
  };

  notifications.sort(
    // Type không có trong map sẽ nhận priority 99 — đẩy xuống cuối danh sách
    (a, b) => (priority[a.type] ?? 99) - (priority[b.type] ?? 99)
  );

  return notifications;
}
