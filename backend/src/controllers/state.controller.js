import * as stateService from '../services/state.service.js';
import { normalizeStateSnapshot } from '../utils/validators.js';

export const getStateSnapshot = async (request, response) => {
  response.json(await stateService.getStateSnapshot(request.auth.userId));
};

export const importStateSnapshot = async (request, response) => {
  const payload = normalizeStateSnapshot(request.body);
  response.json(await stateService.importStateSnapshot(request.auth.userId, payload));
};
