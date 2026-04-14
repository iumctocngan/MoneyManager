import * as settingsService from '../services/settings.service.js';
import { normalizeSettingsPayload } from '../utils/validators.js';

export const getSettings = async (request, response) => {
  response.json(await settingsService.getSettings(request.auth.userId));
};

export const updateSettings = async (request, response) => {
  const payload = normalizeSettingsPayload(request.body, { partial: true });
  response.json(await settingsService.updateSettings(request.auth.userId, payload));
};
