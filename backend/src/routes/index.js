import { Router } from 'express';
import budgetRoutes from './budget.routes.js';
import settingsRoutes from './settings.routes.js';
import stateRoutes from './state.routes.js';
import transactionRoutes from './transaction.routes.js';
import walletRoutes from './wallet.routes.js';
import aiRoutes from './ai.routes.js';

const router = Router();

router.use('/state', stateRoutes);
router.use('/wallets', walletRoutes);
router.use('/transactions', transactionRoutes);
router.use('/budgets', budgetRoutes);
router.use('/settings', settingsRoutes);
router.use('/ai', aiRoutes);

export default router;
