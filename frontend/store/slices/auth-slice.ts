import { StateCreator } from 'zustand';
import { AppState, AuthStatus } from '../types';
import { api } from '@/utils/api';
import { AuthUser } from '@/constants/types';
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
  authStatus: 'signed_out',

  signIn: async (email, password) => {
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

import { AuthResponse, AppSnapshot } from '@/constants/types';

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
  const shouldImportLocalState = isSnapshotEmpty(remoteSnapshot) && !isSnapshotEmpty(localSnapshot);

  if (shouldImportLocalState) {
    const importedSnapshot = await api.importState(result.accessToken, localSnapshot);
    set({ pendingMutations: [], lastSyncError: null });
    await get().mergeRemoteSnapshot(importedSnapshot);
    return;
  }

  await get().syncPendingMutations();
  const refreshedSnapshot = await api.getState(result.accessToken);
  await get().mergeRemoteSnapshot(refreshedSnapshot);
}
