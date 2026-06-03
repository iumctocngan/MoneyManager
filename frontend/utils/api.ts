import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { AppSnapshot, AuthResponse, AuthUser, Budget, Transaction, Wallet } from '@/constants/types';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  token?: string | null;
  body?: unknown;
  // signal cho phép caller hủy request đang chạy (ví dụ khi component unmount)
  signal?: AbortSignal;
};

type ExpoExtra = {
  apiBaseUrl?: string;
};

/**
 * Lớp lỗi tùy chỉnh cho API — giữ HTTP status code để caller xử lý từng loại lỗi riêng.
 */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Callback toàn cục được gọi khi server trả về 401 — thường dùng để logout người dùng
type OnUnauthorizedCallback = () => void;
let onUnauthorized: OnUnauthorizedCallback | null = null;

/**
 * Đăng ký callback xử lý khi token hết hạn (HTTP 401).
 * Thường gọi một lần từ store khi khởi động app.
 */
export function setOnUnauthorized(cb: OnUnauthorizedCallback) {
  onUnauthorized = cb;
}

/**
 * Lấy IP của máy host từ Expo dev server URI.
 * Khi chạy trên thiết bị thật, app cần biết IP LAN thay vì localhost.
 */
function getDevelopmentHost() {
  const hostUri = Constants.expoConfig?.hostUri?.trim();

  if (!hostUri) {
    return null;
  }

  // hostUri có dạng "192.168.x.x:8081" — chỉ lấy phần IP, bỏ port của Metro
  return hostUri.split(':')[0] ?? null;
}

/**
 * Thay thế localhost/127.0.0.1 trong URL bằng địa chỉ host thực.
 * Cần thiết vì thiết bị vật lý không hiểu "localhost" của máy tính.
 */
function replaceLoopbackHost(url: string, nextHost: string) {
  return url.replace('://localhost', `://${nextHost}`).replace('://127.0.0.1', `://${nextHost}`);
}

/**
 * Tính toán base URL của API theo thứ tự ưu tiên:
 * 1. URL trong app.config (extra.apiBaseUrl) — nếu trỏ localhost thì tự động thay IP
 * 2. IP từ Expo dev server (cho thiết bị thật qua LAN)
 * 3. 10.0.2.2 cho Android Emulator (địa chỉ loopback đặc biệt của AVD)
 * 4. localhost cho iOS Simulator
 */
function resolveApiBaseUrl() {
  const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
  const configuredBaseUrl = extra.apiBaseUrl?.trim();
  const developmentHost = getDevelopmentHost();

  if (configuredBaseUrl) {
    if (
      configuredBaseUrl.includes('://localhost') ||
      configuredBaseUrl.includes('://127.0.0.1')
    ) {
      if (developmentHost) {
        // Ưu tiên dùng IP từ Expo host khi có — phù hợp chạy trên thiết bị thật
        return replaceLoopbackHost(configuredBaseUrl, developmentHost);
      }

      if (Platform.OS === 'android') {
        // Android Emulator dùng 10.0.2.2 để trỏ về localhost của máy host
        return replaceLoopbackHost(configuredBaseUrl, '10.0.2.2');
      }
    }

    return configuredBaseUrl;
  }

  if (developmentHost) {
    return `http://${developmentHost}:4000`;
  }

  // Fallback cuối: 10.0.2.2 cho Android emulator, localhost cho iOS simulator
  return Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
}

