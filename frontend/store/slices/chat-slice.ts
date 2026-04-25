import { ChatMessage } from '@/constants/types';
import {
  clearChatMessagesSqlite,
  deleteChatSessionSqlite,
  getChatMessagesSqlite,
  getChatSessionsSqlite,
  saveChatMessageSqlite,
  saveChatSessionSqlite,
  upsertChatMessagesSqlite,
  upsertChatSessionsSqlite
} from '@/database/queries';
import { generateId } from '@/utils';
import { api } from '@/utils/api';
import { StateCreator } from 'zustand';
import { AppState, ChatSlice } from '../types';

let chatAbortController: AbortController | null = null;

export const createChatSlice: StateCreator<AppState, [], [], ChatSlice> = (set, get) => ({
  chatMessages: [],
  chatSessions: [],
  currentSessionId: null,

  listSessions: async () => {
    const { authToken } = get();
    if (!authToken) {
      // Try loading from local SQLite if offline
      const localSessions = await getChatSessionsSqlite();
      set({ chatSessions: localSessions });
      return;
    }
    try {
      const sessions = await api.listChatSessions(authToken);
      set({ chatSessions: sessions });
      // Sync to SQLite in one transaction
      await upsertChatSessionsSqlite(sessions);
    } catch (error) {
      console.error('List sessions error:', error);
      const localSessions = await getChatSessionsSqlite();
      set({ chatSessions: localSessions });
    }
  },

  loadSessionMessages: async (sessionId: string) => {
    const { authToken } = get();
    set({ isBusy: true, currentSessionId: sessionId });

    try {
      // Try local first for immediate UI update
      const localMessages = await getChatMessagesSqlite(sessionId);
      if (localMessages.length > 0) {
        set({ chatMessages: localMessages });
      }

      if (authToken) {
        const messages = await api.getChatMessages(authToken, sessionId);
        const mappedMessages: ChatMessage[] = messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.created_at,
          fileUri: m.file_uri,
        }));

        set({ chatMessages: mappedMessages });

        // Sync to local in one transaction
        await clearChatMessagesSqlite(sessionId);
        await upsertChatMessagesSqlite(mappedMessages, sessionId);
      }
    } catch (error) {
      console.error('Load messages error:', error);
      const localMessages = await getChatMessagesSqlite(sessionId);
      set({ chatMessages: localMessages });
    } finally {
      set({ isBusy: false });
    }
  },

  createNewSession: () => {
    set({ chatMessages: [], currentSessionId: null });
  },

  sendChatMessage: async (message: string, fileUri?: string) => {
    const { authToken, chatMessages, currentSessionId } = get();
    if (!authToken) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      fileUri,
    };

    set((state) => ({
      chatMessages: [...state.chatMessages, userMessage],
      isBusy: true,
    }));

    // Create AbortController for this request
    chatAbortController = new AbortController();

    try {
      const history = chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { response, sessionId } = await api.aiChat(
        authToken,
        message,
        history,
        fileUri,
        currentSessionId || undefined,
        chatAbortController.signal
      );

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        chatMessages: [...state.chatMessages, assistantMessage],
        isBusy: false,
        currentSessionId: sessionId,
      }));

      // Persist to local SQLite
      if (sessionId) {
        await saveChatMessageSqlite(userMessage, sessionId);
        await saveChatMessageSqlite(assistantMessage, sessionId);

        // If it was a new session, we need to save the session itself too
        if (!currentSessionId) {
          await saveChatSessionSqlite({
            id: sessionId,
            title: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
            created_at: new Date().toISOString()
          });
          await get().listSessions();
        }
      }

      // Refresh state if any tool modified data
      if (response.includes('Đã thêm') || response.includes('giao dịch từ')) {
        await get().refreshState();
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Chat request aborted');
        set({ isBusy: false });
        return;
      }
      console.log('Chat error:', error);
      set({ isBusy: false });

      // Làm sạch thông báo lỗi: loại bỏ các tiền tố kỹ thuật
      let cleanMessage = error.message || 'Xin lỗi, có lỗi xảy ra khi kết nối với AI.';
      cleanMessage = cleanMessage.replace(/^ApiError:\s*/i, '');
      cleanMessage = cleanMessage.replace(/^Error:\s*/i, '');

      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: cleanMessage,
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        chatMessages: [...state.chatMessages, errorMessage],
      }));
    } finally {
      chatAbortController = null;
    }
  },

  stopChat: () => {
    if (chatAbortController) {
      chatAbortController.abort();
      chatAbortController = null;
      set({ isBusy: false });
    }
  },

  deleteSession: async (sessionId: string) => {
    const { authToken, currentSessionId } = get();

    try {
      // Always delete locally
      await deleteChatSessionSqlite(sessionId);

      // Delete on server if possible
      if (authToken) {
        await api.deleteChatSession(authToken, sessionId);
      }

      // If we deleted the current active session, reset state
      if (currentSessionId === sessionId) {
        set({ chatMessages: [], currentSessionId: null });
      }

      // Refresh list
      await get().listSessions();
    } catch (error) {
      console.error('Delete session error:', error);
    }
  },

  clearChat: () => {
    set({ chatMessages: [], currentSessionId: null });
  },
});
