import { getUserById } from '../services/auth.service.js';
import { verifyAccessToken } from '../utils/token.js';
import { HttpError } from '../utils/http-error.js';

/**
 * Middleware xác thực JWT — bảo vệ toàn bộ route /api/*.
 * Gắn thông tin user vào request.auth và request.user để các handler downstream sử dụng.
 */
export async function requireAuth(request, response, next) {
  try {
    const authorization = request.get('authorization');

    // Kiểm tra header Authorization đúng định dạng "Bearer <token>"
    if (!authorization || !authorization.startsWith('Bearer ')) {
      next(new HttpError(401, 'Missing bearer access token.'));
      return;
    }

    // Cắt bỏ prefix "Bearer " để lấy token thuần
    const token = authorization.slice('Bearer '.length).trim();
    const payload = verifyAccessToken(token);
    // Tra cứu DB để đảm bảo user vẫn tồn tại (tránh trường hợp token hợp lệ nhưng user đã bị xóa)
    const user = await getUserById(payload.sub);

    if (!user) {
      next(new HttpError(401, 'Authenticated user was not found.'));
      return;
    }

    // Lưu thông tin xác thực tối giản vào request.auth để controller sử dụng nhanh
    request.auth = {
      userId: user.id,
      email: user.email,
    };
    // Lưu toàn bộ object user cho các middleware/handler cần thêm thông tin
    request.user = user;

    next();
  } catch (error) {
    next(error);
  }
}
