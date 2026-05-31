import * as walletService from '../services/wallet.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { normalizeWalletPayload } from '../utils/validators.js';

/** GET /wallets — Lấy danh sách tất cả ví của user kèm has_transactions. */
export const listWallets = async (request, response) => {
  sendSuccess(response, await walletService.listWallets(request.auth.userId));
};

/** GET /wallets/:id — Lấy một ví theo ID, trả 404 nếu không tồn tại. */
export const getWalletById = async (request, response) => {
  const wallet = await walletService.getWalletById(request.auth.userId, request.params.id);

  if (!wallet) {
    return sendError(response, 'Wallet not found.', 404);
  }

  sendSuccess(response, wallet);
};

/** POST /wallets — Tạo ví mới, trả về 201 kèm bản ghi vừa tạo. */
export const createWallet = async (request, response) => {
  const payload = normalizeWalletPayload(request.body);
  const wallet = await walletService.createWallet(request.auth.userId, payload);
  sendSuccess(response, wallet, 201);
};

/**
 * PATCH /wallets/:id — Cập nhật partial cho ví (tên, màu, icon, số dư, includeInTotal).
 * Chỉ các trường có trong payload mới được ghi — tránh ghi đè trường không thay đổi.
 */
export const updateWallet = async (request, response) => {
  const payload = normalizeWalletPayload(request.body, { partial: true });
  const wallet = await walletService.updateWallet(request.auth.userId, request.params.id, payload);
  sendSuccess(response, wallet);
};

/**
 * DELETE /wallets/:id — Xóa ví và cascade xóa giao dịch + ngân sách liên quan.
 * Trả về null khi thành công.
 */
export const deleteWallet = async (request, response) => {
  await walletService.deleteWallet(request.auth.userId, request.params.id);
  sendSuccess(response, null);
};
