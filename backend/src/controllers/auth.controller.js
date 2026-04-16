import { sendSuccess } from '../utils/response.js';

export const register = async (request, response) => {
  const payload = normalizeRegisterPayload(request.body);
  const result = await registerUser(payload);
  sendSuccess(response, result, 201);
};

export const login = async (request, response) => {
  const payload = normalizeLoginPayload(request.body);
  sendSuccess(response, await loginUser(payload));
};

export const me = async (request, response) => {
  sendSuccess(response, { user: request.user });
};
