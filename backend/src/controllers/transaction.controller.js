import * as transactionService from '../services/transaction.service.js';
import { sendSuccess } from '../utils/response.js';
import { normalizeTransactionPayload } from '../utils/validators.js';

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

export const getTransactionById = async (request, response) => {
  const transaction = await transactionService.getTransactionById(request.auth.userId, request.params.id);

  if (!transaction) {
    response.status(404).json({
      success: false,
      error: { message: 'Transaction not found.' }
    });
    return;
  }

  sendSuccess(response, transaction);
};

export const createTransaction = async (request, response) => {
  const payload = normalizeTransactionPayload(request.body);
  const transaction = await transactionService.createTransaction(request.auth.userId, payload);
  sendSuccess(response, transaction, 201);
};

export const createTransactionsBatch = async (request, response) => {
  if (!Array.isArray(request.body)) {
    response.status(400).json({
      success: false,
      error: { message: 'Request body must be an array of transactions.' }
    });
    return;
  }

  const payloads = request.body.map((item) => normalizeTransactionPayload(item));
  const transactions = await transactionService.createTransactionsBatch(request.auth.userId, payloads);
  sendSuccess(response, transactions, 201);
};


export const updateTransaction = async (request, response) => {
  const payload = normalizeTransactionPayload(request.body, { partial: true });
  const transaction = await transactionService.updateTransaction(
    request.auth.userId,
    request.params.id,
    payload,
    (body) => normalizeTransactionPayload(body)
  );
  sendSuccess(response, transaction);
};

export const deleteTransaction = async (request, response) => {
  await transactionService.deleteTransaction(request.auth.userId, request.params.id);
  response.status(204).send();
};
