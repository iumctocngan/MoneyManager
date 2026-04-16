import * as settingsService from '../services/settings.service.js';
import { sendSuccess } from '../utils/response.js';
import { normalizeSettingsPayload } from '../utils/validators.js';

export const getSettings = async (request, response) => {
  sendSuccess(response, await settingsService.getSettings(request.auth.userId));
};

export const updateSettings = async (request, response) => {
  const payload = normalizeSettingsPayload(request.body, { partial: true });
  sendSuccess(response, await settingsService.updateSettings(request.auth.userId, payload));
};
