import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import * as transactionController from '../controllers/transaction.controller.js';

const router = Router();

router.get('/', asyncHandler(transactionController.listTransactions));
router.get('/:id', asyncHandler(transactionController.getTransactionById));
router.post('/', asyncHandler(transactionController.createTransaction));
router.patch('/:id', asyncHandler(transactionController.updateTransaction));
router.delete('/:id', asyncHandler(transactionController.deleteTransaction));

export default router;
