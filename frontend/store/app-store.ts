import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import { createAuthSlice } from './slices/auth-slice';
import { createChatSlice } from './slices/chat-slice';
import { createDataSlice } from './slices/data-slice';
import { createUISlice } from './slices/ui-slice';
import { AppState } from './types';

const customStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const val = await AsyncStorage.getItem(name);
    if (!val) return null;
    if (name === 'money-lover-storage') {
      try {
        const parsed = JSON.parse(val);
        const token = await SecureStore.getItemAsync('authToken');
        if (token) {
          if (!parsed.state) parsed.state = {};
          parsed.state.authToken = token;
        }
        return JSON.stringify(parsed);
      } catch (e) {
        return val;
      }
    }
    return val;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (name === 'money-lover-storage') {
      try {
        const parsed = JSON.parse(value);
        if (parsed.state) {
          const token = parsed.state.authToken;
          if (token) {
            await SecureStore.setItemAsync('authToken', token);
          } else {
            await SecureStore.deleteItemAsync('authToken');
          }
          delete parsed.state.authToken;
        }
        await AsyncStorage.setItem(name, JSON.stringify(parsed));
        return;
      } catch (e) {
        // fallback
      }
    }
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (name === 'money-lover-storage') {
      await SecureStore.deleteItemAsync('authToken');
    }
    await AsyncStorage.removeItem(name);
  },
};

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
      storage: createJSONStorage(() => customStorage),
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
