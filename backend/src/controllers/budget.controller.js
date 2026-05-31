import * as budgetService from '../services/budget.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { normalizeBudgetPayload } from '../utils/validators.js';

/** GET /budgets — Lấy toàn bộ ngân sách kèm số tiền đã chi của user. */
export const listBudgets = async (request, response) => {
  sendSuccess(response, await budgetService.listBudgets(request.auth.userId));
};

/** GET /budgets/:id — Lấy một ngân sách theo ID, trả 404 nếu không tồn tại. */
export const getBudgetById = async (request, response) => {
  const budget = await budgetService.getBudgetById(request.auth.userId, request.params.id);

  if (!budget) {
    return sendError(response, 'Budget not found.', 404);
  }

  sendSuccess(response, budget);
};

/** POST /budgets — Tạo ngân sách mới, trả về 201 kèm bản ghi vừa tạo. */
export const createBudget = async (request, response) => {
  const payload = normalizeBudgetPayload(request.body);
  const budget = await budgetService.createBudget(request.auth.userId, payload);
  sendSuccess(response, budget, 201);
};

/**
 * PATCH /budgets/:id — Cập nhật partial cho ngân sách.
 * normalizeBudgetPayload được truyền vào service dưới dạng callback để service
 * có thể validate lại sau khi merge dữ liệu cũ + mới — đảm bảo toàn vẹn dữ liệu.
 */
export const updateBudget = async (request, response) => {
  const payload = normalizeBudgetPayload(request.body, { partial: true });
  const budget = await budgetService.updateBudget(
    request.auth.userId,
    request.params.id,
    payload,
    // Callback normalize full payload sau khi merge trong service
    (body) => normalizeBudgetPayload(body)
  );
  sendSuccess(response, budget);
};

/** DELETE /budgets/:id — Xóa ngân sách, trả về null khi thành công. */
export const deleteBudget = async (request, response) => {
  await budgetService.deleteBudget(request.auth.userId, request.params.id);
  sendSuccess(response, null);
};
