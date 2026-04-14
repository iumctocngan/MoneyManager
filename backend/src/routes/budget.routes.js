import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { normalizeBudgetPayload } from '../utils/validators.js';
import {
  createBudget,
  deleteBudget,
  getBudgetById,
  listBudgets,
  updateBudget,
} from '../services/budget.service.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (request, response) => {
    response.json(await listBudgets(request.auth.userId));
  })
);

router.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const budget = await getBudgetById(request.auth.userId, request.params.id);

    if (!budget) {
      response.status(404).json({ message: 'Budget not found.' });
      return;
    }

    response.json(budget);
  })
);

router.post(
  '/',
  asyncHandler(async (request, response) => {
    const payload = normalizeBudgetPayload(request.body);
    const budget = await createBudget(request.auth.userId, payload);
    response.status(201).json(budget);
  })
);

router.patch(
  '/:id',
  asyncHandler(async (request, response) => {
    const payload = normalizeBudgetPayload(request.body, { partial: true });
    const budget = await updateBudget(
      request.auth.userId,
      request.params.id,
      payload,
      (body) => normalizeBudgetPayload(body)
    );
    response.json(budget);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (request, response) => {
    await deleteBudget(request.auth.userId, request.params.id);
    response.status(204).send();
  })
);

export default router;
