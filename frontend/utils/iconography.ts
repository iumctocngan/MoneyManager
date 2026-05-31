import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

// Lấy kiểu union của tất cả tên icon hợp lệ từ Ionicons để TypeScript kiểm tra tại compile-time
type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Bảng ánh xạ từ categoryId (string) sang tên Ionicons icon tương ứng.
 * Phải đồng bộ với EXPENSE_CATEGORIES và INCOME_CATEGORIES trong constants/index.ts.
 */
const categoryIcons: Record<string, IoniconName> = {
  // Danh mục chi tiêu
  food: 'restaurant-outline',
  transport: 'car-sport-outline',
  shopping: 'bag-handle-outline',
  entertainment: 'film-outline',
  health: 'heart-circle-outline',
  education: 'school-outline',
  housing: 'home-outline',
  utilities: 'bulb-outline',
  clothing: 'shirt-outline',
  beauty: 'flower-outline',
  family: 'people-outline',
  travel: 'airplane-outline',
  sports: 'football-outline',
  pet: 'paw-outline',
  gift: 'gift-outline',
  other_expense: 'apps-outline',
  // Danh mục thu nhập
  salary: 'cash-outline',
  freelance: 'laptop-outline',
  investment: 'trending-up-outline',
  bonus: 'sparkles-outline',
  rental: 'business-outline',
  business: 'briefcase-outline',
  interest: 'stats-chart-outline',
  gift_income: 'gift-outline',
  other_income: 'wallet-outline',
  // Loại đặc biệt
  transfer: 'swap-horizontal-outline',
};


/**
 * Trả về tên icon Ionicons cho một categoryId.
 * Nếu không tìm thấy hoặc categoryId undefined, trả về fallback icon.
 */
export function getCategoryIconName(categoryId?: string, fallback: IoniconName = 'apps-outline') {
  if (!categoryId) {
    return fallback;
  }

  // Dùng ?? thay vì || để phân biệt icon name rỗng '' với undefined
  return categoryIcons[categoryId] ?? fallback;
}

/**
 * Trả về tên icon Ionicons cho một ví.
 * Cast trực tiếp sang IoniconName vì icon của ví được lưu dưới dạng string tên icon.
 */
export function getWalletIconName(icon?: string, fallback: IoniconName = 'wallet-outline'): IoniconName {
  return (icon as IoniconName) || fallback;
}
