import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { HttpError } from './http-error.js';

// scrypt là hàm KDF chống brute-force tốt hơn bcrypt về mặt memory-hardness
const scrypt = promisify(scryptCallback);
// Prefix nhúng vào hash để xác định thuật toán — dễ migrate sau này nếu đổi thuật toán
const PASSWORD_PREFIX = 'scrypt';

/**
 * Hash mật khẩu với salt ngẫu nhiên dùng scrypt.
 * Định dạng output: "scrypt:<salt_hex>:<derived_key_hex>"
 */
export async function hashPassword(password) {
  // 16 byte = 128 bit salt — đủ entropy để tránh rainbow table
  const salt = randomBytes(16).toString('hex');
  // key length 64 byte (512 bit) — output đủ dài để kháng collision
  const derivedKey = await scrypt(password, salt, 64);

  return `${PASSWORD_PREFIX}:${salt}:${Buffer.from(derivedKey).toString('hex')}`;
}

/**
 * Xác minh mật khẩu nhập vào so với hash đã lưu trong DB.
 * Dùng timingSafeEqual để tránh timing attack khi so sánh hash.
 */
export async function verifyPassword(password, storedHash) {
  const [prefix, salt, originalHash] = String(storedHash).split(':');

  // Kiểm tra định dạng hash — phát hiện dữ liệu DB bị hỏng thay vì trả về false im lặng
  if (prefix !== PASSWORD_PREFIX || !salt || !originalHash) {
    throw new HttpError(500, 'Stored password hash format is invalid.');
  }

  const derivedKey = await scrypt(password, salt, 64);
  const candidateHash = Buffer.from(derivedKey).toString('hex');

  // timingSafeEqual so sánh hai buffer trong thời gian hằng số, không bị rò rỉ qua thời gian thực thi
  return timingSafeEqual(
    Buffer.from(candidateHash, 'hex'),
    Buffer.from(originalHash, 'hex')
  );
}
