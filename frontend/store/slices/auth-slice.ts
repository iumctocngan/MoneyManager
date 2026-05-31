import { StateCreator } from 'zustand';
import { AppState, AuthStatus } from '../types';
import { api } from '@/utils/api';
import { AuthUser, AuthResponse, AppSnapshot } from '@/constants/types';
import {
  snapshotFromState,
  isSnapshotEmpty,
  getErrorMessage,
} from '../store-utils';

export interface AuthSlice {
  authToken: string | null;
  user: AuthUser | null;
  authStatus: AuthStatus;
  
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: { email: string; password: string; name?: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

export const createAuthSlice: StateCreator<
  AppState,
  [],
  [],
  AuthSlice
> = (set, get) => ({
  authToken: null,
  user: null,
  // Trạng thái ban đầu trước khi app kiểm tra xác thực
  authStatus: 'signed_out',

  signIn: async (email, password) => {
    // Chụp snapshot local trước khi đăng nhập — dùng để import nếu tài khoản mới chưa có dữ liệu
    const localSnapshot = snapshotFromState(get());
    set({ isBusy: true });
    try {
      const result = await api.login({ email, password });
      await handleAuthSuccess(set, get, result, localSnapshot);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ isBusy: false });
    }
  },

  signUp: async ({ email, password, name }) => {
    // Tương tự signIn: chụp snapshot local để import vào tài khoản mới nếu server trống
    const localSnapshot = snapshotFromState(get());
    set({ isBusy: true });
    try {
      const result = await api.register({ email, password, name });
      await handleAuthSuccess(set, get, result, localSnapshot);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ isBusy: false });
    }
  },

  signOut: async () => {
    // Reset toàn bộ dữ liệu người dùng về trạng thái ban đầu; isInitialized giữ true để không chạy lại init
    set({
      transactions: [],
      wallets: [],
      budgets: [],
      authToken: null,
      user: null,
      authStatus: 'signed_out',
      isInitialized: true,
      pendingMutations: [],
      lastSyncError: null,
    });
  },
});

/**
 * Xử lý sau khi đăng nhập / đăng ký thành công:
 * - Nếu server chưa có dữ liệu nhưng local có → import local lên server (onboarding offline).
 * - Ngược lại → sync pending mutations rồi kéo snapshot mới nhất từ server về.
 */
async function handleAuthSuccess(
  set: (partial: Partial<AppState>) => void,
  get: () => AppState,
  result: AuthResponse,
  localSnapshot: AppSnapshot
) {
  set({
    authToken: result.accessToken,
    user: result.user,
    authStatus: 'signed_in',
    isInitialized: true,
  });

  const remoteSnapshot = await api.getState(result.accessToken);
  // Ưu tiên import dữ liệu local khi tài khoản hoàn toàn mới (server rỗng) nhưng đã có dữ liệu offline
  const shouldImportLocalState = isSnapshotEmpty(remoteSnapshot) && !isSnapshotEmpty(localSnapshot);

  if (shouldImportLocalState) {
    const importedSnapshot = await api.importState(result.accessToken, localSnapshot);
    // Xóa pending mutations sau khi import thành công — server đã có dữ liệu mới nhất
    set({ pendingMutations: [], lastSyncError: null });
    await get().mergeRemoteSnapshot(importedSnapshot);
    return;
  }

  // Đường bình thường: đẩy các thay đổi offline lên trước, rồi kéo trạng thái mới nhất về
  await get().syncPendingMutations();
  const refreshedSnapshot = await api.getState(result.accessToken);
  await get().mergeRemoteSnapshot(refreshedSnapshot);
}