// Được resolve một lần khi module load — không tính lại mỗi request
export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Hàm fetch nội bộ duy nhất — xử lý header, auth, và parse response envelope.
 * Ném ApiError cho mọi lỗi HTTP hoặc lỗi mạng để caller xử lý thống nhất.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  // Chỉ thêm Content-Type khi có body — tránh gửi header thừa cho GET request
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (e: any) {
    // AbortError xảy ra khi signal bị cancel — re-throw để caller biết request bị hủy chủ động
    if (e.name === 'AbortError') {
      throw e;
    }
    throw new ApiError(
      `Khong ket noi duoc backend tai ${API_BASE_URL}. Neu ban dang mo app tren dien thoai that, hay dung IP LAN cua may thay cho localhost.`,
      0
    );
  }

  // Đọc text trước, rồi parse JSON — cho phép xử lý response không phải JSON (plain text error)
  const rawText = await response.text();
  let payload: any = null;

  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      // Server trả về plain text thay vì JSON — bọc vào object để xử lý thống nhất bên dưới
      payload = { message: rawText };
    }
  }

  if (!response.ok) {
    // Standard error envelope: { success: false, error: { message, details } }
    const errorMessage =
      payload?.error?.message || payload?.message || 'Yeu cau den backend that bai.';
    
    // 401: token hết hạn hoặc không hợp lệ — kích hoạt callback logout toàn cục
    if (response.status === 401) {
      onUnauthorized?.();
    }
    
    throw new ApiError(errorMessage, response.status);
  }

  // Standard success envelope: { success: true, data: T }
  if (payload && typeof payload === 'object' && 'success' in payload) {
    if (payload.success) {
      return payload.data as T;
    } else {
      throw new ApiError(
        payload.error?.message || 'Yeu cau den backend that bai.',
        response.status
      );
    }
  }

  // Fallback for non-enveloped responses (though we aim to eliminate these)
  return payload as T;
}

