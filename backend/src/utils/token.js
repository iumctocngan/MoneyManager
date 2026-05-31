import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { HttpError } from './http-error.js';

// Encode chuỗi sang Base64URL (không có padding '=') — đúng chuẩn JWT
function base64urlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64urlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

// Tạo chữ ký HMAC-SHA256 với secret key từ env — dùng cho cả tạo và xác minh token
function sign(input) {
  return createHmac('sha256', env.auth.tokenSecret).update(input).digest('base64url');
}

/**
 * Tạo JWT access token theo chuẩn HS256.
 * Tự implement thay vì dùng thư viện để giảm dependency và kiểm soát payload chặt chẽ hơn.
 */
export function createAccessToken(user) {
  const now = Math.floor(Date.now() / 1000);
  // Chuyển TTL từ giờ sang giây để tính exp claim
  const exp = now + env.auth.accessTokenTtlHours * 60 * 60;
  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64urlEncode(
    JSON.stringify({
      sub: user.id,   // subject — định danh user
      email: user.email,
      name: user.name,
      iat: now,       // issued at
      exp,            // expiration
    })
  );
  const signature = sign(`${header}.${payload}`);

  // JWT chuẩn: header.payload.signature
  return `${header}.${payload}.${signature}`;
}

/**
 * Xác minh JWT access token — kiểm tra cấu trúc, chữ ký, và thời hạn.
 * Ném HttpError 401 cho mọi trường hợp token không hợp lệ.
 */
export function verifyAccessToken(token) {
  const parts = String(token).split('.');

  // JWT hợp lệ phải có đúng 3 phần
  if (parts.length !== 3) {
    throw new HttpError(401, 'Invalid access token.');
  }

  const [header, payload, signature] = parts;
  const expectedSignature = sign(`${header}.${payload}`);

  // So sánh độ dài trước để tránh lỗi với timingSafeEqual khi buffer khác length
  // timingSafeEqual chống timing attack — không để attacker đoán chữ ký qua thời gian response
  if (
    Buffer.byteLength(signature) !== Buffer.byteLength(expectedSignature) ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    throw new HttpError(401, 'Invalid access token signature.');
  }

  let parsedPayload;

  try {
    parsedPayload = JSON.parse(base64urlDecode(payload));
  } catch {
    throw new HttpError(401, 'Invalid access token payload.');
  }

  const now = Math.floor(Date.now() / 1000);

  // Kiểm tra sub (user id) và exp đều hợp lệ, và token chưa hết hạn
  if (!parsedPayload.sub || !parsedPayload.exp || parsedPayload.exp <= now) {
    throw new HttpError(401, 'Access token has expired.');
  }

  return parsedPayload;
}
