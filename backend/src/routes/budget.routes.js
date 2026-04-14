import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import * as budgetController from '../controllers/budget.controller.js';

const router = Router();

router.get('/', asyncHandler(budgetController.listBudgets));
router.get('/:id', asyncHandler(budgetController.getBudgetById));
router.post('/', asyncHandler(budgetController.createBudget));
router.patch('/:id', asyncHandler(budgetController.updateBudget));
router.delete('/:id', asyncHandler(budgetController.deleteBudget));

export default router;
