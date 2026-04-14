import { Router } from 'express';
import { query } from '../config/database.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (request, response) => {
    const rows = await query('SELECT NOW() AS currentTime');

    response.json({
      status: 'ok',
      database: 'connected',
      time: rows[0].currentTime,
    });
  })
);

export default router;
