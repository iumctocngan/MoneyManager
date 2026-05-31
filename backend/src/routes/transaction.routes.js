import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import * as transactionController from '../controllers/transaction.controller.js';

/**
 * Routes quản lý giao dịch.
 * Route /batch phải đặt TRƯỚC /:id để tránh Express hiểu "batch" là một ID động.
 */
const router = Router();

router.get('/', asyncHandler(transactionController.listTransactions));
router.get('/:id', asyncHandler(transactionController.getTransactionById));
router.post('/', asyncHandler(transactionController.createTransaction));
// Tạo hàng loạt giao dịch trong một request — dùng cho AI scan hoặc import offline
router.post('/batch', asyncHandler(transactionController.createTransactionsBatch));
// PATCH thay vì PUT — cho phép cập nhật partial
router.patch('/:id', asyncHandler(transactionController.updateTransaction));
router.delete('/:id', asyncHandler(transactionController.deleteTransaction));

export default router;
