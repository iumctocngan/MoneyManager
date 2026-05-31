import { Router } from 'express';
import { query } from '../config/database.js';
import { sendSuccess } from '../utils/response.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

/**
 * GET /health — Kiểm tra trạng thái hoạt động của server và kết nối DB.
 * Thực hiện một query đơn giản (SELECT NOW()) để xác minh DB có phản hồi không.
 * Dùng cho load balancer, uptime monitor, hoặc kiểm tra triển khai.
 */
router.get(
  '/',
  asyncHandler(async (request, response) => {
    // Query nhẹ — chỉ để kiểm tra kết nối DB còn hoạt động
    const rows = await query('SELECT NOW() AS currentTime');

    sendSuccess(response, {
      status: 'ok',
      database: 'connected',
      time: rows[0].currentTime,
    });
  })
);

export default router;
