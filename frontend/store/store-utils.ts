import { AppSnapshot, Wallet } from '@/constants/types';

export function snapshotFromState(
  state: Pick<any, 'wallets' | 'transactions' | 'budgets' | 'settings'>
): AppSnapshot {
  return {
    wallets: state.wallets,
    transactions: state.transactions,
    budgets: state.budgets,
    settings: state.settings,
  };
}

export function isSnapshotEmpty(snapshot: AppSnapshot) {
  return (
    snapshot.wallets.length === 0 &&
    snapshot.transactions.length === 0 &&
    snapshot.budgets.length === 0
  );
}

export function normalizeSelectedWallet(selectedWalletId: string | null, wallets: Wallet[]) {
  if (selectedWalletId && wallets.some((wallet) => wallet.id === selectedWalletId)) {
    return selectedWalletId;
  }
  return wallets[0]?.id ?? null;
}

export function requireToken(state: { authToken: string | null }) {
  if (!state.authToken) {
    throw new Error('Bạn cần đăng nhập để đồng bộ dữ liệu.');
  }
  return state.authToken;
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Đã có lỗi xảy ra.';
}