export const api = {
  API_BASE_URL,
  register(body: { email: string; password: string; name?: string }) {
    return request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body,
    });
  },
  login(body: { email: string; password: string }) {
    return request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body,
    });
  },
  forgotPassword(body: { email: string }) {
    return request<any>('/api/auth/forgot-password', {
      method: 'POST',
      body,
    });
  },
  verifyResetOtp(body: { email: string; otp: string }) {
    return request<any>('/api/auth/verify-reset-otp', {
      method: 'POST',
      body,
    });
  },
  resetPassword(body: { email: string; otp: string; newPassword: string }) {
    return request<any>('/api/auth/reset-password', {
      method: 'POST',
      body,
    });
  },
  me(token: string) {
    return request<{ user: AuthUser }>('/api/auth/me', { token });
  },
  // Lấy toàn bộ state (wallets, transactions, budgets) từ server để sync về local
  getState(token: string) {
    return request<AppSnapshot>('/api/state', { token });
  },
  // Đẩy toàn bộ state local lên server — dùng khi khôi phục dữ liệu từ thiết bị khác
  importState(token: string, body: AppSnapshot) {
    return request<AppSnapshot>('/api/state/import', {
      method: 'POST',
      token,
      body,
    });
  },
  createWallet(token: string, wallet: Wallet) {
    return request<Wallet>('/api/wallets', {
      method: 'POST',
      token,
      body: wallet,
    });
  },
  deleteWallet(token: string, id: string) {
    return request<void>(`/api/wallets/${id}`, {
      method: 'DELETE',
      token,
    });
  },
  updateWallet(token: string, id: string, payload: Partial<Wallet>) {
    return request<Wallet>(`/api/wallets/${id}`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },
  createTransaction(token: string, transaction: Transaction) {
    return request<Transaction>('/api/transactions', {
      method: 'POST',
      token,
      body: transaction,
    });
  },
  // Tạo nhiều giao dịch cùng lúc — dùng khi import hoặc sync batch từ SQLite local
  createTransactionsBatch(token: string, transactions: Partial<Transaction>[]) {
    return request<Transaction[]>('/api/transactions/batch', {
      method: 'POST',
      token,
      body: transactions,
    });
  },
  updateTransaction(token: string, id: string, payload: Partial<Transaction>) {
    return request<Transaction>(`/api/transactions/${id}`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },
  deleteTransaction(token: string, id: string) {
    return request<void>(`/api/transactions/${id}`, {
      method: 'DELETE',
      token,
    });
  },
  createBudget(token: string, budget: Budget) {
    return request<Budget>('/api/budgets', {
      method: 'POST',
      token,
      body: budget,
    });
  },
  updateBudget(token: string, id: string, payload: Partial<Budget>) {
    return request<Budget>(`/api/budgets/${id}`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },
  deleteBudget(token: string, id: string) {
    return request<void>(`/api/budgets/${id}`, {
      method: 'DELETE',
      token,
    });
  },

  /**
   * Upload file âm thanh để server transcribe thành văn bản/giao dịch.
   * Dùng FileSystem.uploadAsync vì fetch không hỗ trợ multipart/form-data tốt trên React Native.
   */
  async uploadAudio(token: string, audioUri: string) {
    try {
      const response = await FileSystem.uploadAsync(
        `${API_BASE_URL}/api/ai/transcribe`,
        audioUri,
        {
          httpMethod: 'POST',
          uploadType: 1, // FileSystemUploadType.MULTIPART
          fieldName: 'audio',
          mimeType: 'audio/m4a',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // FileSystem.uploadAsync trả về status code riêng, không throw khi lỗi HTTP
      const isOk = response.status >= 200 && response.status < 300;
      let payload: any = null;
      try {
        payload = JSON.parse(response.body);
      } catch {
        payload = { message: response.body };
      }

      if (!isOk) {
        const msg = payload?.error?.message || payload?.message || 'Failed to transcribe audio';
        throw new ApiError(msg, response.status);
      }

      return (payload && payload.success ? payload.data : payload) as Partial<Transaction>[];
    } catch (e: any) {
      // Re-throw ApiError đã được tạo bên trong, bọc các lỗi khác vào ApiError
      if (e instanceof ApiError) throw e;
      throw new ApiError(e.message || 'Network request failed', 0);
    }
  },

  /**
   * Upload ảnh hóa đơn để server OCR và trả về danh sách giao dịch gợi ý.
   * AbortSignal chưa được hỗ trợ bởi FileSystem.uploadAsync — đây là giới hạn đã biết.
   */
  async uploadReceipt(token: string, imageUri: string) {
    // ... FileSystem does not support AbortSignal easily, but we focus on chat for now
    try {
      const response = await FileSystem.uploadAsync(
        `${API_BASE_URL}/api/ai/scan-receipt`,
        imageUri,
        {
          httpMethod: 'POST',
          uploadType: 1, // FileSystemUploadType.MULTIPART
          fieldName: 'image',
          mimeType: 'image/jpeg',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const isOk = response.status >= 200 && response.status < 300;
      let payload: any = null;
      try {
        payload = JSON.parse(response.body);
      } catch {
        payload = { message: response.body };
      }

      if (!isOk) {
        const msg = payload?.error?.message || payload?.message || 'Failed to scan receipt';
        throw new ApiError(msg, response.status);
      }

      return (payload && payload.success ? payload.data : payload) as Partial<Transaction>[];
    } catch (e: any) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(e.message || 'Network request failed', 0);
    }
  },

  /**
   * Gửi tin nhắn tới AI agent và nhận phản hồi.
   * `dataModified` trong response cho biết AI đã thực hiện mutation — frontend cần refresh state.
   * `signal` cho phép hủy request khi người dùng rời màn hình chat.
   */
  async aiChat(token: string, message: string, history: any[], sessionId?: string, signal?: AbortSignal) {
    return request<{ response: string; sessionId: string; dataModified?: boolean }>('/api/ai/chat', {
      method: 'POST',
      token,
      body: { message, history, sessionId },
      signal,
    });
  },

  listChatSessions(token: string) {
    return request<any[]>('/api/ai/sessions', { token });
  },

  getChatMessages(token: string, sessionId: string) {
    return request<any[]>(`/api/ai/sessions/${sessionId}/messages`, { token });
  },

  deleteChatSession(token: string, sessionId: string) {
    return request<void>(`/api/ai/sessions/${sessionId}`, {
      method: 'DELETE',
      token,
    });
  },
};
