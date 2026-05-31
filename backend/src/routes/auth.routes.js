import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { asyncHandler } from '../utils/async-handler.js';

import * as authController from '../controllers/auth.controller.js';

/**
 * Routes xác thực — mount trực tiếp tại app, không qua router chung.
 * /register và /login không cần requireAuth vì chưa có token.
 * /me cần requireAuth để xác minh token và trả thông tin user hiện tại.
 */
const router = Router();

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
// requireAuth middleware xác thực JWT và gán request.user trước khi vào controller
router.get('/me', requireAuth, asyncHandler(authController.me));

export default router;
