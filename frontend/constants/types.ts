/** Ba loại giao dịch được hỗ trợ trong app. */
export type TransactionType = 'expense' | 'income' | 'transfer';

/** Danh mục giao dịch (chi tiêu hoặc thu nhập). */
export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  /** Nếu undefined, category có thể dùng cho cả hai loại giao dịch. */
  type?: TransactionType;
}

export interface Wallet {
  id: string;
  name: string;
  /** Số dư lưu dạng INTEGER (đơn vị VNĐ) để tránh lỗi dấu phẩy động. */
  balance: number;
  color: string;
  icon: string;
  /** Nếu false, ví này không được tính vào tổng số dư hiển thị trên màn hình chính. */
  includeInTotal: boolean;
  /** Runtime-only flag, không lưu DB — dùng để disable nút xóa ví còn giao dịch. */
  hasTransactions: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Số tiền lưu dạng INTEGER (đơn vị VNĐ). */
  amount: number;
  categoryId: string;
  /** Ví nguồn của giao dịch. */
  walletId: string;
  /** Ví đích — chỉ có giá trị khi type = 'transfer'. */
  toWalletId?: string;
  note: string;
  /** ISO 8601 string — ngày thực hiện giao dịch. */
  date: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  /** Hạn mức ngân sách (INTEGER, đơn vị VNĐ). */
  amount: number;
  /** Số tiền đã chi trong kỳ — tính toán runtime, không lưu DB. */
  spent: number;
  period: 'monthly' | 'weekly' | 'yearly';
  startDate: string;
  endDate: string;
  /** Nếu undefined/null, ngân sách áp dụng cho tất cả các ví. */
  walletId?: string;
}



export interface AuthUser {
  id: string;
  email: string;
  name: string;
  lastLoginAt: string | null;
  createdAt: string;
}

/** Một tin nhắn trong cuộc hội thoại với AI assistant. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/** Một phiên hội thoại với AI, chứa nhiều ChatMessage. */
export interface ChatSession {
  id: string;
  title: string;
  /** Dùng snake_case để khớp với field trả về từ backend API. */
  created_at: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

/**
 * Tập hợp dữ liệu cốt lõi của app dùng để sync giữa SQLite local và backend.
 */
export interface AppSnapshot {
  wallets: Wallet[];
  transactions: Transaction[];
  budgets: Budget[];
}

/** Các loại thông báo thông minh được tạo tự động dựa trên hành vi tài chính của người dùng. */
export type NotificationType =
  | 'budget_warning'    // Gần đạt hạn mức ngân sách
  | 'budget_exceeded'   // Đã vượt hạn mức ngân sách
  | 'no_activity'       // Không có giao dịch trong thời gian dài
  | 'saving_good';      // Chi tiêu tốt, có tiết kiệm

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon: string;
  color: string;
  timestamp: string;
  /** Liên kết đến budget cụ thể nếu thông báo liên quan đến ngân sách. */
  budgetId?: string;
}
