import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import * as walletController from '../controllers/wallet.controller.js';

const router = Router();

router.get('/', asyncHandler(walletController.listWallets));
router.get('/:id', asyncHandler(walletController.getWalletById));
router.post('/', asyncHandler(walletController.createWallet));
router.patch('/:id', asyncHandler(walletController.updateWallet));
router.delete('/:id', asyncHandler(walletController.deleteWallet));

export default router;
