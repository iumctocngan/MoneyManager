import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createAuthSlice } from './slices/auth-slice';
import { createChatSlice } from './slices/chat-slice';
import { createDataSlice } from './slices/data-slice';
import { createUISlice } from './slices/ui-slice';
import { AppState } from './types';

export const useStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createDataSlice(...a),
      ...createUISlice(...a),
      ...createChatSlice(...a),
    }),
    {
      name: 'money-lover-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        settings: state.settings,
        selectedWalletId: state.selectedWalletId,
        authToken: state.authToken,
        user: state.user,
        authStatus: state.authStatus,
        pendingMutations: state.pendingMutations,
        currentSessionId: state.currentSessionId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
