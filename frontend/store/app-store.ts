import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import { setOnUnauthorized } from '@/utils/api';
import { createAuthSlice } from './slices/auth-slice';
import { createChatSlice } from './slices/chat-slice';
import { createDataSlice } from './slices/data-slice';
import { createUISlice } from './slices/ui-slice';
import { AppState } from './types';

// Hằng số cho tên storage — tránh hardcode chuỗi lặp lại nhiều nơi
const STORAGE_KEY = 'money-lover-storage';
const SECURE_TOKEN_KEY = 'authToken';

// Storage tùy chỉnh:
// - authToken được lưu riêng trong SecureStore (bảo mật) thay vì AsyncStorage (plaintext)
// - Phần còn lại của state vẫn lưu trong AsyncStorage bình thường
const customStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const val = await AsyncStorage.getItem(name);
    if (!val) return null;

    if (name === STORAGE_KEY) {
      try {
        const parsed = JSON.parse(val);
        const token = await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
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
    if (name === STORAGE_KEY) {
      try {
        const parsed = JSON.parse(value);
        if (parsed.state) {
          const token = parsed.state.authToken;
          if (token) {
            await SecureStore.setItemAsync(SECURE_TOKEN_KEY, token);
          } else {
            await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
          }
          // Xóa token khỏi AsyncStorage — chỉ lưu trong SecureStore
          delete parsed.state.authToken;
        }
        await AsyncStorage.setItem(name, JSON.stringify(parsed));
        return;
      } catch (e) {
        // Fallback: lưu nguyên vẹn nếu parse thất bại
      }
    }

    await AsyncStorage.setItem(name, value);
  },

  removeItem: async (name: string): Promise<void> => {
    if (name === STORAGE_KEY) {
      await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
    }
    await AsyncStorage.removeItem(name);
  },
};

export const useStore = create<AppState>()(
  persist(
    (...a) => {
      const [set, get] = a;

      // Đăng ký xử lý lỗi 401 toàn cục: tự động đăng xuất khi token hết hạn
      setOnUnauthorized(() => {
        get().signOut();
      });

      return {
        ...createAuthSlice(...a),
        ...createDataSlice(...a),
        ...createUISlice(...a),
        ...createChatSlice(...a),
      };
    },
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => customStorage),
      partialize: (state) => ({
        selectedWalletId: state.selectedWalletId,
        authToken: state.authToken,
        user: state.user,
        authStatus: state.authStatus,
        pendingMutations: state.pendingMutations,
        currentSessionId: state.currentSessionId,
        // Persist tùy chọn AI để người dùng không bị reset mỗi lần mở app
        aiAssistantEnabled: state.aiAssistantEnabled,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
