import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { loginUser, registerUser } from '../services/auth.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import {
  normalizeLoginPayload,
  normalizeRegisterPayload,
} from '../utils/validators.js';

const router = Router();

router.post(
  '/register',
  asyncHandler(async (request, response) => {
    const payload = normalizeRegisterPayload(request.body);
    const result = await registerUser(payload);
    response.status(201).json(result);
  })
);

router.post(
  '/login',
  asyncHandler(async (request, response) => {
    const payload = normalizeLoginPayload(request.body);
    response.json(await loginUser(payload));
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (request, response) => {
    response.json({ user: request.user });
  })
);

export default router;
