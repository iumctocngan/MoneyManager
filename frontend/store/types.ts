import {
  AuthUser,
  Budget,
  Transaction,
  Wallet,
  AppSnapshot,
  ChatMessage,
  ChatSession,
} from '@/constants/types';

export { ChatMessage, ChatSession };

/** Trạng thái xác thực của người dùng trong app. */
export type AuthStatus = 'signed_out' | 'signed_in';

/**
 * Đại diện cho một thay đổi dữ liệu chờ được đồng bộ lên server.
 * Mỗi mutation có id riêng để theo dõi và dedup khi replay.
 * Dùng discriminated union để TypeScript có thể type-narrow từng loại mutation.
 */
export type PendingMutation =
  | { id: string; kind: 'transaction.create'; transaction: Transaction }
  | { id: string; kind: 'transaction.batchCreate'; transactions: Transaction[] }
  | { id: string; kind: 'transaction.update'; transactionId: string; updates: Partial<Transaction> }
  | { id: string; kind: 'transaction.delete'; transactionId: string }
  | { id: string; kind: 'wallet.create'; wallet: Wallet }
  | { id: string; kind: 'wallet.update'; walletId: string; updates: Partial<Wallet> }
  | { id: string; kind: 'wallet.delete'; walletId: string }
  | { id: string; kind: 'budget.create'; budget: Budget }
  | { id: string; kind: 'budget.update'; budgetId: string; updates: Partial<Budget> }
  | { id: string; kind: 'budget.delete'; budgetId: string };

/** Interface định nghĩa state và actions cho tính năng chat AI. */
export interface ChatSlice {
  chatMessages: ChatMessage[];
  chatSessions: ChatSession[];
  currentSessionId: string | null;
  sendChatMessage: (message: string) => Promise<void>;
  stopChat: () => void;
  listSessions: () => Promise<void>;
  createNewSession: () => void;
  loadSessionMessages: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  clearChat: () => void;
}

/**
 * Interface tổng thể của Zustand store, mở rộng ChatSlice.
 * Phân chia rõ ràng theo nhóm: Data State, UI & Auth State, Actions, Getters.
 */
export interface AppState extends ChatSlice {
  // --- Data State ---
  transactions: Transaction[];
  wallets: Wallet[];
  budgets: Budget[];
  /** Hàng đợi các mutation chưa được đồng bộ lên server (offline-first). */
  pendingMutations: PendingMutation[];
  
  // --- UI & Auth State ---
  selectedWalletId: string | null;
  authToken: string | null;
  user: AuthUser | null;
  authStatus: AuthStatus;
  /** true sau khi SQLite local đã được load xong vào store. */
  isHydrated: boolean;
  /** true sau khi toàn bộ quá trình khởi động app (hydrate + sync) hoàn tất. */
  isInitialized: boolean;
  /** true khi đang có thao tác sync nặng (import/export snapshot). */
  isBusy: boolean;
  aiAssistantEnabled: boolean;
  lastSyncError: string | null;

  // --- Actions: Lifecycle ---
  setHydrated: () => void;
  initializeApp: () => Promise<void>;
  
  // --- Actions: Auth ---
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: { email: string; password: string; name?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  
  // --- Actions: Sync ---
  refreshState: () => Promise<void>;
  importCurrentState: () => Promise<void>;
  /** Ghi đè toàn bộ state local bằng snapshot (dùng khi pull từ server). */
  applySnapshot: (snapshot: AppSnapshot) => void;
  /** Merge snapshot từ server với data local, ưu tiên giữ lại pending mutations. */
  mergeRemoteSnapshot: (snapshot: AppSnapshot) => Promise<void>;
  /** Thử phát lại các mutation chưa đồng bộ khi có kết nối trở lại. */
  replayPendingMutations: () => Promise<void>;
  syncPendingMutations: () => Promise<void>;
  
  // --- Actions: Data (Queued Sync) ---
  // Các action này cập nhật local trước, sau đó queue lên server (offline-first)
  addTransaction: (tx: Transaction) => Promise<void>;
  addTransactionsBatch: (txs: Transaction[]) => Promise<void>;
  updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  
  addWallet: (wallet: Wallet) => Promise<void>;
  updateWallet: (id: string, wallet: Partial<Wallet>) => Promise<void>;
  deleteWallet: (id: string) => Promise<void>;
  
  addBudget: (budget: Budget) => Promise<void>;
  updateBudget: (id: string, budget: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  
  // --- Actions: Data (Local Apply) ---
  // Các action này chỉ cập nhật SQLite local và store, không queue sync
  // Dùng khi AI agent hoặc sync đã xử lý server-side rồi
  addTransactionLocally: (tx: Transaction) => Promise<void>;
  updateTransactionLocally: (id: string, tx: Partial<Transaction>) => Promise<void>;
  deleteTransactionLocally: (id: string) => Promise<void>;
  
  addWalletLocally: (wallet: Wallet) => Promise<void>;
  updateWalletLocally: (id: string, wallet: Partial<Wallet>) => Promise<void>;
  deleteWalletLocally: (id: string) => Promise<void>;
  
  addBudgetLocally: (budget: Budget) => Promise<void>;
  updateBudgetLocally: (id: string, budget: Partial<Budget>) => Promise<void>;
  deleteBudgetLocally: (id: string) => Promise<void>;
  
  setSelectedWallet: (id: string | null) => void;
  setAiAssistantEnabled: (enabled: boolean) => void;

  // --- Getters ---
  /** Tổng số dư của tất cả ví có includeInTotal = true. */
  getTotalBalance: () => number;
  getWalletBalance: (walletId: string) => number;
  getTransactionsByWallet: (walletId: string) => Transaction[];
  getTransactionsByMonth: (year: number, month: number) => Transaction[];
  getCategoryById: (id: string) => any;
  /** Tỷ lệ phần trăm đã chi so với ngân sách (0–1+). */
  getBudgetProgress: (budgetId: string) => number;
}
