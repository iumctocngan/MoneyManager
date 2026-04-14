import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import * as settingsController from '../controllers/settings.controller.js';

const router = Router();

router.get('/', asyncHandler(settingsController.getSettings));
router.put('/', asyncHandler(settingsController.updateSettings));

export default router;
