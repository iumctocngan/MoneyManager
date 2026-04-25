import {
  AppSettings,
  AuthUser,
  Budget,
  Transaction,
  Wallet,
  AppSnapshot,
  ChatMessage,
  ChatSession,
} from '@/constants/types';

export { ChatMessage, ChatSession };

export type AuthStatus = 'signed_out' | 'signed_in';

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

export interface ChatSlice {
  chatMessages: ChatMessage[];
  chatSessions: ChatSession[];
  currentSessionId: string | null;
  sendChatMessage: (message: string, fileUri?: string) => Promise<void>;
  stopChat: () => void;
  listSessions: () => Promise<void>;
  createNewSession: () => void;
  loadSessionMessages: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  clearChat: () => void;
}

export interface AppState extends ChatSlice {
  // --- Data State ---
  transactions: Transaction[];
  wallets: Wallet[];
  budgets: Budget[];
  pendingMutations: PendingMutation[];
  
  // --- UI & Auth State ---
  settings: AppSettings;
  selectedWalletId: string | null;
  authToken: string | null;
  user: AuthUser | null;
  authStatus: AuthStatus;
  isHydrated: boolean;
  isInitialized: boolean;
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
  applySnapshot: (snapshot: AppSnapshot) => void;
  mergeRemoteSnapshot: (snapshot: AppSnapshot) => Promise<void>;
  replayPendingMutations: () => Promise<void>;
  syncPendingMutations: () => Promise<void>;
  
  // --- Actions: Data (Queued Sync) ---
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
  updateSettings: (settings: Partial<AppSettings>) => void;
  setAiAssistantEnabled: (enabled: boolean) => void;

  // --- Getters ---
  getTotalBalance: () => number;
  getWalletBalance: (walletId: string) => number;
  getTransactionsByWallet: (walletId: string) => Transaction[];
  getTransactionsByMonth: (year: number, month: number) => Transaction[];
  getCategoryById: (id: string) => any;
  getBudgetProgress: (budgetId: string) => number;
}
