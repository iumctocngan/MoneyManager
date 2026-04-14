import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { normalizeTransactionPayload } from '../utils/validators.js';
import {
  createTransaction,
  deleteTransaction,
  getTransactionById,
  listTransactions,
  updateTransaction,
} from '../services/transaction.service.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (request, response) => {
    const filters = {};

    if (typeof request.query.walletId === 'string' && request.query.walletId.trim() !== '') {
      filters.walletId = request.query.walletId.trim();
    }

    if (typeof request.query.type === 'string' && request.query.type.trim() !== '') {
      filters.type = request.query.type.trim();
    }

    response.json(await listTransactions(request.auth.userId, filters));
  })
);

router.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const transaction = await getTransactionById(request.auth.userId, request.params.id);

    if (!transaction) {
      response.status(404).json({ message: 'Transaction not found.' });
      return;
    }

    response.json(transaction);
  })
);

router.post(
  '/',
  asyncHandler(async (request, response) => {
    const payload = normalizeTransactionPayload(request.body);
    const transaction = await createTransaction(request.auth.userId, payload);
    response.status(201).json(transaction);
  })
);

router.patch(
  '/:id',
  asyncHandler(async (request, response) => {
    const payload = normalizeTransactionPayload(request.body, { partial: true });
    const transaction = await updateTransaction(
      request.auth.userId,
      request.params.id,
      payload,
      (body) => normalizeTransactionPayload(body)
    );
    response.json(transaction);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (request, response) => {
    await deleteTransaction(request.auth.userId, request.params.id);
    response.status(204).send();
  })
);

export default router;
