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

// Controller dùng chung để hủy request AI đang chạy khi người dùng bấm Stop hoặc gửi tin mới
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
      // Khi mạng lỗi, dùng danh sách session đã cache trong SQLite để tránh màn trắng
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
        // Chuẩn hóa trường created_at → timestamp để khớp với interface ChatMessage
        const mappedMessages: ChatMessage[] = messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.created_at,
        }));

        set({ chatMessages: mappedMessages });

        // Sync to local in one transaction
        // Xóa toàn bộ cũ trước khi upsert để tránh tin trùng lặp
        await clearChatMessagesSqlite(sessionId);
        await upsertChatMessagesSqlite(mappedMessages, sessionId);
      }
    } catch (error) {
      // Fallback về SQLite nếu API lỗi — vẫn hiển thị lịch sử đã cache
      console.error('Load messages error:', error);
      const localMessages = await getChatMessagesSqlite(sessionId);
      set({ chatMessages: localMessages });
    } finally {
      set({ isBusy: false });
    }
  },

  // Tạo cuộc trò chuyện mới bằng cách reset state — session thực trên server chỉ tạo khi gửi tin đầu tiên
  createNewSession: () => {
    set({ chatMessages: [], currentSessionId: null });
  },

  sendChatMessage: async (message: string) => {
    const { authToken, chatMessages, currentSessionId } = get();
    if (!authToken) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      chatMessages: [...state.chatMessages, userMessage],
      isBusy: true,
    }));

    // Hủy request chat cũ nếu vẫn đang chạy trước khi bắt đầu request mới
    if (chatAbortController) {
      chatAbortController.abort();
    }
    chatAbortController = new AbortController();

    try {
      // Gửi toàn bộ lịch sử hội thoại để AI giữ ngữ cảnh xuyên suốt session
      const history = chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { response, sessionId, dataModified } = await api.aiChat(
        authToken,
        message,
        history,
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
          // Dùng 30 ký tự đầu của tin nhắn làm tiêu đề session — đủ ngắn để hiển thị trong danh sách
          await saveChatSessionSqlite({
            id: sessionId,
            title: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
            created_at: new Date().toISOString()
          });
          await get().listSessions();
        }
      }

      // Refresh state if any tool modified data
      // dataModified được backend trả về khi AI gọi công cụ tạo/sửa/xóa giao dịch
      if (dataModified) {
        await get().refreshState();
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Người dùng chủ động hủy — không hiển thị lỗi
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

      // Hiển thị lỗi dưới dạng tin nhắn của assistant để UX nhất quán
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
      // Dọn controller sau mỗi request (dù thành công hay thất bại) để tránh abort nhầm request sau
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

  // Xóa tin nhắn khỏi bộ nhớ — không ảnh hưởng đến SQLite hay server
  clearChat: () => {
    set({ chatMessages: [], currentSessionId: null });
  },
});
