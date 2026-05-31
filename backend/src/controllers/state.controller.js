import * as stateService from '../services/state.service.js';
import { sendSuccess } from '../utils/response.js';
import { normalizeStateSnapshot } from '../utils/validators.js';

/**
 * GET /state — Lấy toàn bộ state của user (wallets, transactions, budgets).
 * Dùng cho đồng bộ ban đầu khi frontend khởi động hoặc sau khi AI thay đổi dữ liệu.
 */
export const getStateSnapshot = async (request, response) => {
  sendSuccess(response, await stateService.getStateSnapshot(request.auth.userId));
};

/**
 * POST /state/import — Nhập toàn bộ dữ liệu từ snapshot (ghi đè hoàn toàn).
 * Dùng cho luồng đồng bộ offline-first: client đẩy dữ liệu local lên server.
 * Dữ liệu được validate qua normalizeStateSnapshot trước khi giao cho service.
 */
export const importStateSnapshot = async (request, response) => {
  const payload = normalizeStateSnapshot(request.body);
  sendSuccess(response, await stateService.importStateSnapshot(request.auth.userId, payload));
};
