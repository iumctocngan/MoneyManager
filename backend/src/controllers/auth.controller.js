import { sendSuccess } from '../utils/response.js';
import { normalizeRegisterPayload, normalizeLoginPayload } from '../utils/validators.js';
import { registerUser, loginUser, requestPasswordReset, verifyPasswordResetOtp, resetPassword } from '../services/auth.service.js';

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

/**
 * POST /auth/forgot-password
 */
export const forgotPassword = async (request, response) => {
  const { email } = request.body;
  if (!email) {
    return sendSuccess(response, { success: true }); // Giả vờ thành công nếu ko có email để chống dò tìm
  }
  const result = await requestPasswordReset(email);
  sendSuccess(response, result);
};

/**
 * POST /auth/verify-reset-otp
 */
export const verifyResetOtp = async (request, response) => {
  const { email, otp } = request.body;
  if (!email || !otp) {
    throw new Error('Email và mã xác nhận là bắt buộc.');
  }
  const result = await verifyPasswordResetOtp(email, otp);
  sendSuccess(response, result);
};

/**
 * POST /auth/reset-password
 */
export const resetPasswordController = async (request, response) => {
  const { email, otp, newPassword } = request.body;
  if (!email || !otp || !newPassword) {
    throw new Error('Vui lòng điền đầy đủ thông tin.');
  }
  const result = await resetPassword(email, otp, newPassword);
  sendSuccess(response, result);
};

