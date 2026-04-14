import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { normalizeSettingsPayload } from '../utils/validators.js';
import { getSettings, updateSettings } from '../services/settings.service.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (request, response) => {
    response.json(await getSettings(request.auth.userId));
  })
);

router.put(
  '/',
  asyncHandler(async (request, response) => {
    const payload = normalizeSettingsPayload(request.body, { partial: true });
    response.json(await updateSettings(request.auth.userId, payload));
  })
);

export default router;
