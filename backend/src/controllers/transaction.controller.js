import * as transactionService from '../services/transaction.service.js';
import { normalizeTransactionPayload } from '../utils/validators.js';

export const listTransactions = async (request, response) => {
  const filters = {};

  if (typeof request.query.walletId === 'string' && request.query.walletId.trim() !== '') {
    filters.walletId = request.query.walletId.trim();
  }

  if (typeof request.query.type === 'string' && request.query.type.trim() !== '') {
    filters.type = request.query.type.trim();
  }

  response.json(await transactionService.listTransactions(request.auth.userId, filters));
};

export const getTransactionById = async (request, response) => {
  const transaction = await transactionService.getTransactionById(request.auth.userId, request.params.id);

  if (!transaction) {
    response.status(404).json({ message: 'Transaction not found.' });
    return;
  }

  response.json(transaction);
};

export const createTransaction = async (request, response) => {
  const payload = normalizeTransactionPayload(request.body);
  const transaction = await transactionService.createTransaction(request.auth.userId, payload);
  response.status(201).json(transaction);
};

export const updateTransaction = async (request, response) => {
  const payload = normalizeTransactionPayload(request.body, { partial: true });
  const transaction = await transactionService.updateTransaction(
    request.auth.userId,
    request.params.id,
    payload,
    (body) => normalizeTransactionPayload(body)
  );
  response.json(transaction);
};

export const deleteTransaction = async (request, response) => {
  await transactionService.deleteTransaction(request.auth.userId, request.params.id);
  response.status(204).send();
};
