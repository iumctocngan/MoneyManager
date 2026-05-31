import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import * as stateController from '../controllers/state.controller.js';

/**
 * Routes đồng bộ toàn bộ state giữa client và server.
 * GET /  — Tải snapshot mới nhất từ server về client.
 * POST /import — Đẩy toàn bộ dữ liệu local lên server (ghi đè hoàn toàn).
 */
const router = Router();

router.get('/', asyncHandler(stateController.getStateSnapshot));
// /import dùng POST vì thao tác này thay đổi dữ liệu server (không idempotent hoàn toàn)
router.post('/import', asyncHandler(stateController.importStateSnapshot));

export default router;
