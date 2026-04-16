import * as stateService from '../services/state.service.js';
import { sendSuccess } from '../utils/response.js';
import { normalizeStateSnapshot } from '../utils/validators.js';

export const getStateSnapshot = async (request, response) => {
  sendSuccess(response, await stateService.getStateSnapshot(request.auth.userId));
};

export const importStateSnapshot = async (request, response) => {
  const payload = normalizeStateSnapshot(request.body);
  sendSuccess(response, await stateService.importStateSnapshot(request.auth.userId, payload));
};
