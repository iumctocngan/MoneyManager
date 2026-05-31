import { sendSuccess } from '../utils/response.js';
import { normalizeRegisterPayload, normalizeLoginPayload } from '../utils/validators.js';
import { registerUser, loginUser } from '../services/auth.service.js';

/**
 * POST /auth/register — Đăng ký tài khoản mới.
 * Trả về 201 kèm { accessToken, user } khi thành công.
 */
export const register = async (request, response) => {
  const payload = normalizeRegisterPayload(request.body);
  const result = await registerUser(payload);
  sendSuccess(response, result, 201);
};

/**
 * POST /auth/login — Đăng nhập và nhận access token.
 * Trả về 200 kèm { accessToken, user } khi thành công.
 */
export const login = async (request, response) => {
  const payload = normalizeLoginPayload(request.body);
  sendSuccess(response, await loginUser(payload));
};

/**
 * GET /auth/me — Lấy thông tin user đang đăng nhập.
 * request.user được gán bởi middleware requireAuth sau khi xác thực JWT.
 */
export const me = async (request, response) => {
  sendSuccess(response, { user: request.user });
};
