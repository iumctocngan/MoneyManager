import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import * as walletController from '../controllers/wallet.controller.js';

/**
 * Routes quản lý ví tiền.
 * DELETE /:id sẽ cascade xóa toàn bộ giao dịch và ngân sách liên quan — xem wallet.service.js.
 */
const router = Router();

router.get('/', asyncHandler(walletController.listWallets));
router.get('/:id', asyncHandler(walletController.getWalletById));
router.post('/', asyncHandler(walletController.createWallet));
// PATCH thay vì PUT — cho phép cập nhật partial (tên, màu, icon, v.v.)
router.patch('/:id', asyncHandler(walletController.updateWallet));
router.delete('/:id', asyncHandler(walletController.deleteWallet));

export default router;
