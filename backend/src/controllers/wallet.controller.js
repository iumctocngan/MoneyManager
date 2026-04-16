import * as walletService from '../services/wallet.service.js';
import { sendSuccess } from '../utils/response.js';
import { normalizeWalletPayload } from '../utils/validators.js';

export const listWallets = async (request, response) => {
  sendSuccess(response, await walletService.listWallets(request.auth.userId));
};

export const getWalletById = async (request, response) => {
  const wallet = await walletService.getWalletById(request.auth.userId, request.params.id);

  if (!wallet) {
    response.status(404).json({
      success: false,
      error: { message: 'Wallet not found.' }
    });
    return;
  }

  sendSuccess(response, wallet);
};

export const createWallet = async (request, response) => {
  const payload = normalizeWalletPayload(request.body);
  const wallet = await walletService.createWallet(request.auth.userId, payload);
  sendSuccess(response, wallet, 201);
};

export const updateWallet = async (request, response) => {
  const payload = normalizeWalletPayload(request.body, { partial: true });
  const wallet = await walletService.updateWallet(request.auth.userId, request.params.id, payload);
  sendSuccess(response, wallet);
};

export const deleteWallet = async (request, response) => {
  await walletService.deleteWallet(request.auth.userId, request.params.id);
  response.status(204).send();
};
