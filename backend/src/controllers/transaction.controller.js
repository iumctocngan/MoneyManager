import * as transactionService from '../services/transaction.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { normalizeTransactionPayload } from '../utils/validators.js';

/**
 * GET /transactions — Lấy danh sách giao dịch với các bộ lọc tùy chọn.
 * Hỗ trợ filter theo walletId và type qua query string.
 * Chỉ chấp nhận giá trị string không rỗng để tránh filter với giá trị undefined/null.
 */
export const listTransactions = async (request, response) => {
  const filters = {};

  if (typeof request.query.walletId === 'string' && request.query.walletId.trim() !== '') {
    filters.walletId = request.query.walletId.trim();
  }

  if (typeof request.query.type === 'string' && request.query.type.trim() !== '') {
    filters.type = request.query.type.trim();
  }

  sendSuccess(response, await transactionService.listTransactions(request.auth.userId, filters));
};

/** GET /transactions/:id — Lấy một giao dịch theo ID, trả 404 nếu không tồn tại. */
export const getTransactionById = async (request, response) => {
  const transaction = await transactionService.getTransactionById(request.auth.userId, request.params.id);

  if (!transaction) {
    return sendError(response, 'Transaction not found.', 404);
  }

  sendSuccess(response, transaction);
};

/** POST /transactions — Tạo một giao dịch đơn lẻ, trả về 201 kèm bản ghi vừa tạo. */
export const createTransaction = async (request, response) => {
  const payload = normalizeTransactionPayload(request.body);
  const transaction = await transactionService.createTransaction(request.auth.userId, payload);
  sendSuccess(response, transaction, 201);
};

/**
 * POST /transactions/batch — Tạo hàng loạt giao dịch trong một request.
 * Body phải là mảng; mỗi phần tử được validate riêng qua normalizeTransactionPayload.
 * Toàn bộ batch thành công hoặc thất bại (atomic) nhờ withTransaction trong service.
 */
export const createTransactionsBatch = async (request, response) => {
  if (!Array.isArray(request.body)) {
    return sendError(response, 'Request body must be an array of transactions.', 400);
  }

  const payloads = request.body.map((item) => normalizeTransactionPayload(item));
  const transactions = await transactionService.createTransactionsBatch(request.auth.userId, payloads);
  sendSuccess(response, transactions, 201);
};


/**
 * PATCH /transactions/:id — Cập nhật partial cho giao dịch.
 * normalizeTransactionPayload callback được truyền vào service để validate
 * sau khi merge dữ liệu cũ + mới và điều chỉnh số dư ví tương ứng.
 */
export const updateTransaction = async (request, response) => {
  const payload = normalizeTransactionPayload(request.body, { partial: true });
  const transaction = await transactionService.updateTransaction(
    request.auth.userId,
    request.params.id,
    payload,
    // Callback normalize full payload sau khi merge trong service
    (body) => normalizeTransactionPayload(body)
  );
  sendSuccess(response, transaction);
};

/** DELETE /transactions/:id — Xóa giao dịch và hoàn tác số dư ví, trả về null khi thành công. */
export const deleteTransaction = async (request, response) => {
  await transactionService.deleteTransaction(request.auth.userId, request.params.id);
  sendSuccess(response, null);
};
