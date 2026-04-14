import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { normalizeWalletPayload } from '../utils/validators.js';
import {
  createWallet,
  deleteWallet,
  getWalletById,
  listWallets,
  updateWallet,
} from '../services/wallet.service.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (request, response) => {
    response.json(await listWallets(request.auth.userId));
  })
);

router.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const wallet = await getWalletById(request.auth.userId, request.params.id);

    if (!wallet) {
      response.status(404).json({ message: 'Wallet not found.' });
      return;
    }

    response.json(wallet);
  })
);

router.post(
  '/',
  asyncHandler(async (request, response) => {
    const payload = normalizeWalletPayload(request.body);
    const wallet = await createWallet(request.auth.userId, payload);
    response.status(201).json(wallet);
  })
);

router.patch(
  '/:id',
  asyncHandler(async (request, response) => {
    const payload = normalizeWalletPayload(request.body, { partial: true });
    const wallet = await updateWallet(request.auth.userId, request.params.id, payload);
    response.json(wallet);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (request, response) => {
    await deleteWallet(request.auth.userId, request.params.id);
    response.status(204).send();
  })
);

export default router;
