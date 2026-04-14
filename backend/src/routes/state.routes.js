import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import * as stateController from '../controllers/state.controller.js';

const router = Router();

router.get('/', asyncHandler(stateController.getStateSnapshot));
router.post('/import', asyncHandler(stateController.importStateSnapshot));

export default router;
