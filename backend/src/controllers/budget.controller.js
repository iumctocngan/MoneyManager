import * as budgetService from '../services/budget.service.js';
import { sendSuccess } from '../utils/response.js';
import { normalizeBudgetPayload } from '../utils/validators.js';

export const listBudgets = async (request, response) => {
  sendSuccess(response, await budgetService.listBudgets(request.auth.userId));
};

export const getBudgetById = async (request, response) => {
  const budget = await budgetService.getBudgetById(request.auth.userId, request.params.id);

  if (!budget) {
    response.status(404).json({
      success: false,
      error: { message: 'Budget not found.' }
    });
    return;
  }

  sendSuccess(response, budget);
};

export const createBudget = async (request, response) => {
  const payload = normalizeBudgetPayload(request.body);
  const budget = await budgetService.createBudget(request.auth.userId, payload);
  sendSuccess(response, budget, 201);
};

export const updateBudget = async (request, response) => {
  const payload = normalizeBudgetPayload(request.body, { partial: true });
  const budget = await budgetService.updateBudget(
    request.auth.userId,
    request.params.id,
    payload,
    (body) => normalizeBudgetPayload(body)
  );
  sendSuccess(response, budget);
};

export const deleteBudget = async (request, response) => {
  await budgetService.deleteBudget(request.auth.userId, request.params.id);
  response.status(204).send();
};
