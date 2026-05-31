import { Router } from 'express';
import budgetRoutes from './budget.routes.js';
import stateRoutes from './state.routes.js';
import transactionRoutes from './transaction.routes.js';
import walletRoutes from './wallet.routes.js';
import aiRoutes from './ai.routes.js';

/**
 * Router gốc cho toàn bộ API — tập hợp tất cả sub-router theo tài nguyên.
 * Tất cả routes ở đây đều yêu cầu xác thực (requireAuth được gắn ở cấp app).
 * auth.routes được mount trực tiếp tại app, không qua router này vì không cần auth.
 */
const router = Router();

// Đồng bộ toàn bộ state (wallets + transactions + budgets) trong một lần gọi
router.use('/state', stateRoutes);
router.use('/wallets', walletRoutes);
router.use('/transactions', transactionRoutes);
router.use('/budgets', budgetRoutes);
// AI chat và tool calls (get_financial_status, add_transaction, v.v.)
router.use('/ai', aiRoutes);

export default router;
