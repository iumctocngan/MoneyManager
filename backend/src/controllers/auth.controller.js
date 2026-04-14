import { loginUser, registerUser } from '../services/auth.service.js';
import {
  normalizeLoginPayload,
  normalizeRegisterPayload,
} from '../utils/validators.js';

export const register = async (request, response) => {
  const payload = normalizeRegisterPayload(request.body);
  const result = await registerUser(payload);
  response.status(201).json(result);
};

export const login = async (request, response) => {
  const payload = normalizeLoginPayload(request.body);
  response.json(await loginUser(payload));
};

export const me = async (request, response) => {
  response.json({ user: request.user });
};
