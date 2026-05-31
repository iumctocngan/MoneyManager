import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import * as budgetController from '../controllers/budget.controller.js';

/**
 * Routes quản lý ngân sách.
 * asyncHandler bọc controller để tự động bắt lỗi async và chuyển vào next(err),
 * tránh phải try/catch lặp lại trong mỗi handler.
 */
const router = Router();

router.get('/', asyncHandler(budgetController.listBudgets));
router.get('/:id', asyncHandler(budgetController.getBudgetById));
router.post('/', asyncHandler(budgetController.createBudget));
// PATCH thay vì PUT — cho phép cập nhật partial, không yêu cầu gửi toàn bộ body
router.patch('/:id', asyncHandler(budgetController.updateBudget));
router.delete('/:id', asyncHandler(budgetController.deleteBudget));

export default router;
