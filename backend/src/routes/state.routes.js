import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { normalizeStateSnapshot } from '../utils/validators.js';
import { getStateSnapshot, importStateSnapshot } from '../services/state.service.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (request, response) => {
    response.json(await getStateSnapshot(request.auth.userId));
  })
);

router.post(
  '/import',
  asyncHandler(async (request, response) => {
    const payload = normalizeStateSnapshot(request.body);
    response.json(await importStateSnapshot(request.auth.userId, payload));
  })
);

export default router;
