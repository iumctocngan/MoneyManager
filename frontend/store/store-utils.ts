import { AppSnapshot, Wallet } from '@/constants/types';

/**
 * Trích xuất snapshot dữ liệu thuần (wallets, transactions, budgets) từ Zustand state.
 * Dùng để serialize state trước khi lưu SQLite hoặc gửi lên server.
 */
export function snapshotFromState(
  state: Pick<any, 'wallets' | 'transactions' | 'budgets'>
): AppSnapshot {
  return {
    wallets: state.wallets,
    transactions: state.transactions,
    budgets: state.budgets,
  };
}

/**
 * Kiểm tra xem snapshot có rỗng hoàn toàn không.
 * Dùng để quyết định có cần pull data từ server hay không khi app khởi động.
 */
export function isSnapshotEmpty(snapshot: AppSnapshot) {
  return (
    snapshot.wallets.length === 0 &&
    snapshot.transactions.length === 0 &&
    snapshot.budgets.length === 0
  );
}

/**
 * Đảm bảo selectedWalletId luôn trỏ đến một ví hợp lệ.
 * Nếu ví đã chọn bị xóa hoặc chưa có, tự động chọn ví đầu tiên trong danh sách.
 */
export function normalizeSelectedWallet(selectedWalletId: string | null, wallets: Wallet[]) {
  if (selectedWalletId && wallets.some((wallet) => wallet.id === selectedWalletId)) {
    return selectedWalletId;
  }
  // Fallback: chọn ví đầu tiên, hoặc null nếu không có ví nào
  return wallets[0]?.id ?? null;
}

/**
 * Xác nhận người dùng đã đăng nhập trước khi thực hiện thao tác đồng bộ.
 * Ném lỗi ngay để caller có thể xử lý (hiển thị thông báo yêu cầu đăng nhập).
 */
export function requireToken(state: { authToken: string | null }) {
  if (!state.authToken) {
    throw new Error('Bạn cần đăng nhập để đồng bộ dữ liệu.');
  }
  return state.authToken;
}

/**
 * Chuẩn hóa thông báo lỗi từ bất kỳ kiểu nào (Error object hoặc unknown).
 * Dùng trong các catch block để hiển thị thông báo thân thiện với người dùng.
 */
export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Đã có lỗi xảy ra.';
}
