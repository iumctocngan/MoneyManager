import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { AppSettings, AppSnapshot, AuthResponse, AuthUser, Budget, Transaction, Wallet } from '@/constants/types';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  token?: string | null;
  body?: unknown;
};

type ExpoExtra = {
  apiBaseUrl?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getDevelopmentHost() {
  const hostUri = Constants.expoConfig?.hostUri?.trim();

  if (!hostUri) {
    return null;
  }

  return hostUri.split(':')[0] ?? null;
}

function replaceLoopbackHost(url: string, nextHost: string) {
  return url.replace('://localhost', `://${nextHost}`).replace('://127.0.0.1', `://${nextHost}`);
}

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
        return replaceLoopbackHost(configuredBaseUrl, developmentHost);
      }

      if (Platform.OS === 'android') {
        return replaceLoopbackHost(configuredBaseUrl, '10.0.2.2');
      }
    }

    return configuredBaseUrl;
  }

  if (developmentHost) {
    return `http://${developmentHost}:4000`;
  }

  return Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
}

export const API_BASE_URL = resolveApiBaseUrl();

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

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
    });
  } catch {
    throw new ApiError(
      `Khong ket noi duoc backend tai ${API_BASE_URL}. Neu ban dang mo app tren dien thoai that, hay dung IP LAN cua may thay cho localhost.`,
      0
    );
  }

  const rawText = await response.text();
  let payload: any = null;

  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = { message: rawText };
    }
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.message || 'Yeu cau den backend that bai.',
      response.status
    );
  }

  return payload as T;
}

export const api = {
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
  me(token: string) {
    return request<{ user: AuthUser }>('/api/auth/me', { token });
  },
  getState(token: string) {
    return request<AppSnapshot>('/api/state', { token });
  },
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
  deleteBudget(token: string, id: string) {
    return request<void>(`/api/budgets/${id}`, {
      method: 'DELETE',
      token,
    });
  },
  updateSettings(token: string, settings: Partial<AppSettings>) {
    return request<AppSettings>('/api/settings', {
      method: 'PUT',
      token,
      body: settings,
    });
  },
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

      if (response.status !== 200) {
        let msg = 'Failed to transcribe audio';
        try {
          const errorJson = JSON.parse(response.body);
          msg = errorJson.message || errorJson.error?.message || msg;
        } catch {}
        throw new ApiError(msg, response.status);
      }

      return JSON.parse(response.body) as Partial<Transaction>[];
    } catch (e: any) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(e.message || 'Network request failed', 0);
    }
  },

  async uploadReceipt(token: string, imageUri: string) {
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

      if (response.status !== 200) {
        let msg = 'Failed to scan receipt';
        try {
          const errorJson = JSON.parse(response.body);
          msg = errorJson.message || errorJson.error?.message || msg;
        } catch {}
        throw new ApiError(msg, response.status);
      }

      return JSON.parse(response.body) as Partial<Transaction>[];
    } catch (e: any) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(e.message || 'Network request failed', 0);
    }
  },
};
