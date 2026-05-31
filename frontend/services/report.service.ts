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
  // top4Cats: 4 danh mục chi nhiều nhất, dùng cho biểu đồ donut
  top4Cats: CategoryBreakdownItem[];
  // othersAmount: tổng của tất cả danh mục ngoài top 4, hiển thị là segment "Khác"
  othersAmount: number;
  // realTotal: luôn >= 1, tránh chia cho 0 khi tính phần trăm biểu đồ
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

/**
 * Lọc giao dịch theo khoảng thời gian tương đối so với ngày hiện tại.
 * Tất cả so sánh đều dựa trên ngày (bỏ giờ/phút) để tránh lệch múi giờ.
 */
export function filterTransactionsByPeriod(
  transactions: Transaction[],
  period: string
): Transaction[] {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return transactions.filter((transaction) => {
    const date = new Date(transaction.date);
    // Chuẩn hóa về nửa đêm để so sánh ngày chính xác, tránh lệch do giờ lưu trữ
    const txDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    switch (period) {
      case 'today':
        return txDate === today;
      case 'week': {
        // Tuần bắt đầu từ thứ Hai — điều chỉnh khi now.getDay() === 0 (Chủ Nhật)
        const startOfWeek = new Date();
        startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
        startOfWeek.setHours(0, 0, 0, 0);
        return txDate >= startOfWeek.getTime();
      }
      case 'quarter': {
        // Chia tháng cho 3 để xác định quý (0-3)
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

/**
 * Tạo báo cáo tài chính theo kỳ và loại giao dịch (expense/income).
 * `convertAmount` cho phép áp dụng tỷ giá khi hiển thị theo ngoại tệ.
 */
export function generateFinancialReport(
  transactions: Transaction[],
  period: string,
  activeTab: 'expense' | 'income',
  convertAmount?: (tx: Transaction) => number
): ReportData {
  // Nếu không truyền hàm convert, dùng amount gốc — tránh điều kiện null ở mọi nơi dùng
  const convert = convertAmount || ((tx: Transaction) => tx.amount);
  const filteredTxs = filterTransactionsByPeriod(transactions, period);
  const activeTxs = filteredTxs.filter((tx) => tx.type === activeTab);
  const totalAmount = activeTxs.reduce((sum, tx) => sum + convert(tx), 0);

  // Gom nhóm tổng tiền theo categoryId bằng một lần duyệt — O(n)
  const categoryMap: Record<string, number> = {};
  activeTxs.forEach((tx) => {
    categoryMap[tx.categoryId] = (categoryMap[tx.categoryId] || 0) + convert(tx);
  });

  // Sắp xếp giảm dần để top4Cats luôn là 4 danh mục lớn nhất
  const categoryBreakdown = Object.entries(categoryMap)
    .map(([id, amount]) => ({ id, amount }))
    .sort((a, b) => b.amount - a.amount);

  const top4Cats = categoryBreakdown.slice(0, 4);
  // Các danh mục từ vị trí thứ 5 trở đi gộp thành một segment "Khác"
  const othersAmount = categoryBreakdown
    .slice(4)
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    activeTxs,
    totalAmount,
    categoryBreakdown,
    top4Cats,
    othersAmount,
    // realTotal dùng làm mẫu số — fallback về 1 khi totalAmount = 0 để tránh NaN/Infinity
    realTotal: totalAmount || 1,
  };
}

/**
 * Tạo dữ liệu cho biểu đồ donut và legend từ top categories + "Khác".
 * `safeTotal` đảm bảo không chia cho 0 khi không có giao dịch nào.
 */
export function buildDonutChartModel(
  topItems: CategoryBreakdownItem[],
  othersAmount: number,
  totalAmount: number,
  colors: string[],
  othersColor = 'rgba(174, 213, 188, 0.4)'
): { data: DonutChartSegment[]; legendItems: DonutLegendItem[] } {
  // Math.max để tránh chia cho 0 khi totalAmount = 0
  const safeTotal = Math.max(totalAmount, 1);

  const legendItems: DonutLegendItem[] = topItems.map((item, index) => ({
    id: item.id,
    amount: item.amount,
    percentage: (item.amount / safeTotal) * 100,
    // Xoay vòng màu nếu số lượng danh mục nhiều hơn số màu có sẵn
    color: colors[index % colors.length],
  }));

  // Chỉ thêm segment "Khác" nếu thực sự có danh mục ngoài top 4
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
    // DonutChartSegment dùng tỷ lệ thập phân (0-1), legend dùng phần trăm (0-100)
    data: legendItems.map((item) => ({
      percentage: item.amount / safeTotal,
      color: item.color,
    })),
    legendItems,
  };
}
